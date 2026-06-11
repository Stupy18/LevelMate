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
        String avatarData,
        String role,
        List<SportSummary> sports,
        List<CoachProfileSummary> coachProfiles
) {
    public record SportSummary(
            UUID sportId,
            String sportName,
            String sportSlug,
            RatingType ratingType,
            Double eloRating,
            int gamesPlayed,
            String grade,
            Integer level,
            List<SportMetricValue> metrics
    ) {
        public static SportSummary from(UserSport us, List<SportMetricValue> metrics) {
            return new SportSummary(
                    us.getSport().getId(),
                    us.getSport().getName(),
                    us.getSport().getSlug(),
                    us.getSport().getRatingType(),
                    us.getEloRating(),
                    us.getGamesPlayed(),
                    us.getGrade(),
                    us.getLevel(),
                    metrics
            );
        }
    }

    public record SportMetricValue(
            String metricKey,
            String label,
            String inputType,
            String unit,
            String value
    ) {}

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
