import { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import '../styles/network.css';

interface Site {
  name: string;
  jurisdiction: string;
  utilization: number;
  scanners: number;
  staff: number;
  queue_depth: number;
  coverage: string;
}

interface ApiSiteStatus {
  site?: string;
  site_name?: string;
  jurisdiction?: string;
  utilization?: number;
  utilization_percent?: number;
  scanners?: number;
  radiologists?: number;
  technologists?: number;
  queue_depth?: number;
  coverage?: string;
  coverage_status?: string;
}

function formatCoverage(value: string | undefined) {
  return (value ?? 'balanced')
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function coverageClass(value: string) {
  return value.toLowerCase().includes('constrained') ? 'is-constrained' : 'is-balanced';
}

export function NetworkPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tools/get_network_status`);
      if (!response.ok) {
        throw new Error(`Failed to fetch network status: ${response.statusText}`);
      }
      const data = await response.json();
      const siteData = (data.status_rail || []).map((site: ApiSiteStatus) => ({
        name: site.site ?? site.site_name ?? 'Unknown site',
        jurisdiction: site.jurisdiction ?? 'CA',
        utilization: site.utilization ?? site.utilization_percent ?? 0,
        scanners: site.scanners ?? 0,
        staff: (site.radiologists ?? 0) + (site.technologists ?? 0),
        queue_depth: site.queue_depth ?? 0,
        coverage: formatCoverage(site.coverage ?? site.coverage_status),
      }));
      setSites(siteData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network data');
    } finally {
      setLoading(false);
    }
  };

  const averageUtilization = sites.length
    ? Math.round(sites.reduce((total, site) => total + site.utilization, 0) / sites.length)
    : 0;
  const constrainedSites = sites.filter((site) => coverageClass(site.coverage) === 'is-constrained').length;

  useEffect(() => {
    fetchNetworkStatus();
    const interval = setInterval(fetchNetworkStatus, 10000); // Refresh every 10 seconds

    const handleRefreshEvent = () => {
      fetchNetworkStatus();
    };
    window.addEventListener('orbit:refresh', handleRefreshEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('orbit:refresh', handleRefreshEvent);
    };
  }, []);

  if (loading) return <div className="page-container"><h1>Network View</h1><p>Loading...</p></div>;
  if (error) return <div className="page-container"><h1>Network View</h1><div className="error-banner"><p>Error: {error}</p></div></div>;

  return (
    <div className="page-container">
      <div className="page-hero page-hero-compact network-hero">
        <div className="hero-copy">
          <p className="eyebrow">Network state</p>
          <h1>Scanner coverage</h1>
          <p className="page-intro">A quick read on utilization, staffing, and coverage so coordinators can spot pressure before it becomes friction.</p>
        </div>
        <div className="hero-kpis" aria-label="Network summary">
          <span><strong>{sites.length}</strong> sites</span>
          <span><strong>{averageUtilization}%</strong> avg utilization</span>
          <span><strong>{constrainedSites}</strong> constrained</span>
        </div>
      </div>
      <div className="network-grid">
        {sites.map((site) => (
          <article key={site.name} className={`network-card ${coverageClass(site.coverage)}`}>
            <div className="network-card-header">
              <div>
                <p className="network-card-kicker">Site overview</p>
                <h3>{site.name}</h3>
              </div>
              <p className="network-jurisdiction">{site.jurisdiction}</p>
            </div>
            <div className="network-metrics">
              <div className="network-metric">
                <span className="network-metric-label">Utilization</span>
                <span className="network-metric-value">{site.utilization}%</span>
              </div>
              <div className="network-metric">
                <span className="network-metric-label">Queue Depth</span>
                <span className="network-metric-value">{site.queue_depth}</span>
              </div>
              <div className="network-metric">
                <span className="network-metric-label">Scanners</span>
                <span className="network-metric-value">{site.scanners}</span>
              </div>
            </div>
            <div className="network-card-footer">
              <p className="network-coverage">{site.coverage || 'Balanced'}</p>
              <p className="network-footnote">{site.staff} staff · {site.queue_depth} queued</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
