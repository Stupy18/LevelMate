package com.Levelmate.backend.notifications.service;

import com.Levelmate.backend.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/push/send";

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    /**
     * Sends a push notification to a single user.
     * Runs on the background executor so it never blocks a request thread.
     * Silently skips if the user has no push token registered.
     */
    @Async("eloTaskExecutor")
    public void sendToUser(UUID userId, String title, String body, Map<String, String> data) {
        userRepository.findById(userId).ifPresent(user -> {
            String token = user.getPushToken();
            if (token == null || token.isBlank()) return;

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("to", token);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("data", data);
            payload.put("sound", "default");
            payload.put("priority", "high");

            try {
                ResponseEntity<Map> response = restTemplate.postForEntity(EXPO_PUSH_URL, payload, Map.class);
                handleExpoResponse(userId, response.getBody());
            } catch (Exception e) {
                log.error("Push notification failed for user {}: {}", userId, e.getMessage());
            }
        });
    }

    /**
     * Checks the Expo push response for a DeviceNotRegistered error and clears
     * the stale token so future attempts are skipped immediately.
     */
    @SuppressWarnings("unchecked")
    private void handleExpoResponse(UUID userId, Map<?, ?> responseBody) {
        if (responseBody == null) return;
        Object dataObj = responseBody.get("data");
        if (!(dataObj instanceof Map<?, ?> dataMap)) return;
        if (!"error".equals(dataMap.get("status"))) return;
        Object detailsObj = dataMap.get("details");
        if (!(detailsObj instanceof Map<?, ?> details)) return;
        if ("DeviceNotRegistered".equals(details.get("error"))) {
            log.info("Clearing stale push token for user {} (DeviceNotRegistered)", userId);
            userRepository.findById(userId).ifPresent(user -> {
                user.setPushToken(null);
                userRepository.save(user);
            });
        }
    }
}
