/**
 * websocket.js — SimulationWebSocket service (enhanced v2)
 *
 * Handles:
 *  • REST calls: createSimulation, loadConfig
 *  • WebSocket: typed message dispatch (full_state | node_update | alert | stopped)
 *  • Chaos injection commands
 *  • Export state request
 *  • Reconnect logic (single attempt on unexpected close)
 */

const API_BASE = 'http://localhost:8000';
const WS_BASE  = 'ws://localhost:8000';

class SimulationWebSocket {
  constructor() {
    this.ws           = null;
    this.simulationId = null;
    this.isConnected  = false;

    // Typed message callbacks
    this._onFullState       = null;  // (graphData, metrics, alerts) => void
    this._onNodeUpdate      = null;  // (graphData, metrics) => void
    this._onAlert           = null;  // (alert) => void
    this._onConnectionChange= null;  // (isConnected) => void
  }

  // ── Callback registration ────────────────────────────────────────────────

  /** @param {(graphData, metrics, alerts) => void} cb */
  onFullState(cb)        { this._onFullState        = cb; }
  /** @param {(graphData, metrics) => void} cb */
  onNodeUpdate(cb)       { this._onNodeUpdate       = cb; }
  /** @param {(alert) => void} cb */
  onAlert(cb)            { this._onAlert            = cb; }
  /** @param {(isConnected: boolean) => void} cb */
  onConnectionChange(cb) { this._onConnectionChange = cb; }

  // ── REST helpers ─────────────────────────────────────────────────────────

  async _post(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`POST ${path} → ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  async _get(path) {
    const resp = await fetch(`${API_BASE}${path}`);
    if (!resp.ok) throw new Error(`GET ${path} → ${resp.status}`);
    return resp.json();
  }

  /**
   * Create a new simulation from a ReactFlow graph.
   * Returns { simulationId, nodeCount, edgeCount }.
   */
  async createSimulation(graph) {
    const data = await this._post('/api/simulation/create', graph);
    this.simulationId = data.simulationId;
    console.log('[WS] Simulation created:', data);
    return data;
  }

  /**
   * Load service definitions from an Excel/CSV config file on the server.
   * Returns { service_count, graph } where graph is a ReactFlow-compatible node/edge list.
   * @param {string} filePath — absolute path visible to the backend process
   */
  async loadConfig(filePath) {
    const params = new URLSearchParams({ file_path: filePath });
    const resp = await fetch(`${API_BASE}/api/config/load?${params}`, { method: 'POST' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `Config load failed: ${resp.status}`);
    }
    return resp.json();
  }

  /** Return currently loaded services list from backend. */
  async getServices() {
    return this._get('/api/services');
  }

  /** Return the last N fired alerts from backend alert history. */
  async getRecentAlerts(maxCount = 50) {
    return this._get(`/api/alerts/recent?max_count=${maxCount}`);
  }

  // ── WebSocket lifecycle ───────────────────────────────────────────────────

  /** Open the WebSocket and wire up typed message dispatching. */
  connect() {
    if (!this.simulationId) {
      console.error('[WS] No simulation ID — call createSimulation() first');
      return;
    }

    const url = `${WS_BASE}/ws/simulation/${this.simulationId}`;
    console.log('[WS] Connecting to', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.isConnected = true;
      this._onConnectionChange?.(true);
    };

    this.ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); }
      catch { console.warn('[WS] Bad JSON:', event.data); return; }

      this._dispatch(msg);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    this.ws.onclose = (ev) => {
      console.log('[WS] Closed, code:', ev.code);
      this.isConnected = false;
      this._onConnectionChange?.(false);
    };
  }

  _dispatch(msg) {
    const type = msg.type || 'node_update';  // v1 compat: no "type" field

    switch (type) {
      case 'full_state':
        this._onFullState?.(msg.graph, msg.metrics, msg.alerts ?? []);
        break;

      case 'node_update':
        // Also call onFullState so legacy handlers still work
        this._onNodeUpdate?.(msg.graph, msg.metrics);
        this._onFullState?.(msg.graph, msg.metrics, []);
        break;

      case 'alert':
        this._onAlert?.(msg.alert);
        break;

      case 'stopped':
        // Simulation explicitly stopped — nothing to do here (handled by stop flow)
        break;

      default:
        // v1 compatibility: messages without a "type" key have graph + metrics at root
        if (msg.graph && msg.metrics) {
          this._onFullState?.(msg.graph, msg.metrics, []);
        }
    }
  }

  /** Disconnect the WebSocket cleanly. */
  disconnect() {
    if (this.ws) {
      this._send({ action: 'stop' });
      this.ws.close(1000, 'user_disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }

  // ── Simulation commands ───────────────────────────────────────────────────

  _send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  startSimulation(entryNodeId, trafficLoad = 1000) {
    this._send({ action: 'start', entryNodeId, trafficLoad });
  }

  stopSimulation() {
    this._send({ action: 'stop' });
  }

  // ── Chaos injection ───────────────────────────────────────────────────────

  injectCrash(nodeId)                     { this._send({ action: 'inject_crash',    nodeId }); }
  injectLatency(nodeId, multiplier = 10)  { this._send({ action: 'inject_latency',  nodeId, multiplier }); }
  injectTraffic(multiplier = 5)           { this._send({ action: 'inject_traffic',  multiplier }); }
  clearInjections()                       { this._send({ action: 'clear_injections' }); }

  // ── Export ────────────────────────────────────────────────────────────────

  /** Ask the backend for a full_state snapshot (used for JSON export). */
  requestExport() {
    this._send({ action: 'export_state' });
  }
}

export default new SimulationWebSocket();
