import { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import '../styles/settings.css';

interface Constraints {
  max_travel_km: number;
  protected_shifts: string[];
  remote_reading_enabled: boolean;
  remote_scanning_assistance_enabled: boolean;
  max_radiologist_caseload: number;
  max_technologist_caseload: number;
  fatigue_threshold: number;
  subspecialty_matching_strict: boolean;
  enforce_jurisdiction_licensing: boolean;
  enable_instant_fallback: boolean;
}

export function SettingsPage() {
  const [constraints, setConstraints] = useState<Constraints | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchConstraints = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/tools/get_constraints`);
        if (!response.ok) {
          throw new Error(`Failed to fetch constraints: ${response.statusText}`);
        }
        const data = await response.json();
        setConstraints({
          max_travel_km: data.max_travel_km ?? 25,
          protected_shifts: data.protected_shifts ?? [],
          remote_reading_enabled: data.remote_reading_enabled ?? true,
          remote_scanning_assistance_enabled: data.remote_scanning_assistance_enabled ?? true,
          max_radiologist_caseload: data.max_radiologist_caseload ?? 20,
          max_technologist_caseload: data.max_technologist_caseload ?? 15,
          fatigue_threshold: data.fatigue_threshold ?? 0.8,
          subspecialty_matching_strict: data.subspecialty_matching_strict ?? false,
          enforce_jurisdiction_licensing: data.enforce_jurisdiction_licensing ?? true,
          enable_instant_fallback: data.enable_instant_fallback ?? true,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchConstraints();
  }, []);

  const handleSavePolicy = async () => {
    if (!constraints) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/tools/update_constraints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(constraints),
      });
      if (!response.ok) {
        throw new Error(`Failed to save policy: ${response.statusText}`);
      }
      setSuccessNotice('Policy constraints updated and logged to audit trail.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetBaseline = async () => {
    if (!window.confirm('Reset the database to calibrated baseline state? This cannot be undone.')) {
      return;
    }
    try {
      setResetting(true);
      const response = await fetch(`${API_BASE}/tools/reset_demo`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to reset baseline: ${response.statusText}`);
      }
      setSuccessNotice('Database reset to baseline state. Network and queue will refresh.');
      window.dispatchEvent(new Event('orbit:refresh'));
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset baseline');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="page-container"><h1>Settings</h1><p>Loading...</p></div>;
  if (error) return <div className="page-container"><h1>Settings</h1><div className="error-banner"><p>Error: {error}</p></div></div>;

  return (
    <div className="page-container">
      <div className="page-hero page-hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">Dynamic Policy Controls</p>
          <h1>Settings & Safety Envelope</h1>
          <p className="page-intro">Adjust network thresholds, fatigue caps, and travel caps in real time to keep rebalancing moves predictable and safe.</p>
        </div>
        <div className="hero-kpis" aria-label="Constraint summary">
          <span><strong>{constraints?.max_travel_km ?? 0}</strong> km cap</span>
          <span><strong>{(constraints?.fatigue_threshold ?? 0.8) * 100}%</strong> fatigue cap</span>
          <span><strong>{constraints?.enable_instant_fallback ? 'On' : 'Off'}</strong> fallback cascade</span>
        </div>
      </div>

      {successNotice ? (
        <div className="success-banner" role="status">
          {successNotice}
        </div>
      ) : null}

      {constraints ? (
        <div className="policy-grid">
          <section className="policy-panel policy-panel-wide">
            <div className="policy-panel-header">
              <div>
                <p className="policy-kicker">Capacity thresholds</p>
                <h2>Network rebalance parameters</h2>
              </div>
              <p className="policy-caption">Adjust the guardrails that shape routing proposals and clinician load balancing.</p>
            </div>

            <div className="policy-slider-list">
              <div className="policy-slider-item">
                <div className="policy-slider-copy">
                  <label htmlFor="max-travel">Max patient travel distance</label>
                  <p>Controls how far non-urgent patients may be rerouted for capacity relief.</p>
                </div>
                <div className="policy-slider-control">
                  <span className="policy-slider-value">{constraints.max_travel_km} km</span>
                  <input
                    id="max-travel"
                    type="range"
                    min="5"
                    max="60"
                    value={constraints.max_travel_km}
                    onChange={(e) => setConstraints({ ...constraints, max_travel_km: parseInt(e.target.value) || 25 })}
                  />
                </div>
              </div>

              <div className="policy-slider-item">
                <div className="policy-slider-copy">
                  <label htmlFor="fatigue-threshold">Radiologist fatigue threshold</label>
                  <p>Prevents the system from overloading readers during high-intensity periods.</p>
                </div>
                <div className="policy-slider-control">
                  <span className="policy-slider-value">{Math.round(constraints.fatigue_threshold * 100)}%</span>
                  <input
                    id="fatigue-threshold"
                    type="range"
                    min="50"
                    max="95"
                    value={Math.round(constraints.fatigue_threshold * 100)}
                    onChange={(e) => setConstraints({ ...constraints, fatigue_threshold: (parseInt(e.target.value) || 80) / 100 })}
                  />
                </div>
              </div>

              <div className="policy-slider-item">
                <div className="policy-slider-copy">
                  <label htmlFor="max-caseload">Max radiologist hourly caseload</label>
                  <p>Caps the number of studies ORBIT may route to a single radiologist per hour.</p>
                </div>
                <div className="policy-slider-control">
                  <span className="policy-slider-value">{constraints.max_radiologist_caseload} studies/hr</span>
                  <input
                    id="max-caseload"
                    type="range"
                    min="5"
                    max="30"
                    value={constraints.max_radiologist_caseload}
                    onChange={(e) => setConstraints({ ...constraints, max_radiologist_caseload: parseInt(e.target.value) || 20 })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="policy-panel">
            <div className="policy-panel-header">
              <div>
                <p className="policy-kicker">Safety rules</p>
                <h2>Licensing and fallback controls</h2>
              </div>
            </div>

            <div className="policy-toggle-list">
              <label className="policy-toggle-item">
                <input
                  type="checkbox"
                  checked={constraints.remote_reading_enabled}
                  onChange={(e) => setConstraints({ ...constraints, remote_reading_enabled: e.target.checked })}
                />
                <span className="policy-toggle-copy">
                  <span className="policy-toggle-title">Remote radiologist reading</span>
                  <span className="policy-toggle-note">Allow cross-site reading when licensure and workload constraints pass.</span>
                </span>
              </label>

              <label className="policy-toggle-item">
                <input
                  type="checkbox"
                  checked={constraints.remote_scanning_assistance_enabled}
                  onChange={(e) => setConstraints({ ...constraints, remote_scanning_assistance_enabled: e.target.checked })}
                />
                <span className="policy-toggle-copy">
                  <span className="policy-toggle-title">Remote technologist scan assistance</span>
                  <span className="policy-toggle-note">Enable guided scanning support for sites with thin on-site coverage.</span>
                </span>
              </label>

              <label className="policy-toggle-item">
                <input
                  type="checkbox"
                  checked={constraints.enforce_jurisdiction_licensing}
                  onChange={(e) => setConstraints({ ...constraints, enforce_jurisdiction_licensing: e.target.checked })}
                />
                <span className="policy-toggle-copy">
                  <span className="policy-toggle-title">Strict jurisdiction licensing</span>
                  <span className="policy-toggle-note">Require state medical board verification before any reassignment is proposed.</span>
                </span>
              </label>

              <label className="policy-toggle-item">
                <input
                  type="checkbox"
                  checked={constraints.enable_instant_fallback}
                  onChange={(e) => setConstraints({ ...constraints, enable_instant_fallback: e.target.checked })}
                />
                <span className="policy-toggle-copy">
                  <span className="policy-toggle-title">Instant fallback cascade</span>
                  <span className="policy-toggle-note">Stage the next approved alternative immediately when a primary option is rejected.</span>
                </span>
              </label>
            </div>
          </section>

          <section className="policy-panel">
            <div className="policy-panel-header policy-panel-header-split">
              <div>
                <p className="policy-kicker">System maintenance</p>
                <h2>Reset and recalibrate</h2>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleResetBaseline}
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Reset Baseline'}
              </button>
            </div>
            <p className="policy-caption">Reset the database to calibrated baseline state with sample data and demo proposals. Use this to restore a clean state after testing.</p>
          </section>
        </div>
      ) : (
        <p>No settings available</p>
      )}
    </div>
  );
}
