package com.Levelmate.backend.users.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.SportAlreadyAddedException;
import com.Levelmate.backend.common.exception.SportNotFoundException;
import com.Levelmate.backend.common.exception.UserSportNotFoundException;
import com.Levelmate.backend.users.dto.AddSportRequest;
import com.Levelmate.backend.users.dto.SportEntryResponse;
import com.Levelmate.backend.users.dto.UpdateSportRequest;
import com.Levelmate.backend.users.entity.Sport;
import com.Levelmate.backend.users.entity.UserSport;
import com.Levelmate.backend.users.repository.SportRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserSportProfileService {

    private final UserSportRepository userSportRepository;
    private final SportRepository sportRepository;

    @Transactional
    public SportEntryResponse addSport(UUID userId, AddSportRequest request) {
        checkOwnership(userId);

        if (userSportRepository.existsByUserIdAndSportId(userId, request.sportId())) {
            throw new SportAlreadyAddedException();
        }

        Sport sport = sportRepository.findById(request.sportId())
                .orElseThrow(SportNotFoundException::new);

        User user = currentUser();
        UserSport userSport = UserSport.builder()
                .user(user)
                .sport(sport)
                .eloRating(request.eloRating())
                .grade(request.grade())
                .level(request.level())
                .build();

        return SportEntryResponse.from(userSportRepository.save(userSport));
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

        userSport.setEloRating(request.eloRating());
        userSport.setGrade(request.grade());
        userSport.setLevel(request.level());
        return SportEntryResponse.from(userSportRepository.save(userSport));
    }

    @Transactional
    public void removeSport(UUID userId, UUID sportId) {
        checkOwnership(userId);
        UserSport userSport = userSportRepository.findByUserIdAndSportId(userId, sportId)
                .orElseThrow(UserSportNotFoundException::new);
        userSportRepository.delete(userSport);
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
