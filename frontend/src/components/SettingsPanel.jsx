import React from 'react';
import { X, Settings, Volume2, VolumeX, RefreshCw, Clock, Activity } from 'lucide-react';

function Toggle({ checked, onChange, label, description }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '36px', height: '20px',
          borderRadius: '10px',
          backgroundColor: checked ? '#3b82f6' : '#374151',
          position: 'relative',
          flexShrink: 0,
          transition: 'background-color 0.2s',
          cursor: 'pointer',
          marginTop: '2px',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          width: '16px', height: '16px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#e5e7eb' }}>{label}</div>
        {description && (
          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', lineHeight: '1.4' }}>{description}</div>
        )}
      </div>
    </label>
  );
}

function Slider({ value, min, max, step = 1, onChange, label, formatValue }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#e5e7eb' }}>{label}</span>
        <span style={{ fontSize: '11px', color: '#3b82f6', fontFamily: 'monospace', fontWeight: '700' }}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
      />
    </div>
  );
}

export default function SettingsPanel({ open, onClose, settings, onSettingsChange }) {
  const update = (key, val) => onSettingsChange({ ...settings, [key]: val });

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 299,
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '300px',
        background: '#0d1117',
        borderLeft: '1px solid #1f2937',
        zIndex: 300,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0,
        }}>
          <Settings size={16} color="#9ca3af" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#e5e7eb', flex: 1 }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '18px 16px', flex: 1 }}>

          {/* — Alerts section — */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '9px', color: '#4b5563', textTransform: 'uppercase',
              letterSpacing: '0.8px', marginBottom: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {settings?.alertsMuted ? <VolumeX size={11} color="#ef4444" /> : <Volume2 size={11} color="#3b82f6" />}
              Alert Notifications
            </div>

            <Toggle
              checked={!settings?.alertsMuted}
              onChange={v => update('alertsMuted', !v)}
              label="Toast notifications"
              description="Show pop-up toasts for critical alerts. Warning toasts always go to sidebar only."
            />

            <Toggle
              checked={settings?.simulationMode ?? true}
              onChange={v => update('simulationMode', v)}
              label="Simulation mode"
              description="In simulation mode, warning toasts are suppressed. Only critical/cascade show toasts."
            />
          </div>

          <div style={{ borderTop: '1px solid #1f2937', marginBottom: '20px', paddingTop: '18px' }}>
            <div style={{
              fontSize: '9px', color: '#4b5563', textTransform: 'uppercase',
              letterSpacing: '0.8px', marginBottom: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <RefreshCw size={11} color="#3b82f6" />
              Polling
            </div>

            <Slider
              label="Poll interval"
              value={settings?.pollInterval ?? 20}
              min={5} max={60} step={5}
              onChange={v => update('pollInterval', v)}
              formatValue={v => `${v}s`}
            />
          </div>

          <div style={{ borderTop: '1px solid #1f2937', marginBottom: '20px', paddingTop: '18px' }}>
            <div style={{
              fontSize: '9px', color: '#4b5563', textTransform: 'uppercase',
              letterSpacing: '0.8px', marginBottom: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Activity size={11} color="#3b82f6" />
              Anomaly Detection
            </div>

            <Slider
              label="Z-score threshold"
              value={settings?.zScoreThreshold ?? 3}
              min={1.5} max={5} step={0.5}
              onChange={v => update('zScoreThreshold', v)}
              formatValue={v => `${v}σ`}
            />

            <Slider
              label="Prediction horizon"
              value={settings?.predictionHorizonMin ?? 30}
              min={5} max={120} step={5}
              onChange={v => update('predictionHorizonMin', v)}
              formatValue={v => `${v}m`}
            />
          </div>

          <div style={{ borderTop: '1px solid #1f2937', paddingTop: '18px' }}>
            <div style={{
              fontSize: '9px', color: '#4b5563', textTransform: 'uppercase',
              letterSpacing: '0.8px', marginBottom: '14px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Clock size={11} color="#3b82f6" />
              Display
            </div>

            <Slider
              label="Max sparkline points"
              value={settings?.maxSparklinePoints ?? 20}
              min={10} max={60} step={5}
              onChange={v => update('maxSparklinePoints', v)}
              formatValue={v => `${v} pts`}
            />

            <Toggle
              checked={settings?.showHealthScore ?? true}
              onChange={v => update('showHealthScore', v)}
              label="Show health score"
              description="Display health % badge on each node card."
            />

            <Toggle
              checked={settings?.showPredictions ?? true}
              onChange={v => update('showPredictions', v)}
              label="Show prediction timers"
              description="Show breach countdown on nodes with rising trends."
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #1f2937',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '9px', color: '#374151', textAlign: 'center' }}>
            Changes apply immediately · No restart required
          </div>
        </div>
      </div>
    </>
  );
}
