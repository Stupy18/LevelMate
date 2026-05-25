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
@Table(name = "result_votes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "result_id", nullable = false)
    private GameResult result;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VoteType vote;

    @Column(name = "voted_at", nullable = false, updatable = false)
    private Instant votedAt;

    @PrePersist
    void prePersist() {
        if (votedAt == null) votedAt = Instant.now();
    }
}
