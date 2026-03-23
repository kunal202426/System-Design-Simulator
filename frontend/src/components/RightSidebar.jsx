import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Zap, Settings, Bell, X,
  ChevronLeft, ChevronRight,
  AlertTriangle, XCircle, CheckCircle, Info, ExternalLink,
  Volume2, VolumeX, RefreshCw, Activity, Clock,
  Shield, TrendingUp,
} from 'lucide-react';
import { getNodeTypesArray } from '../services/nodeTypes';

// ─── helpers ──────────────────────────────────────────────────────────────────
const sev = {
  critical:  { color: '#ef4444', bg: '#ef444418', Icon: XCircle },
  warning:   { color: '#f59e0b', bg: '#f59e0b18', Icon: AlertTriangle },
  cascade:   { color: '#f97316', bg: '#f9731618', Icon: AlertTriangle },
  anomaly:   { color: '#06b6d4', bg: '#06b6d418', Icon: Info },
  predicted: { color: '#8b5cf6', bg: '#8b5cf618', Icon: Info },
  resolved:  { color: '#10b981', bg: '#10b98118', Icon: CheckCircle },
  info:      { color: '#3b82f6', bg: '#3b82f618', Icon: Info },
};
const sevMeta = s => sev[s] || sev.info;

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor(Date.now() / 1000 - ts);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  return `${Math.floor(d / 3600)}h`;
}

// ─── Widget: Add Component ─────────────────────────────────────────────────
function AddWidget({ onAddNode }) {
  const [search, setSearch] = useState('');
  const types = getNodeTypesArray().filter(
    t => !search || t.label.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (e, nodeType) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 12px 8px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search components…"
          style={{
            width: '100%', padding: '6px 10px', boxSizing: 'border-box',
            backgroundColor: '#111827', border: '1px solid #374151',
            borderRadius: '6px', color: '#d1d5db', fontSize: '11px', outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
        <div style={{ fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '4px 4px 8px' }}>
          Drag onto canvas or click to add at center
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {types.map(nodeType => {
            const IC = nodeType.IconComponent;
            return (
              <div
                key={nodeType.id}
                draggable
                onDragStart={e => onDragStart(e, nodeType)}
                onClick={() => onAddNode?.(nodeType)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '8px 10px', borderRadius: '7px',
                  backgroundColor: '#111827', border: '1px solid #1f2937',
                  borderLeft: `3px solid ${nodeType.color}`,
                  cursor: 'grab', userSelect: 'none',
                  transition: 'background-color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}
              >
                <div style={{ padding: '5px', borderRadius: '5px', backgroundColor: `${nodeType.color}20`, flexShrink: 0, pointerEvents: 'none' }}>
                  {IC && <IC size={13} color={nodeType.color} strokeWidth={2.5} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nodeType.label}
                  </div>
                  <div style={{ fontSize: '9px', color: '#4b5563', fontFamily: 'monospace' }}>
                    {nodeType.defaultConfig.maxCapacity} req/s
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status legend */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1f2937' }}>
        {[['#10b981', 'Healthy', '< 70%'], ['#f59e0b', 'Stressed', '70–90%'], ['#ef4444', 'Failing', '> 90%'], ['#6b7280', 'Down', 'Crashed']].map(([c, l, d]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: c, flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>{l}</span>
            <span style={{ fontSize: '9px', color: '#4b5563' }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Widget: Chaos Injection ──────────────────────────────────────────────
function ChaosWidget({ nodes, isRunning, onInject, activeInjections }) {
  const [selectedNode, setSelectedNode] = useState('');
  const [latMult, setLatMult] = useState(10);
  const [trafficMult, setTrafficMult] = useState(5);

  const hasActive = activeInjections &&
    (activeInjections.crashes?.length > 0 ||
     activeInjections.latencyMultiplier > 1 ||
     activeInjections.trafficMultiplier > 1);

  const inp = {
    padding: '4px 7px', backgroundColor: '#111827',
    border: '1px solid #374151', borderRadius: '4px',
    color: '#e5e7eb', fontSize: '11px', width: '60px', outline: 'none',
  };
  const btn = (bg, disabled = false) => ({
    padding: '6px 10px', backgroundColor: disabled ? '#1f2937' : bg,
    color: '#fff', border: 'none', borderRadius: '5px',
    fontSize: '11px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '12px 12px 8px' }}>
        {!isRunning ? (
          <div style={{
            textAlign: 'center', color: '#4b5563', fontSize: '11px', padding: '24px 0',
          }}>
            Start simulation to inject chaos
          </div>
        ) : (
          <>
            {/* Node selector */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '4px' }}>
                Target Node
              </label>
              <select
                value={selectedNode}
                onChange={e => setSelectedNode(e.target.value)}
                style={{ ...inp, width: '100%', cursor: 'pointer' }}
              >
                <option value="">— any —</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.data.label}</option>
                ))}
              </select>
            </div>

            {/* Crash */}
            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#111827', borderRadius: '7px', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                💥 Node Crash
              </div>
              <button
                onClick={() => onInject('crash', { nodeId: selectedNode || (nodes[0]?.id ?? '') })}
                disabled={!selectedNode}
                style={btn('#ef4444', !selectedNode)}
              >
                Crash {selectedNode ? nodes.find(n => n.id === selectedNode)?.data.label ?? 'Node' : '(select node)'}
              </button>
            </div>

            {/* Latency spike */}
            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#111827', borderRadius: '7px', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                ⏱ Latency Spike
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="number" value={latMult} onChange={e => setLatMult(Number(e.target.value))} min="2" max="100" step="1" style={inp} />
                <span style={{ fontSize: '10px', color: '#6b7280' }}>× multiplier</span>
              </div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '7px' }}>
                {[2, 5, 10].map(v => (
                  <button key={v} onClick={() => { setLatMult(v); onInject('latency', { nodeId: selectedNode || '', multiplier: v }); }}
                    style={{ ...btn('#92400e'), padding: '4px 8px', fontSize: '10px' }}>{v}×</button>
                ))}
                <button onClick={() => onInject('latency', { nodeId: selectedNode || '', multiplier: latMult })} style={{ ...btn('#f59e0b'), padding: '4px 8px', fontSize: '10px' }}>
                  Apply {latMult}×
                </button>
              </div>
            </div>

            {/* Traffic spike */}
            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#111827', borderRadius: '7px', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: '700', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                📈 Traffic Spike
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="number" value={trafficMult} onChange={e => setTrafficMult(Number(e.target.value))} min="2" max="50" step="1" style={inp} />
                <span style={{ fontSize: '10px', color: '#6b7280' }}>× multiplier</span>
              </div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '7px' }}>
                {[3, 5, 10].map(v => (
                  <button key={v} onClick={() => { setTrafficMult(v); onInject('traffic', { multiplier: v }); }}
                    style={{ ...btn('#5b21b6'), padding: '4px 8px', fontSize: '10px' }}>{v}×</button>
                ))}
                <button onClick={() => onInject('traffic', { multiplier: trafficMult })} style={{ ...btn('#8b5cf6'), padding: '4px 8px', fontSize: '10px' }}>
                  Apply {trafficMult}×
                </button>
              </div>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>
                Scenario Presets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                {[
                  { label: '🛒 Black Friday', action: () => onInject('traffic', { multiplier: 10 }) },
                  { label: '💾 DB Crash', action: () => { const db = nodes.find(n => n.data.type === 'database'); if (db) onInject('crash', { nodeId: db.id }); } },
                  { label: '🔥 DDoS', action: () => onInject('traffic', { multiplier: 20 }) },
                  { label: '🐢 Lag Spike', action: () => onInject('latency', { nodeId: '', multiplier: 5 }) },
                ].map(p => (
                  <button key={p.label} onClick={p.action}
                    style={{ ...btn('#1f2937'), border: '1px solid #374151', fontSize: '10px', padding: '6px 8px' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear all */}
            <button
              onClick={() => onInject('clear', {})}
              disabled={!hasActive}
              style={{ ...btn('#10b981', !hasActive), width: '100%' }}
            >
              ✓ Clear All Injections
            </button>

            {/* Active injections summary */}
            {hasActive && (
              <div style={{ marginTop: '10px', padding: '8px 10px', backgroundColor: '#1a0a0a', borderRadius: '6px', border: '1px solid #ef444430', fontSize: '10px', color: '#fca5a5' }}>
                ⚡ Active: {[
                  activeInjections.crashes?.length ? `${activeInjections.crashes.length} crash` : null,
                  activeInjections.latencyMultiplier > 1 ? `${activeInjections.latencyMultiplier}× latency` : null,
                  activeInjections.trafficMultiplier > 1 ? `${activeInjections.trafficMultiplier}× traffic` : null,
                ].filter(Boolean).join(', ')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Widget: Settings ──────────────────────────────────────────────────────
function SettingsWidget({ settings, onSettingsChange }) {
  const u = (k, v) => onSettingsChange({ ...settings, [k]: v });

  const Toggle = ({ k, label, desc }) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
      <div onClick={() => u(k, !settings[k])} style={{
        width: '34px', height: '18px', borderRadius: '9px',
        backgroundColor: settings[k] ? '#3b82f6' : '#374151',
        position: 'relative', flexShrink: 0, marginTop: '2px', cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: '1px',
          left: settings[k] ? '17px' : '1px',
          width: '16px', height: '16px', borderRadius: '50%',
          backgroundColor: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#e5e7eb' }}>{label}</div>
        {desc && <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '1px', lineHeight: 1.4 }}>{desc}</div>}
      </div>
    </label>
  );

  const Slider = ({ k, label, min, max, step = 1, fmt }) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#e5e7eb' }}>{label}</span>
        <span style={{ fontSize: '10px', color: '#3b82f6', fontFamily: 'monospace', fontWeight: '700' }}>
          {fmt ? fmt(settings[k]) : settings[k]}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={settings[k]}
        onChange={e => u(k, Number(e.target.value))}
        style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
    </div>
  );

  return (
    <div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {settings.alertsMuted ? <VolumeX size={10} color="#ef4444" /> : <Volume2 size={10} color="#3b82f6" />}
        Alerts
      </div>
      <Toggle k="alertsMuted" label="Mute toast notifications" desc="Suppress pop-up alerts. Sidebar still shows all alerts." />
      <Toggle k="simulationMode" label="Simulation mode" desc="Warning toasts suppressed. Only critical/cascade show toasts." />

      <div style={{ borderTop: '1px solid #1f2937', marginTop: '4px', paddingTop: '12px', marginBottom: '10px', fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <RefreshCw size={10} color="#3b82f6" /> Polling
      </div>
      <Slider k="pollInterval" label="Poll interval" min={5} max={60} step={5} fmt={v => `${v}s`} />

      <div style={{ borderTop: '1px solid #1f2937', marginTop: '4px', paddingTop: '12px', marginBottom: '10px', fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Activity size={10} color="#3b82f6" /> Anomaly Detection
      </div>
      <Slider k="zScoreThreshold" label="Z-score threshold" min={1.5} max={5} step={0.5} fmt={v => `${v}σ`} />
      <Slider k="predictionHorizonMin" label="Prediction horizon" min={5} max={120} step={5} fmt={v => `${v}m`} />

      <div style={{ borderTop: '1px solid #1f2937', marginTop: '4px', paddingTop: '12px', marginBottom: '10px', fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={10} color="#3b82f6" /> Display
      </div>
      <Slider k="maxSparklinePoints" label="Max sparkline points" min={10} max={60} step={5} fmt={v => `${v} pts`} />
      <Toggle k="showHealthScore" label="Show health score" desc="% badge on each node." />
      <Toggle k="showPredictions" label="Show prediction timers" desc="Breach countdown on rising-trend nodes." />
    </div>
  );
}

// ─── Widget: Alerts ────────────────────────────────────────────────────────
function AlertsWidget({ alerts = [], onDismiss, selectedNode }) {
  const recent = alerts.slice(-50).reverse();
  const d = selectedNode?.data || {};
  const statusColors = { healthy: '#10b981', stressed: '#f59e0b', failing: '#ef4444', down: '#6b7280' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '11px', padding: '32px 0' }}>
            No alerts
          </div>
        ) : (
          recent.map(a => {
            const m = sevMeta(a.severity);
            const MI = m.Icon;
            return (
              <div key={a.id} style={{
                padding: '8px 10px', borderRadius: '7px',
                backgroundColor: m.bg, border: `1px solid ${m.color}40`,
                marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                  <MI size={12} color={m.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                      <span style={{ fontSize: '9px', color: m.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{a.severity}</span>
                      <span style={{ fontSize: '9px', color: '#6b7280' }}>{timeAgo(a.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#d1d5db', fontWeight: '600' }}>{a.service_id}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.4, marginTop: '1px' }}>{a.message}</div>
                    {a.runbook && (
                      <a href={a.runbook} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#60a5fa', marginTop: '3px', textDecoration: 'none' }}>
                        <ExternalLink size={8} /> Runbook
                      </a>
                    )}
                  </div>
                  {onDismiss && (
                    <button onClick={() => onDismiss(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0, flexShrink: 0 }}>
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div style={{ padding: '10px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Selected Node
          </div>
          <div style={{
            padding: '8px 10px', borderRadius: '7px',
            backgroundColor: '#111827', border: `1px solid ${statusColors[d.status] || '#374151'}40`,
          }}>
            <div style={{ fontWeight: '700', fontSize: '11px', color: d.color || '#e5e7eb', marginBottom: '6px' }}>
              {d.label || selectedNode.id}
            </div>
            {[
              ['Status',   d.status || '—'],
              ['Load',     d.utilization > 0 ? `${(d.utilization * 100).toFixed(1)}%` : '—'],
              ['Latency',  d.currentLatency > 0 ? `${d.currentLatency.toFixed(0)}ms` : '—'],
              ['Health',   d.health_score != null ? `${(d.health_score * 100).toFixed(0)}%` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k}</span>
                <span style={{ fontSize: '10px', color: '#e5e7eb', fontFamily: 'monospace', fontWeight: '600' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RightSidebar (main export) ────────────────────────────────────────────
const WIDGETS = [
  { id: 'add',      Icon: Plus,     label: 'Add Component', color: '#3b82f6' },
  { id: 'chaos',    Icon: Zap,      label: 'Chaos',         color: '#ef4444' },
  { id: 'settings', Icon: Settings, label: 'Settings',      color: '#9ca3af' },
  { id: 'alerts',   Icon: Bell,     label: 'Alerts',        color: '#f59e0b' },
];

export default function RightSidebar({
  activeWidget,
  onWidgetChange,
  onAddNode,
  // chaos
  nodes = [],
  isRunning = false,
  onInject,
  activeInjections,
  // settings
  settings = {},
  onSettingsChange,
  // alerts
  alerts = [],
  onDismissAlert,
  selectedNode = null,
}) {
  const critCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'cascade').length;

  // ESC closes
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onWidgetChange(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onWidgetChange]);

  const toggle = id => onWidgetChange(activeWidget === id ? null : id);

  const panelContent = {
    add:      <AddWidget onAddNode={onAddNode} />,
    chaos:    <ChaosWidget nodes={nodes} isRunning={isRunning} onInject={onInject} activeInjections={activeInjections} />,
    settings: <SettingsWidget settings={settings} onSettingsChange={onSettingsChange} />,
    alerts:   <AlertsWidget alerts={alerts} onDismiss={onDismissAlert} selectedNode={selectedNode} />,
  };

  const activeLabel = activeWidget ? WIDGETS.find(w => w.id === activeWidget)?.label : '';

  return (
    <>
      {/* Backdrop when open */}
      {activeWidget && (
        <div
          onClick={() => onWidgetChange(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 990, cursor: 'default' }}
        />
      )}

      {/* Expanded content panel */}
      <div style={{
        position: 'fixed',
        right: '60px',
        top: '50px',
        bottom: '40px',
        width: '290px',
        backgroundColor: '#1a1f2e',
        borderLeft: '1px solid #374151',
        borderRight: '1px solid #374151',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: activeWidget ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
        }}>
          {activeWidget && (() => {
            const w = WIDGETS.find(w => w.id === activeWidget);
            const WI = w?.Icon;
            return WI ? <WI size={13} color={w.color} /> : null;
          })()}
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#e5e7eb', flex: 1 }}>
            {activeLabel}
          </span>
          {activeWidget === 'alerts' && alerts.length > 0 && (
            <span style={{
              padding: '1px 7px', borderRadius: '9px',
              backgroundColor: critCount > 0 ? '#ef444420' : '#f59e0b20',
              border: `1px solid ${critCount > 0 ? '#ef4444' : '#f59e0b'}50`,
              color: critCount > 0 ? '#ef4444' : '#f59e0b',
              fontSize: '9px', fontWeight: '700',
            }}>
              {alerts.length}
            </span>
          )}
          <button
            onClick={() => onWidgetChange(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Widget content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeWidget && panelContent[activeWidget]}
        </div>
      </div>

      {/* Icon strip (always visible) */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: '50px',
        bottom: '40px',
        width: '60px',
        backgroundColor: '#1a1f2e',
        borderLeft: '1px solid #374151',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '10px',
        gap: '4px',
      }}>
        {WIDGETS.map(({ id, Icon: WIcon, label, color }) => {
          const isActive = activeWidget === id;
          const badge = id === 'alerts' && alerts.length > 0 ? alerts.length : null;
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              title={label}
              style={{
                width: '42px', height: '42px',
                borderRadius: '8px',
                backgroundColor: isActive ? `${color}20` : 'transparent',
                border: isActive ? `1px solid ${color}50` : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px',
                position: 'relative',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#1f2937'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <WIcon size={16} color={isActive ? color : '#6b7280'} />
              <span style={{ fontSize: '7px', color: isActive ? color : '#4b5563', fontWeight: '600', letterSpacing: '0.3px', lineHeight: 1 }}>
                {label.split(' ')[0].toUpperCase()}
              </span>
              {badge && (
                <div style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  backgroundColor: critCount > 0 ? '#ef4444' : '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', color: '#fff', fontWeight: '700',
                }}>
                  {badge > 9 ? '9+' : badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
