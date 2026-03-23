import React from 'react';
import { ChevronDown, Activity } from 'lucide-react';

const CHART_HEIGHT = 50;

function Sparkline({ data, color = '#3b82f6', label, unit = '' }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{
          height: CHART_HEIGHT,
          background: '#111827',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '9px', color: '#374151' }}>no data</span>
        </div>
      </div>
    );
  }

  const vals = data.map(Number).filter(isFinite);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 200;
  const H = CHART_HEIGHT;
  const step = W / (vals.length - 1);

  const points = vals
    .map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * (H - 6) - 3).toFixed(1)}`)
    .join(' ');

  const last = vals[vals.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color, fontFamily: 'monospace' }}>
          {typeof last === 'number' ? last.toFixed(1) : '—'}{unit}
        </span>
      </div>
      <div style={{
        background: '#111827',
        borderRadius: '6px',
        overflow: 'hidden',
        padding: '4px',
        border: `1px solid ${color}20`,
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Fill area */}
          <polygon
            points={`0,${H} ${points} ${((vals.length - 1) * step).toFixed(1)},${H}`}
            fill={`url(#sg-${label})`}
          />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Last point dot */}
          <circle
            cx={((vals.length - 1) * step).toFixed(1)}
            cy={vals.length > 0 ? (H - ((vals[vals.length - 1] - min) / range) * (H - 6) - 3).toFixed(1) : H / 2}
            r="2.5"
            fill={color}
          />
        </svg>
      </div>
    </div>
  );
}

export default function BottomSparklinePanel({
  open,
  onToggle,
  selectedNode = null,
  sparklines = {},
}) {
  const nodeId = selectedNode?.id;
  const history = nodeId ? (sparklines[nodeId] || []) : [];

  // Extract series from history array of { utilization, latency, rps, errorRate }
  const loadSeries   = history.map(h => (h.utilization || 0) * 100);
  const latSeries    = history.map(h => h.latency || 0);
  const rpsSeries    = history.map(h => h.rps || 0);
  const errSeries    = history.map(h => h.errorRate || 0);

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        title={open ? 'Collapse sparklines' : 'Expand sparklines'}
        style={{
          position: 'fixed',
          bottom: open ? '220px' : '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: '#111827',
          border: '1px solid #374151',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          padding: '5px 14px',
          cursor: 'pointer',
          color: '#9ca3af',
          transition: 'bottom 0.25s ease',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '10px',
        }}
      >
        <Activity size={12} color="#3b82f6" />
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
          {selectedNode ? selectedNode.data?.label || nodeId : 'Sparklines'}
        </span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
      </button>

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: open ? '40px' : '-180px',
        left: '0',
        right: '60px',
        height: '180px',
        background: '#1a1f2e',
        borderTop: '1px solid #374151',
        zIndex: 150,
        transition: 'bottom 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 16px 6px',
          borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
        }}>
          <Activity size={13} color="#3b82f6" />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#e5e7eb' }}>
            {selectedNode ? (selectedNode.data?.label || nodeId) : 'No node selected'}
          </span>
          {selectedNode && (
            <span style={{ fontSize: '9px', color: '#6b7280', marginLeft: '4px' }}>
              ({history.length} samples)
            </span>
          )}
        </div>

        {/* Charts */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'stretch', gap: '12px',
          padding: '10px 16px',
          overflowX: 'auto',
        }}>
          {!selectedNode ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>Click a node to see sparklines</span>
            </div>
          ) : (
            <>
              <Sparkline data={loadSeries}  color="#3b82f6" label="Load"    unit="%" />
              <Sparkline data={latSeries}   color="#f59e0b" label="Latency" unit="ms" />
              <Sparkline data={rpsSeries}   color="#10b981" label="RPS"     unit="" />
              <Sparkline data={errSeries}   color="#ef4444" label="Errors"  unit="%" />
            </>
          )}
        </div>
      </div>
    </>
  );
}
