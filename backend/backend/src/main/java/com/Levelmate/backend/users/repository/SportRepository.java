package com.Levelmate.backend.users.repository;

import com.Levelmate.backend.users.entity.Sport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SportRepository extends JpaRepository<Sport, UUID> {
}
