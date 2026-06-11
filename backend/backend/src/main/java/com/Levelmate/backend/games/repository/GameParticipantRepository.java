package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.entity.TeamSide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameParticipantRepository extends JpaRepository<GameParticipant, UUID> {

    List<GameParticipant> findAllBySessionId(UUID sessionId);

    Optional<GameParticipant> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    boolean existsBySessionIdAndUserId(UUID sessionId, UUID userId);

    long countBySessionId(UUID sessionId);

    void deleteBySessionIdAndUserId(UUID sessionId, UUID userId);

    Optional<GameParticipant> findFirstBySessionIdAndTeamOrderByJoinedAtAsc(UUID sessionId, TeamSide team);

    @Query("SELECT gp FROM GameParticipant gp JOIN FETCH gp.session s WHERE gp.user.id = :userId AND s.sport.id = :sportId AND s.status IN :statuses")
    List<GameParticipant> findActiveByUserAndSport(@Param("userId") UUID userId, @Param("sportId") UUID sportId, @Param("statuses") Collection<SessionStatus> statuses);
}
