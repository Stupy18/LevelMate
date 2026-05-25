package com.Levelmate.backend.users.controller;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.dto.PendingResultResponse;
import com.Levelmate.backend.games.service.GameSessionService;
import com.Levelmate.backend.users.dto.UpdateProfileRequest;
import com.Levelmate.backend.users.dto.UserProfileResponse;
import com.Levelmate.backend.users.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final GameSessionService gameSessionService;

    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(userProfileService.getProfile(userId));
    }

    @GetMapping("/me/active-sessions")
    public ResponseEntity<List<GameSessionResponse>> getMyActiveSessions(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gameSessionService.getActiveSessionsForUser(user.getId()));
    }

    @GetMapping("/me/pending-results")
    public ResponseEntity<List<PendingResultResponse>> getMyPendingResults(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gameSessionService.getPendingResults(user.getId()));
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userProfileService.updateProfile(user.getId(), req));
    }
}
