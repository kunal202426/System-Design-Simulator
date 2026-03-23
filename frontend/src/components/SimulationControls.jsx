import React, { useState, useEffect } from 'react';
import { Play, Square, Download, FolderOpen, Sun, Moon, X, Activity } from 'lucide-react';

/**
 * Header — compact 50px top bar
 *
 * Props:
 *   nodes, onStart(entryId, traffic), onStop
 *   isRunning, isConnected, isInitializing
 *   filterType, onFilterChange
 *   onLoadConfig(filePath)  async
 *   onExport                (optional — shown when running)
 *   darkMode, onToggleDark
 */
const Header = ({
  nodes = [],
  onStart,
  onStop,
  isRunning,
  isConnected,
  isInitializing,
  filterType = '',
  onFilterChange,
  onLoadConfig,
  onExport,
  darkMode = true,
  onToggleDark,
}) => {
  const [entryNode, setEntryNode]         = useState('');
  const [traffic, setTraffic]             = useState(1000);
  const [showConfig, setShowConfig]       = useState(false);
  const [configPath, setConfigPath]       = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError]     = useState('');

  const canStart = nodes.length > 0 && !isInitializing;
  const nodeTypes = [...new Set(nodes.map(n => n.data?.type).filter(Boolean))];

  const handleStart = () => {
    if (!entryNode) { alert('Select an entry node first'); return; }
    onStart(entryNode, traffic);
  };

  const handleLoad = async () => {
    if (!configPath.trim()) return;
    setConfigLoading(true);
    setConfigError('');
    try {
      await onLoadConfig?.(configPath.trim());
      setShowConfig(false);
      setConfigPath('');
    } catch (e) {
      setConfigError(e.message || 'Failed');
    } finally {
      setConfigLoading(false);
    }
  };

  const inputCss = {
    padding: '4px 8px',
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '5px',
    color: '#e5e7eb',
    fontSize: '11px',
    outline: 'none',
  };

  const textBtn = (onClick, label, bg, disabled = false, title = '') => (
    <button
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 11px',
        backgroundColor: disabled ? '#1f2937' : bg,
        color: '#fff', border: 'none', borderRadius: '5px',
        fontSize: '11px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {label}
    </button>
  );

  const iconBtn = (onClick, Icon, title, active = false) => (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: '5px 7px',
        backgroundColor: active ? '#1f2937' : 'transparent',
        border: '1px solid transparent',
        borderRadius: '5px', cursor: 'pointer',
        color: '#6b7280', display: 'flex', alignItems: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = active ? '#1f2937' : 'transparent'}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <header style={{
      height: '50px', flexShrink: 0,
      backgroundColor: '#1a1f2e',
      borderBottom: '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 12px',
      zIndex: 800,
      overflowX: 'auto',
    }}>
      {/* Branding badge */}
      <div title="Digital Chaos Lab — Real-Time Observability" style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px',
        backgroundColor: '#111827',
        borderRadius: '6px',
        border: '1px solid #1f2937',
        cursor: 'default',
      }}>
        <Activity size={13} color="#3b82f6" />
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#e5e7eb', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
          Chaos Lab
        </span>
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#1f2937', flexShrink: 0 }} />

      {/* Entry node */}
      <div style={{ flexShrink: 0 }}>
        <select
          value={entryNode}
          onChange={e => setEntryNode(e.target.value)}
          disabled={isRunning || isInitializing}
          title="Entry node for simulation"
          style={{ ...inputCss, minWidth: '130px', cursor: (isRunning || isInitializing) ? 'not-allowed' : 'pointer' }}
        >
          <option value="">Entry node…</option>
          {nodes.map(n => (
            <option key={n.id} value={n.id}>{n.data.label}</option>
          ))}
        </select>
      </div>

      {/* Traffic */}
      <div style={{ flexShrink: 0 }}>
        <input
          type="number"
          value={traffic}
          onChange={e => setTraffic(Number(e.target.value))}
          disabled={isRunning || isInitializing}
          min="100" max="10000" step="100"
          title="Traffic (req/s)"
          placeholder="req/s"
          style={{ ...inputCss, width: '80px' }}
        />
      </div>

      {/* Start / Stop */}
      <div style={{ flexShrink: 0 }}>
        {!isRunning
          ? textBtn(handleStart, isInitializing ? 'Starting…' : '▶ Start', '#10b981', !canStart)
          : textBtn(onStop, '■ Stop', '#ef4444')
        }
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: '#1f2937', flexShrink: 0 }} />

      {/* Filter */}
      {nodeTypes.length > 0 && (
        <select
          value={filterType}
          onChange={e => onFilterChange?.(e.target.value)}
          title="Filter nodes by type"
          style={{ ...inputCss, minWidth: '100px', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="">All types</option>
          {nodeTypes.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      )}

      {/* Config loader */}
      {!showConfig
        ? iconBtn(() => setShowConfig(true), FolderOpen, 'Load CSV/XLSX config')
        : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <div>
              <input
                type="text"
                value={configPath}
                onChange={e => setConfigPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoad()}
                placeholder="config/services.csv"
                autoFocus
                style={{ ...inputCss, width: '170px' }}
              />
              {configError && (
                <div style={{ fontSize: '9px', color: '#ef4444', marginTop: '1px', position: 'absolute' }}>
                  {configError}
                </div>
              )}
            </div>
            {textBtn(handleLoad, configLoading ? '…' : 'Load', '#3b82f6', configLoading)}
            <button
              onClick={() => { setShowConfig(false); setConfigError(''); }}
              style={{ padding: '4px 6px', background: 'none', border: '1px solid #374151', borderRadius: '4px', cursor: 'pointer', color: '#6b7280' }}
            >
              <X size={11} />
            </button>
          </div>
        )
      }

      {/* Export */}
      {isRunning && onExport && iconBtn(onExport, Download, 'Export state as JSON')}

      {/* Dark mode */}
      {iconBtn(onToggleDark, darkMode ? Sun : Moon, darkMode ? 'Switch to light mode' : 'Switch to dark mode')}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* WS status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : isInitializing ? '#f59e0b' : '#374151',
          boxShadow: isConnected ? '0 0 6px #10b981' : isInitializing ? '0 0 5px #f59e0b' : 'none',
          transition: 'all 0.3s',
        }} />
        <span style={{ fontSize: '10px', color: '#4b5563', fontFamily: 'monospace', fontWeight: '600', whiteSpace: 'nowrap' }}>
          {isConnected ? 'Live' : isInitializing ? 'Connecting' : 'Ready'}
        </span>
      </div>
    </header>
  );
};

export default Header;
