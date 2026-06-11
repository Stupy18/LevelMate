package com.Levelmate.backend.admin.controller;

import com.Levelmate.backend.admin.dto.AdminDisputeResponse;
import com.Levelmate.backend.admin.dto.ResolveDisputeRequest;
import com.Levelmate.backend.admin.service.AdminService;
import com.Levelmate.backend.games.dto.GameResultResponse;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/disputes")
    public ResponseEntity<List<AdminDisputeResponse>> getDisputes() {
        return ResponseEntity.ok(adminService.getDisputes());
    }

    @PostMapping("/disputes/{sessionId}/resolve")
    public ResponseEntity<GameResultResponse> resolveDispute(
            @PathVariable UUID sessionId,
            @RequestBody ResolveDisputeRequest request) {
        return ResponseEntity.ok(adminService.resolveDispute(sessionId, request));
    }

    @GetMapping("/sessions")
    public ResponseEntity<Page<GameSessionResponse>> getAllSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllSessions(page, size));
    }
}
