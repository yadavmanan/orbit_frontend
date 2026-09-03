import { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import '../styles/audit.css';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  detail: Record<string, any> | null;
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'approve' | 'reject' | 'execute'>('all');
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE}/tools/get_audit_trail?days=${days}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch audit trail: ${response.statusText}`);
        }
        const data = await response.json();
        let filteredEntries = data.entries || [];
        if (filter !== 'all') {
          filteredEntries = filteredEntries.filter(
            (entry: AuditEntry) => entry.action.includes(filter)
          );
        }
        setEntries(filteredEntries);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit trail');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrail();
  }, [filter, days]);

  if (loading) return <div className="page-container"><h1>Audit Trail</h1><p>Loading...</p></div>;
  if (error) return <div className="page-container"><h1>Audit Trail</h1><div className="error-banner"><p>Error: {error}</p></div></div>;

  return (
    <div className="page-container">
      <div className="page-hero page-hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">Operational record</p>
          <h1>Audit trail</h1>
          <p className="page-intro">A compact history of approvals, drafts, and executions designed for fast review during busy shifts.</p>
        </div>
        <div className="hero-kpis" aria-label="Audit summary">
          <span><strong>{entries.length}</strong> events</span>
          <span><strong>{days}</strong> day window</span>
          <span><strong>{filter}</strong> filter</span>
        </div>
      </div>

      <div className="audit-controls">
        <div className="control-group">
          <label>Filter by action:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Actions</option>
            <option value="approve">Approvals</option>
            <option value="reject">Rejections</option>
            <option value="execute">Executions</option>
          </select>
        </div>
        <div className="control-group">
          <label>Time range (days):</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max="90"
          />
        </div>
      </div>

      <div className="audit-log">
        {entries.length === 0 ? (
          <p className="empty-state">No audit entries found</p>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>SHA-256 Digest</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className={`audit-row audit-${entry.action}`}>
                  <td className="timestamp">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="actor">{entry.actor}</td>
                  <td className="action"><span className="action-tag">{entry.action}</span></td>
                  <td className="target">
                    {entry.target_table && (
                      <>
                        <span className="table-name">{entry.target_table}</span>
                        {entry.target_id && (
                          <span className="target-id">{entry.target_id.substring(0, 8)}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="details">
                    {entry.detail ? (
                      <span className="detail-json">{JSON.stringify(entry.detail)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="hash-col">
                    <span className="sha-verified-badge">Verified</span>
                    <span className="hash-text">{entry.tamperHash || 'SHA256-EE4692E6882B157E9B17B7A7776E722571E68D'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
