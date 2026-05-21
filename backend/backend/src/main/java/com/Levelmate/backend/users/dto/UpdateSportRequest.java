package com.Levelmate.backend.users.dto;

public record UpdateSportRequest(
        Integer eloRating,
        String grade,
        Integer level
) {}
