package com.Levelmate.backend.games.controller;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.games.dto.GameResultResponse;
import com.Levelmate.backend.games.dto.ReportResultRequest;
import com.Levelmate.backend.games.service.GameResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/game-sessions")
@RequiredArgsConstructor
public class GameResultController {

    private final GameResultService gameResultService;

    @PostMapping("/{sessionId}/result")
    public ResponseEntity<GameResultResponse> reportResult(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @Valid @RequestBody ReportResultRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gameResultService.reportResult(sessionId, user.getId(), request));
    }

    @GetMapping("/{sessionId}/result")
    public ResponseEntity<GameResultResponse> getResult(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(gameResultService.getResult(sessionId));
    }

    @PostMapping("/{sessionId}/result/confirm")
    public ResponseEntity<GameResultResponse> confirmResult(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(gameResultService.confirmResult(sessionId, user.getId()));
    }

    @PostMapping("/{sessionId}/result/dispute")
    public ResponseEntity<GameResultResponse> disputeResult(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(gameResultService.disputeResult(sessionId, user.getId()));
    }
}
