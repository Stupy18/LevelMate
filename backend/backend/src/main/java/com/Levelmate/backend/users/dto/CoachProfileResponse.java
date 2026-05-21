package com.Levelmate.backend.users.dto;

import com.Levelmate.backend.users.entity.CoachProfile;

import java.util.UUID;

public record CoachProfileResponse(
        UUID coachProfileId,
        UUID sportId,
        String sportName,
        String description,
        Integer hourlyRateCents,
        boolean isVerified
) {
    public static CoachProfileResponse from(CoachProfile cp) {
        return new CoachProfileResponse(
                cp.getId(),
                cp.getSport().getId(),
                cp.getSport().getName(),
                cp.getDescription(),
                cp.getHourlyRateCents(),
                cp.isVerified()
        );
    }
}
