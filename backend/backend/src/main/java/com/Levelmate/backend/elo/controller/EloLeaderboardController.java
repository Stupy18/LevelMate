package com.Levelmate.backend.elo.controller;

import com.Levelmate.backend.elo.dto.LeaderboardEntryResponse;
import com.Levelmate.backend.elo.service.EloQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sports")
@RequiredArgsConstructor
public class EloLeaderboardController {

    private final EloQueryService eloQueryService;

    @GetMapping("/{sportId}/leaderboard")
    public ResponseEntity<List<LeaderboardEntryResponse>> getLeaderboard(@PathVariable UUID sportId) {
        return ResponseEntity.ok(eloQueryService.getLeaderboard(sportId));
    }
}
