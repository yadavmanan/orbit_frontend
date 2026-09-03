# ORBIT Frontend

React + TypeScript + Vite WebMCP client for ORBIT, a radiology load-balancing system with AI agent support.

## Quick start

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Build

```bash
npm run build
```

Outputs static files to `dist/`

## Environment variables

For local dev, Vite's dev server proxies `/api` to `http://localhost:8000` automatically (see `vite.config.ts`).

For production, set `VITE_API_BASE` at build time (see `.env.example`):

```
VITE_API_BASE=https://your-backend-host.example.com/api
```

## Pages

- **Dashboard** (`/`) — Live queue, network status, proposals, audit trail
- **Network View** (`/network`) — Site utilization and staff availability
- **Approval Queue** (`/proposals`) — Staged proposals for human/agent review
- **Audit Trail** (`/audit`) — Tamper-hashed action history
- **Settings** (`/settings`) — Policy constraints, reset baseline

## WebMCP tools

Frontend registers ~15 tools via `document.modelContext.registerTool()` for ChatGPT and Chrome WebMCP support:

- Read-only: `get_network_status`, `get_constraints`, `get_approval_queue`, `get_audit_trail`
- Propose: `propose_scanner_rebalance`, `propose_remote_read_assignment`, `propose_remote_scan_assist`
- Review: `approve_move`, `reject_move`, `execute_move`
- Draft: `draft_patient_notification`, `draft_staff_notification`
- Admin: `update_constraints`, `trigger_scenario`

See [webmcpTools.ts](src/webmcpTools.ts) for full tool definitions.

## See also

- [Backend](../backend) — FastAPI + SQLAlchemy rebalancing engine
- [Demo script](../md/demo.md) — 3-minute video walkthrough
- [Agent testing guide](../md/running-with-agent.md) — WebMCP integration test script
