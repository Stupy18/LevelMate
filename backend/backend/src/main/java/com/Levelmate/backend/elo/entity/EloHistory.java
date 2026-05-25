package com.Levelmate.backend.elo.entity;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.users.entity.Sport;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "elo_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EloHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @Column(name = "elo_before", nullable = false)
    private double eloBefore;

    @Column(name = "elo_delta", nullable = false)
    private double eloDelta;

    @Column(name = "elo_after", nullable = false)
    private double eloAfter;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    @PrePersist
    void prePersist() {
        if (recordedAt == null) recordedAt = Instant.now();
    }
}
