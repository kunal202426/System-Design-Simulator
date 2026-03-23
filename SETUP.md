# 🚀 Digital Chaos Lab — Setup & Run Guide

Complete step-by-step instructions to get the Digital Chaos Lab running on your machine.

---

## 📋 Prerequisites

### Required Software
- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** (optional, for cloning)

### Check Versions
```bash
python --version   # Should be 3.11 or higher
node --version     # Should be 18 or higher
npm --version      # Should be 8 or higher
```

---

## 🛠️ Installation

### Step 1: Navigate to Project Directory
```bash
cd "c:\Users\kunal\Desktop\Choas Sim\digital-chaos-lab"
```

### Step 2: Backend Setup (Python FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

**Required packages** (should be installed):
- `fastapi` — Web framework
- `uvicorn` — ASGI server
- `websockets` — WebSocket support
- `numpy` — Anomaly detection math
- `openpyxl` — Excel file support
- `aiohttp` — Async HTTP client
- `pydantic` — Data validation

### Step 3: Frontend Setup (React + Vite)

```bash
# Navigate to frontend directory (from project root)
cd ../frontend

# Install Node dependencies
npm install

# This will install:
# - react, react-dom
# - reactflow (node graph visualization)
# - lucide-react (icons)
# - vite (build tool)
```

---

## ▶️ Running the Application

### Option 1: Run Both Servers Manually (Recommended for Development)

#### Terminal 1 — Backend Server
```bash
cd backend

# Activate venv if not already active
venv\Scripts\activate

# Start FastAPI backend on port 8000
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx]
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Backend is ready when you see:** `Application startup complete`

#### Terminal 2 — Frontend Dev Server
```bash
cd frontend

# Start Vite dev server (hot reload enabled)
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Frontend is ready!** Open browser to: **http://localhost:5173**

---

### Option 2: Production Build

```bash
# Build frontend for production
cd frontend
npm run build

# Serve with a static server
npm install -g serve
serve -s dist -l 5173
```

---

## 🧪 Verify Everything Works

### 1. Check Backend Health
Open browser to: **http://localhost:8000/docs**

You should see the **FastAPI Swagger UI** with these endpoints:
- `GET /` — Health check
- `POST /api/simulation/create` — Create simulation
- `GET /api/simulation/state` — Get current state
- `WS /ws` — WebSocket endpoint
- `POST /api/config/load` — Load config file
- `GET /api/alerts/recent` — Get recent alerts

### 2. Check Frontend
Open browser to: **http://localhost:5173**

You should see:
- **Compact 50px header** at top (Chaos Lab badge, entry node selector, Start button)
- **Main canvas area** (empty initially, ready for nodes)
- **60px icon strip** on right side (Add ⊞, Chaos ⚡, Settings ⚙, Alerts 🔔)
- **40px status bar** at bottom (shows "Sim: STOPPED | RPS: — | ...")

### 3. Test Basic Flow

#### Step A: Add Nodes
1. Click **⊞ Add** icon on right sidebar
2. Drag **Load Balancer** onto canvas (or click to add at center)
3. Drag **API Service** onto canvas
4. Drag **Database** onto canvas

#### Step B: Connect Nodes
1. Drag from **Load Balancer** bottom handle to **API Service** top handle
2. Drag from **API Service** bottom handle to **Database** top handle

#### Step C: Start Simulation
1. In header, select **Entry Node** → "Load Balancer"
2. Set **Traffic** to `1000` req/s
3. Click **▶ Start**

**Expected:**
- Status bar shows "Sim: RUNNING" with green dot
- RPS counter updates in real-time
- Nodes animate with utilization bars
- WebSocket indicator shows "Live" (green)

#### Step D: Inject Chaos
1. Click **⚡ Chaos** icon on right sidebar
2. Select a node from dropdown
3. Click **Crash Node** or **Apply 5× Latency**
4. Watch metrics spike, alerts fire

#### Step E: View Alerts
1. Click **🔔 Alerts** icon on right sidebar
2. See all fired alerts (critical, warning, anomaly, predicted)
3. Dismiss alerts with ✕ button

---

## 📂 Loading Config Files

### Use Sample Config
```bash
# From project root
cd backend
python -c "
import excel_loader
services = excel_loader.load_config('../config/services.csv')
print(f'Loaded {len(services)} services')
"
```

### Load via UI
1. Click **📂 Config** button in header
2. Type path: `config/services.csv` (or `../config/services.csv` depending on working dir)
3. Click **Load**
4. Canvas auto-populates with 8-node topology

---

## 🐛 Troubleshooting

### Backend fails to start
**Error**: `ModuleNotFoundError: No module named 'fastapi'`
```bash
cd backend
pip install -r requirements.txt --upgrade
```

**Error**: `Port 8000 already in use`
```bash
# Kill existing process
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Or use different port:
uvicorn main:app --port 8001
```

### Frontend fails to start
**Error**: `npm ERR! code ENOENT`
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error**: `VITE v5.x.x failed to start`
```bash
# Check Node version
node --version  # Must be 18+

# Clear cache
npm cache clean --force
npm install
```

### WebSocket connection fails
**Symptom**: Status bar shows "Ready" (grey) instead of "Live" (green)

**Fix**:
1. Verify backend is running on **http://localhost:8000**
2. Check browser console for errors
3. Open `frontend/src/services/websocket.js` and verify:
   ```javascript
   const WS_URL = 'ws://localhost:8000/ws';
   ```
4. If using different port, update this URL

### Nodes not appearing after drag
**Symptom**: Drag node from sidebar, nothing appears on canvas

**Fix**:
1. Check browser console for React errors
2. Verify `frontend/src/services/nodeTypes.js` has all 16 node types
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Alerts not showing
**Symptom**: Simulation running but no alerts in sidebar

**Cause**: Alert thresholds not crossed yet

**Fix**:
1. Inject chaos: Click ⚡ → **10× Traffic** or **Crash Node**
2. Check Settings → Alert volume not muted
3. Lower thresholds in `backend/alert_manager.py` if needed (default: 70% warn, 90% critical)

---

## 📊 Understanding the UI

### Header (50px top bar)
- **🏛 Chaos Lab** — Project badge (tooltip shows full name)
- **Entry Node** — Dropdown to select traffic entry point
- **Traffic** — Request rate (100-10,000 req/s)
- **▶ Start / ■ Stop** — Simulation control
- **Filter** — Filter nodes by type
- **📂 Config** — Load CSV/XLSX topology
- **⬇ Export** — Download state as JSON (only when running)
- **☀/🌙** — Toggle dark/light mode
- **WS Indicator** — Live (green) / Connecting (amber) / Ready (grey)

### Right Sidebar (60px icon strip)
**Four collapsible widgets** (click icon to expand/collapse):

1. **⊞ Add Component**
   - Search bar for filtering
   - 16 draggable node types (CDN, Load Balancer, API, Cache, DB, Queue, Worker, Rate Limiter, External API, Monitor, Autoscaler, Circuit Breaker, Service Mesh, Log Aggregator, Backup Storage, Alert Manager)
   - Status legend at bottom (Healthy/Stressed/Failing/Down)

2. **⚡ Chaos Injection**
   - **Node Crash** — Kill selected node
   - **Latency Spike** — 2×/5×/10× multipliers
   - **Traffic Spike** — 3×/5×/10× multipliers
   - **Presets**: Black Friday (10× traffic), DB Crash, DDoS (20× traffic), Lag (5× latency)
   - **Clear All** — Remove all injections

3. **⚙ Settings**
   - **Alerts**: Mute toasts, Simulation mode (suppresses warning toasts)
   - **Polling**: Poll interval (5-60s)
   - **Anomaly Detection**: Z-score threshold (1.5σ-5σ), Prediction horizon (5-120min)
   - **Display**: Sparkline points (10-60), Show health score %, Show prediction timers

4. **🔔 Alerts**
   - List of all alerts (last 50, reversed)
   - Color-coded by severity: Critical (red), Warning (amber), Cascade (orange), Anomaly (cyan), Predicted (purple), Resolved (green)
   - Click ✕ to dismiss
   - Selected node detail at bottom (status, load, latency, health)

### Canvas Area (flex: 1)
- **ReactFlow graph** — Drag nodes, connect handles
- **Delete / Clear buttons** — Top right (above icon strip)
- **Layout button** — Auto-arrange (appears when >6 nodes)
- **Node count pill** — Bottom right (e.g., "8n · 7e")
- **Config panel** — Opens when node clicked (slides in from right, left of icon strip)

### Bottom Sparkline Panel (180px collapsible)
- Click tab to expand/collapse
- Shows 4 sparklines for **selected node**: Load %, Latency ms, RPS, Errors %
- Prediction breach timer (if applicable)

### Status Bar (40px bottom)
- **Sim:** RUNNING (green) / STOPPED (grey)
- **RPS:** Real-time throughput
- **P99:** Average P99 latency
- **Load:** Average node utilization
- **Alerts:** Count + critical badge
- **Node status pills:** Healthy/Stressed/Failing/Down counts
- **Collapse %:** System collapse risk
- **Uptime:** Elapsed time since start
- **Clock:** Current time (HH:MM:SS)

---

## 🎨 Color Theme

The UI now uses **enhanced dark theme** with better contrast:
- **Main background**: `#0f1419` (dark navy)
- **Panels**: `#1a1f2e` (lighter grey-blue)
- **Status bar**: `#111827` (medium grey)
- **Borders**: `#374151` (visible separator)
- **Text**: `#e5e7eb` (bright white) / `#9ca3af` (muted labels)
- **Accents**: See each component for status colors

All text has **WCAG AA contrast** for readability.

---

## 📝 Next Steps

1. ✅ **Load sample topology**: Click 📂 Config → `config/services.csv`
2. ✅ **Start simulation**: Select entry node → ▶ Start
3. ✅ **Inject chaos**: Click ⚡ → try different scenarios
4. ✅ **Enable real API polling**: Edit `backend/main.py` to set `ENABLE_REAL_API_POLLING = True`
5. ✅ **Add Slack webhook**: Set `SLACK_WEBHOOK_URL` env var for alerts
6. ✅ **Configure thresholds**: Edit `config/services.csv` warn/critical thresholds

---

## 🔗 Useful URLs

- **Frontend UI**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/
- **WebSocket**: ws://localhost:8000/ws

---

## 💡 Pro Tips

1. **Keyboard shortcuts**:
   - `Delete` / `Backspace` — Delete selected nodes
   - `Escape` — Close config panel + active widget

2. **Multi-select**: Hold `Shift` and click multiple nodes, then Delete

3. **Auto-layout**: When canvas gets messy, click **Layout** button

4. **Export state**: Click **⬇ Export** during simulation to save JSON snapshot

5. **Filter by type**: Use header dropdown to dim all other node types

6. **Toast alerts**: Critical alerts show as toasts (top-right); warnings go to sidebar only (configurable in Settings)

---

Need help? Check the [GitHub Issues](https://github.com/anthropics/claude-code/issues) or ask in community forums!
