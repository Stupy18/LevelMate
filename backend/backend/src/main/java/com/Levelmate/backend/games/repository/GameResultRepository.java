package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.GameResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GameResultRepository extends JpaRepository<GameResult, UUID> {

    Optional<GameResult> findBySessionId(UUID sessionId);
}
