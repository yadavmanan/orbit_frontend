import type { DashboardData } from './types';
import { API_BASE } from './config';

interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, options: { signal: AbortSignal }) => Promise<unknown>;
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<void>;
    };
  }
}

export interface WebMcpBindings {
  /** Always reads the latest client state — never a stale snapshot. */
  getData: () => DashboardData;
  /** Re-fetches the dashboard and notifies every other page (Network, Audit) to refresh, exactly like a human action does. */
  refresh: () => Promise<void>;
}

/** Resolves a proposal/move id pair the same way the human Approval Queue buttons do. */
function resolveMoveTarget(data: DashboardData, moveOrProposalId: string, explicitProposalId?: string) {
  const proposal = data.approvalQueue.find(
    (item) => item.id === moveOrProposalId || item.proposalId === moveOrProposalId || item.moveId === moveOrProposalId,
  );
  return {
    proposalId: explicitProposalId ?? proposal?.proposalId ?? moveOrProposalId,
    moveId: proposal?.moveId ?? moveOrProposalId,
  };
}

async function postJson(path: string, body?: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

/**
 * Registers ORBIT's WebMCP tools on the top-level document, per the WebMCP spec.
 * Every tool here calls the exact same backend endpoints as the human UI buttons —
 * no separate/hidden agent channel (the "shared workspace" requirement). Mutating
 * tools trigger the same `orbit:refresh` broadcast the human action bar uses, so
 * the Network View, Audit Trail, and Dashboard stay in sync regardless of who acted.
 *
 * Destructive, hard-to-reverse operations (full demo reset) are intentionally left
 * out of the agent-facing surface and remain a human-only action in Settings.
 */
export function registerWebMcpTools(bindings: WebMcpBindings, signal: AbortSignal): void {
  if (typeof document.modelContext?.registerTool !== 'function') {
    return;
  }

  const { registerTool } = document.modelContext;

  // ---------- Read-only tools ----------

  registerTool(
    {
      name: 'get_network_status',
      title: 'Get network status',
      description:
        'Returns current scanner utilization, queue depth, staff availability, and idle hours for every site on the live network, including whether each site is equipment- or staff-constrained.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => ({ status_rail: bindings.getData().statusRail }),
    },
    { signal },
  );

  registerTool(
    {
      name: 'get_constraints',
      title: 'Get active policy constraints',
      description:
        'Returns the active policy profile (max patient travel distance, fatigue thresholds, caseload caps, protected shifts, licensing rules) so any proposal can be checked against a known, inspectable rule set.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => bindings.getData().constraints,
    },
    { signal },
  );

  registerTool(
    {
      name: 'get_approval_queue',
      title: 'Get pending proposals',
      description:
        'Returns every rebalancing move currently staged for human review, including patient, origin/target, rationale, constraint checks, and status. Does not change anything.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => ({ proposals: bindings.getData().approvalQueue }),
    },
    { signal },
  );

  registerTool(
    {
      name: 'get_audit_trail',
      title: 'Get audit trail',
      description: 'Returns the tamper-hashed history of proposal approvals, rejections, and executions for this session.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => ({ events: bindings.getData().auditStrip }),
    },
    { signal },
  );

  // ---------- Proposal generation (Pillars 1 & 2) ----------

  registerTool(
    {
      name: 'propose_scanner_rebalance',
      title: 'Propose a scanner rebalance',
      description:
        'Analyzes live queue depth across all sites and, if an overloaded site and an underutilized site exist, drafts a staged proposal to move appointments between them. Never executes anything — only stages a proposal for human review.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute: async () => {
        const { data } = await postJson('/tools/propose_scanner_rebalance?actor=agent');
        await bindings.refresh();
        return data;
      },
    },
    { signal },
  );

  registerTool(
    {
      name: 'propose_remote_read_assignment',
      title: 'Propose a remote radiologist read',
      description:
        'Finds radiologist-constrained sites and drafts a proposal to route pending reads to available, licensed, non-fatigued remote radiologists. Never executes anything — only stages a proposal for human review.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute: async () => {
        const { data } = await postJson('/tools/propose_remote_read_assignment?actor=agent');
        await bindings.refresh();
        return data;
      },
    },
    { signal },
  );

  registerTool(
    {
      name: 'propose_remote_scan_assist',
      title: 'Propose remote scan assistance',
      description:
        'Finds technologist-constrained sites with idle, remote-guidance-capable scanners and drafts a proposal to staff them with remote technologists. Never executes anything — only stages a proposal for human review.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'string', description: 'Optional site id to target; if omitted, the most constrained site is chosen automatically.' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const siteId = (input as { site_id?: string }).site_id;
        const query = siteId ? `&site_id=${encodeURIComponent(siteId)}` : '';
        const { data } = await postJson(`/tools/propose_remote_scan_assist?actor=agent${query}`);
        await bindings.refresh();
        return data;
      },
    },
    { signal },
  );

  registerTool(
    {
      name: 'run_simulation',
      title: 'Run a deterministic impact simulation',
      description:
        'Runs a what-if simulation for a staged proposal and returns projected queue reduction, wait-time improvement, and constraint risk — without approving or executing anything.',
      inputSchema: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'The id of the proposal to simulate.' },
        },
        required: ['proposal_id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const proposalId = String((input as { proposal_id?: string }).proposal_id ?? '');
        const { data } = await postJson(`/tools/run_scenario_simulation/${proposalId}`);
        return data;
      },
    },
    { signal },
  );

  // ---------- Human-in-the-loop review actions ----------

  registerTool(
    {
      name: 'approve_move',
      title: 'Approve a staged move',
      description:
        'Approves a single pending move in the Approval Queue — identical to a coordinator clicking "Approve Move". Fails with an explicit message if the move is not pending.',
      inputSchema: {
        type: 'object',
        properties: {
          move_id: { type: 'string', description: 'The move id to approve, from get_approval_queue.' },
          proposal_id: { type: 'string', description: 'The parent proposal id. Optional if it can be resolved from the current queue.' },
        },
        required: ['move_id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const { move_id, proposal_id } = input as { move_id?: string; proposal_id?: string };
        const { proposalId, moveId } = resolveMoveTarget(bindings.getData(), String(move_id ?? ''), proposal_id);
        const { ok, data } = await postJson(`/proposals/${proposalId}/approve/${moveId}?reviewer=agent`);
        if (ok) await bindings.refresh();
        return ok ? { status: 'approved', move_id: moveId } : { status: 'rejected', reason: data?.detail ?? 'Approval was not permitted.' };
      },
    },
    { signal },
  );

  registerTool(
    {
      name: 'reject_move',
      title: 'Reject a staged move',
      description:
        'Rejects a single pending move — identical to a coordinator clicking "Reject & Fallback". Automatically stages an Option B fallback proposal when the fallback-cascade policy is enabled. Fails with an explicit message if the move is not pending.',
      inputSchema: {
        type: 'object',
        properties: {
          move_id: { type: 'string', description: 'The move id to reject, from get_approval_queue.' },
          proposal_id: { type: 'string', description: 'The parent proposal id. Optional if it can be resolved from the current queue.' },
          reason: { type: 'string', description: 'Plain-language reason for the rejection, recorded in the audit trail.' },
        },
        required: ['move_id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const { move_id, proposal_id, reason } = input as { move_id?: string; proposal_id?: string; reason?: string };
        const { proposalId, moveId } = resolveMoveTarget(bindings.getData(), String(move_id ?? ''), proposal_id);
        const query = reason ? `?reviewer=agent&reason=${encodeURIComponent(reason)}` : '?reviewer=agent';
        const { ok, data } = await postJson(`/proposals/${proposalId}/reject/${moveId}${query}`);
        if (ok) await bindings.refresh();
        return ok ? { status: 'rejected', move_id: moveId, fallback_proposal_id: data?.fallback_proposal_id ?? null } : { status: 'rejected', reason: data?.detail ?? 'Rejection failed.' };
      },
    },
    { signal },
  );

  registerTool(
    {
      name: 'execute_move',
      title: 'Execute an approved move',
      description:
        "Executes a single move that a human coordinator has already approved in the Approval Queue. Rejects execution with an explicit message if the move is not in the 'approved' state — never silently no-ops.",
      inputSchema: {
        type: 'object',
        properties: {
          move_id: { type: 'string', description: 'The id of the approved move to execute, from get_approval_queue.' },
        },
        required: ['move_id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const moveId = String((input as { move_id?: string }).move_id ?? '');
        const { ok, data } = await postJson(`/tools/execute_move/${moveId}`);
        if (ok) await bindings.refresh();
        return ok && data.status === 'executed'
          ? { status: 'executed', move_id: moveId }
          : { status: 'rejected', move_id: moveId, reason: data?.reason ?? 'Execution was not permitted.' };
      },
    },
    { signal },
  );

  // ---------- Communication drafting (never sent automatically) ----------

  registerTool(
    {
      name: 'draft_patient_notification',
      title: 'Draft a patient notification',
      description:
        'Drafts a plain-language, unsent patient SMS/portal message explaining a proposed schedule change. Text-only — never actually sent to a patient.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'The appointment id affected by the move (from get_approval_queue).' },
          proposal_id: { type: 'string', description: 'The parent proposal id.' },
        },
        required: ['appointment_id', 'proposal_id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const { appointment_id, proposal_id } = input as { appointment_id?: string; proposal_id?: string };
        const { data } = await postJson(`/tools/draft_patient_notification?appointment_id=${appointment_id}&proposal_id=${proposal_id}`);
        return data;
      },
    },
    { signal },
  );

  registerTool(
    {
      name: 'draft_staff_notification',
      title: 'Draft a staff notification',
      description:
        'Drafts a plain-language, unsent notification to a radiologist or technologist explaining a proposed reassignment, including "why me" reasoning (subspecialty, caseload, fatigue, licensure). Text-only — never actually sent.',
      inputSchema: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'The parent proposal id.' },
          move_id: { type: 'string', description: 'The move id whose target staff member should receive the notification.' },
          recipient_role: { type: 'string', enum: ['radiologist', 'tech'], description: 'Which staff role to address the draft to.' },
        },
        required: ['proposal_id', 'move_id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        const { proposal_id, move_id, recipient_role } = input as { proposal_id?: string; move_id?: string; recipient_role?: string };
        const { data } = await postJson(
          `/tools/draft_staff_notification?proposal_id=${proposal_id}&move_id=${move_id}&recipient_role=${recipient_role ?? 'radiologist'}`,
        );
        return data;
      },
    },
    { signal },
  );

  // ---------- Policy administration ----------

  registerTool(
    {
      name: 'update_constraints',
      title: 'Update policy constraints',
      description:
        'Updates the active safety envelope (max travel km, fatigue threshold, caseload caps, licensing/fallback toggles) — identical to a coordinator saving the Policy Settings page. Every change is written to the audit trail.',
      inputSchema: {
        type: 'object',
        properties: {
          max_travel_km: { type: 'number' },
          fatigue_threshold: { type: 'number', description: 'Value between 0 and 1.' },
          max_radiologist_caseload: { type: 'number' },
          max_technologist_caseload: { type: 'number' },
          remote_reading_enabled: { type: 'boolean' },
          remote_scanning_assistance_enabled: { type: 'boolean' },
          enforce_jurisdiction_licensing: { type: 'boolean' },
          enable_instant_fallback: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const { data } = await postJson('/tools/update_constraints', input);
        await bindings.refresh();
        return data;
      },
    },
    { signal },
  );

  // ---------- Demo scenario presets (synthetic data only) ----------

  registerTool(
    {
      name: 'trigger_scenario',
      title: 'Trigger a crisis scenario preset',
      description:
        'Injects one of four synthetic crisis presets (stroke_spike, scanner_outage, neuro_surge, tech_shortage) into the demo network and auto-generates the resulting rebalance proposal for human review. Synthetic data only — safe to call repeatedly.',
      inputSchema: {
        type: 'object',
        properties: {
          scenario_key: {
            type: 'string',
            enum: ['stroke_spike', 'scanner_outage', 'neuro_surge', 'tech_shortage'],
          },
        },
        required: ['scenario_key'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input) => {
        const scenarioKey = String((input as { scenario_key?: string }).scenario_key ?? '');
        const { data } = await postJson(`/tools/trigger_scenario/${scenarioKey}`);
        await bindings.refresh();
        return data;
      },
    },
    { signal },
  );
}

