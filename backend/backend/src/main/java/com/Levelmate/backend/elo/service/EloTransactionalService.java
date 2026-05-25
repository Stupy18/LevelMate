package com.Levelmate.backend.elo.service;

import com.Levelmate.backend.elo.entity.EloHistory;
import com.Levelmate.backend.elo.repository.EloHistoryRepository;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.TeamSide;
import com.Levelmate.backend.games.entity.WinnerTeam;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.entity.UserSport;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class EloTransactionalService {

    private static final Logger log = LoggerFactory.getLogger(EloTransactionalService.class);
    private static final double DEFAULT_ELO = 1000.0;
    private static final double ELO_FLOOR = 100.0;

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final UserSportRepository userSportRepository;
    private final EloHistoryRepository eloHistoryRepository;

    @Transactional
    public void doCalculate(UUID sessionId, WinnerTeam winner) {
        GameSession session = gameSessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            log.warn("ELO: session {} not found", sessionId);
            return;
        }

        if (session.getSport().getRatingType() != RatingType.ELO_COMPETITIVE) {
            log.info("ELO: session {} is not ELO_COMPETITIVE — skipping", sessionId);
            return;
        }

        List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(sessionId);
        if (participants.isEmpty()) {
            log.warn("ELO: session {} has no participants — skipping", sessionId);
            return;
        }

        boolean anyUnassigned = participants.stream().anyMatch(p -> p.getTeam() == null);
        if (anyUnassigned) {
            log.info("ELO: session {} has unassigned participants — auto-assigning teams", sessionId);
            int idx = 0;
            for (GameParticipant p : participants) {
                if (p.getTeam() == null) {
                    p.setTeam(idx++ % 2 == 0 ? TeamSide.TEAM_A : TeamSide.TEAM_B);
                }
            }
        }

        List<GameParticipant> teamA = participants.stream()
                .filter(p -> p.getTeam() == TeamSide.TEAM_A).toList();
        List<GameParticipant> teamB = participants.stream()
                .filter(p -> p.getTeam() == TeamSide.TEAM_B).toList();

        if (teamA.isEmpty() || teamB.isEmpty()) {
            log.warn("ELO: session {} has an empty team after auto-assignment — skipping", sessionId);
            return;
        }

        UUID sportId = session.getSport().getId();

        Map<UUID, UserSport> userSportMap = new HashMap<>();
        for (GameParticipant p : participants) {
            UUID userId = p.getUser().getId();
            userSportRepository.findByUserIdAndSportId(userId, sportId)
                    .ifPresent(us -> userSportMap.put(userId, us));
        }

        double avgEloA = teamA.stream()
                .mapToDouble(p -> resolveElo(userSportMap.get(p.getUser().getId())))
                .average().orElse(DEFAULT_ELO);
        double avgEloB = teamB.stream()
                .mapToDouble(p -> resolveElo(userSportMap.get(p.getUser().getId())))
                .average().orElse(DEFAULT_ELO);

        double actualA = actualScore(winner, TeamSide.TEAM_A);
        double actualB = actualScore(winner, TeamSide.TEAM_B);

        List<UserSport> toSave = new ArrayList<>();
        List<EloHistory> historyToSave = new ArrayList<>();

        for (GameParticipant p : participants) {
            UUID userId = p.getUser().getId();
            UserSport us = userSportMap.get(userId);
            if (us == null) {
                log.warn("ELO: no UserSport found for user {} in session {} — skipping player", userId, sessionId);
                continue;
            }

            double currentElo = resolveElo(us);
            double opposingAvg = p.getTeam() == TeamSide.TEAM_A ? avgEloB : avgEloA;
            double actual = p.getTeam() == TeamSide.TEAM_A ? actualA : actualB;

            double eExpected = 1.0 / (1.0 + Math.pow(10.0, (opposingAvg - currentElo) / 400.0));
            int k = kFactor(us.getGamesPlayed(), currentElo);
            double delta = k * (actual - eExpected);
            double newElo = Math.max(ELO_FLOOR, currentElo + delta);

            historyToSave.add(EloHistory.builder()
                    .user(p.getUser())
                    .sport(session.getSport())
                    .session(session)
                    .eloBefore(currentElo)
                    .eloDelta(delta)
                    .eloAfter(newElo)
                    .build());

            us.setEloRating(newElo);
            us.setGamesPlayed(us.getGamesPlayed() + 1);
            toSave.add(us);
        }

        userSportRepository.saveAll(toSave);
        eloHistoryRepository.saveAll(historyToSave);

        log.info("ELO: updated {} players for session {}", toSave.size(), sessionId);
    }

    private double resolveElo(UserSport us) {
        if (us == null) return DEFAULT_ELO;
        if (us.getEloRating() != null) return us.getEloRating();
        if (us.getLevel() != null) return 700.0 + us.getLevel() * 60.0;
        return DEFAULT_ELO;
    }

    private double actualScore(WinnerTeam winner, TeamSide side) {
        if (winner == WinnerTeam.DRAW) return 0.5;
        return (winner == WinnerTeam.TEAM_A && side == TeamSide.TEAM_A)
                || (winner == WinnerTeam.TEAM_B && side == TeamSide.TEAM_B) ? 1.0 : 0.0;
    }

    private int kFactor(int gamesPlayed, double elo) {
        if (gamesPlayed < 30) return 32;
        if (elo < 2000) return 24;
        return 16;
    }
}
