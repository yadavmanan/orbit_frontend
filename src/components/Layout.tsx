import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE } from '../config';
import '../styles/layout.css';

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.4" />
      <circle cx="5" cy="18" r="2.4" />
      <circle cx="19" cy="18" r="2.4" />
      <path d="M12 7.4v4.6M12 12l-5.6 3.8M12 12l5.6 3.8" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5.2" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v4.8l3.2 2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { path: '/', label: 'Dashboard', icon: <IconHome /> },
        { path: '/network', label: 'Network View', icon: <IconNetwork /> },
      ],
    },
    {
      label: 'Operations',
      items: [
        { path: '/proposals', label: 'Approval Queue', icon: <IconCheck /> },
        { path: '/audit', label: 'Audit Trail', icon: <IconAudit /> },
      ],
    },
    {
      label: 'Administration',
      items: [
        { path: '/settings', label: 'Policy Settings', icon: <IconSettings /> },
      ],
    },
  ];

  const handleTriggerPreset = async (presetKey: string) => {
    try {
      setTriggering(true);
      const url = presetKey === 'reset'
        ? `${API_BASE}/tools/reset_demo`
        : `${API_BASE}/tools/trigger_scenario/${presetKey}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      setPresetNotice(data.message || `Scenario ${presetKey} activated.`);
      window.dispatchEvent(new CustomEvent('orbit:refresh'));
      setTimeout(() => setPresetNotice(null), 4000);
    } catch (err) {
      setPresetNotice('Error triggering preset scenario');
      setTimeout(() => setPresetNotice(null), 3000);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className={`layout-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <div className="nav-header">
          <div className="nav-brand">
            <p className="nav-eyebrow">ORBIT</p>
            <h1>Radiology</h1>
          </div>
          <button
            type="button"
            className={`sidebar-toggle ${collapsed ? 'is-collapsed' : ''}`}
            onClick={() => setCollapsed((prev) => !prev)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <IconChevron />
          </button>
        </div>

        <div className="nav-scroll">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <ul className="nav-menu">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="nav-footer">
          <p className="version">ORBIT v4.6 Cockpit</p>
          <p className="status"><span className="live-dot" /><span className="nav-label">WebMCP Sync Active</span></p>
        </div>
      </nav>

      <main className="main-content">
        <header className="top-demo-bar">
          <div className="demo-title">
            <span className="demo-badge">LIVE DEMO PRESETS</span>
            <span className="demo-sub">Simulate real-world operational crises in real time:</span>
          </div>
          <div className="demo-buttons">
            <button
              type="button"
              className="preset-btn stroke-btn"
              disabled={triggering}
              onClick={() => handleTriggerPreset('stroke_spike')}
              title="Inject sudden acute stroke CTA influx at East River Trauma"
            >
              ⚡ Stroke STAT Spike
            </button>
            <button
              type="button"
              className="preset-btn outage-btn"
              disabled={triggering}
              onClick={() => handleTriggerPreset('scanner_outage')}
              title="Simulate cryogenic hardware fault on North Campus 3.0T MRI"
            >
              ❄️ Scanner Fault
            </button>
            <button
              type="button"
              className="preset-btn neuro-btn"
              disabled={triggering}
              onClick={() => handleTriggerPreset('neuro_surge')}
              title="Spike pediatric brain tumor cases & test licensure checks"
            >
              Neuro Surge
            </button>
            <button
              type="button"
              className="preset-btn tech-btn"
              disabled={triggering}
              onClick={() => handleTriggerPreset('tech_shortage')}
              title="Simulate staff sick call & activate tele-proctoring"
            >
              Tech Shortage
            </button>
            <button
              type="button"
              className="preset-btn reset-btn"
              disabled={triggering}
              onClick={() => handleTriggerPreset('reset')}
              title="Restore baseline calibrated state"
            >
              Reset Baseline
            </button>
          </div>
        </header>

        {presetNotice ? (
          <div className="preset-banner" role="status">
            <span className="banner-icon">⚡</span>
            <span>{presetNotice}</span>
          </div>
        ) : null}

        <div className="content-wrapper">{children}</div>
      </main>
    </div>
  );
}
