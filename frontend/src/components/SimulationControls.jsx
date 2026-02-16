import React, { useState } from 'react';

const SimulationControls = ({ nodes, onStart, onStop, isRunning, isConnected, isInitializing }) => {
  const [selectedEntryNode, setSelectedEntryNode] = useState('');
  const [trafficLoad, setTrafficLoad] = useState(1000);

  const handleStart = () => {
    if (!selectedEntryNode) {
      alert('Please select an entry node first');
      return;
    }
    onStart(selectedEntryNode, trafficLoad);
  };

  const entryNodes = nodes;

  // ✅ FIX: Button is enabled if we have nodes (connection happens on click)
  const canStart = nodes.length > 0 && !isInitializing;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 5,
      padding: '12px 16px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '600px'
    }}>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
          Entry Node
        </label>
        <select
          value={selectedEntryNode}
          onChange={(e) => setSelectedEntryNode(e.target.value)}
          disabled={isRunning || isInitializing}
          style={{
            width: '100%',
            padding: '6px 10px',
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px',
            cursor: (isRunning || isInitializing) ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">Select entry point...</option>
          {entryNodes.map(node => (
            <option key={node.id} value={node.id}>
              {node.data.icon} {node.data.label} ({node.id})
            </option>
          ))}
        </select>
      </div>

      <div style={{ width: '140px' }}>
        <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
          Traffic (req/s)
        </label>
        <input
          type="number"
          value={trafficLoad}
          onChange={(e) => setTrafficLoad(Number(e.target.value))}
          disabled={isRunning || isInitializing}
          min="100"
          max="10000"
          step="100"
          style={{
            width: '100%',
            padding: '6px 10px',
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px'
          }}
        />
      </div>

      <div style={{ paddingTop: '16px' }}>
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{
              padding: '8px 20px',
              backgroundColor: canStart ? '#10b981' : '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: canStart ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            {isInitializing ? '⏳ Starting...' : '▶️ Start'}
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              padding: '8px 20px',
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            ⏸️ Stop
          </button>
        )}
      </div>

      <div style={{ paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : isInitializing ? '#f59e0b' : '#6b7280'
        }} />
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {isConnected ? 'Connected' : isInitializing ? 'Connecting...' : 'Ready'}
        </span>
      </div>
    </div>
  );
};

export default SimulationControls;
