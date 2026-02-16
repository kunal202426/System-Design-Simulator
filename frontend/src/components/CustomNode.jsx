import React from 'react';
import { Handle, Position } from 'reactflow';
import { Activity, AlertTriangle, XCircle } from 'lucide-react';
import { getIconComponent } from '../services/nodeTypes';

const CustomNode = ({ data, selected }) => {
  const { label, icon, color, config, status = 'healthy', utilization = 0, currentLatency = 0 } = data;

  // Get icon component from icon name
  const IconComponent = getIconComponent(icon);

  const statusColors = {
    healthy: '#10b981',
    stressed: '#f59e0b',
    failing: '#ef4444',
    down: '#6b7280'
  };

  const statusBg = {
    healthy: 'rgba(16, 185, 129, 0.08)',
    stressed: 'rgba(245, 158, 11, 0.08)',
    failing: 'rgba(239, 68, 68, 0.08)',
    down: 'rgba(107, 114, 128, 0.08)'
  };

  const shouldPulse = status === 'failing' || status === 'down';

  const StatusIcon = status === 'down' ? XCircle : 
                     status === 'failing' ? AlertTriangle : 
                     status === 'stressed' ? Activity : 
                     null;

  return (
    <div
      style={{
        padding: '14px 18px',
        borderRadius: '10px',
        border: `2px solid ${selected ? '#fff' : statusColors[status]}`,
        backgroundColor: color ? `${color}15` : statusBg[status],
        minWidth: '200px',
        color: '#fff',
        position: 'relative',
        boxShadow: selected ? `0 0 20px ${statusColors[status]}50` : '0 2px 8px rgba(0,0,0,0.3)',
        animation: shouldPulse ? 'pulse 2s infinite' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {StatusIcon && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: statusColors[status],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: shouldPulse ? 'bounce 1s infinite' : 'none',
          boxShadow: `0 0 10px ${statusColors[status]}`
        }}>
          <StatusIcon size={14} color="#fff" />
        </div>
      )}

      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          width: '10px', 
          height: '10px', 
          backgroundColor: '#3b82f6',
          border: '2px solid #fff',
          boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {IconComponent && (
          <div style={{ 
            padding: '8px', 
            borderRadius: '8px', 
            backgroundColor: `${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconComponent size={20} color={color} strokeWidth={2.5} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', letterSpacing: '0.3px' }}>
            {label}
          </div>
          {config && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', fontFamily: 'monospace' }}>
              {config.maxCapacity} req/s
            </div>
          )}
        </div>
      </div>

      {utilization > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Load
            </span>
            <span style={{ 
              fontSize: '11px',
              color: statusColors[status], 
              fontWeight: '700',
              fontFamily: 'monospace'
            }}>
              {(utilization * 100).toFixed(0)}%
            </span>
          </div>
          <div style={{ 
            height: '5px', 
            backgroundColor: '#1f2937', 
            borderRadius: '3px',
            overflow: 'hidden',
            border: '1px solid #374151'
          }}>
            <div style={{
              width: `${Math.min(utilization * 100, 100)}%`,
              height: '100%',
              backgroundColor: statusColors[status],
              transition: 'width 0.3s ease',
              boxShadow: `0 0 8px ${statusColors[status]}`
            }} />
          </div>
        </div>
      )}

      {currentLatency > 0 && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '10px', 
          color: '#9ca3af',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 8px',
          backgroundColor: '#111827',
          borderRadius: '4px',
          border: '1px solid #374151'
        }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Latency</span>
          <span style={{ 
            color: currentLatency > 1000 ? '#ef4444' : currentLatency > 500 ? '#f59e0b' : '#10b981', 
            fontWeight: '700',
            fontFamily: 'monospace'
          }}>
            {currentLatency.toFixed(0)}ms
          </span>
        </div>
      )}

      <div style={{ marginTop: '10px' }}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: `${statusColors[status]}20`,
          border: `1px solid ${statusColors[status]}`,
          color: statusColors[status],
          fontWeight: '700',
          textTransform: 'uppercase',
          fontSize: '9px',
          letterSpacing: '1px',
          display: 'inline-block'
        }}>
          {status}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          width: '10px', 
          height: '10px', 
          backgroundColor: '#a855f7',
          border: '2px solid #fff',
          boxShadow: '0 0 5px rgba(168, 85, 247, 0.5)'
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.85;
            transform: scale(1.015);
          }
        }
        
        @keyframes bounce {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
};

export default CustomNode;
