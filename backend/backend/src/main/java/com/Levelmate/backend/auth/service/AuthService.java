package com.Levelmate.backend.auth.service;

import com.Levelmate.backend.auth.dto.AuthResponse;
import com.Levelmate.backend.auth.dto.LoginRequest;
import com.Levelmate.backend.auth.dto.RefreshRequest;
import com.Levelmate.backend.auth.dto.RegisterRequest;
import com.Levelmate.backend.auth.entity.RefreshToken;
import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.auth.repository.RefreshTokenRepository;
import com.Levelmate.backend.auth.repository.UserRepository;
import com.Levelmate.backend.auth.security.JwtService;
import com.Levelmate.backend.common.exception.EmailAlreadyInUseException;
import com.Levelmate.backend.common.exception.InvalidRefreshTokenException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Value("${app.jwt.refresh-token-expiry}")
    private long refreshTokenExpiryMs;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new EmailAlreadyInUseException(req.email());
        }
        User user = User.builder()
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .firstName(req.firstName())
                .lastName(req.lastName())
                .build();
        userRepository.save(user);
        return issueTokenPair(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );
        User user = userRepository.findByEmail(req.email()).orElseThrow();
        return issueTokenPair(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        String hash = jwtService.hashToken(req.refreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new InvalidRefreshTokenException(
                        "INVALID_REFRESH_TOKEN", "Refresh token not found or already used"));

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(stored);
            throw new InvalidRefreshTokenException("REFRESH_TOKEN_EXPIRED", "Refresh token has expired");
        }

        User user = stored.getUser();
        refreshTokenRepository.delete(stored);
        return issueTokenPair(user);
    }

    private AuthResponse issueTokenPair(User user) {
        String rawRefresh = jwtService.generateRefreshToken();
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .tokenHash(jwtService.hashToken(rawRefresh))
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiryMs))
                .build();
        refreshTokenRepository.save(token);
        return new AuthResponse(jwtService.generateAccessToken(user), rawRefresh);
    }
}
