package com.Levelmate.backend.games.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record GameSessionSearchParams(
        UUID sportId,
        BigDecimal lat,
        BigDecimal lng,
        Double radiusKm,
        Integer minLevel,
        Integer maxLevel,
        int page,
        int size
) {}
