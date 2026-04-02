"""
main.py — Digital Chaos Lab API v2
FastAPI server with:
  • Backward-compatible simulation endpoints
  • Excel/CSV config loading → auto-built node graph
  • Live API polling management (wraps api_poller)
  • Anomaly detection + predictions per simulation step
  • Alert delivery to WebSocket clients
  • New WebSocket message types: full_state | node_update | alert | prediction_update
"""

import asyncio
import json
import logging
import os
import sys
import time
import traceback
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models.node import SystemGraph
from simulation.engine import SimulationEngine

# ── Optional enhanced-module imports (graceful if deps not installed) ──────────
_enhanced_ok = True
try:
    from excel_loader import build_node_graph, load_config as _load_config_file
    from api_poller import ApiPoller
    from anomaly_detector import AnomalyDetector
    from alert_manager import AlertManager
    from normalizer import normalize_from_simulation
except ImportError as _imp_err:
    _enhanced_ok = False
    logging.warning("Enhanced modules unavailable (%s) — running in simulation-only mode.", _imp_err)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Digital Chaos Lab API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        # Allow production frontend URLs from environment variable
        *os.environ.get("FRONTEND_URL", "").split(","),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ───────────────────────────────────────────────────────────────
active_simulations: Dict[str, SimulationEngine] = {}
loaded_services:    List[Dict[str, Any]] = []          # from excel/csv
loaded_graph:       Dict[str, Any]       = {}          # auto-built ReactFlow graph

# Enhanced singletons (only constructed if enhanced modules loaded)
if _enhanced_ok:
    poller        = ApiPoller(poll_interval_seconds=20.0)
    detector      = AnomalyDetector()
    alert_manager = AlertManager(
        slack_webhook_url=os.environ.get("SLACK_WEBHOOK_URL", "")
    )
else:
    poller = detector = alert_manager = None  # type: ignore


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "Digital Chaos Lab API",
        "status":  "running",
        "version": "2.0.0",
        "enhanced_modules": _enhanced_ok,
    }


# ── Config loading ─────────────────────────────────────────────────────────────
@app.post("/api/config/load")
async def load_config_endpoint(file_path: str):
    """
    Load service definitions from an Excel (.xlsx) or CSV file.
    Auto-builds and returns the ReactFlow node graph.
    """
    global loaded_services, loaded_graph

    if not _enhanced_ok:
        raise HTTPException(status_code=501, detail="Enhanced modules not installed. Run: pip install openpyxl aiohttp")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    try:
        loaded_services = _load_config_file(file_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse config: {exc}") from exc

    if not loaded_services:
        raise HTTPException(status_code=400, detail="No valid service rows found in the config file.")

    loaded_graph = build_node_graph(loaded_services)
    logger.info("Loaded %d services from %s", len(loaded_services), file_path)

    return {
        "status":        "ok",
        "service_count": len(loaded_services),
        "graph":         loaded_graph,
    }


@app.get("/api/config/services")
async def get_services():
    """Return currently loaded service definitions."""
    return {"services": loaded_services, "count": len(loaded_services)}


@app.get("/api/config/graph")
async def get_graph():
    """Return the auto-built ReactFlow node graph from the loaded config."""
    if not loaded_graph:
        return {"nodes": [], "edges": []}
    return loaded_graph


# ── Poller stats ───────────────────────────────────────────────────────────────
@app.get("/api/poller/stats")
async def get_poller_stats():
    if not _enhanced_ok:
        raise HTTPException(status_code=501, detail="Enhanced modules not installed")
    return poller.get_poll_stats()  # type: ignore[union-attr]


# ── Alert endpoints ────────────────────────────────────────────────────────────
@app.get("/api/alerts/recent")
async def get_recent_alerts(max_count: int = 50):
    if not _enhanced_ok or alert_manager is None:
        return {"alerts": []}
    return {"alerts": alert_manager.get_recent_alerts(max_count)}


@app.get("/api/alerts/active")
async def get_active_alerts():
    if not _enhanced_ok or alert_manager is None:
        return {"alerts": []}
    return {"alerts": alert_manager.get_active_alerts()}


# ── Simulation endpoints (backward-compatible) ─────────────────────────────────
@app.post("/api/simulation/create")
async def create_simulation(graph: SystemGraph):
    """Create a new simulation from a system graph description."""
    sim_id = f"sim_{len(active_simulations)}"
    engine = SimulationEngine(graph)
    active_simulations[sim_id] = engine
    logger.info("Created simulation %s (%d nodes, %d edges)", sim_id, len(graph.nodes), len(graph.edges))
    return {
        "simulationId": sim_id,
        "message":      "Simulation created",
        "nodeCount":    len(graph.nodes),
        "edgeCount":    len(graph.edges),
    }


@app.post("/api/simulation/{sim_id}/inject/crash")
async def inject_crash(sim_id: str, node_id: str):
    _require_sim(sim_id)
    active_simulations[sim_id].inject_node_crash(node_id)
    return {"message": f"Node {node_id} crashed"}


@app.post("/api/simulation/{sim_id}/inject/latency")
async def inject_latency(sim_id: str, node_id: str, multiplier: float = 10.0):
    _require_sim(sim_id)
    active_simulations[sim_id].inject_latency_spike(node_id, multiplier)
    return {"message": f"Latency spike on {node_id}: {multiplier}x"}


@app.post("/api/simulation/{sim_id}/inject/traffic")
async def inject_traffic(sim_id: str, multiplier: float = 5.0):
    _require_sim(sim_id)
    active_simulations[sim_id].inject_traffic_spike(multiplier)
    return {"message": f"Traffic spike: {multiplier}x"}


@app.post("/api/simulation/{sim_id}/inject/clear")
async def clear_injections(sim_id: str):
    _require_sim(sim_id)
    active_simulations[sim_id].clear_injections()
    return {"message": "All injections cleared"}


def _require_sim(sim_id: str):
    if sim_id not in active_simulations:
        raise HTTPException(status_code=404, detail=f"Simulation '{sim_id}' not found")


# ── Helpers — build enhanced node list ────────────────────────────────────────

def _services_by_id() -> Dict[str, Dict[str, Any]]:
    return {svc["service_id"]: svc for svc in loaded_services}


def _synthetic_service_config(node_state: Any) -> Dict[str, Any]:
    """Derive a minimal service config from a NodeState for nodes not in the loaded config."""
    cfg = node_state.config
    return {
        "service_id":             node_state.id,
        "service_name":           node_state.label,
        "service_type":           node_state.type,
        "max_capacity":           cfg.maxCapacity,
        "warn_threshold_pct":     70.0,
        "critical_threshold_pct": min(99.0, cfg.failureThreshold * 100.0),
        "slo_latency_p99_ms":     cfg.timeout,
        "metric_paths":           {},
    }


async def _enrich_nodes(
    nodes: list,
    alert_queue: asyncio.Queue,
) -> List[Dict[str, Any]]:
    """
    Annotate simulation NodeState objects with anomaly / prediction data.
    Returns a list of plain dicts ready for JSON serialisation.
    """
    svc_lookup = _services_by_id()
    enriched: List[Dict[str, Any]] = []

    for node in nodes:
        nd = node.dict()

        if _enhanced_ok and detector is not None and alert_manager is not None:
            svc_conf = svc_lookup.get(node.id) or _synthetic_service_config(node)
            norm     = normalize_from_simulation(nd, svc_conf)
            events, pred = detector.process(norm, svc_conf)

            fired = await alert_manager.handle_events(events)
            for fired_alert in fired:
                try:
                    alert_queue.put_nowait(fired_alert)
                except asyncio.QueueFull:
                    pass

            nd["prediction"]  = {
                "breach_time_min": pred.breach_time_min,
                "trend":           pred.trend,
                "slope_per_min":   pred.slope_per_minute,
            }
            nd["health_score"] = norm["health"]["score"]
            nd["live_status"]  = norm["health"]["status"]
        else:
            nd["prediction"]   = {"breach_time_min": None, "trend": "stable", "slope_per_min": 0.0}
            nd["health_score"] = max(0.0, 1.0 - node.failureRate)
            nd["live_status"]  = node.status

        enriched.append(nd)

    return enriched


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/simulation/{sim_id}")
async def simulation_websocket(websocket: WebSocket, sim_id: str):
    """
    Real-time WebSocket channel for a simulation.

    Server → client message types:
      full_state      — initial/periodic full graph + metrics + active alerts
      node_update     — per-tick graph + metrics
      alert           — fired alert record
      stopped         — simulation stopped confirmation

    Client → server actions (JSON):
      start           — { action, entryNodeId, trafficLoad }
      stop            — { action }
      inject_crash    — { action, nodeId }
      inject_latency  — { action, nodeId, multiplier }
      inject_traffic  — { action, multiplier }
      clear_injections— { action }
      filter_nodes    — { action, filterType }  (acknowledged, applied frontend-side)
      export_state    — { action }  → triggers full_state reply
    """
    await websocket.accept()
    logger.info("WebSocket connected: %s", sim_id)

    is_running     = False
    entry_node_id: Optional[str]   = None
    traffic_load:  int             = 0
    step_count:    int             = 0

    alert_queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    # Register listener so alert_manager pushes alerts into this WS's queue
    def _enqueue_alert(alert_dict: Dict[str, Any]):
        try:
            alert_queue.put_nowait(alert_dict)
        except asyncio.QueueFull:
            pass

    if _enhanced_ok and alert_manager is not None:
        alert_manager.add_listener(_enqueue_alert)

    try:
        while True:
            # ── Drain queued alert pushes first ──────────────────────────────
            while not alert_queue.empty():
                al = alert_queue.get_nowait()
                await websocket.send_json({"type": "alert", "alert": al})

            # ── Receive next command (non-blocking) ───────────────────────────
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                command = json.loads(raw)
                action  = command.get("action", "")

                if action == "start":
                    is_running    = True
                    entry_node_id = command.get("entryNodeId")
                    traffic_load  = int(command.get("trafficLoad", 1000))
                    step_count    = 0
                    logger.info("Simulation started: %d rps → %s", traffic_load, entry_node_id)

                    # Send full_state immediately so the UI populates instantly
                    if sim_id in active_simulations:
                        engine = active_simulations[sim_id]
                        g  = engine.step(traffic_load, entry_node_id)
                        mx = engine.get_system_metrics()
                        nodes  = await _enrich_nodes(g.nodes, alert_queue)
                        active = alert_manager.get_active_alerts() if (_enhanced_ok and alert_manager) else []
                        await websocket.send_json({
                            "type":      "full_state",
                            "graph":     {"nodes": nodes, "edges": [e.dict() for e in g.edges]},
                            "metrics":   mx,
                            "alerts":    active,
                            "timestamp": time.time(),
                        })

                elif action == "stop":
                    is_running = False
                    logger.info("Simulation stopped: %s", sim_id)
                    await websocket.send_json({"type": "stopped", "message": "Simulation stopped"})

                elif action == "inject_crash":
                    node_id = command.get("nodeId")
                    if sim_id in active_simulations:
                        active_simulations[sim_id].inject_node_crash(node_id)

                elif action == "inject_latency":
                    node_id    = command.get("nodeId")
                    multiplier = float(command.get("multiplier", 10.0))
                    if sim_id in active_simulations:
                        active_simulations[sim_id].inject_latency_spike(node_id, multiplier)

                elif action == "inject_traffic":
                    multiplier = float(command.get("multiplier", 5.0))
                    if sim_id in active_simulations:
                        active_simulations[sim_id].inject_traffic_spike(multiplier)

                elif action == "clear_injections":
                    if sim_id in active_simulations:
                        active_simulations[sim_id].clear_injections()

                elif action == "export_state":
                    # Respond with a fresh full_state for client-side JSON export
                    if is_running and sim_id in active_simulations:
                        engine = active_simulations[sim_id]
                        g  = engine.step(traffic_load, entry_node_id)
                        mx = engine.get_system_metrics()
                        nodes  = await _enrich_nodes(g.nodes, alert_queue)
                        active = alert_manager.get_active_alerts() if (_enhanced_ok and alert_manager) else []
                        await websocket.send_json({
                            "type":      "full_state",
                            "graph":     {"nodes": nodes, "edges": [e.dict() for e in g.edges]},
                            "metrics":   mx,
                            "alerts":    active,
                            "timestamp": time.time(),
                        })

                # filter_nodes is handled frontend-side; acknowledge silently

            except asyncio.TimeoutError:
                pass  # no command this tick

            # ── Simulation tick ───────────────────────────────────────────────
            if is_running and sim_id in active_simulations:
                engine = active_simulations[sim_id]
                g  = engine.step(traffic_load, entry_node_id)
                mx = engine.get_system_metrics()
                step_count += 1

                nodes = await _enrich_nodes(g.nodes, alert_queue)

                if step_count % 10 == 0:
                    # Periodic full refresh (includes active alerts)
                    active = alert_manager.get_active_alerts() if (_enhanced_ok and alert_manager) else []
                    msg = {
                        "type":      "full_state",
                        "graph":     {"nodes": nodes, "edges": [e.dict() for e in g.edges]},
                        "metrics":   mx,
                        "alerts":    active,
                        "timestamp": time.time(),
                    }
                else:
                    msg = {
                        "type":      "node_update",
                        "graph":     {"nodes": nodes, "edges": [e.dict() for e in g.edges]},
                        "metrics":   mx,
                        "timestamp": time.time(),
                    }

                await websocket.send_json(msg)
                await asyncio.sleep(0.2)
            else:
                await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", sim_id)
    except Exception as exc:
        logger.error("WebSocket error on %s: %s", sim_id, exc)
        traceback.print_exc()
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        if _enhanced_ok and alert_manager is not None:
            alert_manager.remove_listener(_enqueue_alert)
        logger.info("WebSocket handler exited: %s", sim_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
