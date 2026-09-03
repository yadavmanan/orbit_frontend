import type { Proposal, ProposalStatus } from '../types';
import { ProposalEntry } from './ProposalEntry';

interface ApprovalQueueProps {
  proposals: Proposal[];
  error: string | null;
  onAction: (proposalId: string, action: 'approve' | 'reject' | 'execute') => void;
}

export function ApprovalQueue({ proposals, error, onAction }: ApprovalQueueProps) {
  const pendingCount = proposals.filter((proposal): proposal is Proposal & { status: ProposalStatus } => proposal.status === 'pending').length;

  return (
    <section className="panel panel-queue" aria-labelledby="approval-queue-title">
      <div className="panel-header">
        <h2 id="approval-queue-title">Approval queue</h2>
        <p>{pendingCount} pending — every move stays staged until a coordinator confirms it.</p>
      </div>
      {error ? (
        <p className="action-error" role="alert">{error}</p>
      ) : null}
      {proposals.length === 0 ? (
        <p className="empty-state">No pending proposals — the network is balanced.</p>
      ) : (
        <div className="proposal-list">
          {proposals.map((proposal) => (
            <ProposalEntry key={proposal.id} proposal={proposal} onAction={onAction} />
          ))}
        </div>
      )}
    </section>
  );
}