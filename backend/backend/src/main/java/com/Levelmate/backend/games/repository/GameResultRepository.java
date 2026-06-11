package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.GameResult;
import com.Levelmate.backend.games.entity.ResultStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameResultRepository extends JpaRepository<GameResult, UUID> {

    Optional<GameResult> findBySessionId(UUID sessionId);

    boolean existsBySessionId(UUID sessionId);

    List<GameResult> findAllByStatusOrderByReportedAtDesc(ResultStatus status);

    @Query("SELECT r FROM GameResult r WHERE r.status = com.Levelmate.backend.games.entity.ResultStatus.DISPUTED AND r.autoResolved = false AND r.disputedAt < :threshold")
    List<GameResult> findUnresolvedDisputesOlderThan(@Param("threshold") Instant threshold);
}
