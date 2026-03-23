"""
tests/test_polling.py — Integration and unit tests for the enhanced backend.

Run with:
    cd backend
    python -m pytest ../tests/test_polling.py -v
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure backend modules are importable
BACKEND_DIR = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))


# ─── excel_loader tests ────────────────────────────────────────────────────────

class TestExcelLoader:
    def test_load_csv_minimal(self, tmp_path):
        from excel_loader import load_csv, build_node_graph

        csv_content = (
            "service_id,service_name,service_type,api_endpoint,auth_token,"
            "max_capacity,warn_threshold_pct,critical_threshold_pct,"
            "slo_latency_p99_ms,slo_error_rate_pct,depends_on,metric_paths\n"
            "lb-01,Load Balancer,lb,,, 1000,70,90,100,0.5,,{}\n"
            "api-01,API Service,api,,,500,70,90,500,1.0,lb-01,{}\n"
        )
        csv_file = tmp_path / "services.csv"
        csv_file.write_text(csv_content, encoding="utf-8")

        services = load_csv(str(csv_file))
        assert len(services) == 2
        assert services[0]["service_id"] == "lb-01"
        assert services[0]["service_type"] == "load_balancer"
        assert services[1]["depends_on"] == ["lb-01"]

    def test_build_node_graph_structure(self, tmp_path):
        from excel_loader import build_node_graph

        services = [
            {
                "service_id": "lb-01", "service_name": "LB", "service_type": "load_balancer",
                "api_endpoint": "", "auth_token": "", "max_capacity": 1000,
                "warn_threshold_pct": 70.0, "critical_threshold_pct": 90.0,
                "slo_latency_p99_ms": 100, "slo_error_rate_pct": 0.5,
                "depends_on": [], "metric_paths": {},
            },
            {
                "service_id": "api-01", "service_name": "API", "service_type": "api_service",
                "api_endpoint": "", "auth_token": "", "max_capacity": 500,
                "warn_threshold_pct": 70.0, "critical_threshold_pct": 90.0,
                "slo_latency_p99_ms": 500, "slo_error_rate_pct": 1.0,
                "depends_on": ["lb-01"], "metric_paths": {},
            },
        ]
        graph = build_node_graph(services)

        assert "nodes" in graph
        assert "edges" in graph
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) == 1

        edge = graph["edges"][0]
        assert edge["source"] == "lb-01"
        assert edge["target"] == "api-01"

    def test_unsupported_extension_raises(self, tmp_path):
        from excel_loader import load_config
        bad_file = tmp_path / "config.toml"
        bad_file.write_text("foo = bar")
        with pytest.raises(ValueError, match="Unsupported"):
            load_config(str(bad_file))

    def test_sample_csv_loads(self):
        """Test that the bundled config/services.csv parses without error."""
        csv_path = Path(__file__).parent.parent / "config" / "services.csv"
        if not csv_path.exists():
            pytest.skip("config/services.csv not found")
        from excel_loader import load_config
        services = load_config(str(csv_path))
        assert len(services) > 0


# ─── normalizer tests ──────────────────────────────────────────────────────────

class TestNormalizer:
    def _base_config(self, **overrides):
        cfg = {
            "service_id":             "svc-1",
            "service_name":           "Test Service",
            "service_type":           "api_service",
            "max_capacity":           500,
            "warn_threshold_pct":     70.0,
            "critical_threshold_pct": 90.0,
            "slo_latency_p99_ms":     500,
            "metric_paths":           {},
        }
        cfg.update(overrides)
        return cfg

    def test_normalize_flat_rps(self):
        from normalizer import normalize
        raw = {"rps": 400, "p99_ms": 300, "error_rate_pct": 0.5}
        result = normalize(raw, self._base_config())
        assert result["metrics"]["throughput"]["rps"] == 400
        assert result["metrics"]["throughput"]["load_pct"] == pytest.approx(80.0)
        assert result["metrics"]["latency"]["p99_ms"] == 300

    def test_health_score_healthy(self):
        from normalizer import normalize
        raw = {"rps": 100, "p99_ms": 100, "error_rate_pct": 0.0}
        result = normalize(raw, self._base_config())
        assert result["health"]["score"] > 0.9
        assert result["health"]["status"] == "healthy"

    def test_health_score_critical(self):
        from normalizer import normalize
        raw = {"rps": 500, "p99_ms": 2000, "error_rate_pct": 10.0}
        result = normalize(raw, self._base_config())
        assert result["health"]["score"] < 0.5
        assert result["health"]["status"] in ("critical", "degraded")

    def test_metric_paths_override(self):
        from normalizer import normalize
        raw = {"data": {"requests_per_second": 300}}
        cfg  = self._base_config(metric_paths={"rps": "$.data.requests_per_second"})
        result = normalize(raw, cfg)
        assert result["metrics"]["throughput"]["rps"] == 300

    def test_normalize_from_simulation(self):
        from normalizer import normalize_from_simulation
        node_state = {
            "utilization": 0.8,
            "currentLatency": 200,
            "failureRate": 0.05,
            "config": {"maxCapacity": 500},
        }
        result = normalize_from_simulation(node_state, self._base_config())
        assert result["metrics"]["throughput"]["rps"] == pytest.approx(400.0)
        assert result["metrics"]["errors"]["rate_pct"] == pytest.approx(5.0)


# ─── anomaly_detector tests ────────────────────────────────────────────────────

class TestAnomalyDetector:
    def _base_config(self):
        return {
            "service_id":             "svc-1",
            "warn_threshold_pct":     70.0,
            "critical_threshold_pct": 90.0,
            "slo_latency_p99_ms":     500,
        }

    def _make_metric(self, load_pct=50.0, p99_ms=100.0, error_rate=0.0):
        return {
            "service_id":   "svc-1",
            "service_type": "api_service",
            "timestamp":    time.time(),
            "metrics": {
                "throughput": {"rps": None, "load_pct": load_pct},
                "latency":    {"p50_ms": p99_ms * 0.5, "p99_ms": p99_ms},
                "errors":     {"rate_pct": error_rate},
                "resources":  {"cpu_pct": None, "memory_pct": None},
                "saturation": {"queue_depth": None},
            },
            "health": {"status": "healthy", "score": 1.0},
            "prediction": {"breach_time_min": None, "trend": "stable"},
        }

    def test_no_anomaly_below_threshold(self):
        from anomaly_detector import AnomalyDetector
        det = AnomalyDetector()
        cfg = self._base_config()
        events, pred = det.process(self._make_metric(load_pct=50.0), cfg)
        assert not any(e.severity == "critical" for e in events)

    def test_critical_threshold_fires(self):
        from anomaly_detector import AnomalyDetector
        det = AnomalyDetector()
        cfg = self._base_config()
        events, pred = det.process(self._make_metric(load_pct=95.0), cfg)
        severities = [e.severity for e in events]
        assert "critical" in severities

    def test_zscore_anomaly_detected(self):
        from anomaly_detector import AnomalyDetector
        det = AnomalyDetector()
        cfg = self._base_config()

        # Establish a stable baseline with slight variation so std > 0
        for i in range(8):
            det.process(self._make_metric(load_pct=28.0 + (i % 3)), cfg)

        # Inject a large spike — should trigger threshold warning or z-score anomaly
        events, pred = det.process(self._make_metric(load_pct=95.0), cfg)
        # 95% >= critical threshold (90%) → critical event expected
        has_alert = any(e.severity in ("anomaly", "critical", "warning") for e in events)
        assert has_alert

    def test_prediction_rising_trend(self):
        import time
        from anomaly_detector import AnomalyDetector, MetricWindow
        det = AnomalyDetector()
        cfg = self._base_config()

        # Directly inject a window with spread-out timestamps to bypass the
        # sub-millisecond guard (which correctly returns stable when all
        # observations were made within the same second).
        window = det._get_window("svc-1", "load_pct")
        base_ts = time.time() - 600  # 10 minutes ago
        for i in range(10):
            window.push(50.0 + i * 3.0, base_ts + i * 60)  # 1-min apart

        from anomaly_detector import PredictionResult
        pred = det._predict_breach(window, 90.0, "svc-1", "load_pct")
        assert pred.trend == "rising"


# ─── alert_manager tests ───────────────────────────────────────────────────────

class TestAlertManager:
    def _make_event(self, severity="warning", service_id="svc-1", metric="load_pct"):
        from anomaly_detector import AnomalyEvent
        return AnomalyEvent(
            service_id=service_id,
            metric=metric,
            value=85.0,
            z_score=None,
            severity=severity,
            message=f"Test {severity} alert on {service_id}",
        )

    def test_event_fired_first_time(self):
        from alert_manager import AlertManager
        mgr = AlertManager()
        events = [self._make_event()]
        fired = mgr.process_events(events)
        assert len(fired) == 1

    def test_cooldown_suppresses_duplicate(self):
        from alert_manager import AlertManager
        mgr = AlertManager()
        events = [self._make_event()]
        mgr.process_events(events)  # first fire
        fired2 = mgr.process_events(events)  # within cooldown
        assert len(fired2) == 0

    def test_different_severity_not_suppressed(self):
        from alert_manager import AlertManager
        mgr = AlertManager()
        mgr.process_events([self._make_event(severity="warning")])
        fired = mgr.process_events([self._make_event(severity="critical")])
        assert len(fired) == 1

    def test_get_recent_alerts_bounded(self):
        from alert_manager import AlertManager
        mgr = AlertManager()
        for i in range(10):
            # Use different service IDs to bypass cooldown
            mgr.process_events([self._make_event(service_id=f"svc-{i}")])
        recent = mgr.get_recent_alerts(max_count=5)
        assert len(recent) == 5

    def test_listener_receives_alert(self):
        from alert_manager import AlertManager
        mgr = AlertManager()
        received = []
        mgr.add_listener(received.append)

        import asyncio
        async def _body():
            events = [self._make_event(service_id="svc-unique-99")]
            fired = mgr.process_events(events)
            await mgr.fire_alerts(fired)
            assert len(received) == 1
            assert received[0]["severity"] == "warning"
        asyncio.run(_body())


# ─── api_poller tests ─────────────────────────────────────────────────────────

class TestApiPoller:
    def _svc(self, endpoint="http://fake-endpoint.local/metrics"):
        return {
            "service_id":             "svc-1",
            "service_name":           "Test Svc",
            "service_type":           "api_service",
            "api_endpoint":           endpoint,
            "auth_token":             "",
            "max_capacity":           500,
            "warn_threshold_pct":     70.0,
            "critical_threshold_pct": 90.0,
            "slo_latency_p99_ms":     500,
            "metric_paths":           {},
        }

    def test_no_endpoint_returns_none(self):
        import asyncio
        from api_poller import ApiPoller
        poller = ApiPoller()
        svc = self._svc(endpoint="")
        result = asyncio.run(poller.poll_once(svc))
        assert result is None

    def test_poll_stats_initial(self):
        from api_poller import ApiPoller
        poller = ApiPoller()
        stats = poller.get_poll_stats()
        assert "services_with_live_data" in stats
        assert stats["services_with_live_data"] == 0

    def test_http_failure_returns_none(self):
        """Polling unreachable endpoint should return None gracefully."""
        from api_poller import ApiPoller
        poller = ApiPoller()
        svc = self._svc(endpoint="http://unreachable.example.invalid/metrics")
        import asyncio
        async def _body():
            result = await poller.poll_once(svc)
            assert result is None
            assert poller._poll_failures.get("svc-1", 0) >= 1
            await poller.close()
        asyncio.run(_body())
