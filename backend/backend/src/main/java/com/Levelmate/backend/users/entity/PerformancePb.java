package com.Levelmate.backend.users.entity;

import com.Levelmate.backend.auth.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "performance_pbs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformancePb {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

    @Column(name = "distance_meters")
    private Integer distanceMeters;

    @Column(name = "time_seconds")
    private Integer timeSeconds;

    @Column(name = "metric_key", length = 50)
    private String metricKey;

    @Column(name = "metric_value_text", length = 200)
    private String metricValueText;

    @Column(name = "metric_value_number", precision = 15, scale = 3)
    private BigDecimal metricValueNumber;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @PrePersist
    void prePersist() {
        if (recordedAt == null) recordedAt = Instant.now();
    }
}
