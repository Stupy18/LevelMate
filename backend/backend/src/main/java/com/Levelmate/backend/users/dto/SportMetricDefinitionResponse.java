package com.Levelmate.backend.users.dto;

import com.Levelmate.backend.users.entity.SportMetric;

import java.util.UUID;

public record SportMetricDefinitionResponse(
        UUID id,
        String metricKey,
        String label,
        String inputType,
        String unit,
        boolean isRequired,
        int displayOrder
) {
    public static SportMetricDefinitionResponse from(SportMetric m) {
        return new SportMetricDefinitionResponse(
                m.getId(),
                m.getMetricKey(),
                m.getLabel(),
                m.getInputType(),
                m.getUnit(),
                m.isRequired(),
                m.getDisplayOrder()
        );
    }
}
