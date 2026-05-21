package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.GameParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameParticipantRepository extends JpaRepository<GameParticipant, UUID> {

    List<GameParticipant> findAllBySessionId(UUID sessionId);

    Optional<GameParticipant> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    boolean existsBySessionIdAndUserId(UUID sessionId, UUID userId);

    long countBySessionId(UUID sessionId);

    void deleteBySessionIdAndUserId(UUID sessionId, UUID userId);
}
