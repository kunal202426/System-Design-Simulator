import React from 'react';
import { X, ChevronRight, Bell, ExternalLink, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const SEVERITY_META = {
  critical:  { color: '#ef4444', bg: '#ef444418', Icon: XCircle },
  warning:   { color: '#f59e0b', bg: '#f59e0b18', Icon: AlertTriangle },
  cascade:   { color: '#f97316', bg: '#f9731618', Icon: AlertTriangle },
  anomaly:   { color: '#06b6d4', bg: '#06b6d418', Icon: Info },
  predicted: { color: '#8b5cf6', bg: '#8b5cf618', Icon: Info },
  resolved:  { color: '#10b981', bg: '#10b98118', Icon: CheckCircle },
  info:      { color: '#3b82f6', bg: '#3b82f618', Icon: Info },
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60)       return `${diff}s ago`;
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function AlertRow({ alert, onDismiss }) {
  const meta  = SEVERITY_META[alert.severity] || SEVERITY_META.info;
  const Icon  = meta.Icon;

  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: '8px',
      backgroundColor: meta.bg,
      border: `1px solid ${meta.color}40`,
      marginBottom: '8px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Icon size={14} color={meta.color} style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {alert.severity}
            </span>
            <span style={{ fontSize: '9px', color: '#6b7280' }}>
              {timeAgo(alert.timestamp)}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#d1d5db', fontWeight: '600', marginBottom: '2px', lineHeight: '1.3' }}>
            {alert.service_id}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: '1.4' }}>
            {alert.message}
          </div>
          {alert.runbook && (
            <a
              href={alert.runbook}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '9px', color: '#60a5fa',
                marginTop: '4px', textDecoration: 'none',
              }}
            >
              <ExternalLink size={9} />
              Runbook
            </a>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4b5563', padding: '0', flexShrink: 0,
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function NodeDetailSection({ node }) {
  if (!node) return null;
  const d = node.data || {};
  const metrics = d.metrics || {};
  const tp = metrics.throughput || {};
  const lat = metrics.latency || {};
  const err = metrics.errors || {};

  const rows = [
    ['Status',      d.status || '—'],
    ['Load',        d.utilization > 0 ? `${(d.utilization * 100).toFixed(1)}%` : '—'],
    ['Latency P99', d.currentLatency > 0 ? `${d.currentLatency.toFixed(0)} ms` : '—'],
    ['Health',      d.health_score != null ? `${(d.health_score * 100).toFixed(0)}%` : '—'],
    ['RPS',         tp.rps != null ? tp.rps.toFixed(0) : '—'],
    ['Error Rate',  err.rate_pct != null ? `${err.rate_pct.toFixed(2)}%` : '—'],
  ];

  const statusColors = { healthy: '#10b981', stressed: '#f59e0b', failing: '#ef4444', down: '#6b7280' };
  const sc = statusColors[d.status] || '#6b7280';

  return (
    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #1f2937' }}>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
        Selected Node
      </div>
      <div style={{
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: '#111827',
        border: `1px solid ${sc}40`,
        marginBottom: '8px',
      }}>
        <div style={{ fontWeight: '700', fontSize: '12px', color: d.color || '#fff', marginBottom: '8px' }}>
          {d.label || node.id}
        </div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</span>
            <span style={{ fontSize: '10px', color: '#e5e7eb', fontFamily: 'monospace', fontWeight: '600' }}>{v}</span>
          </div>
        ))}
        {d.prediction?.breach_time_min != null && (
          <div style={{
            marginTop: '8px', padding: '5px 8px',
            borderRadius: '5px', backgroundColor: '#8b5cf618',
            border: '1px solid #8b5cf650',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '9px', color: '#7c3aed', textTransform: 'uppercase' }}>Breach</span>
            <span style={{ fontSize: '11px', color: '#a78bfa', fontFamily: 'monospace', fontWeight: '700' }}>
              {d.prediction.breach_time_min.toFixed(1)}m{' '}
              {d.prediction.trend === 'rising' ? '↑' : d.prediction.trend === 'falling' ? '↓' : '→'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertPanel({
  open,
  onToggle,
  alerts = [],
  onDismiss,
  selectedNode = null,
  maxAlerts = 5,
}) {
  const visible = alerts.slice(-maxAlerts).reverse();

  return (
    <>
      {/* Collapse toggle tab */}
      <button
        onClick={onToggle}
        title={open ? 'Collapse alert panel' : 'Expand alert panel'}
        style={{
          position: 'fixed',
          right: open ? '280px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 200,
          background: '#111827',
          border: '1px solid #374151',
          borderRight: open ? 'none' : '1px solid #374151',
          borderRadius: open ? '6px 0 0 6px' : '6px 0 0 6px',
          padding: '10px 6px',
          cursor: 'pointer',
          color: '#9ca3af',
          transition: 'right 0.25s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronRight size={14} style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s' }} />
      </button>

      {/* Panel */}
      <div style={{
        position: 'fixed',
        right: open ? '0' : '-280px',
        top: '56px',
        bottom: '0',
        width: '280px',
        background: '#0d1117',
        borderLeft: '1px solid #1f2937',
        zIndex: 150,
        transition: 'right 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
        }}>
          <Bell size={14} color="#f59e0b" />
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Alerts
          </span>
          {alerts.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: '#ef444420', border: '1px solid #ef444460',
              borderRadius: '10px', padding: '1px 7px',
              fontSize: '10px', color: '#ef4444', fontWeight: '700',
            }}>
              {alerts.length}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 12px 16px',
        }}>
          {visible.length === 0 && !selectedNode ? (
            <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '11px', marginTop: '40px' }}>
              No active alerts
            </div>
          ) : (
            <>
              {visible.map(a => (
                <AlertRow key={a.id} alert={a} onDismiss={onDismiss} />
              ))}
              {alerts.length > maxAlerts && (
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                  +{alerts.length - maxAlerts} older alerts
                </div>
              )}
              <NodeDetailSection node={selectedNode} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
