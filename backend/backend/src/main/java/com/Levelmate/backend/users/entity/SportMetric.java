package com.Levelmate.backend.users.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "sport_metrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SportMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

    @Column(name = "metric_key", nullable = false, length = 50)
    private String metricKey;

    @Column(name = "label", nullable = false, length = 100)
    private String label;

    @Column(name = "input_type", nullable = false, length = 30)
    private String inputType;

    @Column(name = "unit", length = 30)
    private String unit;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;
}
