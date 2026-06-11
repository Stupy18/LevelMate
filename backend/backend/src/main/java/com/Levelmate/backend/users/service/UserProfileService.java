package com.Levelmate.backend.users.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.auth.repository.UserRepository;
import com.Levelmate.backend.common.exception.UserNotFoundException;
import com.Levelmate.backend.users.dto.UpdateProfileRequest;
import com.Levelmate.backend.users.dto.UserProfileResponse;
import com.Levelmate.backend.users.entity.PerformancePb;
import com.Levelmate.backend.users.entity.SportMetric;
import com.Levelmate.backend.users.entity.UserSport;
import com.Levelmate.backend.users.repository.CoachProfileRepository;
import com.Levelmate.backend.users.repository.PerformancePbRepository;
import com.Levelmate.backend.users.repository.SportMetricRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final UserSportRepository userSportRepository;
    private final CoachProfileRepository coachProfileRepository;
    private final SportMetricRepository sportMetricRepository;
    private final PerformancePbRepository performancePbRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        List<UserSport> userSports = userSportRepository.findAllByUserId(userId);

        List<UUID> sportIds = userSports.stream().map(us -> us.getSport().getId()).toList();

        Map<UUID, List<SportMetric>> metricDefs = sportIds.isEmpty()
                ? Map.of()
                : sportMetricRepository.findAllBySportIdInOrderByDisplayOrderAsc(sportIds)
                        .stream()
                        .collect(Collectors.groupingBy(m -> m.getSport().getId()));

        Map<UUID, Map<String, PerformancePb>> metricValues = performancePbRepository
                .findAllByUserIdAndMetricKeyIsNotNull(userId)
                .stream()
                .collect(Collectors.groupingBy(
                        pb -> pb.getSport().getId(),
                        Collectors.toMap(PerformancePb::getMetricKey, pb -> pb, (a, b) -> a)
                ));

        List<UserProfileResponse.SportSummary> sports = userSports.stream()
                .map(us -> {
                    List<SportMetric> defs = metricDefs.getOrDefault(us.getSport().getId(), List.of());
                    Map<String, PerformancePb> vals = metricValues.getOrDefault(us.getSport().getId(), Map.of());

                    List<UserProfileResponse.SportMetricValue> metrics = defs.stream()
                            .map(def -> {
                                PerformancePb pb = vals.get(def.getMetricKey());
                                String value = null;
                                if (pb != null) {
                                    if (pb.getMetricValueText() != null) {
                                        value = pb.getMetricValueText();
                                    } else if (pb.getMetricValueNumber() != null) {
                                        value = pb.getMetricValueNumber().stripTrailingZeros().toPlainString();
                                    }
                                }
                                return new UserProfileResponse.SportMetricValue(
                                        def.getMetricKey(), def.getLabel(), def.getInputType(), def.getUnit(), value
                                );
                            })
                            .toList();

                    return UserProfileResponse.SportSummary.from(us, metrics);
                })
                .toList();

        List<UserProfileResponse.CoachProfileSummary> coachProfiles = coachProfileRepository.findAllByUserId(userId)
                .stream()
                .map(UserProfileResponse.CoachProfileSummary::from)
                .toList();

        return new UserProfileResponse(
                user.getId(),
                user.getFirstName() + " " + user.getLastName(),
                null,
                user.getAvatarData(),
                user.getRole(),
                sports,
                coachProfiles
        );
    }

    @Transactional
    public void savePushToken(UUID userId, String token) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        user.setPushToken(token);
        userRepository.save(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        if (req.displayName() != null && !req.displayName().isBlank()) {
            String name = req.displayName().trim();
            int idx = name.lastIndexOf(' ');
            if (idx > 0) {
                user.setFirstName(name.substring(0, idx));
                user.setLastName(name.substring(idx + 1));
            } else {
                user.setFirstName(name);
                user.setLastName("");
            }
        }

        user.setAvatarData(req.avatarData());
        userRepository.save(user);
        return getProfile(userId);
    }
}
