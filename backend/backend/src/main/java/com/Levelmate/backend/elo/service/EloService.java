package com.Levelmate.backend.elo.service;

import com.Levelmate.backend.games.entity.WinnerTeam;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EloService {

    private final EloCalculationService eloCalculationService;

    public void onResultConfirmed(UUID sessionId, WinnerTeam winner) {
        eloCalculationService.calculateAndApply(sessionId, winner);
    }
}
