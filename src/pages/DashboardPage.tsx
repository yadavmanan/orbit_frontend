import { useEffect, useRef, useState } from 'react';
import { LiveBoard } from '../components/LiveBoard';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { AuditStrip } from '../components/AuditStrip';
import type { DashboardData } from '../types';
import { registerWebMcpTools } from '../webmcpTools';
import { API_BASE } from '../config';

interface ApiStatusItem {
  site?: string;
  site_name?: string;
  modality?: 'CT' | 'MRI' | 'XRAY' | 'US';
  utilization_percent: number;
  queue_depth: number;
  idle_hours: number;
  coverage?: string;
  coverage_status?: string;
}

interface ApiBoardSlot {
  time_label: string;
  scanner: string;
  modality: 'CT' | 'MRI' | 'XRAY' | 'US';
  case_id: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: string;
}

interface ApiProposal {
  id: string;
  proposal_id?: string;
  move_id?: string;
  appointment_id?: string;
  patient_id: string;
  from_scanner: string;
  to_scanner: string;
  rationale: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'executed';
  constraint_checks: string[];
}

interface ApiAuditEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  detail: string;
}

interface ApiConstraints {
  max_travel_km: number;
  protected_shifts: string[];
  remote_reading_enabled: boolean;
}

interface ApiDashboardPayload {
  status_rail?: ApiStatusItem[];
  live_board?: ApiBoardSlot[];
  approval_queue?: ApiProposal[];
  audit_strip?: ApiAuditEvent[];
  constraints?: ApiConstraints;
}

function sentenceCase(value: string | undefined) {
  return (value ?? 'balanced')
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function mapPayload(payload: ApiDashboardPayload): DashboardData {
  return {
    statusRail: (payload.status_rail ?? []).map((item) => ({
      site: item.site ?? item.site_name ?? 'Unknown site',
      modality: item.modality ?? 'MRI',
      utilizationPercent: item.utilization_percent ?? 0,
      queueDepth: item.queue_depth ?? 0,
      idleHours: item.idle_hours ?? 0,
      coverage: sentenceCase(item.coverage ?? item.coverage_status),
    })),
    liveBoard: (payload.live_board ?? []).map((slot) => ({
      timeLabel: slot.time_label,
      scanner: slot.scanner,
      modality: slot.modality,
      caseId: slot.case_id,
      urgency: slot.urgency,
      status: slot.status,
    })),
    approvalQueue: (payload.approval_queue ?? []).map((proposal) => ({
      id: proposal.move_id ?? proposal.id,
      proposalId: proposal.proposal_id ?? proposal.id,
      moveId: proposal.move_id,
      appointmentId: proposal.appointment_id,
      patientId: proposal.patient_id,
      fromScanner: proposal.from_scanner,
      toScanner: proposal.to_scanner,
      rationale: proposal.rationale,
      urgency: proposal.urgency,
      constraintChecks: proposal.constraint_checks ?? [],
      status: proposal.status,
    })),
    auditStrip: (payload.audit_strip ?? []).map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      timestamp: event.timestamp,
      detail: event.detail ?? 'No additional detail',
    })),
    constraints: {
      maxTravelKm: payload.constraints?.max_travel_km ?? 25,
      protectedShifts: payload.constraints?.protected_shifts ?? [],
      remoteReadingEnabled: payload.constraints?.remote_reading_enabled ?? true,
    },
  };
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshDashboard = async () => {
    const response = await fetch(`${API_BASE}/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }
    const payload = await response.json();
    const mapped = mapPayload(payload);
    setData(mapped);
    return mapped;
  };

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      try {
        await refreshDashboard();
        setError(null);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);

    const handleRefreshEvent = () => {
      fetchData();
    };
    window.addEventListener('orbit:refresh', handleRefreshEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('orbit:refresh', handleRefreshEvent);
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (data) {
      registerWebMcpTools(
        {
          getData: () => data,
          refresh: async () => {
            await refreshDashboard();
            window.dispatchEvent(new Event('orbit:refresh'));
          },
        },
        abortControllerRef.current?.signal ?? new AbortController().signal
      );
    }
  }, [data]);

    const handleProposalAction = async (proposalId: string, action: 'approve' | 'reject' | 'execute') => {
      try {
        const proposal = data?.approvalQueue.find((item) => item.id === proposalId || item.proposalId === proposalId);
        const targetProposalId = proposal?.proposalId ?? proposalId;
        const targetMoveId = proposal?.moveId ?? proposalId;
        const endpoint = action === 'execute'
          ? `${API_BASE}/tools/execute_move/${targetMoveId}`
          : `${API_BASE}/proposals/${targetProposalId}/${action}/${targetMoveId}`;
        const response = await fetch(endpoint, { method: 'POST' });
        if (!response.ok) {
          throw new Error(`Unable to ${action} move: ${response.statusText}`);
        }
        await refreshDashboard();
        window.dispatchEvent(new Event('orbit:refresh'));
        setActionError(null);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Action failed');
      }
    };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <div className="error-banner">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-hero dashboard-hero">
        <div className="hero-copy">
          <p className="hero-brandline" aria-label="Dashboard brand statement">
            <span className="hero-lead">Smarter routing, faster reads</span>
            <span className="hero-divider" aria-hidden="true">·</span>
            <span className="hero-sublead">Balanced Radiology</span>
            <span className="hero-separator" aria-hidden="true">|</span>
            <span className="hero-powered-label">Powered by</span>
            <span className="hero-powered-brand">OpenAI WebMCP</span>
          </p>
        </div>
        <div className="hero-stack">
          <div className="hero-stats" aria-label="Network summary">
            <span><strong>{data.statusRail.length}</strong> sites</span>
            <span><strong>{data.liveBoard.length}</strong> live cases</span>
            <span><strong>{data.approvalQueue.filter((proposal) => proposal.status === 'pending').length}</strong> pending</span>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <LiveBoard
          slots={data.liveBoard}
          constraints={data.constraints}
        />
        <ApprovalQueue proposals={data.approvalQueue} error={actionError} onAction={handleProposalAction} />
      </div>
      <AuditStrip events={data.auditStrip} />
    </div>
  );
}
