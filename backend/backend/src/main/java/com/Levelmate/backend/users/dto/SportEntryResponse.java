package com.Levelmate.backend.users.dto;

import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.entity.UserSport;

import java.util.UUID;

public record SportEntryResponse(
        UUID userSportId,
        UUID sportId,
        String sportName,
        RatingType ratingType,
        Integer eloRating,
        String grade,
        Integer level
) {
    public static SportEntryResponse from(UserSport us) {
        return new SportEntryResponse(
                us.getId(),
                us.getSport().getId(),
                us.getSport().getName(),
                us.getSport().getRatingType(),
                us.getEloRating(),
                us.getGrade(),
                us.getLevel()
        );
    }
}
