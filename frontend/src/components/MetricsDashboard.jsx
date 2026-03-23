import React from 'react';
import { Activity, AlertCircle, Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react';

/**
 * MetricsDashboard — live system metrics HUD
 *
 * Props:
 *   metrics      — system metrics object from backend
 *   isRunning    — boolean
 *   predictions  — Map<nodeId, { breach_time_min, trend }> (optional)
 */
const MetricsDashboard = ({ metrics, isRunning, predictions = {} }) => {
  if (!metrics || !isRunning) return null;

  const {
    totalThroughput = 0,
    totalFailures   = 0,
    totalRetries    = 0,
    averageLatency  = 0,
    errorRate       = 0,
    collapseScore   = 0,
    statusCounts    = {},
  } = metrics;

  // Find nearest predicted breach
  const breachList = Object.values(predictions)
    .filter(p => p && p.breach_time_min !== null && p.breach_time_min !== undefined)
    .map(p => p.breach_time_min)
    .sort((a, b) => a - b);
  const nearestBreach = breachList[0] ?? null;

  const col = (score) =>
    score > 0.5 ? '#ef4444' : score > 0.3 ? '#f59e0b' : '#10b981';

  const errCol =
    errorRate >= 0.05 ? '#ef4444' : errorRate >= 0.01 ? '#f59e0b' : '#10b981';

  const DIVIDER = {
    borderRight: '1px solid #374151',
    paddingRight: '12px',
    marginRight: '0px',
  };

  const tile = (icon, label, value, color, extra = {}) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', ...extra }}>
      {icon}
      <div>
        <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '700', color, fontFamily: 'monospace', lineHeight: 1.2 }}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      top: '58px',
      left: '56.2%',
      transform: 'translateX(-50%)',
      zIndex: 4,
      display: 'flex',
      gap: '0',
      padding: '10px 20px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      alignItems: 'center',
      flexWrap: 'wrap',
      maxWidth: '900px',
    }}>
      {tile(<Activity size={16} color="#10b981" />, 'Throughput', `${Math.round(totalThroughput)} rps`, '#fff', DIVIDER)}
      {tile(<AlertCircle size={16} color="#ef4444" />, 'Failures', totalFailures, '#ef4444', DIVIDER)}
      {tile(<Clock size={16} color="#f59e0b" />, 'Avg Latency', `${averageLatency.toFixed(0)}ms`, '#fff', DIVIDER)}
      {tile(
        <TrendingDown size={16} color="#8b5cf6" />,
        'Collapse',
        `${(collapseScore * 100).toFixed(0)}%`,
        col(collapseScore),
        DIVIDER,
      )}
      {tile(
        <AlertCircle size={16} color={errCol} />,
        'Error Rate',
        `${(errorRate * 100).toFixed(1)}%`,
        errCol,
        DIVIDER,
      )}

      {/* Nearest breach prediction */}
      {nearestBreach !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '2px 12px',
          marginLeft: '4px',
          borderRadius: '6px',
          backgroundColor: '#8b5cf620',
          border: '1px solid #8b5cf6',
        }}>
          <TrendingUp size={14} color="#8b5cf6" />
          <div>
            <div style={{ fontSize: '9px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Next Breach
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6', fontFamily: 'monospace' }}>
              {nearestBreach.toFixed(1)}min
            </div>
          </div>
        </div>
      )}

      {/* Status pills */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', paddingLeft: '12px', borderLeft: '1px solid #374151', marginLeft: '4px' }}>
        {[
          ['healthy',  '#10b981', statusCounts.healthy],
          ['stressed', '#f59e0b', statusCounts.stressed],
          ['failing',  '#ef4444', statusCounts.failing],
          ['down',     '#6b7280', statusCounts.down],
        ].filter(([, , count]) => count > 0).map(([label, color, count]) => (
          <div key={label} style={{
            padding: '3px 7px',
            borderRadius: '5px',
            backgroundColor: `${color}20`,
            border: `1px solid ${color}`,
            fontSize: '11px', fontWeight: '700', color,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
          }}>
            {count} {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsDashboard;
