package com.Levelmate.backend.elo.dto;

import com.Levelmate.backend.users.entity.UserSport;

import java.util.UUID;

public record LeaderboardEntryResponse(
        UUID userId,
        String displayName,
        int elo,
        int gamesPlayed
) {
    public static LeaderboardEntryResponse from(UserSport us) {
        var user = us.getUser();
        return new LeaderboardEntryResponse(
                user.getId(),
                user.getFirstName() + " " + user.getLastName(),
                us.getEloRating() != null ? us.getEloRating() : 1000,
                us.getGamesPlayed()
        );
    }
}
