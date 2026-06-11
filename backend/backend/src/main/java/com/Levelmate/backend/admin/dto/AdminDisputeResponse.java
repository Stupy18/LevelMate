package com.Levelmate.backend.admin.dto;

import java.util.List;
import java.util.UUID;

public record AdminDisputeResponse(
        UUID sessionId,
        String sportName,
        String scheduledAt,
        String locationName,
        // Original report (Player A)
        String reportedByDisplayName,
        String winnerTeam,
        Integer scoreTeamA,
        Integer scoreTeamB,
        // Counter report (Player B) — null if dispute was escalated without a counter
        String counterReportedByDisplayName,
        String counterWinnerTeam,
        Integer counterScoreTeamA,
        Integer counterScoreTeamB,
        List<ParticipantInfo> participants
) {
    public record ParticipantInfo(UUID userId, String displayName, String team) {}
}
