package com.Levelmate.backend.users.controller;

import com.Levelmate.backend.users.dto.UserProfileResponse;
import com.Levelmate.backend.users.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(userProfileService.getProfile(userId));
    }
}
