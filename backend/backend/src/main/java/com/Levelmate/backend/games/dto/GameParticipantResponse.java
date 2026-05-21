package com.Levelmate.backend.games.dto;

import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.ParticipantRole;
import com.Levelmate.backend.games.entity.TeamSide;

import java.time.Instant;
import java.util.UUID;

public record GameParticipantResponse(
        UUID participantId,
        UUID userId,
        ParticipantRole role,
        TeamSide team,
        Instant joinedAt
) {
    public static GameParticipantResponse from(GameParticipant p) {
        return new GameParticipantResponse(
                p.getId(),
                p.getUser().getId(),
                p.getRole(),
                p.getTeam(),
                p.getJoinedAt()
        );
    }
}
