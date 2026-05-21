package com.Levelmate.backend.users.dto;

import com.Levelmate.backend.users.entity.CoachProfile;
import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.entity.UserSport;

import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
        UUID userId,
        String displayName,
        String avatarUrl,
        List<SportSummary> sports,
        List<CoachProfileSummary> coachProfiles
) {
    public record SportSummary(
            UUID sportId,
            String sportName,
            RatingType ratingType,
            Integer eloRating,
            int gamesPlayed,
            String grade,
            Integer level
    ) {
        public static SportSummary from(UserSport us) {
            return new SportSummary(
                    us.getSport().getId(),
                    us.getSport().getName(),
                    us.getSport().getRatingType(),
                    us.getEloRating(),
                    us.getGamesPlayed(),
                    us.getGrade(),
                    us.getLevel()
            );
        }
    }

    public record CoachProfileSummary(
            UUID coachProfileId,
            UUID sportId,
            String sportName,
            String description,
            Integer hourlyRateCents,
            boolean isVerified
    ) {
        public static CoachProfileSummary from(CoachProfile cp) {
            return new CoachProfileSummary(
                    cp.getId(),
                    cp.getSport().getId(),
                    cp.getSport().getName(),
                    cp.getDescription(),
                    cp.getHourlyRateCents(),
                    cp.isVerified()
            );
        }
    }
}
