package com.Levelmate.backend.users.dto;

import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.entity.Sport;

import java.util.UUID;

public record SportCatalogItemResponse(
        UUID id,
        String name,
        String slug,
        RatingType ratingType,
        String description
) {
    public static SportCatalogItemResponse from(Sport sport) {
        return new SportCatalogItemResponse(
                sport.getId(),
                sport.getName(),
                sport.getSlug(),
                sport.getRatingType(),
                sport.getDescription()
        );
    }
}
