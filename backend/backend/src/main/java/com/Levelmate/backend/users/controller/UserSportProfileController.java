package com.Levelmate.backend.users.controller;

import com.Levelmate.backend.users.dto.AddSportRequest;
import com.Levelmate.backend.users.dto.SportEntryResponse;
import com.Levelmate.backend.users.dto.UpdateSportRequest;
import com.Levelmate.backend.users.service.UserSportProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/{userId}/sports")
@RequiredArgsConstructor
public class UserSportProfileController {

    private final UserSportProfileService userSportProfileService;

    @PostMapping
    public ResponseEntity<SportEntryResponse> addSport(
            @PathVariable UUID userId,
            @Valid @RequestBody AddSportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userSportProfileService.addSport(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<SportEntryResponse>> getSports(@PathVariable UUID userId) {
        return ResponseEntity.ok(userSportProfileService.getSports(userId));
    }

    @PutMapping("/{sportId}")
    public ResponseEntity<SportEntryResponse> updateSport(
            @PathVariable UUID userId,
            @PathVariable UUID sportId,
            @Valid @RequestBody UpdateSportRequest request) {
        return ResponseEntity.ok(userSportProfileService.updateSport(userId, sportId, request));
    }

    @DeleteMapping("/{sportId}")
    public ResponseEntity<Void> removeSport(
            @PathVariable UUID userId,
            @PathVariable UUID sportId) {
        userSportProfileService.removeSport(userId, sportId);
        return ResponseEntity.noContent().build();
    }
}
