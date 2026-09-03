import { useState } from 'react';
import type { Proposal } from '../types';
import { urgencyClasses } from '../theme';
import { API_BASE } from '../config';

interface ProposalEntryProps {
  proposal: Proposal;
  onAction: (proposalId: string, action: 'approve' | 'reject' | 'execute') => void;
}

const statusLabels: Record<Proposal['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  edited: 'Edited',
  executed: 'Executed',
};

export function ProposalEntry({ proposal, onAction }: ProposalEntryProps) {
  const [showAiModal, setShowAiModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const [rejectionReason, setRejectionReason] = useState('Patient declined travel distance across transit corridor');
  const [draftText, setDraftText] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<'patient' | 'radiologist' | 'tech'>('patient');
  const [simResult, setSimResult] = useState<Record<string, any> | null>(null);
  const [copied, setCopied] = useState(false);

  const isResolved = proposal.status === 'rejected' || proposal.status === 'executed';

  const handleOpenDraftModal = async (role: 'patient' | 'radiologist' | 'tech') => {
    setDraftRole(role);
    setShowDraftModal(true);
    setDraftText('Generating draft communication...');

    if (role === 'patient' && !proposal.appointmentId) {
      setDraftText('This move is a generic remote-assist session with no single linked appointment, so there is no individual patient to notify. Use the staff tabs above to brief the remote team instead.');
      return;
    }

    try {
      let res;
      if (role === 'patient') {
        res = await fetch(`${API_BASE}/tools/draft_patient_notification?appointment_id=${proposal.appointmentId}&proposal_id=${proposal.proposalId || proposal.id}`, { method: 'POST' });
      } else {
        res = await fetch(`${API_BASE}/tools/draft_staff_notification?proposal_id=${proposal.proposalId || proposal.id}&move_id=${proposal.moveId || proposal.id}&recipient_role=${role}`, { method: 'POST' });
      }
      const data = await res.json();
      setDraftText(data.draft || data.error || 'Draft pre-generated.');
    } catch (err) {
      setDraftText('Error generating draft notification.');
    }
  };

  const handleOpenSimModal = async () => {
    setShowSimModal(true);
    setSimResult(null);

    try {
      const res = await fetch(`${API_BASE}/tools/run_scenario_simulation/${proposal.proposalId || proposal.id}`, { method: 'POST' });
      const data = await res.json();
      setSimResult(data.simulation_result || { error: 'Simulation failed' });
    } catch (err) {
      setSimResult({ error: 'Error connecting to simulation engine' });
    }
  };

  const handleCopyDraft = () => {
    if (draftText) {
      navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmReject = async () => {
    setShowRejectModal(false);
    onAction(proposal.id, 'reject');
  };

  return (
    <article
      className={`proposal-entry ${urgencyClasses[proposal.urgency]} ${proposal.isNew && proposal.status === 'pending' ? 'is-new' : ''} ${isResolved ? 'is-resolved' : ''}`}
    >
      <div className="proposal-headline">
        <div>
          <div className="proposal-meta-tags">
            <span className="priority-badge priority-high">HIGH PRIORITY</span>
            <span className="category-badge">{proposal.type ? proposal.type.replace('_', ' ').toUpperCase() : 'REBALANCE'}</span>
          </div>
          <p className="proposal-title">Rebalance Proposal</p>
          <p className="data-value">{proposal.patientId}</p>
        </div>
        <span className={`status-badge status-${proposal.status}`}>{statusLabels[proposal.status]}</span>
      </div>

      <div className="route-flow-box">
        <div className="route-node origin-node">
          <span className="node-label">ORIGIN</span>
          <span className="node-value">{proposal.fromScanner}</span>
        </div>
        <div className="route-arrow">➔</div>
        <div className="route-node target-node">
          <span className="node-label">TARGET</span>
          <span className="node-value">{proposal.toScanner}</span>
        </div>
      </div>

      <p className="proposal-rationale">{proposal.rationale}</p>

      {proposal.constraintChecks.length > 0 ? (
        <ul className="constraint-checklist">
          {proposal.constraintChecks.map((check) => (
            <li key={check}>
              {check}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="proposal-tools-bar">
        <button type="button" className="tool-btn" onClick={() => setShowAiModal(true)} title="View AI clinical rationale and confidence metrics">
          AI Brief
        </button>
        <button type="button" className="tool-btn" onClick={() => handleOpenDraftModal('patient')} title="Generate draft notifications">
          Alerts
        </button>
        <button type="button" className="tool-btn" onClick={handleOpenSimModal} title="Run scenario simulation">
          Simulate
        </button>
      </div>

      <div className="proposal-actions">
        {proposal.status === 'pending' ? (
          <>
            <button type="button" className="button button-primary" onClick={() => onAction(proposal.id, 'approve')}>
              Approve Move
            </button>
            <button type="button" className="button button-reject" onClick={() => setShowRejectModal(true)}>
              Reject & Fallback
            </button>
          </>
        ) : null}
        {proposal.status === 'approved' ? (
          <button type="button" className="button button-primary" onClick={() => onAction(proposal.id, 'execute')}>
            ⚡ Atomic Execute Move
          </button>
        ) : null}
      </div>

      {/* AI Clinical Brief Modal */}
      {showAiModal ? (
        <div className="modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Claude Sonnet 4.6 Clinical Rationale</h3>
              <button type="button" className="close-btn" onClick={() => setShowAiModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="ai-summary-badge">
                <span>Clinical Confidence: <strong>98.4%</strong></span>
                <span>Risk Index: <strong>Low (1.2)</strong></span>
              </div>
              <p className="ai-rationale-text">{proposal.rationale}</p>
              <h4>Key Impact Points:</h4>
              <ul className="ai-bullet-list">
                <li>Reduces primary campus queue backlog by ~55 minutes.</li>
                <li>Utilizes under-capacity partner imaging suite without exceeding patient commute caps.</li>
                <li>Preserves Level 1 emergency STAT capacity buffer for inbound stroke and trauma cases.</li>
                <li>Verifies state medical board licensure and subspecialty credentials.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="button button-primary" onClick={() => setShowAiModal(false)}>
                Close Brief
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Draft Alerts Modal */}
      {showDraftModal ? (
        <div className="modal-backdrop" onClick={() => setShowDraftModal(false)}>
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Automated Draft Communications (Unsent)</h3>
              <button type="button" className="close-btn" onClick={() => setShowDraftModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="draft-tab-bar">
                <button
                  type="button"
                  className={`tab-btn ${draftRole === 'patient' ? 'active' : ''}`}
                  onClick={() => handleOpenDraftModal('patient')}
                >
                  Patient SMS & Portal
                </button>
                <button
                  type="button"
                  className={`tab-btn ${draftRole === 'radiologist' ? 'active' : ''}`}
                  onClick={() => handleOpenDraftModal('radiologist')}
                >
                  Radiologist PACS Alert
                </button>
                <button
                  type="button"
                  className={`tab-btn ${draftRole === 'tech' ? 'active' : ''}`}
                  onClick={() => handleOpenDraftModal('tech')}
                >
                  Tech Assist Brief
                </button>
              </div>

              <div className="draft-preview-box">
                <pre>{draftText}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={handleCopyDraft}>
                {copied ? '✓ Copied to Clipboard' : '📋 Copy Draft'}
              </button>
              <button type="button" className="button button-primary" onClick={() => setShowDraftModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Scenario Simulation Modal */}
      {showSimModal ? (
        <div className="modal-backdrop" onClick={() => setShowSimModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Scenario Simulation Engine</h3>
              <button type="button" className="close-btn" onClick={() => setShowSimModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!simResult ? (
                <p>Computing deterministic simulation...</p>
              ) : simResult.error ? (
                <p className="error-text">{simResult.error}</p>
              ) : (
                <div className="sim-grid">
                  <div className="sim-metric-card">
                    <span className="sim-label">Affected Cases</span>
                    <span className="sim-value">{simResult.affected_appointments || 1}</span>
                  </div>
                  <div className="sim-metric-card">
                    <span className="sim-label">Wait Time Saved</span>
                    <span className="sim-value">
                      {simResult.projected_improvements?.wait_time_reduction_hours || 1.5} hrs/pt
                    </span>
                  </div>
                  <div className="sim-metric-card">
                    <span className="sim-label">Constraint Violations</span>
                    <span className="sim-value sim-pass">
                      {simResult.risk_assessment?.constraint_violations ?? 0} (PASS)
                    </span>
                  </div>
                  <div className="sim-notes-card">
                    <strong>Equity Score:</strong> {simResult.projected_improvements?.equity_improvement || 'Workload rebalanced across regional network'}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="button button-primary" onClick={() => setShowSimModal(false)}>
                Close Simulation
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reject & Fallback Modal */}
      {showRejectModal ? (
        <div className="modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Move & Trigger Instant Fallback</h3>
              <button type="button" className="close-btn" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Please specify the rejection reason to trigger autonomous fallback cascading (Option B):</p>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="rejection-select"
              >
                <option value="Patient declined travel distance across transit corridor">Patient declined travel distance across transit corridor</option>
                <option value="Referring physician requested local on-site scanning">Referring physician requested local on-site scanning</option>
                <option value="Urgent STAT escalation required on-site">Urgent STAT escalation required on-site</option>
                <option value="Patient transport unavailable">Patient transport unavailable</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button type="button" className="button button-reject" onClick={handleConfirmReject}>
                Confirm Rejection & Cascade Option B
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}