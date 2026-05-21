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
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class EloCalculationService {

    private static final Logger log = LoggerFactory.getLogger(EloCalculationService.class);
    private static final int DEFAULT_ELO = 1000;
    private static final int ELO_FLOOR = 100;

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final UserSportRepository userSportRepository;
    private final EloHistoryRepository eloHistoryRepository;

    @Async("eloTaskExecutor")
    @Transactional
    public void calculateAndApply(UUID sessionId, WinnerTeam winner) {
        try {
            doCalculate(sessionId, winner);
        } catch (Exception e) {
            log.error("ELO: calculation failed for session {}", sessionId, e);
        }
    }

    private void doCalculate(UUID sessionId, WinnerTeam winner) {
        GameSession session = gameSessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            log.warn("ELO: session {} not found", sessionId);
            return;
        }

        if (session.getSport().getRatingType() != RatingType.ELO_COMPETITIVE) {
            return;
        }

        List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(sessionId);

        List<UUID> unassigned = participants.stream()
                .filter(p -> p.getTeam() == null)
                .map(p -> p.getUser().getId())
                .toList();
        if (!unassigned.isEmpty()) {
            log.warn("ELO: session {} has participants without team assignment: {}", sessionId, unassigned);
            return;
        }

        List<GameParticipant> teamA = participants.stream()
                .filter(p -> p.getTeam() == TeamSide.TEAM_A).toList();
        List<GameParticipant> teamB = participants.stream()
                .filter(p -> p.getTeam() == TeamSide.TEAM_B).toList();

        if (teamA.isEmpty() || teamB.isEmpty()) {
            log.warn("ELO: session {} has an empty team — skipping", sessionId);
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
                .mapToInt(p -> resolveElo(userSportMap.get(p.getUser().getId())))
                .average().orElse(DEFAULT_ELO);
        double avgEloB = teamB.stream()
                .mapToInt(p -> resolveElo(userSportMap.get(p.getUser().getId())))
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

            int currentElo = resolveElo(us);
            double opposingAvg = p.getTeam() == TeamSide.TEAM_A ? avgEloB : avgEloA;
            double actual = p.getTeam() == TeamSide.TEAM_A ? actualA : actualB;

            double eExpected = 1.0 / (1.0 + Math.pow(10.0, (opposingAvg - currentElo) / 400.0));
            int k = kFactor(us.getGamesPlayed(), currentElo);
            int delta = (int) Math.round(k * (actual - eExpected));
            int newElo = Math.max(ELO_FLOOR, currentElo + delta);

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

    private int resolveElo(UserSport us) {
        if (us == null || us.getEloRating() == null) return DEFAULT_ELO;
        return us.getEloRating();
    }

    private double actualScore(WinnerTeam winner, TeamSide side) {
        if (winner == WinnerTeam.DRAW) return 0.5;
        return (winner == WinnerTeam.TEAM_A && side == TeamSide.TEAM_A)
                || (winner == WinnerTeam.TEAM_B && side == TeamSide.TEAM_B) ? 1.0 : 0.0;
    }

    private int kFactor(int gamesPlayed, int elo) {
        if (gamesPlayed < 30) return 32;
        if (elo < 2000) return 24;
        return 16;
    }
}
