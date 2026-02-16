import React, { useState, useEffect } from 'react';

const ConfigPanel = ({ node, onClose, onUpdate }) => {
  const [config, setConfig] = useState({
    baseLatency: 50,
    maxCapacity: 500,
    retryPolicy: 'none',
    failureThreshold: 0.85,
    timeout: 5000
  });

  // Load node config when panel opens
  useEffect(() => {
    if (node?.data?.config) {
      setConfig(node.data.config);
    }
  }, [node]);

  if (!node) return null;

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
  };

  const handleSave = () => {
    onUpdate(node.id, config);
    console.log('💾 Saved config for', node.data.label, config);
  };

  const retryPolicies = ['none', 'linear', 'exponential'];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '320px',
      height: '100%',
      backgroundColor: '#111827',
      borderLeft: '1px solid #374151',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
            {node.data.icon} {node.data.label}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
            Node ID: {node.id}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* Configuration Form */}
      <div style={{ padding: '16px', flex: 1 }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '8px'
          }}>
            Base Latency (ms)
          </label>
          <input
            type="number"
            value={config.baseLatency}
            onChange={(e) => handleChange('baseLatency', Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px'
            }}
            min="1"
            max="10000"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
            Processing time when idle
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '8px'
          }}>
            Max Capacity (req/sec)
          </label>
          <input
            type="number"
            value={config.maxCapacity}
            onChange={(e) => handleChange('maxCapacity', Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px'
            }}
            min="1"
            max="10000"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
            Maximum requests per second
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '8px'
          }}>
            Failure Threshold
          </label>
          <input
            type="range"
            value={config.failureThreshold}
            onChange={(e) => handleChange('failureThreshold', Number(e.target.value))}
            min="0.5"
            max="1.0"
            step="0.05"
            style={{
              width: '100%',
              marginBottom: '8px'
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#9ca3af'
          }}>
            <span>50%</span>
            <span style={{ fontWeight: '600', color: '#fff' }}>
              {(config.failureThreshold * 100).toFixed(0)}%
            </span>
            <span>100%</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
            Utilization level where failures start
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '8px'
          }}>
            Retry Policy
          </label>
          <select
            value={config.retryPolicy}
            onChange={(e) => handleChange('retryPolicy', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {retryPolicies.map(policy => (
              <option key={policy} value={policy}>
                {policy.charAt(0).toUpperCase() + policy.slice(1)}
              </option>
            ))}
          </select>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
            How to retry failed requests
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#d1d5db',
            marginBottom: '8px'
          }}>
            Timeout (ms)
          </label>
          <input
            type="number"
            value={config.timeout}
            onChange={(e) => handleChange('timeout', Number(e.target.value))}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px'
            }}
            min="100"
            max="60000"
            step="100"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
            Request timeout duration
          </p>
        </div>

        {/* Config Summary */}
        <div style={{
          padding: '12px',
          backgroundColor: '#1f2937',
          borderRadius: '6px',
          border: '1px solid #374151',
          marginBottom: '16px'
        }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            fontWeight: '600',
            color: '#d1d5db'
          }}>
            Configuration Summary
          </h4>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
            <div>• Processes requests in <strong style={{color: '#fff'}}>{config.baseLatency}ms</strong></div>
            <div>• Handles up to <strong style={{color: '#fff'}}>{config.maxCapacity}</strong> req/s</div>
            <div>• Fails at <strong style={{color: '#fff'}}>{(config.failureThreshold * 100).toFixed(0)}%</strong> utilization</div>
            <div>• Retry: <strong style={{color: '#fff'}}>{config.retryPolicy}</strong></div>
            <div>• Timeout: <strong style={{color: '#fff'}}>{config.timeout}ms</strong></div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #374151',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
        >
          💾 Save Changes
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
