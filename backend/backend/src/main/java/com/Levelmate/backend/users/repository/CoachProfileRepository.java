package com.Levelmate.backend.users.repository;

import com.Levelmate.backend.users.entity.CoachProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoachProfileRepository extends JpaRepository<CoachProfile, UUID> {

    Optional<CoachProfile> findByUserIdAndSportId(UUID userId, UUID sportId);

    boolean existsByUserIdAndSportId(UUID userId, UUID sportId);

    List<CoachProfile> findAllByUserId(UUID userId);
}
