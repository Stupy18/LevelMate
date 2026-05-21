package com.Levelmate.backend.auth.repository;

import com.Levelmate.backend.auth.entity.RefreshToken;
import com.Levelmate.backend.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Transactional
    void deleteByUser(User user);
}
