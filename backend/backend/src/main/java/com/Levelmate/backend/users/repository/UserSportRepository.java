package com.Levelmate.backend.users.repository;

import com.Levelmate.backend.users.entity.UserSport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSportRepository extends JpaRepository<UserSport, UUID> {

    List<UserSport> findAllByUserId(UUID userId);

    Optional<UserSport> findByUserIdAndSportId(UUID userId, UUID sportId);

    boolean existsByUserIdAndSportId(UUID userId, UUID sportId);

    @Query("""
        SELECT us FROM UserSport us
        JOIN FETCH us.user
        WHERE us.sport.id = :sportId
          AND us.eloRating IS NOT NULL
        ORDER BY us.eloRating DESC
        """)
    List<UserSport> findLeaderboard(@Param("sportId") UUID sportId, Pageable pageable);
}
