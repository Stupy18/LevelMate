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
@Table(name = "game_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private GameSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_by_user_id", nullable = false)
    private User reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by_user_id")
    private User confirmedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "winner_team", length = 10)
    private WinnerTeam winnerTeam;

    @Column(name = "score_team_a")
    private Integer scoreTeamA;

    @Column(name = "score_team_b")
    private Integer scoreTeamB;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counter_reported_by_user_id")
    private User counterReportedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "counter_winner_team", length = 10)
    private WinnerTeam counterWinnerTeam;

    @Column(name = "counter_score_team_a")
    private Integer counterScoreTeamA;

    @Column(name = "counter_score_team_b")
    private Integer counterScoreTeamB;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResultStatus status;

    @Column(name = "reported_at", nullable = false, updatable = false)
    private Instant reportedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "disputed_at")
    private Instant disputedAt;

    @Column(name = "auto_resolved", nullable = false)
    @Builder.Default
    private boolean autoResolved = false;

    @PrePersist
    void prePersist() {
        if (reportedAt == null) reportedAt = Instant.now();
    }
}
