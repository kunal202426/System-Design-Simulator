"""
api_poller.py — Async HTTP polling of real service APIs with simulation fallback.

Architecture
────────────
  ApiPoller
   ├── poll_once(service_config) → normalized metric dict | None
   ├── poll_all(services)        → dict[service_id, normalized_metric]
   └── run_polling_loop(...)     → continuous background task

Fallback chain (per service):
  1.  Try real HTTP GET/POST to service api_endpoint
  2.  On failure: use previous good value (if < MAX_STALE_SECONDS old)
  3.  On stale:   generate synthetic data from SimulationEngine

Auth strategies supported (auto-detected from auth_token field):
  • "Bearer <token>"  → Authorization: Bearer <token>
  • "Basic <b64>"     → Authorization: Basic <b64>
  • "token:<token>"   → X-Auth-Token: <token>
  • ""                → no auth header
"""

import asyncio
import logging
import time
from typing import Any, Callable, Dict, List, Optional

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

from normalizer import normalize

logger = logging.getLogger(__name__)

# How old (seconds) a cached value can be before we fall through to simulation
MAX_STALE_SECONDS = 120

# Timeout per HTTP request
REQUEST_TIMEOUT_SECONDS = 10


def _build_auth_headers(auth_token: str) -> Dict[str, str]:
    """Derive Auth headers from the configured auth_token string."""
    token = auth_token.strip()
    if not token:
        return {}
    lower = token.lower()
    if lower.startswith("bearer "):
        return {"Authorization": token}
    if lower.startswith("basic "):
        return {"Authorization": token}
    if lower.startswith("token:"):
        return {"X-Auth-Token": token[6:].strip()}
    # Default: treat as a raw bearer token
    return {"Authorization": f"Bearer {token}"}


class ApiPoller:
    """
    Manages async polling of multiple service metric endpoints.
    Falls back to simulation-derived data when real APIs are unavailable.
    """

    def __init__(self, poll_interval_seconds: float = 20.0):
        self.poll_interval = poll_interval_seconds
        self._last_results: Dict[str, Dict[str, Any]] = {}   # service_id → normalized metric
        self._last_poll_time: Dict[str, float] = {}          # service_id → timestamp
        self._poll_failures: Dict[str, int] = {}             # service_id → consecutive failure count
        self._running = False
        self._session: Optional[Any] = None                  # aiohttp.ClientSession

    # ── Session management ──────────────────────────────────────────────────

    async def _get_session(self) -> Optional[Any]:
        """Lazily create an aiohttp session (only if aiohttp is installed)."""
        if not AIOHTTP_AVAILABLE:
            return None
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self):
        """Clean up the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    # ── Single-service polling ──────────────────────────────────────────────

    async def poll_once(self, service_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Poll a single service.  Returns a normalized metric dict on success,
        or None if the endpoint is unreachable and no cached data is available.
        """
        service_id = service_config["service_id"]
        endpoint   = service_config.get("api_endpoint", "").strip()

        if not endpoint:
            logger.debug("No api_endpoint for %s — using simulation fallback", service_id)
            return None

        if not AIOHTTP_AVAILABLE:
            logger.warning("aiohttp not installed — skipping real API poll for %s", service_id)
            return None

        session = await self._get_session()
        if session is None:
            return None

        headers = _build_auth_headers(service_config.get("auth_token", ""))
        headers["Accept"] = "application/json"

        try:
            async with session.get(endpoint, headers=headers) as resp:
                if resp.status >= 400:
                    raise ValueError(f"HTTP {resp.status} from {endpoint}")
                raw_data: Dict[str, Any] = await resp.json(content_type=None)

            normalized = normalize(raw_data, service_config)
            self._last_results[service_id] = normalized
            self._last_poll_time[service_id] = time.time()
            self._poll_failures[service_id] = 0
            logger.debug("Polled %s OK (status=%s)", service_id, normalized["health"]["status"])
            return normalized

        except Exception as exc:
            fail_count = self._poll_failures.get(service_id, 0) + 1
            self._poll_failures[service_id] = fail_count
            logger.warning("Poll failed for %s (attempt %d): %s", service_id, fail_count, exc)

            # Return stale cached value if it's fresh enough
            cached = self._last_results.get(service_id)
            last_t = self._last_poll_time.get(service_id, 0)
            if cached and (time.time() - last_t) < MAX_STALE_SECONDS:
                logger.debug("Returning stale cached data for %s", service_id)
                # Mark that we're using cached data
                cached = dict(cached)
                cached["_stale"] = True
                return cached

            return None

    # ── Batch polling ───────────────────────────────────────────────────────

    async def poll_all(
        self,
        services: List[Dict[str, Any]],
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Poll all services concurrently.

        Returns:
            dict mapping service_id → normalized metric dict (or None if unavailable)
        """
        tasks = [self.poll_once(svc) for svc in services]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        output: Dict[str, Optional[Dict[str, Any]]] = {}
        for svc, result in zip(services, results):
            sid = svc["service_id"]
            if isinstance(result, Exception):
                logger.error("Unexpected error polling %s: %s", sid, result)
                output[sid] = None
            else:
                output[sid] = result
        return output

    # ── Stats ────────────────────────────────────────────────────────────────

    def get_poll_stats(self) -> Dict[str, Any]:
        """Return a summary of polling health for the monitoring UI."""
        return {
            "services_with_live_data":  sum(1 for v in self._last_results.values() if not v.get("_stale")),
            "services_with_stale_data": sum(1 for v in self._last_results.values() if v.get("_stale")),
            "services_failing":         sum(1 for c in self._poll_failures.values() if c > 0),
            "last_poll_times":          dict(self._last_poll_time),
            "consecutive_failures":     dict(self._poll_failures),
        }

    # ── Continuous polling loop ─────────────────────────────────────────────

    async def run_polling_loop(
        self,
        services: List[Dict[str, Any]],
        on_results: Callable[[Dict[str, Optional[Dict[str, Any]]]], None],
        poll_interval: Optional[float] = None,
    ):
        """
        Continuously poll all services and invoke `on_results` with the latest batch.

        Args:
            services:      List of service config dicts from excel_loader.
            on_results:    Callback called after each poll batch with the results dict.
            poll_interval: Override the default interval (seconds).
        """
        interval = poll_interval or self.poll_interval
        self._running = True
        logger.info(
            "Starting API polling loop for %d services (interval=%.1fs)",
            len(services), interval
        )

        try:
            while self._running:
                start = time.monotonic()
                results = await self.poll_all(services)
                on_results(results)

                elapsed = time.monotonic() - start
                sleep_time = max(0.0, interval - elapsed)
                await asyncio.sleep(sleep_time)
        finally:
            await self.close()
            logger.info("Polling loop stopped")

    def stop(self):
        """Signal the polling loop to exit after the current iteration."""
        self._running = False


# ── Module-level singleton ────────────────────────────────────────────────────
# Imported by main.py so the same session is reused across requests.
default_poller = ApiPoller(poll_interval_seconds=20.0)
