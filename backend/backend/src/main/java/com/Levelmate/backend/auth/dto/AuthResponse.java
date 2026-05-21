package com.Levelmate.backend.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        int expiresIn
) {
    public AuthResponse(String accessToken, String refreshToken) {
        this(accessToken, refreshToken, "Bearer", 900);
    }
}
