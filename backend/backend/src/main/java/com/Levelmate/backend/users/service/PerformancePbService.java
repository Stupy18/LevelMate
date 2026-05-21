package com.Levelmate.backend.users.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.InvalidSportRatingTypeException;
import com.Levelmate.backend.common.exception.SportNotInProfileException;
import com.Levelmate.backend.users.dto.PbResponse;
import com.Levelmate.backend.users.dto.PbResult;
import com.Levelmate.backend.users.dto.RecordPbRequest;
import com.Levelmate.backend.users.entity.PerformancePb;
import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.entity.Sport;
import com.Levelmate.backend.users.repository.PerformancePbRepository;
import com.Levelmate.backend.users.repository.SportRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PerformancePbService {

    private final PerformancePbRepository performancePbRepository;
    private final UserSportRepository userSportRepository;
    private final SportRepository sportRepository;

    @Transactional
    public PbResult recordPb(UUID userId, UUID sportId, RecordPbRequest request) {
        checkOwnership(userId);

        Sport sport = sportRepository.findById(sportId)
                .orElseThrow(() -> new com.Levelmate.backend.common.exception.SportNotFoundException());

        if (sport.getRatingType() != RatingType.PERFORMANCE_BASED) {
            throw new InvalidSportRatingTypeException(
                    "Personal bests are only available for PERFORMANCE_BASED sports");
        }
        if (!userSportRepository.existsByUserIdAndSportId(userId, sportId)) {
            throw new SportNotInProfileException();
        }

        User user = currentUser();
        Optional<PerformancePb> existing = performancePbRepository
                .findByUserIdAndSportIdAndDistanceMeters(userId, sportId, request.distanceMeters());

        boolean isNew = existing.isEmpty();
        PerformancePb pb;
        if (existing.isPresent()) {
            pb = existing.get();
            pb.setTimeSeconds(request.timeSeconds());
            pb.setRecordedAt(Instant.now());
        } else {
            pb = PerformancePb.builder()
                    .user(user)
                    .sport(sport)
                    .distanceMeters(request.distanceMeters())
                    .timeSeconds(request.timeSeconds())
                    .recordedAt(Instant.now())
                    .build();
        }

        return new PbResult(PbResponse.from(performancePbRepository.save(pb)), isNew);
    }

    @Transactional(readOnly = true)
    public List<PbResponse> getPbs(UUID userId, UUID sportId) {
        checkOwnership(userId);
        return performancePbRepository
                .findAllByUserIdAndSportIdOrderByDistanceMetersAsc(userId, sportId)
                .stream()
                .map(PbResponse::from)
                .toList();
    }

    private void checkOwnership(UUID userId) {
        if (!currentUser().getId().equals(userId)) {
            throw new ForbiddenException();
        }
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
