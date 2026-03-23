# Digital Chaos Lab v2

Real-time distributed system observability platform with chaos injection, anomaly detection, and predictive alerting.

## What's New in v2

| Feature | Status |
|---|---|
| Excel/CSV config → auto-built node graph | ✅ |
| Live API polling (async aiohttp) | ✅ |
| Z-score anomaly detection (3σ) | ✅ |
| Linear regression breach prediction | ✅ |
| Cascade pattern detection | ✅ |
| Slack webhook alerts | ✅ |
| Alert deduplication / cooldown | ✅ |
| Alert toast notifications (UI) | ✅ |
| Sparkline history charts (UI) | ✅ |
| Prediction countdown timers on nodes | ✅ |
| Filter by service type | ✅ |
| Export state to JSON | ✅ |
| Dark / light mode toggle | ✅ |
| Docker Compose (backend + Redis) | ✅ |

---

## Quick Start (Local Dev)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                        # opens http://localhost:5173
```

---

## Docker Compose (Full Stack)

```bash
# Optional: set Slack webhook
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

docker-compose up --build
```

Services:
- `backend` → http://localhost:8000
- `frontend` → http://localhost:5173
- `redis` → localhost:6379

---

## Loading Services from Excel/CSV

1. Edit `config/services.csv` (or create a `.xlsx` file with the same columns)
2. In the UI toolbar click **Config** and enter the file path (relative to where the backend runs, e.g. `../config/services.csv`)
3. The node graph is auto-built from the dependency relationships

### Config Schema

| Column | Description |
|---|---|
| `service_id` | Unique identifier (used as node ID) |
| `service_name` | Display name |
| `service_type` | `lb` / `api` / `cache` / `db` / `queue` / `worker` |
| `api_endpoint` | URL to poll for live metrics (leave blank for simulation-only) |
| `auth_token` | `Bearer <token>`, `Basic <b64>`, or `token:<raw>` |
| `max_capacity` | Max requests/second |
| `warn_threshold_pct` | Load % to trigger warning (default 70) |
| `critical_threshold_pct` | Load % to trigger critical (default 90) |
| `slo_latency_p99_ms` | P99 latency SLO in ms |
| `slo_error_rate_pct` | Max acceptable error rate % |
| `depends_on` | Comma-separated list of upstream `service_id`s |
| `metric_paths` | JSON mapping logical names → API response paths (e.g. `{"rps":"$.data.rps"}`) |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SLACK_WEBHOOK_URL` | `` | Slack incoming webhook URL |
| `RUNBOOK_BASE_URL` | `https://runbooks.example.com` | Base URL for runbook links in alerts |

---

## API Reference

### New v2 Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/config/load?file_path=…` | Load Excel/CSV config |
| `GET` | `/api/config/services` | List loaded services |
| `GET` | `/api/config/graph` | Get auto-built node graph |
| `GET` | `/api/poller/stats` | Polling health stats |
| `GET` | `/api/alerts/recent` | Last N fired alerts |
| `GET` | `/api/alerts/active` | Alerts within cooldown window |

### WebSocket Message Types (`/ws/simulation/{sim_id}`)

**Server → Client:**

| Type | Payload | When |
|---|---|---|
| `full_state` | `{ graph, metrics, alerts, timestamp }` | On start + every 10th tick + export |
| `node_update` | `{ graph, metrics, timestamp }` | Every tick |
| `alert` | `{ alert: { severity, message, runbook, … } }` | When alert fires |
| `stopped` | `{ message }` | After stop command |

Each node in `graph.nodes` now includes:
- `prediction: { breach_time_min, trend, slope_per_min }`
- `health_score: 0.0–1.0`

---

## Running Tests

```bash
cd backend
python -m pytest ../tests/test_polling.py -v
```

21 tests covering excel_loader, normalizer, anomaly_detector, alert_manager, and api_poller.

---

## Architecture

```
Browser (React + ReactFlow)
  ↕ WebSocket (full_state / node_update / alert)
FastAPI Backend
  ├── SimulationEngine   — M/M/1 queue theory physics
  ├── excel_loader       — CSV/XLSX → node graph
  ├── api_poller         — async HTTP polling (aiohttp)
  ├── normalizer         — unified metric schema
  ├── anomaly_detector   — Z-score + linear regression
  └── alert_manager      — Slack webhooks + dedup
```
