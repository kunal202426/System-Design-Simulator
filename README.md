<div align="center">
  <h1>🖥️ System Design Simulator — Digital Chaos Lab</h1>
  <p><strong>Real-time distributed system observability platform with chaos injection, anomaly detection, and predictive alerting</strong></p>

  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge"/>

  <br/><br/>
  <a href="https://github.com/kunal202426/System-Design-Simulator/issues">🐛 Report Bug</a> &nbsp;•&nbsp;
  <a href="https://github.com/kunal202426/System-Design-Simulator">⭐ Star this repo</a>
</div>

---

## 📖 Overview

Digital Chaos Lab is a real-time distributed system simulator that lets you model microservice architectures, inject failures, and observe cascading effects — all from a browser UI. Built with FastAPI + WebSockets for live streaming metrics, and React + ReactFlow for interactive node graph visualization.

---

## ✨ Features (v2)

| Feature | Description |
|---------|-------------|
| 📄 Excel/CSV Config | Auto-builds node graph from config file |
| 📡 Live API Polling | Async `aiohttp` poller for real service metrics |
| 🚨 Anomaly Detection | Z-score based 3σ anomaly flagging |
| 🔮 Breach Prediction | Linear regression countdown timers on nodes |
| 🌊 Cascade Detection | Detects cascading failure patterns |
| 🔔 Slack Alerts | Webhook alerts with deduplication & cooldown |
| 📊 Sparkline Charts | Live history charts per node |
| 🎨 Dark/Light Mode | UI theme toggle |
| 📤 JSON Export | Export full simulation state |
| 🐳 Docker Compose | Full-stack backend + Redis in one command |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, WebSockets, aiohttp |
| Frontend | React, ReactFlow, TypeScript |
| Cache | Redis |
| Deployment | Docker Compose, Vercel (frontend), Render (backend) |
| Alerts | Slack Webhooks |

---

## 🚀 Quick Start (Local Dev)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### Docker (Full Stack)
```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
docker-compose up --build
```

---

## 📄 Config Schema (CSV/Excel)

| Column | Description |
|--------|-------------|
| `service_id` | Unique node identifier |
| `service_name` | Display name |
| `service_type` | `lb` / `api` / `cache` / `db` / `queue` / `worker` |
| `api_endpoint` | URL to poll for live metrics |
| `max_capacity` | Max requests/second |
| `warn_threshold_pct` | Warning load % (default 70) |
| `critical_threshold_pct` | Critical load % (default 90) |
| `slo_latency_p99_ms` | P99 latency SLO in ms |
| `depends_on` | Comma-separated upstream service IDs |

---

## 🌐 Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook |
| `RUNBOOK_BASE_URL` | Base URL for runbook links |
| `VITE_API_URL` | Backend API URL (frontend) |
| `VITE_WS_URL` | WebSocket URL (use `wss://` in prod) |

---

## 🔌 API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/config/load?file_path=…` | Load Excel/CSV config |
| `GET` | `/api/config/graph` | Get auto-built node graph |
| `GET` | `/api/alerts/recent` | Last N fired alerts |
| `GET` | `/api/alerts/active` | Active alerts |
| `WS` | `/ws/simulation/{sim_id}` | Live simulation stream |

---

## 🧪 Tests

```bash
cd backend
python -m pytest ../tests/test_polling.py -v
```
21 tests covering excel_loader, normalizer, anomaly_detector, alert_manager, and api_poller.

---

## 📁 Architecture

```
Browser (React + ReactFlow)
    └── WebSocket → FastAPI Backend
            ├── SimulationEngine
            ├── excel_loader
            ├── api_poller (aiohttp)
            ├── anomaly_detector (Z-score)
            ├── alert_manager (Slack)
            └── Redis (deduplication)
```

---

## 📄 License

MIT © [Kunal Mathur](https://github.com/kunal202426)
