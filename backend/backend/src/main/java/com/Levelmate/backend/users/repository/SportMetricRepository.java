package com.Levelmate.backend.users.repository;

import com.Levelmate.backend.users.entity.SportMetric;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface SportMetricRepository extends JpaRepository<SportMetric, UUID> {

    List<SportMetric> findAllBySportIdOrderByDisplayOrderAsc(UUID sportId);

    List<SportMetric> findAllBySportIdInOrderByDisplayOrderAsc(Collection<UUID> sportIds);
}
