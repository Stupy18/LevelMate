package com.Levelmate.backend.games.controller;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.dto.UpdateSessionStatusRequest;
import com.Levelmate.backend.games.service.GameSessionStatusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/game-sessions")
@RequiredArgsConstructor
public class GameSessionStatusController {

    private final GameSessionStatusService gameSessionStatusService;

    @PatchMapping("/{sessionId}/status")
    public ResponseEntity<GameSessionResponse> updateStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @Valid @RequestBody UpdateSessionStatusRequest request) {
        return ResponseEntity.ok(
                gameSessionStatusService.updateStatus(sessionId, user.getId(), request.status()));
    }
}
