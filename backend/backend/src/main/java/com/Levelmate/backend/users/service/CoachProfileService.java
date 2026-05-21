package com.Levelmate.backend.users.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.CoachProfileAlreadyExistsException;
import com.Levelmate.backend.common.exception.CoachProfileNotFoundException;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.SportNotInProfileException;
import com.Levelmate.backend.users.dto.CoachProfileResponse;
import com.Levelmate.backend.users.dto.CreateCoachProfileRequest;
import com.Levelmate.backend.users.dto.UpdateCoachProfileRequest;
import com.Levelmate.backend.users.entity.CoachProfile;
import com.Levelmate.backend.users.entity.Sport;
import com.Levelmate.backend.users.repository.CoachProfileRepository;
import com.Levelmate.backend.users.repository.SportRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachProfileService {

    private final CoachProfileRepository coachProfileRepository;
    private final UserSportRepository userSportRepository;
    private final SportRepository sportRepository;

    @Transactional
    public CoachProfileResponse createProfile(UUID userId, UUID sportId, CreateCoachProfileRequest request) {
        checkOwnership(userId);

        if (!userSportRepository.existsByUserIdAndSportId(userId, sportId)) {
            throw new SportNotInProfileException();
        }
        if (coachProfileRepository.existsByUserIdAndSportId(userId, sportId)) {
            throw new CoachProfileAlreadyExistsException();
        }

        Sport sport = sportRepository.getReferenceById(sportId);
        User user = currentUser();

        CoachProfile profile = CoachProfile.builder()
                .user(user)
                .sport(sport)
                .description(request.description())
                .hourlyRateCents(request.hourlyRateCents())
                .isVerified(false)
                .build();

        return CoachProfileResponse.from(coachProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public CoachProfileResponse getProfile(UUID userId, UUID sportId) {
        checkOwnership(userId);
        CoachProfile profile = coachProfileRepository.findByUserIdAndSportId(userId, sportId)
                .orElseThrow(CoachProfileNotFoundException::new);
        return CoachProfileResponse.from(profile);
    }

    @Transactional
    public CoachProfileResponse updateProfile(UUID userId, UUID sportId, UpdateCoachProfileRequest request) {
        checkOwnership(userId);
        CoachProfile profile = coachProfileRepository.findByUserIdAndSportId(userId, sportId)
                .orElseThrow(CoachProfileNotFoundException::new);

        profile.setDescription(request.description());
        profile.setHourlyRateCents(request.hourlyRateCents());
        return CoachProfileResponse.from(coachProfileRepository.save(profile));
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
