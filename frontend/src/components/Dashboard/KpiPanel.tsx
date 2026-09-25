// frontend/src/components/Dashboard/KpiPanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthModal } from '../Auth/AuthModal';

export default function KpiPanel() {
  const { kpis, areaKm2, loading, error, areaInfo } = useAppStore();

  // Auth state
  const { token, isAuthenticated, bumpSavesVersion } = useAuthStore();

  // UI state for save flow
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!kpis.length) return <p className="muted">Draw an area to begin.</p>;

  // The actual API call to save the snapshot
  const executeSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    // Package the current state into the JSON payload
    const payload = {
      data: {
        kpis,
        areaKm2,
        areaInfo,
      },
    };

    try {
      const response = await fetch('http://localhost:8000/api/save-kpi/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaveStatus({ type: 'success', msg: 'KPI snapshot saved!' });
        // Trigger a refresh of the RecentSaves list
        bumpSavesVersion();
      } else {
        setSaveStatus({ type: 'error', msg: 'Failed to save KPI.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', msg: 'Network error while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    setSaveStatus(null);
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      executeSave();
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Small delay so Zustand has the new token in state before we use it
    setTimeout(() => {
      executeSave();
    }, 50);
  };

  return (
    <div className="kpi-panel-wrapper" style={{ position: 'relative' }}>
      <ul className="kpi-list">
        {kpis.map((k) => (
          <li key={k.key} title={k.definition}>
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">
              {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
              {k.unit && <small> {k.unit}</small>}
            </span>
            {k.band && <span className="kpi-band">{k.band}</span>}
          </li>
        ))}
        <li>
          <span className="kpi-label">Area</span>
          <span className="kpi-value">
            {areaKm2.toFixed(2)}<small> km²</small>
          </span>
        </li>
        <li className="kpi-source">
          source: {areaInfo?.source ?? 'district'}
        </li>
      </ul>

      {/* Save Button Section */}
      <div
        className="save-section"
        style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}
      >
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="save-button"
          style={{
            backgroundColor: isSaving ? '#ccc' : '#2563eb',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {isSaving ? 'Saving...' : 'Save KPI Snapshot'}
        </button>

        {saveStatus && (
          <p
            className={saveStatus.type}
            style={{
              color: saveStatus.type === 'success' ? 'green' : 'red',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
            }}
          >
            {saveStatus.msg}
          </p>
        )}
      </div>

      {/* Auth Modal Overlay (Login + Sign Up) */}
      {showAuthModal && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onCancel={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
