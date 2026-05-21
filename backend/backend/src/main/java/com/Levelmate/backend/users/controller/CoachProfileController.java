package com.Levelmate.backend.users.controller;

import com.Levelmate.backend.users.dto.CoachProfileResponse;
import com.Levelmate.backend.users.dto.CreateCoachProfileRequest;
import com.Levelmate.backend.users.dto.UpdateCoachProfileRequest;
import com.Levelmate.backend.users.service.CoachProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/{userId}/sports/{sportId}/coach-profile")
@RequiredArgsConstructor
public class CoachProfileController {

    private final CoachProfileService coachProfileService;

    @PostMapping
    public ResponseEntity<CoachProfileResponse> createProfile(
            @PathVariable UUID userId,
            @PathVariable UUID sportId,
            @Valid @RequestBody CreateCoachProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(coachProfileService.createProfile(userId, sportId, request));
    }

    @GetMapping
    public ResponseEntity<CoachProfileResponse> getProfile(
            @PathVariable UUID userId,
            @PathVariable UUID sportId) {
        return ResponseEntity.ok(coachProfileService.getProfile(userId, sportId));
    }

    @PutMapping
    public ResponseEntity<CoachProfileResponse> updateProfile(
            @PathVariable UUID userId,
            @PathVariable UUID sportId,
            @Valid @RequestBody UpdateCoachProfileRequest request) {
        return ResponseEntity.ok(coachProfileService.updateProfile(userId, sportId, request));
    }
}
