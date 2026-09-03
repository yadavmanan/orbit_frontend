import { useEffect, useState } from 'react';
import { API_BASE } from '../config';
import '../styles/proposals.css';

interface Move {
  id: string;
  move_kind: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  constraint_checks: Record<string, any>;
  appointment_id: string;
}

interface Proposal {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'executed';
  rationale: string;
  created_at: string;
  moves_count: number;
  simulated_impact: Record<string, any>;
  moves: Move[];
}

export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingCount = proposals.filter((proposal) => proposal.status === 'pending').length;
  const approvedCount = proposals.filter((proposal) => proposal.status === 'approved').length;
  const executedCount = proposals.filter((proposal) => proposal.status === 'executed').length;

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/proposals`);
        if (!response.ok) {
          throw new Error(`Failed to fetch proposals: ${response.statusText}`);
        }
        const data = await response.json();
        setProposals(data.proposals || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposals');
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
    const interval = setInterval(fetchProposals, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleApproveMove = async (proposalId: string, moveId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/proposals/${proposalId}/approve/${moveId}`,
        { method: 'POST' }
      );
      if (response.ok) {
        // Refresh proposals
        const res = await fetch(`${API_BASE}/proposals`);
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to approve move:', err);
    }
  };

  const handleRejectMove = async (proposalId: string, moveId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/proposals/${proposalId}/reject/${moveId}`,
        { method: 'POST' }
      );
      if (response.ok) {
        const res = await fetch(`${API_BASE}/proposals`);
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to reject move:', err);
    }
  };

  const handleExecuteMove = async (moveId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/tools/execute_move/${moveId}`,
        { method: 'POST' }
      );
      if (response.ok) {
        const res = await fetch(`${API_BASE}/proposals`);
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to execute move:', err);
    }
  };

  const formatMetricKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderImpactMetrics = (impact: Record<string, any>) => {
    return Object.entries(impact).map(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'object' && value !== null) {
        if ('before' in value && 'after' in value) {
          return (
            <div key={key} className="impact-metric">
              <div className="metric-label">{formatMetricKey(key)}</div>
              <div className="metric-values">
                <span className="metric-before">{value.before}</span>
                <span className="metric-arrow">→</span>
                <span className="metric-after">{value.after}</span>
              </div>
            </div>
          );
        } else {
          displayValue = JSON.stringify(value);
        }
      }
      return (
        <div key={key} className="impact-metric">
          <div className="metric-label">{formatMetricKey(key)}</div>
          <div className="metric-value">{String(displayValue)}</div>
        </div>
      );
    });
  };

  if (loading) return <div className="page-container"><h1>Approval Queue</h1><p>Loading...</p></div>;
  if (error) return <div className="page-container"><h1>Approval Queue</h1><div className="error-banner"><p>Error: {error}</p></div></div>;

  return (
    <div className="page-container">
      <div className="page-hero page-hero-compact">
        <div className="hero-copy">
          <p className="eyebrow">Approval workflow</p>
          <h1>Human review queue</h1>
          <p className="page-intro">Pending moves stay staged until a coordinator confirms the plan, keeping autonomy useful without feeling loose.</p>
        </div>
        <div className="hero-kpis" aria-label="Queue summary">
          <span><strong>{pendingCount}</strong> pending</span>
          <span><strong>{approvedCount}</strong> approved</span>
          <span><strong>{executedCount}</strong> executed</span>
        </div>
      </div>
      <div className="proposals-list">
        {proposals.length === 0 ? (
          <p className="empty-state">No proposals pending</p>
        ) : (
          proposals.map((proposal) => (
            <div
              key={proposal.id}
              className={`proposal-card proposal-${proposal.status}`}
            >
              <div className="proposal-header">
                <h3>{proposal.type}</h3>
                <span className="status-badge">{proposal.status}</span>
              </div>
              <p className="rationale">{proposal.rationale}</p>
              <p className="created">Created: {new Date(proposal.created_at).toLocaleString()}</p>

              {proposal.simulated_impact && (
                <div className="impact-section">
                  <h4>Simulated Impact</h4>
                  <div className="impact-metrics">
                    {renderImpactMetrics(proposal.simulated_impact)}
                  </div>
                </div>
              )}

              <button
                className="toggle-moves"
                onClick={() =>
                  setExpandedId(expandedId === proposal.id ? null : proposal.id)
                }
              >
                {expandedId === proposal.id ? 'Hide' : 'Show'} Moves ({proposal.moves_count})
              </button>

              {expandedId === proposal.id && (
                <div className="moves-section">
                  {proposal.moves.map((move) => (
                    <div key={move.id} className={`move-item move-${move.status}`}>
                      <div className="move-header">
                        <div className="move-kind-badge">{move.move_kind}</div>
                        <span className={`move-status-label move-status-${move.status}`}>{move.status}</span>
                      </div>
                      {move.constraint_checks && Object.keys(move.constraint_checks).length > 0 && (
                        <div className="constraints">
                          {Object.entries(move.constraint_checks).map(
                            ([key, value]) => (
                              <span key={key} className="constraint-badge">
                                ✓ {formatMetricKey(key)}
                              </span>
                            )
                          )}
                        </div>
                      )}
                      <div className="move-actions">
                        {move.status === 'pending' && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => handleApproveMove(proposal.id, move.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleRejectMove(proposal.id, move.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {move.status === 'approved' && (
                          <button
                            className="btn-execute"
                            onClick={() => handleExecuteMove(move.id)}
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
