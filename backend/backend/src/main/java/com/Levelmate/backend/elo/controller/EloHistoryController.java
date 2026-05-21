package com.Levelmate.backend.elo.controller;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.elo.dto.EloHistoryPageResponse;
import com.Levelmate.backend.elo.service.EloQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class EloHistoryController {

    private final EloQueryService eloQueryService;

    @GetMapping("/{userId}/sports/{sportId}/elo-history")
    public ResponseEntity<EloHistoryPageResponse> getEloHistory(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId,
            @PathVariable UUID sportId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                eloQueryService.getHistory(user.getId(), userId, sportId, page, size));
    }
}
