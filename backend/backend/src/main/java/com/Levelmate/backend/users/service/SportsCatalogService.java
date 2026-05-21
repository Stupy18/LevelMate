package com.Levelmate.backend.users.service;

import com.Levelmate.backend.users.dto.SportCatalogItemResponse;
import com.Levelmate.backend.users.repository.SportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SportsCatalogService {

    private final SportRepository sportRepository;

    @Transactional(readOnly = true)
    public List<SportCatalogItemResponse> findAll() {
        return sportRepository.findAll().stream()
                .map(SportCatalogItemResponse::from)
                .toList();
    }
}
