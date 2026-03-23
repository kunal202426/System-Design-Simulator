"""
normalizer.py — Normalize raw API responses into the unified metric schema.

Unified output schema per service:
{
  "service_id":   "api-svc-1",
  "service_type": "api_service",
  "timestamp":    1234567890.123,
  "metrics": {
    "throughput":  {"rps": 742,   "load_pct": 92.8},
    "latency":     {"p50_ms": 45, "p99_ms": 310},
    "errors":      {"rate_pct": 0.8},
    "resources":   {"cpu_pct": 68.4, "memory_pct": 71.2},
    "saturation":  {"queue_depth": 12}
  },
  "health": {"status": "warning", "score": 0.74},
  "prediction": {"breach_time_min": null, "trend": "stable"}
}

metric_paths (JSON in config column) lets operators map arbitrary API response
fields to the logical metric names understood by the normalizer.  Example:

{
  "rps":         "$.data.requests_per_second",
  "cpu_pct":     "$.system.cpu.usage_percent",
  "p99_ms":      "$.latency_stats.p99",
  "queue_depth": "$.queue.pending_jobs"
}

Supported path syntax: "$.a.b.c" or just "a.b.c" (simple dot-notation only).
"""

import time
from typing import Any, Dict, List, Optional


# ─── Path extraction ──────────────────────────────────────────────────────────

def _get_nested(data: Any, path: str) -> Optional[Any]:
    """Extract a value from a nested dict using simple dot-notation (no arrays)."""
    keys = path.lstrip("$.").split(".")
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
        if current is None:
            return None
    return current


def _extract_metric(data: Dict, metric_paths: Dict[str, str], logical_name: str, *fallback_keys: str) -> Optional[float]:
    """
    Try to extract a metric value:
    1. Via the configured metric_paths mapping (operator-supplied)
    2. Then via a list of common fallback key names
    """
    # Operator-configured path takes priority
    if logical_name in metric_paths:
        val = _get_nested(data, metric_paths[logical_name])
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                pass

    # Try common fallback keys directly in the object (flat or one-level deep)
    for key in fallback_keys:
        # Try flat key
        if key in data:
            try:
                return float(data[key])
            except (TypeError, ValueError):
                pass
        # Try dot-notation fallback
        val = _get_nested(data, key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                pass
    return None


# ─── Health scoring ───────────────────────────────────────────────────────────

def _compute_health_score(
    load_pct: Optional[float],
    error_rate_pct: Optional[float],
    p99_ms: Optional[float],
    slo_latency_p99_ms: int,
    warn_threshold_pct: float,
    critical_threshold_pct: float,
) -> float:
    """
    Compute a [0.0 … 1.0] health score where 1.0 = perfect health.
    Penalties are applied for high utilization, errors, and latency SLO breaches.
    """
    score = 1.0

    if load_pct is not None:
        if load_pct >= critical_threshold_pct:
            score -= 0.40
        elif load_pct >= warn_threshold_pct:
            score -= 0.20

    if error_rate_pct is not None:
        if error_rate_pct >= 5.0:
            score -= 0.30
        elif error_rate_pct >= 1.0:
            score -= 0.15
        elif error_rate_pct >= 0.1:
            score -= 0.05

    if p99_ms is not None and slo_latency_p99_ms > 0:
        ratio = p99_ms / slo_latency_p99_ms
        if ratio >= 2.0:
            score -= 0.30
        elif ratio >= 1.0:
            score -= (ratio - 1.0) * 0.30   # linear penalty once SLO is breached

    return max(0.0, min(1.0, score))


def _derive_status(score: float, critical_threshold_pct: float, load_pct: Optional[float]) -> str:
    if load_pct is not None and load_pct >= critical_threshold_pct:
        return "critical"
    if score >= 0.80:
        return "healthy"
    if score >= 0.55:
        return "warning"
    if score >= 0.30:
        return "degraded"
    return "critical"


# ─── Main normalizer ─────────────────────────────────────────────────────────

def normalize(
    raw_data: Dict[str, Any],
    service_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Normalize a raw API response dict into the unified metric schema.

    Args:
        raw_data:       The parsed JSON response from the service's metrics endpoint.
        service_config: The row from the Excel/CSV config for this service.

    Returns:
        Normalized metric dict (prediction fields left as None — filled by anomaly_detector).
    """
    metric_paths: Dict[str, str] = service_config.get("metric_paths", {})
    max_capacity:           int   = service_config.get("max_capacity", 500)
    warn_threshold_pct:     float = service_config.get("warn_threshold_pct", 70.0)
    critical_threshold_pct: float = service_config.get("critical_threshold_pct", 90.0)
    slo_latency_p99_ms:     int   = service_config.get("slo_latency_p99_ms", 500)

    # ── Throughput ─────────────────────────────────────────────
    rps = _extract_metric(
        raw_data, metric_paths, "rps",
        "rps", "requests_per_second", "req_per_sec", "throughput",
        "rate", "http.rps", "metrics.rps",
    )
    load_pct: Optional[float] = None
    if rps is not None and max_capacity > 0:
        load_pct = min(200.0, (rps / max_capacity) * 100.0)

    # Operator may also supply load_pct directly
    load_pct_direct = _extract_metric(
        raw_data, metric_paths, "load_pct",
        "load_pct", "utilization", "utilization_pct", "cpu_utilization",
    )
    if load_pct is None and load_pct_direct is not None:
        load_pct = load_pct_direct

    # ── Latency ────────────────────────────────────────────────
    p99_ms = _extract_metric(
        raw_data, metric_paths, "p99_ms",
        "p99_ms", "p99", "latency_p99", "latency.p99", "response_time_p99",
        "latencyP99", "percentile_99",
    )
    p50_ms = _extract_metric(
        raw_data, metric_paths, "p50_ms",
        "p50_ms", "p50", "latency_p50", "latency.p50", "median_latency",
        "latencyP50", "percentile_50",
    )

    # ── Errors ────────────────────────────────────────────────
    error_rate_pct = _extract_metric(
        raw_data, metric_paths, "error_rate_pct",
        "error_rate_pct", "error_rate", "error_pct", "errors.rate",
        "errorRate", "failure_rate", "http_error_rate",
    )
    # Some services expose error count + total → compute rate
    if error_rate_pct is None:
        errors_total = _extract_metric(raw_data, metric_paths, "errors_total",
                                        "errors_total", "error_count", "errors")
        requests_total = _extract_metric(raw_data, metric_paths, "requests_total",
                                          "requests_total", "request_count", "total_requests")
        if errors_total is not None and requests_total and requests_total > 0:
            error_rate_pct = (errors_total / requests_total) * 100.0

    # ── Resources ─────────────────────────────────────────────
    cpu_pct = _extract_metric(
        raw_data, metric_paths, "cpu_pct",
        "cpu_pct", "cpu", "cpu_usage", "cpu_percent", "cpu.usage",
        "system.cpu", "cpuUsage",
    )
    memory_pct = _extract_metric(
        raw_data, metric_paths, "memory_pct",
        "memory_pct", "memory", "mem_pct", "memory_usage", "mem_usage",
        "memory.percent", "memUsage",
    )

    # ── Saturation ────────────────────────────────────────────
    queue_depth = _extract_metric(
        raw_data, metric_paths, "queue_depth",
        "queue_depth", "queue_size", "pending_jobs", "messages_pending",
        "queue.depth", "backlog",
    )

    # ── Health score & status ──────────────────────────────────
    health_score = _compute_health_score(
        load_pct, error_rate_pct, p99_ms,
        slo_latency_p99_ms, warn_threshold_pct, critical_threshold_pct,
    )
    status = _derive_status(health_score, critical_threshold_pct, load_pct)

    return {
        "service_id":   service_config["service_id"],
        "service_name": service_config.get("service_name", service_config["service_id"]),
        "service_type": service_config.get("service_type", "api_service"),
        "timestamp":    time.time(),
        "metrics": {
            "throughput": {
                "rps":      rps,
                "load_pct": load_pct,
            },
            "latency": {
                "p50_ms": p50_ms,
                "p99_ms": p99_ms,
            },
            "errors": {
                "rate_pct": error_rate_pct,
            },
            "resources": {
                "cpu_pct":    cpu_pct,
                "memory_pct": memory_pct,
            },
            "saturation": {
                "queue_depth": queue_depth,
            },
        },
        "health": {
            "status": status,
            "score":  round(health_score, 4),
        },
        "prediction": {
            "breach_time_min": None,   # filled by anomaly_detector
            "trend":           "stable",
        },
    }


def normalize_from_simulation(
    node_state: Dict[str, Any],
    service_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Convert a simulation engine NodeState output into the unified metric schema.
    Used when real API polling is unavailable (graceful fallback).
    """
    utilization = node_state.get("utilization", 0.0)
    max_capacity = service_config.get("max_capacity", node_state.get("config", {}).get("maxCapacity", 500))
    rps = utilization * max_capacity
    load_pct = min(200.0, utilization * 100.0)

    latency_ms = node_state.get("currentLatency", 0.0)
    failure_rate = node_state.get("failureRate", 0.0)
    error_rate_pct = min(100.0, failure_rate * 100.0)

    raw = {
        "rps":            rps,
        "load_pct":       load_pct,
        "p99_ms":         latency_ms * 1.5,   # rough P99 estimate
        "p50_ms":         latency_ms,
        "error_rate_pct": error_rate_pct,
    }

    return normalize(raw, service_config)
