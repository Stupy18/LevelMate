package com.Levelmate.backend.users.service;

import com.Levelmate.backend.common.exception.SportNotFoundException;
import com.Levelmate.backend.users.dto.SportCatalogItemResponse;
import com.Levelmate.backend.users.dto.SportMetricDefinitionResponse;
import com.Levelmate.backend.users.repository.SportMetricRepository;
import com.Levelmate.backend.users.repository.SportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SportsCatalogService {

    private final SportRepository sportRepository;
    private final SportMetricRepository sportMetricRepository;

    @Transactional(readOnly = true)
    public List<SportCatalogItemResponse> findAll() {
        return sportRepository.findAll().stream()
                .map(SportCatalogItemResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SportMetricDefinitionResponse> getMetrics(UUID sportId) {
        if (!sportRepository.existsById(sportId)) {
            throw new SportNotFoundException();
        }
        return sportMetricRepository.findAllBySportIdOrderByDisplayOrderAsc(sportId)
                .stream()
                .map(SportMetricDefinitionResponse::from)
                .toList();
    }
}
