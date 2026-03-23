"""
alert_manager.py — State-based alert deduplication, Slack webhook delivery, runbook links.

Alert lifecycle (v2 — state machine):
  1. AnomalyDetector emits AnomalyEvent objects every tick
  2. AlertStateMachine fires ONLY on state changes:
       ok → warning  : fire warning alert
       warning → critical : fire critical alert
       critical → ok : fire "resolved" info alert (sidebar only)
  3. Anomaly / predicted alerts use time-based cooldown (300s between repeats)
  4. simulation_mode=True → warning toasts suppressed; only critical/cascade show toast

Alert state machine per (service_id, metric):
  ┌──────┐  crosses warn   ┌─────────┐  crosses crit  ┌──────────┐
  │  ok  │ ─────────────→  │ warning │ ──────────────→ │ critical │
  │      │ ←─────────────  │         │ ←──────────────  │          │
  └──────┘  drops below    └─────────┘  drops below     └──────────┘
"""

import asyncio
import logging
import os
import time
import uuid
from typing import Any, Callable, Dict, List, Optional, Set

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

from anomaly_detector import AnomalyEvent

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

# Cooldown only applies to non-threshold severities (anomaly, predicted, cascade)
ANOMALY_COOLDOWN_SECONDS: Dict[str, float] = {
    "anomaly":   300.0,
    "predicted": 300.0,
    "cascade":   120.0,
    "info":      600.0,
}

SEVERITY_COLORS = {
    "info":      "#3b82f6",
    "warning":   "#f59e0b",
    "critical":  "#ef4444",
    "predicted": "#8b5cf6",
    "cascade":   "#f97316",
    "anomaly":   "#06b6d4",
    "resolved":  "#10b981",
}

# Severities handled by state machine (fire on transition only, no cooldown)
STATE_MACHINE_SEVERITIES: Set[str] = {"warning", "critical"}

# In simulation_mode these are the only severities that show as toast
SIMULATION_TOAST_SEVERITIES: Set[str] = {"critical", "cascade"}

# Severities that trigger Slack
SLACK_SEVERITIES: Set[str] = {"critical", "cascade", "predicted"}

RUNBOOK_BASE_URL = os.environ.get("RUNBOOK_BASE_URL", "https://runbooks.example.com")
RUNBOOK_LINKS: Dict[str, str] = {
    "load_pct":        f"{RUNBOOK_BASE_URL}/capacity-scaling",
    "p99_ms":          f"{RUNBOOK_BASE_URL}/latency-investigation",
    "error_rate_pct":  f"{RUNBOOK_BASE_URL}/error-rate-runbook",
    "queue_depth":     f"{RUNBOOK_BASE_URL}/queue-depth-runbook",
    "cascade":         f"{RUNBOOK_BASE_URL}/cascade-failure-playbook",
    "default":         f"{RUNBOOK_BASE_URL}/general-incident",
}


# ── Builders ───────────────────────────────────────────────────────────────────

def _dedup_key(event: AnomalyEvent) -> str:
    return f"{event.service_id}:{event.metric}:{event.severity}"


def _state_key(service_id: str, metric: str) -> str:
    return f"{service_id}:{metric}"


def _make_alert_record(event: AnomalyEvent, show_toast: bool = True) -> Dict[str, Any]:
    runbook = RUNBOOK_LINKS.get(event.metric, RUNBOOK_LINKS["default"])
    return {
        "id":         str(uuid.uuid4()),
        "service_id": event.service_id,
        "metric":     event.metric,
        "severity":   event.severity,
        "color":      SEVERITY_COLORS.get(event.severity, "#6b7280"),
        "message":    event.message,
        "value":      event.value,
        "z_score":    event.z_score,
        "runbook":    runbook,
        "timestamp":  event.timestamp,
        "show_toast": show_toast,
    }


def _build_slack_payload(alert: Dict[str, Any]) -> Dict[str, Any]:
    emoji_map = {
        "critical": ":rotating_light:", "warning": ":warning:",
        "predicted": ":crystal_ball:", "cascade": ":fire:",
        "anomaly": ":mag:", "resolved": ":white_check_mark:",
        "info": ":information_source:",
    }
    emoji = emoji_map.get(alert["severity"], ":bell:")
    return {
        "attachments": [{
            "color": alert["color"],
            "blocks": [
                {"type": "section", "text": {"type": "mrkdwn", "text": (
                    f"{emoji} *{alert['severity'].upper()}* — {alert['service_id']}\n"
                    f"{alert['message']}"
                )}},
                {"type": "context", "elements": [
                    {"type": "mrkdwn", "text": f"*Metric:* {alert['metric']}"},
                    {"type": "mrkdwn", "text": f"*Value:* {alert['value']:.1f}"},
                    {"type": "mrkdwn", "text": f"<{alert['runbook']}|Runbook>"},
                ]},
            ],
        }]
    }


# ── AlertManager ───────────────────────────────────────────────────────────────

class AlertManager:
    """
    State-machine based alert manager — prevents notification spam.

    Threshold alerts (warning/critical):
      Fires ONLY when the state changes. CPU at 92% generates exactly ONE critical
      alert and stays silent until it either escalates or recovers.

    Anomaly/predicted/cascade alerts:
      Time-based cooldown (default 300 s between repeats per dedup key).

    simulation_mode=True (set via API or at start):
      Warning-level threshold alerts → show_toast=False (sidebar only).
      Critical/cascade → still show toast regardless.
    """

    def __init__(
        self,
        slack_webhook_url: Optional[str] = None,
        simulation_mode: bool = True,   # default: assume simulation until real polling starts
    ):
        self.slack_webhook_url = slack_webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
        self.simulation_mode   = simulation_mode

        # State machine: _state_key → "ok" | "warning" | "critical"
        self._alert_states:  Dict[str, str]              = {}
        # Cooldown for non-SM events
        self._cooldowns:     Dict[str, float]            = {}
        self._alert_history: List[Dict[str, Any]]        = []
        self._listeners:     List[Callable[[Dict], None]] = []

    # ── Listeners ─────────────────────────────────────────────────────────────

    def add_listener(self, cb: Callable[[Dict[str, Any]], None]):
        self._listeners.append(cb)

    def remove_listener(self, cb: Callable[[Dict[str, Any]], None]):
        self._listeners = [l for l in self._listeners if l is not cb]

    # ── Core processing ────────────────────────────────────────────────────────

    def process_events(self, events: List[AnomalyEvent]) -> List[Dict[str, Any]]:
        """
        Convert AnomalyEvents to fired alert records.
        State-machine events fire on transition only.
        Cooldown events fire at most once per cooldown window.
        """
        fired: List[Dict[str, Any]] = []
        now = time.time()

        for event in events:
            if event.severity in STATE_MACHINE_SEVERITIES:
                rec = self._process_threshold_event(event)
            else:
                rec = self._process_cooldown_event(event, now)

            if rec is not None:
                fired.append(rec)

        return fired

    def _process_threshold_event(self, event: AnomalyEvent) -> Optional[Dict[str, Any]]:
        sk   = _state_key(event.service_id, event.metric)
        prev = self._alert_states.get(sk, "ok")
        new  = event.severity

        if prev == new:
            return None   # same state — silent

        self._alert_states[sk] = new
        show_toast = self._should_toast(new)
        rec = _make_alert_record(event, show_toast=show_toast)
        self._append_history(rec)
        return rec

    def _process_cooldown_event(self, event: AnomalyEvent, now: float) -> Optional[Dict[str, Any]]:
        key      = _dedup_key(event)
        cooldown = ANOMALY_COOLDOWN_SECONDS.get(event.severity, 300.0)
        last     = self._cooldowns.get(key, 0.0)

        if (now - last) < cooldown:
            return None

        self._cooldowns[key] = now
        show_toast = self._should_toast(event.severity)
        rec = _make_alert_record(event, show_toast=show_toast)
        self._append_history(rec)
        return rec

    def _should_toast(self, severity: str) -> bool:
        if self.simulation_mode:
            return severity in SIMULATION_TOAST_SEVERITIES
        return True

    def _append_history(self, record: Dict[str, Any]):
        self._alert_history.append(record)
        if len(self._alert_history) > 500:
            self._alert_history = self._alert_history[-500:]

    # ── Auto-resolution ────────────────────────────────────────────────────────

    def resolve_if_recovered(
        self,
        service_id: str,
        metric: str,
        current_value: float,
        warn_threshold: float,
    ) -> List[Dict[str, Any]]:
        """
        Call after each metric update. If the metric has dropped below warn_threshold
        and was previously alerting, emit a 'resolved' record to clear the state.
        """
        sk   = _state_key(service_id, metric)
        prev = self._alert_states.get(sk, "ok")

        if prev == "ok" or current_value >= warn_threshold:
            return []

        self._alert_states[sk] = "ok"
        event = AnomalyEvent(
            service_id=service_id, metric=metric,
            value=current_value, z_score=None,
            severity="resolved",
            message=f"{service_id} {metric} recovered ({current_value:.1f} < {warn_threshold:.1f})",
        )
        rec = _make_alert_record(event, show_toast=False)
        self._append_history(rec)
        return [rec]

    # ── State queries ──────────────────────────────────────────────────────────

    def get_current_state(self, service_id: str, metric: str) -> str:
        return self._alert_states.get(_state_key(service_id, metric), "ok")

    def get_all_alerting(self) -> Dict[str, str]:
        return {k: v for k, v in self._alert_states.items() if v != "ok"}

    # ── Async delivery ─────────────────────────────────────────────────────────

    async def fire_alerts(self, alerts: List[Dict[str, Any]]):
        for alert in alerts:
            for cb in list(self._listeners):
                try:
                    cb(alert)
                except Exception as exc:
                    logger.error("Listener error: %s", exc)

            if self.slack_webhook_url and alert.get("severity") in SLACK_SEVERITIES:
                asyncio.create_task(self._send_slack(alert))

    async def _send_slack(self, alert: Dict[str, Any]):
        if not AIOHTTP_AVAILABLE:
            return
        payload = _build_slack_payload(alert)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.slack_webhook_url, json=payload,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status != 200:
                        body = await resp.text()
                        logger.warning("Slack %d: %s", resp.status, body[:200])
        except Exception as exc:
            logger.error("Slack send failed: %s", exc)

    async def handle_events(self, events: List[AnomalyEvent]) -> List[Dict[str, Any]]:
        fired = self.process_events(events)
        if fired:
            await self.fire_alerts(fired)
        return fired

    # ── History / active ───────────────────────────────────────────────────────

    def get_recent_alerts(self, max_count: int = 50) -> List[Dict[str, Any]]:
        return self._alert_history[-max_count:]

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Return one alert record per currently alerting (service, metric) pair."""
        alerting = self.get_all_alerting()
        if not alerting:
            return []
        seen: set = set()
        active = []
        for alert in reversed(self._alert_history):
            sk = _state_key(alert["service_id"], alert["metric"])
            if sk in seen or sk not in alerting:
                continue
            active.append(alert)
            seen.add(sk)
        return active

    def reset_all_states(self):
        """Clear state machine + cooldowns. Call on simulation stop/restart."""
        self._alert_states.clear()
        self._cooldowns.clear()


# ── Module-level singleton ─────────────────────────────────────────────────────
default_alert_manager = AlertManager()
