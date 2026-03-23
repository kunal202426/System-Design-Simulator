import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Zap, Radio, Clock } from 'lucide-react';

function Pill({ color, bg, children }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '4px',
      backgroundColor: bg,
      border: `1px solid ${color}50`,
      color,
      fontSize: '10px',
      fontWeight: '700',
      fontFamily: 'monospace',
    }}>
      {children}
    </span>
  );
}

function Divider() {
  return <div style={{ width: '1px', height: '18px', backgroundColor: '#1f2937', flexShrink: 0 }} />;
}

export default function StatusBar({ metrics, isRunning, alerts = [], lastUpdateTime = null }) {
  const [clock, setClock] = useState('');
  const [uptime, setUptime] = useState(0);
  const [startTs] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false }));
      setUptime(Math.floor((Date.now() - startTs) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTs]);

  // Derive values
  const rps      = metrics?.totalThroughput?.toFixed(0) ?? '—';
  const avgLat   = metrics?.averageLatency?.toFixed(0) ?? '—';
  const errRate  = metrics?.errorRate?.toFixed(2) ?? '—';
  const collapse = metrics?.collapseScore ?? 0;

  const statusCounts = metrics?.statusCounts ?? {};
  const totalNodes = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const avgLoad    = metrics?.averageLoad != null
    ? `${(metrics.averageLoad * 100).toFixed(0)}%`
    : '—';

  const alertCount = alerts.length;
  const critAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'cascade').length;

  const simColor = isRunning ? '#10b981' : '#6b7280';
  const simLabel = isRunning ? 'RUNNING' : 'STOPPED';

  const uptimeStr = uptime < 60
    ? `${uptime}s`
    : uptime < 3600
    ? `${Math.floor(uptime / 60)}m ${uptime % 60}s`
    : `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  return (
    <div style={{
      height: '40px',
      flexShrink: 0,
      backgroundColor: '#111827',
      borderTop: '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '0 16px',
      fontSize: '11px',
      color: '#9ca3af',
      zIndex: 2000,
      userSelect: 'none',
      overflowX: 'auto',
    }}>
      {/* Simulation status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          backgroundColor: simColor,
          boxShadow: isRunning ? `0 0 6px ${simColor}` : 'none',
        }} />
        <span style={{ fontWeight: '700', color: simColor, fontSize: '10px', letterSpacing: '0.5px' }}>
          {simLabel}
        </span>
      </div>

      <Divider />

      {/* RPS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <Activity size={11} color="#3b82f6" />
        <span style={{ color: '#9ca3af' }}>RPS</span>
        <span style={{ color: '#e5e7eb', fontFamily: 'monospace', fontWeight: '700' }}>{rps}</span>
      </div>

      <Divider />

      {/* Latency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{ color: '#9ca3af' }}>P99</span>
        <span style={{
          color: metrics?.averageLatency > 1000 ? '#ef4444' : metrics?.averageLatency > 500 ? '#f59e0b' : '#e5e7eb',
          fontFamily: 'monospace', fontWeight: '700',
        }}>{avgLat}ms</span>
      </div>

      <Divider />

      {/* Avg Load */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <Zap size={11} color="#f59e0b" />
        <span style={{ color: '#9ca3af' }}>Load</span>
        <span style={{ color: '#e5e7eb', fontFamily: 'monospace', fontWeight: '700' }}>{avgLoad}</span>
      </div>

      <Divider />

      {/* Alerts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <AlertTriangle size={11} color={critAlerts > 0 ? '#ef4444' : alertCount > 0 ? '#f59e0b' : '#6b7280'} />
        <span style={{ color: '#9ca3af' }}>Alerts</span>
        <span style={{
          color: critAlerts > 0 ? '#ef4444' : alertCount > 0 ? '#f59e0b' : '#6b7280',
          fontFamily: 'monospace', fontWeight: '700',
        }}>{alertCount}</span>
        {critAlerts > 0 && (
          <Pill color="#ef4444" bg="#ef444415">{critAlerts} crit</Pill>
        )}
      </div>

      {/* Node status counts */}
      {totalNodes > 0 && (
        <>
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {[
              ['healthy',  '#10b981'], ['stressed', '#f59e0b'],
              ['failing',  '#ef4444'], ['down',     '#6b7280'],
            ].filter(([k]) => statusCounts[k] > 0).map(([k, c]) => (
              <Pill key={k} color={c} bg={`${c}15`}>{statusCounts[k]} {k}</Pill>
            ))}
          </div>
        </>
      )}

      {/* Collapse score */}
      {isRunning && (
        <>
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <span style={{ color: '#9ca3af' }}>Collapse</span>
            <span style={{
              fontFamily: 'monospace', fontWeight: '700',
              color: collapse > 0.5 ? '#ef4444' : collapse > 0.3 ? '#f59e0b' : '#10b981',
            }}>
              {(collapse * 100).toFixed(0)}%
            </span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Uptime + clock */}
      {isRunning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <Clock size={10} color="#4b5563" />
          <span style={{ fontFamily: 'monospace', color: '#4b5563' }}>{uptimeStr}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <Radio size={10} color="#4b5563" />
        <span style={{ fontFamily: 'monospace', color: '#4b5563' }}>{clock}</span>
      </div>
    </div>
  );
}
