package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.users.entity.RatingType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {

    Page<GameSession> findAllByStatusAndSportId(SessionStatus status, UUID sportId, Pageable pageable);

    Page<GameSession> findAllByStatus(SessionStatus status, Pageable pageable);

    Page<GameSession> findAllByOrderByScheduledAtDesc(Pageable pageable);

    @Query("""
            SELECT s FROM GameSession s
            WHERE s.id IN (
                SELECT p.session.id FROM GameParticipant p WHERE p.user.id = :userId
            )
            ORDER BY s.scheduledAt DESC
            """)
    Page<GameSession> findAllByParticipantUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
            SELECT s FROM GameSession s
            JOIN FETCH s.sport
            WHERE s.id IN (
                SELECT p.session.id FROM GameParticipant p WHERE p.user.id = :userId
            )
            AND s.status IN :statuses
            """)
    List<GameSession> findActiveSessionsForUser(
            @Param("userId") UUID userId,
            @Param("statuses") Collection<SessionStatus> statuses);

    @Modifying
    @Query(value = """
            UPDATE game_sessions
               SET status     = CASE
                                   WHEN (SELECT COUNT(*) FROM game_participants WHERE session_id = game_sessions.id) >= game_sessions.min_players
                                   THEN 'IN_PROGRESS'
                                   ELSE 'CANCELLED'
                                END,
                   updated_at = NOW()
             WHERE status IN ('OPEN', 'FULL')
               AND scheduled_at <= :now
            """, nativeQuery = true)
    int bulkTransitionStarted(@Param("now") Instant now);

    @Modifying
    @Query(value = """
            UPDATE game_sessions
               SET status = 'COMPLETED', updated_at = NOW()
             WHERE status = 'IN_PROGRESS'
               AND (scheduled_at + COALESCE(duration_minutes, 60) * INTERVAL '1 minute') <= :now
            """, nativeQuery = true)
    int bulkTransitionToCompleted(@Param("now") Instant now);

    @Modifying
    @Query(value = """
            UPDATE game_sessions
               SET cancellation_reason_insufficient_players = TRUE
             WHERE status = 'CANCELLED'
               AND cancellation_reason_insufficient_players = FALSE
               AND scheduled_at <= :now
               AND (SELECT COUNT(*) FROM game_participants WHERE session_id = game_sessions.id) < min_players
            """, nativeQuery = true)
    int bulkMarkInsufficientPlayersCancellations(@Param("now") Instant now);

    @Query("""
            SELECT s FROM GameSession s
            JOIN FETCH s.sport
            WHERE s.status = 'CANCELLED'
            AND s.cancellationReasonInsufficientPlayers = true
            AND s.updatedAt >= :since
            AND s.scheduledAt <= :now
            """)
    List<GameSession> findRecentlyAutoCancelled(
            @Param("since") Instant since,
            @Param("now") Instant now);

    @Query("""
            SELECT s FROM GameSession s
            JOIN FETCH s.sport
            WHERE s.status = 'CANCELLED'
            AND s.cancellationReasonInsufficientPlayers = true
            AND EXISTS (SELECT p FROM GameParticipant p WHERE p.session = s AND p.user.id = :userId AND p.sessionAcknowledged = false)
            """)
    List<GameSession> findCancelledAutoSessionsPendingForUser(@Param("userId") UUID userId);

    @Query("""
            SELECT s FROM GameSession s
            JOIN FETCH s.sport
            WHERE s.id IN (SELECT p.session.id FROM GameParticipant p WHERE p.user.id = :userId)
            AND s.status = :status
            AND s.sport.ratingType = :ratingType
            """)
    List<GameSession> findCompletedEloSessionsForUser(
            @Param("userId") UUID userId,
            @Param("status") SessionStatus status,
            @Param("ratingType") RatingType ratingType);

    @Query("""
            SELECT s FROM GameSession s
            JOIN FETCH s.sport
            WHERE s.status = :status
            AND s.sport.ratingType = :ratingType
            AND EXISTS (SELECT p FROM GameParticipant p WHERE p.session = s AND p.user.id = :userId AND p.pbUpdateSubmitted = false)
            """)
    List<GameSession> findCompletedPerfSessionsPendingForUser(
            @Param("userId") UUID userId,
            @Param("status") SessionStatus status,
            @Param("ratingType") RatingType ratingType);

    @Query("""
            SELECT s FROM GameSession s
            JOIN FETCH s.sport
            WHERE s.status = :status
            AND s.sport.ratingType = :ratingType
            AND EXISTS (SELECT p FROM GameParticipant p WHERE p.session = s AND p.user.id = :userId AND p.sessionAcknowledged = false)
            """)
    List<GameSession> findCompletedGradeSessionsPendingForUser(
            @Param("userId") UUID userId,
            @Param("status") SessionStatus status,
            @Param("ratingType") RatingType ratingType);

    @Query("""
            SELECT s FROM GameSession s
            WHERE s.status = 'OPEN'
              AND (:sportId IS NULL OR s.sport.id = :sportId)
              AND (:minLat IS NULL OR s.locationLat >= :minLat)
              AND (:maxLat IS NULL OR s.locationLat <= :maxLat)
              AND (:minLng IS NULL OR s.locationLng >= :minLng)
              AND (:maxLng IS NULL OR s.locationLng <= :maxLng)
              AND (:minLevel IS NULL OR s.minLevel IS NULL OR s.minLevel >= :minLevel)
              AND (:maxLevel IS NULL OR s.maxLevel IS NULL OR s.maxLevel <= :maxLevel)
            ORDER BY s.scheduledAt ASC
            """)
    Page<GameSession> searchOpen(
            @Param("sportId") UUID sportId,
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("minLevel") Integer minLevel,
            @Param("maxLevel") Integer maxLevel,
            Pageable pageable);

    @Query("""
            SELECT s FROM GameSession s
            WHERE s.status = 'OPEN'
              AND s.sport.id IN :sportIds
              AND (:minLat IS NULL OR s.locationLat >= :minLat)
              AND (:maxLat IS NULL OR s.locationLat <= :maxLat)
              AND (:minLng IS NULL OR s.locationLng >= :minLng)
              AND (:maxLng IS NULL OR s.locationLng <= :maxLng)
              AND (:minLevel IS NULL OR s.minLevel IS NULL OR s.minLevel >= :minLevel)
              AND (:maxLevel IS NULL OR s.maxLevel IS NULL OR s.maxLevel <= :maxLevel)
            ORDER BY s.scheduledAt ASC
            """)
    Page<GameSession> searchOpenBySports(
            @Param("sportIds") List<UUID> sportIds,
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("minLevel") Integer minLevel,
            @Param("maxLevel") Integer maxLevel,
            Pageable pageable);
}
