package com.Levelmate.backend.elo.repository;

import com.Levelmate.backend.elo.entity.EloHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EloHistoryRepository extends JpaRepository<EloHistory, UUID> {

    Page<EloHistory> findAllByUserIdAndSportIdOrderByRecordedAtDesc(UUID userId, UUID sportId, Pageable pageable);

    long countByUserIdAndSportId(UUID userId, UUID sportId);
}
