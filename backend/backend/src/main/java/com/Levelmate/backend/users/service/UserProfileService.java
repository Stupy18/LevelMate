package com.Levelmate.backend.users.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.auth.repository.UserRepository;
import com.Levelmate.backend.common.exception.UserNotFoundException;
import com.Levelmate.backend.users.dto.UserProfileResponse;
import com.Levelmate.backend.users.repository.CoachProfileRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final UserSportRepository userSportRepository;
    private final CoachProfileRepository coachProfileRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);

        List<UserProfileResponse.SportSummary> sports = userSportRepository.findAllByUserId(userId)
                .stream()
                .map(UserProfileResponse.SportSummary::from)
                .toList();

        List<UserProfileResponse.CoachProfileSummary> coachProfiles = coachProfileRepository.findAllByUserId(userId)
                .stream()
                .map(UserProfileResponse.CoachProfileSummary::from)
                .toList();

        return new UserProfileResponse(
                user.getId(),
                user.getFirstName() + " " + user.getLastName(),
                null,
                sports,
                coachProfiles
        );
    }
}
