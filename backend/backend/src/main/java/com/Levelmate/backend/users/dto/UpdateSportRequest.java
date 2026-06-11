package com.Levelmate.backend.users.dto;

import java.util.List;

public record UpdateSportRequest(List<MetricValueRequest> metrics) {}
