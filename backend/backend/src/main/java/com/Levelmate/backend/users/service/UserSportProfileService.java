package com.Levelmate.backend.users.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.LevelLockedException;
import com.Levelmate.backend.common.exception.SportAlreadyAddedException;
import com.Levelmate.backend.common.exception.SportNotFoundException;
import com.Levelmate.backend.common.exception.UserSportNotFoundException;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.dto.AddSportRequest;
import com.Levelmate.backend.users.dto.MetricValueRequest;
import com.Levelmate.backend.users.dto.SportEntryResponse;
import com.Levelmate.backend.users.dto.UpdateSportRequest;
import com.Levelmate.backend.users.entity.PerformancePb;
import com.Levelmate.backend.users.entity.Sport;
import com.Levelmate.backend.users.entity.UserSport;
import com.Levelmate.backend.users.repository.PerformancePbRepository;
import com.Levelmate.backend.users.repository.SportRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserSportProfileService {

    private final UserSportRepository userSportRepository;
    private final SportRepository sportRepository;
    private final PerformancePbRepository performancePbRepository;
    private final GameParticipantRepository gameParticipantRepository;

    private static final List<SessionStatus> ACTIVE_STATUSES =
            List.of(SessionStatus.OPEN, SessionStatus.FULL, SessionStatus.IN_PROGRESS);

    @Transactional
    public SportEntryResponse addSport(UUID userId, AddSportRequest request) {
        checkOwnership(userId);

        if (userSportRepository.existsByUserIdAndSportId(userId, request.sportId())) {
            throw new SportAlreadyAddedException();
        }

        Sport sport = sportRepository.findById(request.sportId())
                .orElseThrow(SportNotFoundException::new);

        User user = currentUser();

        Integer level = extractLevelFromMetrics(request.metrics());

        UserSport userSport = UserSport.builder()
                .user(user)
                .sport(sport)
                .level(level)
                .build();
        userSport = userSportRepository.save(userSport);

        saveMetrics(user, sport, request.metrics());

        return SportEntryResponse.from(userSport);
    }

    @Transactional(readOnly = true)
    public List<SportEntryResponse> getSports(UUID userId) {
        checkOwnership(userId);
        return userSportRepository.findAllByUserId(userId).stream()
                .map(SportEntryResponse::from)
                .toList();
    }

    @Transactional
    public SportEntryResponse updateSport(UUID userId, UUID sportId, UpdateSportRequest request) {
        checkOwnership(userId);
        UserSport userSport = userSportRepository.findByUserIdAndSportId(userId, sportId)
                .orElseThrow(UserSportNotFoundException::new);

        Integer level = extractLevelFromMetrics(request.metrics());
        if (level != null) {
            if (userSport.getSport().getRatingType() == RatingType.ELO_COMPETITIVE) {
                List<GameParticipant> active = gameParticipantRepository
                        .findActiveByUserAndSport(userId, userSport.getSport().getId(), ACTIVE_STATUSES);
                if (!active.isEmpty()) {
                    String title = active.get(0).getSession().getTitle();
                    throw new LevelLockedException(title != null ? title : "active session");
                }
            }
            userSport.setLevel(level);
        }

        saveMetrics(userSport.getUser(), userSport.getSport(), request.metrics());

        return SportEntryResponse.from(userSportRepository.save(userSport));
    }

    @Transactional
    public void removeSport(UUID userId, UUID sportId) {
        checkOwnership(userId);
        UserSport userSport = userSportRepository.findByUserIdAndSportId(userId, sportId)
                .orElseThrow(UserSportNotFoundException::new);
        userSportRepository.delete(userSport);
    }

    private void saveMetrics(User user, Sport sport, List<MetricValueRequest> metrics) {
        if (metrics == null || metrics.isEmpty()) return;
        for (MetricValueRequest m : metrics) {
            if (m.metricKey() == null || m.value() == null || m.value().isBlank()) continue;

            BigDecimal numericValue = null;
            String textValue = null;
            try {
                numericValue = new BigDecimal(m.value());
            } catch (NumberFormatException e) {
                textValue = m.value();
            }

            PerformancePb pb = performancePbRepository
                    .findByUserIdAndSportIdAndMetricKey(user.getId(), sport.getId(), m.metricKey())
                    .orElseGet(() -> PerformancePb.builder()
                            .user(user)
                            .sport(sport)
                            .metricKey(m.metricKey())
                            .build());

            pb.setMetricValueNumber(numericValue);
            pb.setMetricValueText(textValue);
            performancePbRepository.save(pb);
        }
    }

    private Integer extractLevelFromMetrics(List<MetricValueRequest> metrics) {
        if (metrics == null) return null;
        return metrics.stream()
                .filter(m -> "self_reported_level".equals(m.metricKey()) && m.value() != null)
                .findFirst()
                .map(m -> {
                    try {
                        int level = Integer.parseInt(m.value());
                        return Math.min(4, Math.max(1, level));
                    }
                    catch (NumberFormatException e) { return null; }
                })
                .orElse(null);
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
