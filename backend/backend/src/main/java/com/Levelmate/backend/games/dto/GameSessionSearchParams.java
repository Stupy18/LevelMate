package com.Levelmate.backend.games.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record GameSessionSearchParams(
        List<UUID> sportIds,
        BigDecimal lat,
        BigDecimal lng,
        Double radiusKm,
        Integer minLevel,
        Integer maxLevel,
        int page,
        int size
) {}
