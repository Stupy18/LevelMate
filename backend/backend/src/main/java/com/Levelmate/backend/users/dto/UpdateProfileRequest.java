package com.Levelmate.backend.users.dto;

public record UpdateProfileRequest(
        String displayName,
        String avatarData
) {}
