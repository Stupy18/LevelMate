package com.Levelmate.backend.elo.service;

import com.Levelmate.backend.games.entity.WinnerTeam;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EloCalculationService {

    private static final Logger log = LoggerFactory.getLogger(EloCalculationService.class);

    private final EloTransactionalService eloTransactionalService;

    @Async("eloTaskExecutor")
    public void calculateAndApply(UUID sessionId, WinnerTeam winner) {
        try {
            eloTransactionalService.doCalculate(sessionId, winner);
        } catch (Exception e) {
            log.error("ELO: calculation failed for session {}", sessionId, e);
        }
    }
}
