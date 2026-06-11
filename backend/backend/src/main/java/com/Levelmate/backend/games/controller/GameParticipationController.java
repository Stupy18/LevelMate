package com.Levelmate.backend.games.controller;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.games.dto.AssignTeamRequest;
import com.Levelmate.backend.games.dto.CanRebalanceResponse;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.service.GameParticipationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/game-sessions")
@RequiredArgsConstructor
public class GameParticipationController {

    private final GameParticipationService gameParticipationService;

    @PostMapping("/{sessionId}/join")
    public ResponseEntity<GameSessionResponse> joinSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(gameParticipationService.joinSession(sessionId, user.getId()));
    }

    @PostMapping("/{sessionId}/leave")
    public ResponseEntity<Void> leaveSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        gameParticipationService.leaveSession(sessionId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{sessionId}/participants/{participantUserId}/team")
    public ResponseEntity<Void> assignTeam(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @PathVariable UUID participantUserId,
            @RequestBody AssignTeamRequest request) {
        gameParticipationService.assignTeam(sessionId, user.getId(), participantUserId, request.team());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{sessionId}/can-rebalance")
    public ResponseEntity<CanRebalanceResponse> canRebalance(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(gameParticipationService.canRebalance(sessionId, user.getId()));
    }

    @PostMapping("/{sessionId}/pb-submitted")
    public ResponseEntity<Void> markPbSubmitted(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        gameParticipationService.markPbSubmitted(sessionId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{sessionId}/acknowledge")
    public ResponseEntity<Void> acknowledge(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        gameParticipationService.markSessionAcknowledged(sessionId, user.getId());
        return ResponseEntity.noContent().build();
    }
}
