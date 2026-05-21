package com.Levelmate.backend.users.controller;

import com.Levelmate.backend.users.dto.PbResponse;
import com.Levelmate.backend.users.dto.PbResult;
import com.Levelmate.backend.users.dto.RecordPbRequest;
import com.Levelmate.backend.users.service.PerformancePbService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/{userId}/sports/{sportId}/pbs")
@RequiredArgsConstructor
public class PerformancePbController {

    private final PerformancePbService performancePbService;

    @PostMapping
    public ResponseEntity<PbResponse> recordPb(
            @PathVariable UUID userId,
            @PathVariable UUID sportId,
            @Valid @RequestBody RecordPbRequest request) {
        PbResult result = performancePbService.recordPb(userId, sportId, request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.response());
    }

    @GetMapping
    public ResponseEntity<List<PbResponse>> getPbs(
            @PathVariable UUID userId,
            @PathVariable UUID sportId) {
        return ResponseEntity.ok(performancePbService.getPbs(userId, sportId));
    }
}
