# SYSTEM_DESIGN_SIMULATOR
Real-time distributed system observability platform with chaos injection, anomaly detection, and predictive alerting.

v2

| Features added
|---|---|
| Excel/CSV config → auto-built node graph 
| Live API polling (async aiohttp)
| Z-score anomaly detection (3σ)
| Linear regression breach prediction
| Cascade pattern detection 
| Slack webhook alerts 
| Alert deduplication / cooldown
| Alert toast notifications (UI) 
| Sparkline history charts (UI)
| Prediction countdown timers on nodes 
| Filter by service type
| Export state to JSON 
| Dark / light mode toggle
| Docker Compose (backend + Redis) 

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
  WebSocket (full_state / node_update / alert)
FastAPI Backend
  - SimulationEngine
  - excel_loader       
  - api_poller         
  - normalizer         
  - anomaly_detector  
  - alert_manager     
```

---

## Production Deployment

### Deploy to Vercel (Frontend) + Render (Backend)

#### Step 1: Deploy Backend to Render

1. **Connect your GitHub repository** to Render:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Blueprint"
   - Connect your repository: `https://github.com/kunal202426/System-Design-Simulator`
   - Render will automatically detect `render.yaml`

2. **Set environment variables** in Render dashboard:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   RUNBOOK_BASE_URL=https://runbooks.example.com
   FRONTEND_URL=https://your-app.vercel.app
   ```

3. **Copy your Render backend URL** after deployment:
   ```
   Example: https://digital-chaos-lab-api.onrender.com
   ```

#### Step 2: Deploy Frontend to Vercel

1. **Connect your GitHub repository** to Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your repository: `https://github.com/kunal202426/System-Design-Simulator`
   - Vercel will automatically detect the configuration from `vercel.json`

2. **Set environment variables** in Vercel dashboard:
   ```bash
   VITE_API_URL=https://digital-chaos-lab-api.onrender.com
   VITE_WS_URL=wss://digital-chaos-lab-api.onrender.com
   ```
   ⚠️ **Important**: Use `wss://` (not `ws://`) for WebSocket URL in production!

3. **Deploy** and copy your Vercel frontend URL

#### Step 3: Update CORS Configuration

Go back to **Render dashboard** and update the `FRONTEND_URL` environment variable:
```bash
FRONTEND_URL=https://your-app.vercel.app
```

Redeploy the backend service for CORS changes to take effect.

---

### Alternative: Deploy with Docker

Both frontend and backend can be deployed using Docker:

```bash
# Build and run with docker-compose
docker-compose up --build

# Or deploy to any Docker-compatible platform:
# - Railway.app
# - Fly.io
# - Google Cloud Run
# - AWS ECS
```

**Environment variables for Docker deployment:**
- Set `VITE_API_URL` and `VITE_WS_URL` as build args for frontend
- Set `PORT`, `SLACK_WEBHOOK_URL`, `FRONTEND_URL` for backend container

---

### Deployment Checklist

- [ ] Backend deployed to Render (or Docker platform)
- [ ] Backend URL copied
- [ ] Frontend environment variables set in Vercel
- [ ] Frontend deployed to Vercel
- [ ] Frontend URL copied
- [ ] Backend CORS updated with frontend URL
- [ ] WebSocket connection tested (check browser console)
- [ ] Slack webhook tested (optional)

---

### Troubleshooting

**Issue**: WebSocket connection fails with "Mixed Content" error  
**Solution**: Ensure you're using `wss://` (not `ws://`) in `VITE_WS_URL`

**Issue**: CORS errors in browser console  
**Solution**: Add your Vercel URL to `FRONTEND_URL` in Render environment variables

**Issue**: Backend fails to start on Render  
**Solution**: Check Render logs. Ensure all required dependencies are in `requirements.txt`

**Issue**: Frontend shows "localhost:8000" in production  
**Solution**: Verify `VITE_API_URL` and `VITE_WS_URL` are set in Vercel environment variables

---
