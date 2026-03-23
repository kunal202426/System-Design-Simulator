import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Trash2, Eraser, LayoutGrid, X, AlertTriangle, Info, Zap } from 'lucide-react';

import CustomNode           from './components/CustomNode';
import ConfigPanel          from './components/ConfigPanel';
import SimulationControls   from './components/SimulationControls';
import BottomSparklinePanel from './components/BottomSparklinePanel';
import StatusBar            from './components/StatusBar';
import RightSidebar         from './components/RightSidebar';

import simulationWS from './services/websocket';

// ─── constants ────────────────────────────────────────────────────────────────
let _nodeId = 0;
const nextId = () => `node_${_nodeId++}`;

const DEFAULT_SETTINGS = {
  alertsMuted: false,
  simulationMode: true,
  pollInterval: 20,
  zScoreThreshold: 3,
  predictionHorizonMin: 30,
  maxSparklinePoints: 20,
  showHealthScore: true,
  showPredictions: true,
};

const SEV_COLOR = {
  critical: '#ef4444', warning: '#f59e0b', cascade: '#f97316',
  anomaly: '#06b6d4', predicted: '#8b5cf6', resolved: '#10b981', info: '#3b82f6',
};
const SEV_ICON = { critical: AlertTriangle, warning: AlertTriangle, cascade: AlertTriangle, predicted: Zap, anomaly: Zap, info: Info };

// ─── Alert toast ──────────────────────────────────────────────────────────────
const AlertToast = ({ alert, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const Icon  = SEV_ICON[alert.severity] || Info;
  const color = SEV_COLOR[alert.severity] || '#9ca3af';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '11px 13px', borderRadius: '10px',
      backgroundColor: '#111827', border: `1px solid ${color}50`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)', maxWidth: '320px',
      animation: 'toastIn 0.2s ease',
    }}>
      <Icon size={14} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {alert.severity} — {alert.service_id}
        </div>
        <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '2px', lineHeight: '1.4', wordBreak: 'break-word' }}>
          {alert.message}
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
        <X size={12} />
      </button>
    </div>
  );
};

const ToastStack = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: '60px', right: '68px',
      zIndex: 1500, display: 'flex', flexDirection: 'column', gap: '6px',
      maxHeight: '60vh', overflowY: 'auto',
    }}>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:none; } }`}</style>
      {toasts.map(a => (
        <AlertToast key={a.id} alert={a} onDismiss={() => onDismiss(a.id)} />
      ))}
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
function AppInner() {
  const reactFlowWrapper  = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Selection
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedNode,  setSelectedNode]  = useState(null);

  // Simulation
  const [isRunning,      setIsRunning]      = useState(false);
  const [isConnected,    setIsConnected]    = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [metrics,        setMetrics]        = useState(null);

  // Alerts
  const [allAlerts,   setAllAlerts]   = useState([]);
  const [toastAlerts, setToastAlerts] = useState([]);

  // Predictions / sparklines
  const [predictions, setPredictions] = useState({});
  const [sparklines,  setSparklines]  = useState({});

  // UI
  const [filterType,         setFilterType]         = useState('');
  const [darkMode,           setDarkMode]           = useState(true);
  const [settings,           setSettings]           = useState(DEFAULT_SETTINGS);
  const [activeWidget,       setActiveWidget]       = useState(null);
  const [sparklinePanelOpen, setSparklinePanelOpen] = useState(false);

  const maxSparkline = settings.maxSparklinePoints ?? 20;

  // ── graph helpers ────────────────────────────────────────────────────────
  const onConnect   = useCallback(p => setEdges(e => addEdge({ ...p, animated: true }, e)), [setEdges]);
  const onDragOver  = useCallback(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    if (!rfInstance) return;
    const raw = e.dataTransfer.getData('application/reactflow');
    if (!raw) return;
    const nt = JSON.parse(raw);
    const pos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(nds => nds.concat({
      id: nextId(), type: 'custom', position: pos,
      data: {
        id: nt.id, label: nt.label, type: nt.id, icon: nt.icon, color: nt.color,
        config: { ...nt.defaultConfig, timeout: nt.defaultConfig.timeout ?? 5000 },
        status: 'healthy', utilization: 0, currentLatency: 0,
      },
    }));
  }, [rfInstance, setNodes]);

  // Add node at canvas center (from sidebar click)
  const handleAddNodeCenter = useCallback(nt => {
    const cx = rfInstance
      ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2 - 30, y: window.innerHeight / 2 - 50 })
      : { x: 200 + Math.random() * 200, y: 150 + Math.random() * 150 };
    setNodes(nds => nds.concat({
      id: nextId(), type: 'custom', position: cx,
      data: {
        id: nt.id, label: nt.label, type: nt.id, icon: nt.icon, color: nt.color,
        config: { ...nt.defaultConfig, timeout: nt.defaultConfig.timeout ?? 5000 },
        status: 'healthy', utilization: 0, currentLatency: 0,
      },
    }));
  }, [rfInstance, setNodes]);

  const onSelectionChange = useCallback(({ nodes: ns }) => setSelectedNodes(ns), []);
  const onNodeClick = useCallback((_e, node) => {
    setSelectedNode(node);
    setSparklinePanelOpen(true);
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedNodes.length) return;
    const ids = new Set(selectedNodes.map(n => n.id));
    setNodes(nds => nds.filter(n => !ids.has(n.id)));
    setEdges(eds => eds.filter(e => !ids.has(e.source) && !ids.has(e.target)));
    setSelectedNodes([]); setSelectedNode(null);
  }, [selectedNodes, setNodes, setEdges]);

  const clearAll = useCallback(() => {
    if (!nodes.length) return;
    if (!window.confirm('Delete all nodes?')) return;
    if (isRunning) { simulationWS.stopSimulation(); simulationWS.disconnect(); }
    setNodes([]); setEdges([]); setSelectedNodes([]); setSelectedNode(null);
    setMetrics(null); setIsRunning(false); setIsConnected(false);
    setAllAlerts([]); setToastAlerts([]); setPredictions({}); setSparklines({});
  }, [nodes.length, isRunning, setNodes, setEdges]);

  const updateNodeConfig = useCallback((nid, cfg) => {
    setNodes(nds => nds.map(n => n.id === nid ? { ...n, data: { ...n.data, config: cfg } } : n));
    setSelectedNode(prev => prev?.id === nid ? { ...prev, data: { ...prev.data, config: cfg } } : prev);
  }, [setNodes]);

  const autoLayout = useCallback(() => {
    if (!nodes.length) return;
    const COLS = Math.max(3, Math.ceil(Math.sqrt(nodes.length)));
    const CW = 220, RH = 160;
    setNodes(nds => nds.map((n, i) => ({ ...n, position: { x: (i % COLS) * CW + 80, y: Math.floor(i / COLS) * RH + 80 } })));
  }, [nodes.length, setNodes]);

  // ── keyboard ────────────────────────────────────────────────────────────
  const onKeyDown = useCallback(e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if (e.key === 'Escape') { setSelectedNode(null); setActiveWidget(null); }
  }, [deleteSelected]);

  // ── WebSocket ────────────────────────────────────────────────────────────
  const applyGraph = useCallback((graph, metricsData) => {
    if (!graph) return;
    const nmap = {};
    graph.nodes.forEach(n => { nmap[n.id] = n; });

    setNodes(nds => nds.map(node => {
      const bn = nmap[node.id];
      if (!bn) return node;
      return {
        ...node,
        data: {
          ...node.data,
          status: bn.status, utilization: bn.utilization,
          currentLatency: bn.currentLatency,
          prediction: bn.prediction, health_score: bn.health_score,
        },
      };
    }));

    setEdges(eds => eds.map(e => {
      const be = graph.edges?.find(ge => ge.id === e.id);
      if (!be?.traffic) return e;
      return { ...e, animated: true, style: { ...e.style, strokeWidth: Math.max(2, Math.min(9, be.traffic / 100)) } };
    }));

    if (metricsData) setMetrics(metricsData);

    const newPreds = {};
    graph.nodes.forEach(bn => { if (bn.prediction) newPreds[bn.id] = bn.prediction; });
    setPredictions(p => ({ ...p, ...newPreds }));

    setSparklines(prev => {
      const next = { ...prev };
      graph.nodes.forEach(bn => {
        const pt = {
          utilization: bn.utilization ?? 0, latency: bn.currentLatency ?? 0,
          rps: bn.metrics?.throughput?.rps ?? 0, errorRate: bn.metrics?.errors?.rate_pct ?? 0,
        };
        const arr = prev[bn.id] ?? [];
        next[bn.id] = [...arr.slice(-maxSparkline + 1), pt];
      });
      return next;
    });

    setSelectedNode(prev => {
      if (!prev) return prev;
      const bn = nmap[prev.id];
      if (!bn) return prev;
      return { ...prev, data: { ...prev.data, status: bn.status, utilization: bn.utilization, currentLatency: bn.currentLatency, prediction: bn.prediction, health_score: bn.health_score } };
    });
  }, [setNodes, setEdges, maxSparkline]);

  const handleAlert = useCallback(alert => {
    setAllAlerts(p => [...p.slice(-49), alert]);
    if (alert.show_toast !== false && !settings.alertsMuted) {
      setToastAlerts(p => [...p.slice(-9), alert]);
    }
  }, [settings.alertsMuted]);

  // ── simulation lifecycle ─────────────────────────────────────────────────
  const toBackend = useCallback(() => ({
    nodes: nodes.map(n => ({
      id: n.id, label: n.data.label, type: n.data.type ?? n.data.id,
      config: n.data.config, currentLoad: 0, utilization: 0, currentLatency: 0,
      queueLength: 0, failureRate: 0, status: 'healthy',
      totalProcessed: 0, totalFailed: 0, totalRetries: 0,
    })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, traffic: 0 })),
  }), [nodes, edges]);

  const startSimulation = useCallback(async (entryId, trafficLoad) => {
    if (!nodes.length) { alert('Add nodes first'); return; }
    setIsInitializing(true);
    try {
      await simulationWS.createSimulation(toBackend());
      simulationWS.onConnectionChange(ok => setIsConnected(ok));
      simulationWS.onFullState((g, m, aa) => {
        applyGraph(g, m);
        if (aa?.length) aa.forEach(handleAlert);
      });
      simulationWS.onNodeUpdate((g, m) => applyGraph(g, m));
      simulationWS.onAlert(a => handleAlert(a));
      simulationWS.connect();
      await new Promise(r => setTimeout(r, 400));
      simulationWS.startSimulation(entryId, trafficLoad);
      setIsRunning(true);
    } catch (err) {
      console.error(err);
      alert('Failed to start: ' + err.message);
    } finally {
      setIsInitializing(false);
    }
  }, [nodes, toBackend, applyGraph, handleAlert]);

  const stopSimulation = useCallback(() => {
    simulationWS.stopSimulation();
    simulationWS.disconnect();
    setIsRunning(false); setMetrics(null); setIsConnected(false);
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'healthy', utilization: 0, currentLatency: 0, prediction: null } })));
    setEdges(eds => eds.map(e => ({ ...e, animated: false, style: { stroke: '#4b5563', strokeWidth: 2 } })));
    setPredictions({});
  }, [setNodes, setEdges]);

  const handleInject = useCallback((type, params) => {
    switch (type) {
      case 'crash':   simulationWS.injectCrash(params.nodeId); break;
      case 'latency': simulationWS.injectLatency(params.nodeId, params.multiplier); break;
      case 'traffic': simulationWS.injectTraffic(params.multiplier); break;
      case 'clear':   simulationWS.clearInjections(); break;
    }
  }, []);

  const loadConfig = useCallback(async fp => {
    const res = await simulationWS.loadConfig(fp);
    if (!res.graph?.nodes?.length) throw new Error('No nodes returned');
    const rfNodes = res.graph.nodes.map(n => ({
      id: n.id, type: 'custom',
      position: n.position || { x: 100, y: 100 },
      data: n.data || { label: n.id, type: 'api_service', icon: 'Plug', color: '#10b981', config: { baseLatency: 50, maxCapacity: 500, retryPolicy: 'linear', failureThreshold: 0.85, timeout: 5000 }, status: 'healthy', utilization: 0, currentLatency: 0 },
    }));
    const rfEdges = res.graph.edges.map(e => ({ ...e, animated: true, style: { stroke: '#4b5563', strokeWidth: 2 } }));
    _nodeId = rfNodes.length;
    setNodes(rfNodes); setEdges(rfEdges);
  }, [setNodes, setEdges]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), nodes: nodes.map(n => ({ id: n.id, position: n.position, data: n.data })), edges, metrics, predictions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chaos-lab-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, metrics, predictions]);

  const dismissAlert      = useCallback(id => setAllAlerts(p => p.filter(a => a.id !== id)), []);
  const dismissToastAlert = useCallback(id => setToastAlerts(p => p.filter(a => a.id !== id)), []);

  const displayNodes = useMemo(() => {
    if (!filterType) return nodes;
    return nodes.map(n => ({
      ...n,
      style: { ...n.style, opacity: (n.data?.type === filterType || n.data?.id === filterType) ? 1 : 0.25 },
    }));
  }, [nodes, filterType]);

  useEffect(() => () => simulationWS.disconnect(), []);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      onKeyDown={onKeyDown}
      tabIndex={0}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#0f1419', outline: 'none' }}
    >
      {/* ── Header (50px) ─────────────────────────────────────────────────── */}
      <SimulationControls
        nodes={nodes}
        onStart={startSimulation}
        onStop={stopSimulation}
        isRunning={isRunning}
        isConnected={isConnected}
        isInitializing={isInitializing}
        filterType={filterType}
        onFilterChange={setFilterType}
        onLoadConfig={loadConfig}
        onExport={isRunning ? exportJSON : null}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />

      {/* ── Main canvas area (flex: 1) ────────────────────────────────────── */}
      <div
        ref={reactFlowWrapper}
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
          style={{ background: darkMode ? '#0f172a' : '#f1f5f9' }}
        >
          <Background color={darkMode ? '#1e293b' : '#cbd5e1'} gap={20} />
          <Controls style={{ bottom: sparklinePanelOpen ? 190 : 10 }} />
          <MiniMap
            nodeColor={n => ({ healthy: '#10b981', stressed: '#f59e0b', failing: '#ef4444', down: '#6b7280' }[n.data?.status] || '#3b82f6')}
            maskColor="rgba(0,0,0,0.5)"
            style={{ backgroundColor: '#111827', border: '1px solid #1f2937', bottom: sparklinePanelOpen ? 190 : 10 }}
          />
        </ReactFlow>

        {/* Canvas overlays */}
        <div style={{
          position: 'absolute', top: '12px', right: '72px',
          zIndex: 5, display: 'flex', gap: '6px',
        }}>
          {nodes.length > 6 && (
            <button onClick={autoLayout} title="Auto-arrange" style={ovBtn('#1f2937')}>
              <LayoutGrid size={13} /> Layout
            </button>
          )}
          <button onClick={deleteSelected} disabled={!selectedNodes.length} title="Delete selected"
            style={ovBtn(selectedNodes.length ? '#ef4444' : '#1f2937', !selectedNodes.length)}>
            <Trash2 size={13} /> ({selectedNodes.length})
          </button>
          <button onClick={clearAll} disabled={!nodes.length} title="Clear all"
            style={ovBtn(nodes.length ? '#dc2626' : '#1f2937', !nodes.length)}>
            <Eraser size={13} /> Clear
          </button>
        </div>

        {/* Node count pill */}
        {nodes.length > 0 && (
          <div style={{
            position: 'absolute', bottom: sparklinePanelOpen ? 186 : 12, right: '72px',
            zIndex: 5, padding: '5px 10px',
            backgroundColor: '#111827', border: '1px solid #1f2937',
            borderRadius: '5px', fontSize: '10px', color: '#6b7280', fontFamily: 'monospace', fontWeight: '600',
            transition: 'bottom 0.25s ease',
          }}>
            {nodes.length}n · {edges.length}e
            {filterType && <span style={{ color: '#3b82f6', marginLeft: '6px' }}>{filterType}</span>}
          </div>
        )}

        {/* Config panel */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={updateNodeConfig}
          />
        )}

        {/* Bottom sparkline panel */}
        <BottomSparklinePanel
          open={sparklinePanelOpen}
          onToggle={() => setSparklinePanelOpen(o => !o)}
          selectedNode={selectedNode}
          sparklines={sparklines}
        />
      </div>

      {/* ── Status bar (40px) ─────────────────────────────────────────────── */}
      <StatusBar
        metrics={metrics}
        isRunning={isRunning}
        alerts={allAlerts}
      />

      {/* ── Right sidebar (fixed) ─────────────────────────────────────────── */}
      <RightSidebar
        activeWidget={activeWidget}
        onWidgetChange={setActiveWidget}
        onAddNode={handleAddNodeCenter}
        nodes={nodes}
        isRunning={isRunning}
        onInject={handleInject}
        activeInjections={metrics?.activeInjections}
        settings={settings}
        onSettingsChange={setSettings}
        alerts={allAlerts}
        onDismissAlert={dismissAlert}
        selectedNode={selectedNode}
      />

      {/* ── Toast stack (fixed) ───────────────────────────────────────────── */}
      <ToastStack toasts={toastAlerts} onDismiss={dismissToastAlert} />
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}

// helper — overlay button style
function ovBtn(bg, disabled = false) {
  return {
    padding: '6px 10px', backgroundColor: bg,
    color: disabled ? '#4b5563' : '#fff',
    border: '1px solid #1f2937', borderRadius: '6px',
    fontSize: '11px', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', gap: '5px',
    opacity: disabled ? 0.5 : 1,
  };
}

export default App;
