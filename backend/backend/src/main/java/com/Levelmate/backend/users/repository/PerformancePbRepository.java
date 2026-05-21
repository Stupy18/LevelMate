package com.Levelmate.backend.users.repository;

import com.Levelmate.backend.users.entity.PerformancePb;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PerformancePbRepository extends JpaRepository<PerformancePb, UUID> {

    List<PerformancePb> findAllByUserIdAndSportIdOrderByDistanceMetersAsc(UUID userId, UUID sportId);

    Optional<PerformancePb> findByUserIdAndSportIdAndDistanceMeters(UUID userId, UUID sportId, int distanceMeters);
}
