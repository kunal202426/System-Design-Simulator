import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Activity, AlertTriangle, XCircle } from 'lucide-react';
import { getIconComponent } from '../services/nodeTypes';

const CustomNode = ({ data, selected }) => {
  const {
    label, icon, color, config,
    status = 'healthy',
    utilization = 0,
    currentLatency = 0,
    prediction = null,
    health_score = null,
    metrics = null,
  } = data;

  const [hovered, setHovered] = useState(false);
  const IconComponent = getIconComponent(icon);

  const statusColors = {
    healthy: '#10b981',
    stressed: '#f59e0b',
    failing: '#ef4444',
    down: '#6b7280',
  };

  const shouldPulse = status === 'failing' || status === 'down';

  const StatusIcon =
    status === 'down' ? XCircle :
    status === 'failing' ? AlertTriangle :
    status === 'stressed' ? Activity :
    null;

  const loadPct = utilization > 0 ? (utilization * 100) : 0;
  const loadColor = loadPct >= 90 ? '#ef4444' : loadPct >= 70 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Main card ─────────────────────────────────────────────────── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '14px 16px 12px',
          borderRadius: '12px',
          border: `2px solid ${selected ? '#fff' : statusColors[status]}`,
          backgroundColor: color ? `${color}12` : 'rgba(17,24,39,0.85)',
          minWidth: '160px',
          minHeight: '100px',
          color: '#fff',
          position: 'relative',
          boxShadow: selected
            ? `0 0 24px ${statusColors[status]}60`
            : hovered
            ? `0 4px 20px rgba(0,0,0,0.5)`
            : '0 2px 8px rgba(0,0,0,0.3)',
          animation: shouldPulse ? 'nodeP 2s infinite' : 'none',
          transition: 'box-shadow 0.2s ease, border-color 0.3s ease',
          cursor: 'default',
        }}
      >
        {/* Status badge */}
        {StatusIcon && (
          <div style={{
            position: 'absolute', top: '-9px', right: '-9px',
            width: '22px', height: '22px',
            borderRadius: '50%',
            backgroundColor: statusColors[status],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: shouldPulse ? 'nodeBounce 1s infinite' : 'none',
            boxShadow: `0 0 8px ${statusColors[status]}`,
          }}>
            <StatusIcon size={13} color="#fff" />
          </div>
        )}

        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: '10px', height: '10px',
            backgroundColor: '#3b82f6',
            border: '2px solid #1f2937',
            boxShadow: '0 0 6px rgba(59,130,246,0.6)',
          }}
        />

        {/* Header: icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {IconComponent && (
            <div style={{
              padding: '7px',
              borderRadius: '8px',
              backgroundColor: `${color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IconComponent size={18} color={color} strokeWidth={2.5} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: '700', fontSize: '13px',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {label}
            </div>
            {config && (
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px', fontFamily: 'monospace' }}>
                {config.maxCapacity} req/s
              </div>
            )}
          </div>
        </div>

        {/* Load bar */}
        {utilization > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Load
              </span>
              <span style={{ fontSize: '10px', color: loadColor, fontWeight: '700', fontFamily: 'monospace' }}>
                {loadPct.toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '4px', backgroundColor: '#1f2937',
              borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(loadPct, 100)}%`,
                height: '100%',
                backgroundColor: loadColor,
                transition: 'width 0.3s ease',
                boxShadow: `0 0 6px ${loadColor}`,
              }} />
            </div>
          </div>
        )}

        {/* Latency chip */}
        {currentLatency > 0 && (
          <div style={{
            fontSize: '10px', color: '#6b7280',
            display: 'flex', justifyContent: 'space-between',
            padding: '3px 7px',
            backgroundColor: '#111827',
            borderRadius: '4px',
            border: '1px solid #1f2937',
            marginBottom: '8px',
          }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>P99</span>
            <span style={{
              color: currentLatency > 1000 ? '#ef4444' : currentLatency > 500 ? '#f59e0b' : '#10b981',
              fontWeight: '700', fontFamily: 'monospace',
            }}>
              {currentLatency.toFixed(0)}ms
            </span>
          </div>
        )}

        {/* Status pill + health score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 7px',
            borderRadius: '4px',
            backgroundColor: `${statusColors[status]}18`,
            border: `1px solid ${statusColors[status]}`,
            color: statusColors[status],
            fontWeight: '700',
            textTransform: 'uppercase',
            fontSize: '8px',
            letterSpacing: '1px',
          }}>
            {status}
          </span>
          {health_score !== null && (
            <span style={{
              padding: '3px 6px',
              borderRadius: '4px',
              backgroundColor: '#11182780',
              fontSize: '9px',
              color: '#9ca3af',
              fontFamily: 'monospace',
            }}>
              {(health_score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Prediction breach timer */}
        {prediction?.breach_time_min != null && (
          <div style={{
            marginTop: '8px',
            padding: '4px 8px',
            borderRadius: '5px',
            backgroundColor: '#8b5cf618',
            border: '1px solid #8b5cf660',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '8px', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Breach</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', fontFamily: 'monospace' }}>
              {prediction.breach_time_min.toFixed(1)}m
            </span>
            <span style={{ fontSize: '10px', color: '#a78bfa' }}>
              {prediction.trend === 'rising' ? '↑' : prediction.trend === 'falling' ? '↓' : '→'}
            </span>
          </div>
        )}

        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: '10px', height: '10px',
            backgroundColor: '#a855f7',
            border: '2px solid #1f2937',
            boxShadow: '0 0 6px rgba(168,85,247,0.6)',
          }}
        />

        <style>{`
          @keyframes nodeP {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.85; transform: scale(1.012); }
          }
          @keyframes nodeBounce {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-3px); }
          }
        `}</style>
      </div>

      {/* ── Hover tooltip ─────────────────────────────────────────────── */}
      {hovered && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
          zIndex: 9999,
          background: '#0f172a',
          border: `1px solid ${color || '#374151'}`,
          borderRadius: '10px',
          padding: '12px 14px',
          minWidth: '200px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: '700', fontSize: '12px', color: color || '#fff', marginBottom: '8px' }}>
            {label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              ['Status',   status],
              ['Load',     utilization > 0 ? `${loadPct.toFixed(1)}%` : '—'],
              ['Latency',  currentLatency > 0 ? `${currentLatency.toFixed(0)} ms` : '—'],
              ['Health',   health_score !== null ? `${(health_score * 100).toFixed(0)}%` : '—'],
              ...(metrics?.throughput?.rps != null
                ? [['RPS', `${metrics.throughput.rps.toFixed(0)}`]] : []),
              ...(metrics?.errors?.rate_pct != null
                ? [['Errors', `${metrics.errors.rate_pct.toFixed(2)}%`]] : []),
              ...(prediction?.breach_time_min != null
                ? [['Breach in', `${prediction.breach_time_min.toFixed(1)} min`]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</span>
                <span style={{ fontSize: '10px', color: '#e5e7eb', fontFamily: 'monospace', fontWeight: '600' }}>{v}</span>
              </div>
            ))}
          </div>
          {config && (
            <div style={{
              marginTop: '8px', paddingTop: '8px',
              borderTop: '1px solid #1f2937',
              fontSize: '9px', color: '#4b5563',
            }}>
              Capacity: {config.maxCapacity} req/s &nbsp;·&nbsp;
              Timeout: {config.timeout}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomNode;
