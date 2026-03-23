"""
excel_loader.py — Parse Excel/CSV service config → node graph

Supports:
  • CSV files (always available)
  • XLSX files (requires openpyxl: pip install openpyxl)

Excel/CSV schema columns:
  service_id, service_name, service_type, api_endpoint, auth_token,
  max_capacity, warn_threshold_pct, critical_threshold_pct,
  slo_latency_p99_ms, slo_error_rate_pct, depends_on, metric_paths
"""

import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

# Normalize shorthand service type strings to canonical names used by the frontend
TYPE_MAP: Dict[str, str] = {
    "lb":               "load_balancer",
    "load_balancer":    "load_balancer",
    "api":              "api_service",
    "api_service":      "api_service",
    "cache":            "cache",
    "db":               "database",
    "database":         "database",
    "queue":            "message_queue",
    "message_queue":    "message_queue",
    "worker":           "worker",
    # New types
    "cdn":              "cdn",
    "rate_limiter":     "rate_limiter",
    "ratelimiter":      "rate_limiter",
    "external_api":     "external_api",
    "external":         "external_api",
    "monitoring_agent": "monitoring_agent",
    "monitor":          "monitoring_agent",
    "agent":            "monitoring_agent",
    "autoscaler":       "autoscaler",
    "auto_scaler":      "autoscaler",
    "circuit_breaker":  "circuit_breaker",
    "breaker":          "circuit_breaker",
    "service_mesh":     "service_mesh",
    "mesh":             "service_mesh",
    "log_aggregator":   "log_aggregator",
    "logs":             "log_aggregator",
    "backup_storage":   "backup_storage",
    "backup":           "backup_storage",
    "storage":          "backup_storage",
    "alert_manager":    "alert_manager",
    "alertmanager":     "alert_manager",
}

TYPE_ICON: Dict[str, str] = {
    "load_balancer":    "Scale",
    "api_service":      "Plug",
    "database":         "Database",
    "cache":            "Zap",
    "message_queue":    "Inbox",
    "worker":           "Settings",
    "cdn":              "Globe",
    "rate_limiter":     "ShieldCheck",
    "external_api":     "ExternalLink",
    "monitoring_agent": "Eye",
    "autoscaler":       "ArrowUpDown",
    "circuit_breaker":  "ShieldOff",
    "service_mesh":     "Network",
    "log_aggregator":   "FileText",
    "backup_storage":   "HardDrive",
    "alert_manager":    "BellRing",
}

TYPE_COLOR: Dict[str, str] = {
    "load_balancer":    "#3b82f6",
    "api_service":      "#10b981",
    "database":         "#8b5cf6",
    "cache":            "#f59e0b",
    "message_queue":    "#ec4899",
    "worker":           "#06b6d4",
    "cdn":              "#0ea5e9",
    "rate_limiter":     "#84cc16",
    "external_api":     "#f97316",
    "monitoring_agent": "#a78bfa",
    "autoscaler":       "#34d399",
    "circuit_breaker":  "#fb923c",
    "service_mesh":     "#22d3ee",
    "log_aggregator":   "#94a3b8",
    "backup_storage":   "#d97706",
    "alert_manager":    "#f43f5e",
}

# Column layout order for auto-positioning nodes in the graph
TYPE_COLUMN_ORDER = [
    "cdn", "rate_limiter", "load_balancer",
    "api_service", "circuit_breaker", "service_mesh",
    "cache", "database", "backup_storage",
    "message_queue", "worker", "autoscaler",
    "monitoring_agent", "log_aggregator", "alert_manager",
    "external_api",
]


def _safe_int(val: Any, default: int) -> int:
    try:
        return int(val) if val not in (None, "", "None") else default
    except (ValueError, TypeError):
        return default


def _safe_float(val: Any, default: float) -> float:
    try:
        return float(val) if val not in (None, "", "None") else default
    except (ValueError, TypeError):
        return default


def _parse_row(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert a raw CSV/Excel row dict into a normalised service config dict."""
    service_id = str(row.get("service_id", "")).strip()
    if not service_id:
        return None

    raw_type = str(row.get("service_type", "api")).lower().strip()
    service_type = TYPE_MAP.get(raw_type, "api_service")

    # depends_on: comma-separated list of service_ids
    depends_on: List[str] = []
    raw_deps = row.get("depends_on", "")
    if raw_deps and str(raw_deps).strip():
        depends_on = [s.strip() for s in str(raw_deps).split(",") if s.strip()]

    # metric_paths: JSON mapping logical names → JSON paths in the service API response
    metric_paths: Dict[str, str] = {}
    raw_mp = row.get("metric_paths", "")
    if raw_mp and str(raw_mp).strip():
        try:
            metric_paths = json.loads(str(raw_mp))
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "service_id":            service_id,
        "service_name":          str(row.get("service_name", service_id)).strip(),
        "service_type":          service_type,
        "api_endpoint":          str(row.get("api_endpoint", "")).strip(),
        "auth_token":            str(row.get("auth_token", "")).strip(),
        "max_capacity":          _safe_int(row.get("max_capacity"), 500),
        "warn_threshold_pct":    _safe_float(row.get("warn_threshold_pct"), 70.0),
        "critical_threshold_pct": _safe_float(row.get("critical_threshold_pct"), 90.0),
        "slo_latency_p99_ms":    _safe_int(row.get("slo_latency_p99_ms"), 500),
        "slo_error_rate_pct":    _safe_float(row.get("slo_error_rate_pct"), 1.0),
        "depends_on":            depends_on,
        "metric_paths":          metric_paths,
    }


def load_csv(file_path: str) -> List[Dict[str, Any]]:
    """Load service definitions from a CSV file."""
    services = []
    with open(file_path, "r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed = _parse_row(row)
            if parsed:
                services.append(parsed)
    return services


def load_xlsx(file_path: str) -> List[Dict[str, Any]]:
    """Load service definitions from an Excel (.xlsx) file."""
    if not OPENPYXL_AVAILABLE:
        raise ImportError(
            "openpyxl is required for XLSX support. Install it with: pip install openpyxl"
        )
    wb = openpyxl.load_workbook(file_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    headers = [str(h).strip() if h else "" for h in rows[0]]
    services = []
    for row_vals in rows[1:]:
        if not row_vals or not row_vals[0]:
            continue
        row_dict = {headers[i]: row_vals[i] for i in range(min(len(headers), len(row_vals)))}
        parsed = _parse_row(row_dict)
        if parsed:
            services.append(parsed)
    return services


def load_config(file_path: str) -> List[Dict[str, Any]]:
    """Auto-detect file type (CSV or XLSX) and load service definitions."""
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix in (".xlsx", ".xls"):
        return load_xlsx(file_path)
    elif suffix == ".csv":
        return load_csv(file_path)
    else:
        raise ValueError(f"Unsupported config file type: {suffix!r}. Use .csv or .xlsx")


def build_node_graph(services: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convert a list of service config dicts into a ReactFlow-compatible node graph.

    Returns:
        {"nodes": [...], "edges": [...]}  — ready to POST to /api/simulation/create
    """
    # Group services by type for column layout
    type_groups: Dict[str, List[Dict[str, Any]]] = {}
    for svc in services:
        t = svc["service_type"]
        type_groups.setdefault(t, []).append(svc)

    # Assign (x, y) positions — columns by type, rows within each column
    COL_SPACING = 260
    ROW_SPACING = 160
    service_positions: Dict[str, tuple] = {}

    for col_idx, stype in enumerate(TYPE_COLUMN_ORDER):
        for row_idx, svc in enumerate(type_groups.get(stype, [])):
            x = col_idx * COL_SPACING + 80
            y = row_idx * ROW_SPACING + 100
            service_positions[svc["service_id"]] = (x, y)

    # Any types not in the ordered list get appended at the end
    extra_col = len(TYPE_COLUMN_ORDER)
    for stype, svcs in type_groups.items():
        if stype not in TYPE_COLUMN_ORDER:
            for row_idx, svc in enumerate(svcs):
                service_positions.setdefault(svc["service_id"], (extra_col * COL_SPACING + 80, row_idx * ROW_SPACING + 100))

    nodes = []
    edges = []

    for svc in services:
        sid = svc["service_id"]
        pos = service_positions.get(sid, (100, 100))
        stype = svc["service_type"]

        # Convert SLO values into node config understood by the simulation engine
        base_latency = max(5, svc["slo_latency_p99_ms"] // 10)
        failure_threshold = min(0.99, svc["critical_threshold_pct"] / 100.0)
        timeout = svc["slo_latency_p99_ms"] * 2

        nodes.append({
            "id": sid,
            "type": "custom",
            "position": {"x": pos[0], "y": pos[1]},
            "data": {
                "label":   svc["service_name"],
                "type":    stype,
                "icon":    TYPE_ICON.get(stype, "Server"),
                "color":   TYPE_COLOR.get(stype, "#6b7280"),
                "config": {
                    "baseLatency":      base_latency,
                    "maxCapacity":      svc["max_capacity"],
                    "retryPolicy":      "linear",
                    "failureThreshold": failure_threshold,
                    "timeout":          timeout,
                },
                "service_config": svc,
                # Runtime fields — populated once simulation/polling starts
                "status":       "healthy",
                "utilization":  0.0,
                "currentLatency": 0,
            },
        })

        # Edges from depends_on relationships
        for dep_id in svc.get("depends_on", []):
            edges.append({
                "id":       f"e-{dep_id}-{sid}",
                "source":   dep_id,
                "target":   sid,
                "animated": True,
                "style":    {"stroke": "#4b5563", "strokeWidth": 2},
            })

    return {"nodes": nodes, "edges": edges}
