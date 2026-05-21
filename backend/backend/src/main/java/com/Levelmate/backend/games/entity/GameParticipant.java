package com.Levelmate.backend.games.entity;

import com.Levelmate.backend.auth.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "game_participants")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ParticipantRole role;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TeamSide team;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @PrePersist
    void prePersist() {
        if (joinedAt == null) joinedAt = Instant.now();
    }
}
