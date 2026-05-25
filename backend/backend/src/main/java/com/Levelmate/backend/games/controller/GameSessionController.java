package com.Levelmate.backend.games.controller;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.games.dto.CreateGameSessionRequest;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.dto.GameSessionSearchParams;
import com.Levelmate.backend.games.service.GameSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/game-sessions")
@RequiredArgsConstructor
public class GameSessionController {

    private final GameSessionService gameSessionService;

    @PostMapping
    public ResponseEntity<GameSessionResponse> createSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateGameSessionRequest request) {
        GameSessionResponse response = gameSessionService.createSession(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<GameSessionResponse>> searchSessions(
            @RequestParam(required = false) List<UUID> sportIds,
            @RequestParam(required = false) BigDecimal lat,
            @RequestParam(required = false) BigDecimal lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) Integer minLevel,
            @RequestParam(required = false) Integer maxLevel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        GameSessionSearchParams params = new GameSessionSearchParams(
                sportIds, lat, lng, radiusKm, minLevel, maxLevel, page, size);
        return ResponseEntity.ok(gameSessionService.searchSessions(params));
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<GameSessionResponse> getSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(gameSessionService.getSession(sessionId));
    }

    @GetMapping("/by-participant/{userId}")
    public ResponseEntity<Page<GameSessionResponse>> getSessionsByParticipant(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(gameSessionService.getSessionsByParticipant(userId, page, size));
    }
}
