package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {

    Page<GameSession> findAllByStatusAndSportId(SessionStatus status, UUID sportId, Pageable pageable);

    Page<GameSession> findAllByStatus(SessionStatus status, Pageable pageable);

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
            @Param("minLat") java.math.BigDecimal minLat,
            @Param("maxLat") java.math.BigDecimal maxLat,
            @Param("minLng") java.math.BigDecimal minLng,
            @Param("maxLng") java.math.BigDecimal maxLng,
            @Param("minLevel") Integer minLevel,
            @Param("maxLevel") Integer maxLevel,
            Pageable pageable);
}
