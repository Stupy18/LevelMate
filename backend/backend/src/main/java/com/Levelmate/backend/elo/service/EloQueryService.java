package com.Levelmate.backend.elo.service;

import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.SportNotEloCompetitiveException;
import com.Levelmate.backend.common.exception.UserSportNotFoundException;
import com.Levelmate.backend.elo.dto.EloHistoryPageResponse;
import com.Levelmate.backend.elo.dto.EloHistoryResponse;
import com.Levelmate.backend.elo.dto.LeaderboardEntryResponse;
import com.Levelmate.backend.elo.repository.EloHistoryRepository;
import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.entity.UserSport;
import com.Levelmate.backend.users.repository.SportRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import com.Levelmate.backend.common.exception.SportNotFoundException;

@Service
@RequiredArgsConstructor
public class EloQueryService {

    private final UserSportRepository userSportRepository;
    private final SportRepository sportRepository;
    private final EloHistoryRepository eloHistoryRepository;

    @Transactional(readOnly = true)
    public EloHistoryPageResponse getHistory(UUID requestingUserId, UUID userId, UUID sportId, int page, int size) {
        if (!requestingUserId.equals(userId)) {
            throw new ForbiddenException();
        }

        var sport = sportRepository.findById(sportId).orElseThrow(SportNotFoundException::new);
        if (sport.getRatingType() != RatingType.ELO_COMPETITIVE) {
            throw new SportNotEloCompetitiveException();
        }

        UserSport us = userSportRepository.findByUserIdAndSportId(userId, sportId)
                .orElseThrow(UserSportNotFoundException::new);

        Page<EloHistoryResponse> historyPage = eloHistoryRepository
                .findAllByUserIdAndSportIdOrderByRecordedAtDesc(userId, sportId, PageRequest.of(page, size))
                .map(EloHistoryResponse::from);

        return new EloHistoryPageResponse(
                us.getEloRating(),
                us.getGamesPlayed(),
                historyPage.getContent(),
                historyPage.getTotalElements(),
                historyPage.getTotalPages(),
                page
        );
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getLeaderboard(UUID sportId) {
        var sport = sportRepository.findById(sportId).orElseThrow(SportNotFoundException::new);
        if (sport.getRatingType() != RatingType.ELO_COMPETITIVE) {
            throw new SportNotEloCompetitiveException();
        }

        return userSportRepository.findLeaderboard(sportId, PageRequest.of(0, 50))
                .stream()
                .map(LeaderboardEntryResponse::from)
                .toList();
    }
}
