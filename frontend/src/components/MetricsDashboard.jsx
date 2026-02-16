import React from 'react';
import { Activity, AlertCircle, Clock, TrendingDown } from 'lucide-react';

const MetricsDashboard = ({ metrics, isRunning }) => {
  if (!metrics || !isRunning) {
    return null;
  }

  const {
    totalThroughput = 0,
    totalFailures = 0,
    averageLatency = 0,
    errorRate = 0,
    collapseScore = 0,
    statusCounts = {}
  } = metrics;

  return (
    <div style={{
      position: 'absolute',
      top: '80px', // Below simulation controls
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 4,
      display: 'flex',
      gap: '12px',
      padding: '14px 18px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      {/* Throughput */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '0 12px',
        borderRight: '1px solid #374151'
      }}>
        <Activity size={18} color="#10b981" />
        <div>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Throughput
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
            {totalThroughput}
          </div>
        </div>
      </div>

      {/* Failures */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '0 12px',
        borderRight: '1px solid #374151'
      }}>
        <AlertCircle size={18} color="#ef4444" />
        <div>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Failures
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444', fontFamily: 'monospace' }}>
            {totalFailures}
          </div>
        </div>
      </div>

      {/* Latency */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '0 12px',
        borderRight: '1px solid #374151'
      }}>
        <Clock size={18} color="#f59e0b" />
        <div>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Latency
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>
            {averageLatency.toFixed(0)}ms
          </div>
        </div>
      </div>

      {/* Collapse Score */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '0 12px'
      }}>
        <TrendingDown size={18} color="#8b5cf6" />
        <div>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Collapse
          </div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            color: collapseScore > 0.5 ? '#ef4444' : collapseScore > 0.3 ? '#f59e0b' : '#10b981',
            fontFamily: 'monospace'
          }}>
            {(collapseScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Status Pills */}
      <div style={{ 
        display: 'flex', 
        gap: '6px',
        alignItems: 'center',
        padding: '0 0 0 12px',
        borderLeft: '1px solid #374151'
      }}>
        {statusCounts.healthy > 0 && (
          <div style={{
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#10b98120',
            border: '1px solid #10b981',
            fontSize: '11px',
            fontWeight: '700',
            color: '#10b981',
            fontFamily: 'monospace'
          }}>
            {statusCounts.healthy}
          </div>
        )}
        {statusCounts.stressed > 0 && (
          <div style={{
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#f59e0b20',
            border: '1px solid #f59e0b',
            fontSize: '11px',
            fontWeight: '700',
            color: '#f59e0b',
            fontFamily: 'monospace'
          }}>
            {statusCounts.stressed}
          </div>
        )}
        {statusCounts.failing > 0 && (
          <div style={{
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#ef444420',
            border: '1px solid #ef4444',
            fontSize: '11px',
            fontWeight: '700',
            color: '#ef4444',
            fontFamily: 'monospace'
          }}>
            {statusCounts.failing}
          </div>
        )}
        {statusCounts.down > 0 && (
          <div style={{
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: '#6b728020',
            border: '1px solid #6b7280',
            fontSize: '11px',
            fontWeight: '700',
            color: '#6b7280',
            fontFamily: 'monospace'
          }}>
            {statusCounts.down}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsDashboard;
