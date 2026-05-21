package com.Levelmate.backend.users.controller;

import com.Levelmate.backend.users.dto.SportCatalogItemResponse;
import com.Levelmate.backend.users.service.SportsCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sports")
@RequiredArgsConstructor
public class SportsCatalogController {

    private final SportsCatalogService sportsCatalogService;

    @GetMapping
    public ResponseEntity<List<SportCatalogItemResponse>> getSports() {
        return ResponseEntity.ok(sportsCatalogService.findAll());
    }
}
