package com.Levelmate.backend.users.dto;

public record UpdateSportRequest(
        Double eloRating,
        String grade,
        Integer level
) {}
