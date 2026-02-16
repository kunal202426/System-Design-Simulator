import React, { useState } from 'react';
import { 
  Skull, 
  Timer, 
  TrendingUp, 
  RefreshCw, 
  ShoppingCart, 
  Database, 
  Shield, 
  Wifi,
  AlertTriangle
} from 'lucide-react';

const FailureInjection = ({ nodes, isRunning, onInject, activeInjections = {} }) => {
  const [selectedNode, setSelectedNode] = useState('');
  const [latencyMultiplier, setLatencyMultiplier] = useState(10);
  const [trafficMultiplier, setTrafficMultiplier] = useState(5);

  // Position: Bottom left, above zoom controls (which are at bottom: 10px, left: 10px)
  const containerStyle = {
    position: 'fixed',
    bottom: '130px', // Above zoom controls (which are ~70px height)
    left: '296px', // After sidebar
    zIndex: 5,
    padding: isRunning ? '18px' : '16px',
    backgroundColor: '#1f2937',
    border: isRunning ? '2px solid #ef4444' : '1px solid #374151',
    borderRadius: '10px',
    width: isRunning ? '340px' : '300px',
    maxHeight: 'calc(100vh - 200px)', // Don't go too tall
    overflowY: 'auto',
    boxShadow: isRunning ? '0 4px 20px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(0,0,0,0.3)',
    transform: 'none',
    margin: 0
  };

  if (!isRunning) {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color="#6b7280" />
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Chaos Injection
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>
              Start simulation to inject failures
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { crashedNodes = [], latencySpikes = {}, trafficMultiplier: activeTraffic = 1 } = activeInjections;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <AlertTriangle size={20} color="#ef4444" />
          <h3 style={{ 
            margin: 0,
            fontSize: '14px', 
            fontWeight: '700', 
            color: '#ef4444',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Chaos Injection
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af', paddingLeft: '30px' }}>
          Test resilience
        </p>
      </div>

      {/* Node Selector */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '10px', color: '#d1d5db', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Target Node
        </label>
        <select
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}
        >
          <option value="">Select target...</option>
          {nodes.map(node => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </div>

      {/* Injection Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {/* Node Crash */}
        <button
          onClick={() => {
            if (!selectedNode) {
              alert('Select a node first');
              return;
            }
            onInject('crash', { nodeId: selectedNode });
          }}
          disabled={!selectedNode || crashedNodes.includes(selectedNode)}
          style={{
            padding: '9px 12px',
            backgroundColor: crashedNodes.includes(selectedNode) ? '#4b5563' : '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: !selectedNode || crashedNodes.includes(selectedNode) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            boxShadow: !selectedNode || crashedNodes.includes(selectedNode) ? 'none' : '0 2px 6px rgba(220, 38, 38, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Skull size={15} />
            <span>Crash Node</span>
          </div>
          {crashedNodes.includes(selectedNode) && (
            <span style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: '#6b7280', borderRadius: '3px' }}>
              ACTIVE
            </span>
          )}
        </button>

        {/* Latency Spike */}
        <div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (!selectedNode) {
                  alert('Select a node first');
                  return;
                }
                onInject('latency', { nodeId: selectedNode, multiplier: latencyMultiplier });
              }}
              disabled={!selectedNode}
              style={{
                flex: 1,
                padding: '9px 12px',
                backgroundColor: !selectedNode ? '#4b5563' : '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !selectedNode ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: !selectedNode ? 'none' : '0 2px 6px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Timer size={15} />
              <span>Latency</span>
            </button>
            <input
              type="number"
              value={latencyMultiplier}
              onChange={(e) => setLatencyMultiplier(Number(e.target.value))}
              min="2"
              max="100"
              style={{
                width: '65px',
                padding: '7px',
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: '600'
              }}
            />
          </div>
          {latencySpikes[selectedNode] && (
            <div style={{ fontSize: '9px', color: '#f59e0b', textAlign: 'right', marginTop: '3px', fontFamily: 'monospace' }}>
              {latencySpikes[selectedNode]}x active
            </div>
          )}
        </div>

        {/* Traffic Spike */}
        <div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                onInject('traffic', { multiplier: trafficMultiplier });
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                backgroundColor: activeTraffic > 1 ? '#4b5563' : '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: activeTraffic > 1 ? 'none' : '0 2px 6px rgba(139, 92, 246, 0.3)'
              }}
            >
              <TrendingUp size={15} />
              <span>Traffic</span>
            </button>
            <input
              type="number"
              value={trafficMultiplier}
              onChange={(e) => setTrafficMultiplier(Number(e.target.value))}
              min="2"
              max="20"
              style={{
                width: '65px',
                padding: '7px',
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: '600'
              }}
            />
          </div>
          {activeTraffic > 1 && (
            <div style={{ fontSize: '9px', color: '#8b5cf6', textAlign: 'right', marginTop: '3px', fontFamily: 'monospace' }}>
              {activeTraffic}x active
            </div>
          )}
        </div>
      </div>

      {/* Preset Scenarios */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '10px', color: '#d1d5db', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Presets
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={() => onInject('traffic', { multiplier: 10 })}
            style={{
              padding: '7px 8px',
              backgroundColor: '#312e81',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center'
            }}
          >
            <ShoppingCart size={11} />
            <span>Black Friday</span>
          </button>
          <button
            onClick={() => {
              const dbNode = nodes.find(n => n.data.id === 'database');
              if (dbNode) onInject('crash', { nodeId: dbNode.id });
            }}
            style={{
              padding: '7px 8px',
              backgroundColor: '#7c2d12',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center'
            }}
          >
            <Database size={11} />
            <span>DB Crash</span>
          </button>
          <button
            onClick={() => onInject('traffic', { multiplier: 20 })}
            style={{
              padding: '7px 8px',
              backgroundColor: '#991b1b',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center'
            }}
          >
            <Shield size={11} />
            <span>DDoS</span>
          </button>
          <button
            onClick={() => {
              nodes.forEach(node => {
                onInject('latency', { nodeId: node.id, multiplier: 5 });
              });
            }}
            style={{
              padding: '7px 8px',
              backgroundColor: '#713f12',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center'
            }}
          >
            <Wifi size={11} />
            <span>Lag</span>
          </button>
        </div>
      </div>

      {/* Active Summary */}
      {(crashedNodes.length > 0 || Object.keys(latencySpikes).length > 0 || activeTraffic > 1) && (
        <div style={{
          padding: '8px 10px',
          backgroundColor: '#7f1d1d',
          borderRadius: '6px',
          marginBottom: '10px',
          border: '1px solid #991b1b'
        }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#fca5a5', marginBottom: '4px', textTransform: 'uppercase' }}>
            Active
          </div>
          <div style={{ fontSize: '9px', color: '#fecaca', lineHeight: '1.5', fontFamily: 'monospace' }}>
            {crashedNodes.length > 0 && <div>• {crashedNodes.length} crashed</div>}
            {Object.keys(latencySpikes).length > 0 && <div>• {Object.keys(latencySpikes).length} latency</div>}
            {activeTraffic > 1 && <div>• {activeTraffic}x traffic</div>}
          </div>
        </div>
      )}

      {/* Clear */}
      <button
        onClick={() => onInject('clear', {})}
        disabled={crashedNodes.length === 0 && Object.keys(latencySpikes).length === 0 && activeTraffic === 1}
        style={{
          width: '100%',
          padding: '9px',
          backgroundColor: crashedNodes.length === 0 && Object.keys(latencySpikes).length === 0 && activeTraffic === 1 ? '#374151' : '#059669',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          cursor: crashedNodes.length === 0 && Object.keys(latencySpikes).length === 0 && activeTraffic === 1 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'center'
        }}
      >
        <RefreshCw size={13} />
        <span>CLEAR ALL</span>
      </button>
    </div>
  );
};

export default FailureInjection;
