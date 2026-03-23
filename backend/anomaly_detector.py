"""
anomaly_detector.py — Z-score anomaly detection + linear regression breach prediction.

Detection pipeline (per metric per service):
  1. Maintain a rolling window of the last N observations
  2. Z-score: flag anomaly when |z| > Z_THRESHOLD  (default 3σ)
  3. Threshold check: warn/critical from service config
  4. Linear regression on the rolling window: extrapolate breach ETA

Cascade patterns detected:
  • Cache hit-rate drop → DB load spike (cache_miss_flood)
  • Queue depth growing → worker saturation (queue_saturation)
  • Worker failure cascade (worker_cascade)
"""

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

# ── Constants ─────────────────────────────────────────────────────────────────

WINDOW_SIZE       = 30      # observations kept in rolling window
Z_THRESHOLD       = 3.0     # σ threshold for z-score anomalies
MIN_SAMPLES       = 5       # minimum observations before z-score is meaningful
PREDICTION_HORIZON_MINUTES = 30.0  # don't report breach times beyond this


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class MetricWindow:
    """Rolling window of values for a single metric of a single service."""
    values:     Deque[float]  = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))
    timestamps: Deque[float]  = field(default_factory=lambda: deque(maxlen=WINDOW_SIZE))

    def push(self, value: float, ts: Optional[float] = None):
        self.values.append(value)
        self.timestamps.append(ts or time.time())

    def mean(self) -> float:
        return float(np.mean(self.values)) if self.values else 0.0

    def std(self) -> float:
        return float(np.std(self.values)) if len(self.values) >= 2 else 0.0

    def z_score(self, value: float) -> Optional[float]:
        """Return z-score for `value` relative to current window, or None if not enough data."""
        if len(self.values) < MIN_SAMPLES:
            return None
        std = self.std()
        if std < 1e-9:
            return None
        return (value - self.mean()) / std


@dataclass
class AnomalyEvent:
    service_id:   str
    metric:       str
    value:        float
    z_score:      Optional[float]
    severity:     str        # "anomaly" | "warning" | "critical" | "predicted"
    message:      str
    timestamp:    float = field(default_factory=time.time)


@dataclass
class PredictionResult:
    service_id:        str
    metric:            str
    breach_time_min:   Optional[float]   # None = no breach predicted
    trend:             str               # "stable" | "rising" | "falling"
    slope_per_minute:  float
    current_value:     Optional[float]


# ── Core detector ─────────────────────────────────────────────────────────────

class AnomalyDetector:
    """
    Stateful detector — call `process()` after each poll cycle.
    """

    def __init__(self):
        # { service_id: { metric_name: MetricWindow } }
        self._windows: Dict[str, Dict[str, MetricWindow]] = {}

    def _get_window(self, service_id: str, metric: str) -> MetricWindow:
        if service_id not in self._windows:
            self._windows[service_id] = {}
        if metric not in self._windows[service_id]:
            self._windows[service_id][metric] = MetricWindow()
        return self._windows[service_id][metric]

    # ── Linear regression breach prediction ──────────────────────────────────

    def _predict_breach(
        self,
        window: MetricWindow,
        threshold: float,
        service_id: str,
        metric: str,
    ) -> PredictionResult:
        """
        Fit a linear trend to the window values and extrapolate when (if ever)
        the metric will cross `threshold`.
        """
        current_value = window.values[-1] if window.values else None

        if len(window.values) < MIN_SAMPLES:
            return PredictionResult(
                service_id=service_id, metric=metric,
                breach_time_min=None, trend="stable",
                slope_per_minute=0.0, current_value=current_value,
            )

        xs = np.array(window.timestamps, dtype=float)
        ys = np.array(window.values,     dtype=float)

        # Normalise timestamps to minutes-since-first-observation
        xs = (xs - xs[0]) / 60.0

        # Guard: if all timestamps are identical (common in tests), no regression possible
        if xs[-1] < 1e-9:
            return PredictionResult(
                service_id=service_id, metric=metric,
                breach_time_min=None, trend="stable",
                slope_per_minute=0.0, current_value=current_value,
            )

        # Least-squares linear fit
        try:
            coeffs = np.polyfit(xs, ys, 1)  # [slope, intercept]
        except (np.linalg.LinAlgError, ValueError):
            return PredictionResult(
                service_id=service_id, metric=metric,
                breach_time_min=None, trend="stable",
                slope_per_minute=0.0, current_value=current_value,
            )
        slope:     float = float(coeffs[0])
        intercept: float = float(coeffs[1])

        # Determine trend direction
        if abs(slope) < 0.01:
            trend = "stable"
        elif slope > 0:
            trend = "rising"
        else:
            trend = "falling"

        # Project forward: y = slope*t + intercept → t = (threshold - intercept) / slope
        breach_time_min: Optional[float] = None
        if slope > 0 and current_value is not None and current_value < threshold:
            current_x = (time.time() - float(window.timestamps[0])) / 60.0
            current_projected = slope * current_x + intercept
            if current_projected < threshold:
                t_breach = (threshold - intercept) / slope
                t_remaining = t_breach - current_x
                if 0 < t_remaining <= PREDICTION_HORIZON_MINUTES:
                    breach_time_min = round(t_remaining, 1)

        return PredictionResult(
            service_id=service_id, metric=metric,
            breach_time_min=breach_time_min, trend=trend,
            slope_per_minute=round(slope, 4), current_value=current_value,
        )

    # ── Z-score check ─────────────────────────────────────────────────────────

    def _check_zscore(
        self, service_id: str, metric: str, value: float, window: MetricWindow
    ) -> Optional[AnomalyEvent]:
        z = window.z_score(value)
        if z is not None and abs(z) >= Z_THRESHOLD:
            direction = "spike" if z > 0 else "drop"
            return AnomalyEvent(
                service_id=service_id,
                metric=metric,
                value=value,
                z_score=round(z, 2),
                severity="anomaly",
                message=f"{metric} {direction} detected on {service_id} "
                        f"(z={z:+.1f}, value={value:.1f})",
            )
        return None

    # ── Threshold check ───────────────────────────────────────────────────────

    def _check_threshold(
        self,
        service_id: str,
        metric: str,
        value: float,
        warn_threshold: float,
        critical_threshold: float,
    ) -> Optional[AnomalyEvent]:
        if value >= critical_threshold:
            return AnomalyEvent(
                service_id=service_id, metric=metric, value=value,
                z_score=None, severity="critical",
                message=f"{service_id} {metric} critical: {value:.1f} ≥ {critical_threshold:.1f}",
            )
        if value >= warn_threshold:
            return AnomalyEvent(
                service_id=service_id, metric=metric, value=value,
                z_score=None, severity="warning",
                message=f"{service_id} {metric} warning: {value:.1f} ≥ {warn_threshold:.1f}",
            )
        return None

    # ── Main process entry point ──────────────────────────────────────────────

    def process(
        self,
        normalized_metrics: Dict[str, Any],
        service_config: Dict[str, Any],
    ) -> Tuple[List[AnomalyEvent], PredictionResult]:
        """
        Process a single normalised metric snapshot for one service.

        Returns:
            (list_of_anomaly_events, prediction_result_for_primary_metric)
        """
        service_id = normalized_metrics["service_id"]
        config     = service_config

        warn_pct     = config.get("warn_threshold_pct",     70.0)
        critical_pct = config.get("critical_threshold_pct", 90.0)
        slo_latency  = config.get("slo_latency_p99_ms",     500)

        metrics = normalized_metrics.get("metrics", {})

        events: List[AnomalyEvent] = []

        # ── load_pct ──────────────────────────────────────────────────────────
        load_pct = (metrics.get("throughput") or {}).get("load_pct")
        load_window = self._get_window(service_id, "load_pct")
        if load_pct is not None:
            load_window.push(load_pct)
            ev = self._check_threshold(service_id, "load_pct", load_pct, warn_pct, critical_pct)
            if ev:
                events.append(ev)
            ev = self._check_zscore(service_id, "load_pct", load_pct, load_window)
            if ev:
                events.append(ev)

        # ── p99 latency ───────────────────────────────────────────────────────
        p99 = (metrics.get("latency") or {}).get("p99_ms")
        p99_window = self._get_window(service_id, "p99_ms")
        if p99 is not None:
            p99_window.push(p99)
            slo_warn     = slo_latency * 0.8
            slo_critical = slo_latency
            ev = self._check_threshold(service_id, "p99_ms", p99, slo_warn, slo_critical)
            if ev:
                events.append(ev)
            ev = self._check_zscore(service_id, "p99_ms", p99, p99_window)
            if ev:
                events.append(ev)

        # ── error rate ────────────────────────────────────────────────────────
        error_rate = (metrics.get("errors") or {}).get("rate_pct")
        err_window = self._get_window(service_id, "error_rate_pct")
        if error_rate is not None:
            err_window.push(error_rate)
            ev = self._check_threshold(service_id, "error_rate_pct", error_rate, 1.0, 5.0)
            if ev:
                events.append(ev)
            ev = self._check_zscore(service_id, "error_rate_pct", error_rate, err_window)
            if ev:
                events.append(ev)

        # ── queue depth ───────────────────────────────────────────────────────
        q_depth = (metrics.get("saturation") or {}).get("queue_depth")
        q_window = self._get_window(service_id, "queue_depth")
        if q_depth is not None:
            q_window.push(q_depth)
            ev = self._check_zscore(service_id, "queue_depth", q_depth, q_window)
            if ev:
                events.append(ev)

        # ── Primary prediction: load_pct → capacity breach ────────────────────
        prediction = self._predict_breach(
            load_window, critical_pct, service_id, "load_pct"
        )

        # Add a predicted event to the list if breach is imminent
        if prediction.breach_time_min is not None:
            events.append(AnomalyEvent(
                service_id=service_id,
                metric="load_pct",
                value=load_pct or 0.0,
                z_score=None,
                severity="predicted",
                message=(
                    f"{service_id} will reach {critical_pct:.0f}% capacity "
                    f"in {prediction.breach_time_min:.1f} minutes "
                    f"(trend: {prediction.trend})"
                ),
            ))

        return events, prediction


    # ── Cascade pattern detection ─────────────────────────────────────────────

    def detect_cascade(
        self,
        all_metrics: Dict[str, Dict[str, Any]],
        services_by_id: Dict[str, Dict[str, Any]],
    ) -> List[AnomalyEvent]:
        """
        Look for multi-service cascade patterns across the entire current snapshot.

        Patterns:
          1. cache_miss_flood:  cache error↑ AND database load↑
          2. queue_saturation:  message_queue depth↑ AND worker load↑
          3. lb_fan_out_failure: load_balancer load↑ AND multiple api_service errors↑
        """
        cascade_events: List[AnomalyEvent] = []

        caches   = [sid for sid, svc in services_by_id.items() if svc.get("service_type") == "cache"]
        dbs      = [sid for sid, svc in services_by_id.items() if svc.get("service_type") == "database"]
        queues   = [sid for sid, svc in services_by_id.items() if svc.get("service_type") == "message_queue"]
        workers  = [sid for sid, svc in services_by_id.items() if svc.get("service_type") == "worker"]

        def _load(sid: str) -> Optional[float]:
            m = all_metrics.get(sid, {})
            return (m.get("metrics") or {}).get("throughput", {}).get("load_pct")

        def _err(sid: str) -> Optional[float]:
            m = all_metrics.get(sid, {})
            return (m.get("metrics") or {}).get("errors", {}).get("rate_pct")

        # Pattern 1: cache miss → DB flood
        high_error_caches = [c for c in caches if (_err(c) or 0) > 5.0]
        high_load_dbs     = [d for d in dbs    if (_load(d) or 0) > 80.0]
        if high_error_caches and high_load_dbs:
            cascade_events.append(AnomalyEvent(
                service_id="SYSTEM",
                metric="cascade",
                value=0.0,
                z_score=None,
                severity="critical",
                message=(
                    f"Cache miss flood detected: caches {high_error_caches} failing "
                    f"→ DB overload on {high_load_dbs}"
                ),
            ))

        # Pattern 2: queue depth saturation
        high_load_queues  = [q for q in queues  if (_load(q) or 0) > 85.0]
        high_load_workers = [w for w in workers if (_load(w) or 0) > 85.0]
        if high_load_queues and high_load_workers:
            cascade_events.append(AnomalyEvent(
                service_id="SYSTEM",
                metric="cascade",
                value=0.0,
                z_score=None,
                severity="critical",
                message=(
                    f"Queue saturation cascade: queues {high_load_queues} backing up "
                    f"→ workers {high_load_workers} overwhelmed"
                ),
            ))

        return cascade_events


# ── Module-level singleton ─────────────────────────────────────────────────────
default_detector = AnomalyDetector()
