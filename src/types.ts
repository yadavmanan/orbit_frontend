export type Modality = 'CT' | 'MRI' | 'XRAY' | 'US';
export type Urgency = 'routine' | 'urgent' | 'stat';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'edited' | 'executed';

export interface StatusItem {
  siteId?: string;
  site: string;
  modality: Modality;
  utilizationPercent: number;
  queueDepth: number;
  idleHours: number;
  coverage: string;
  scanners?: number;
  radiologists?: number;
  technologists?: number;
}

export interface BoardSlot {
  appointmentId?: string;
  timeLabel: string;
  scanner: string;
  modality: Modality;
  caseId: string;
  urgency: Urgency;
  status: string;
  siteName?: string;
}

export interface Proposal {
  id: string;
  proposalId?: string;
  moveId?: string;
  appointmentId?: string;
  patientId: string;
  fromScanner: string;
  toScanner: string;
  rationale: string;
  urgency: Urgency;
  status: ProposalStatus;
  constraintChecks: string[];
  isNew?: boolean;
  type?: string;
  simulatedImpact?: Record<string, any>;
  movesCount?: number;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  detail: string;
  tamperHash?: string;
}

export interface ConstraintProfile {
  maxTravelKm: number;
  protectedShifts: string[];
  remoteReadingEnabled: boolean;
  remoteScanningAssistanceEnabled?: boolean;
  maxRadiologistCaseload?: number;
  maxTechnologistCaseload?: number;
  fatigueThreshold?: number;
  subspecialtyMatchingStrict?: boolean;
  enforceJurisdictionLicensing?: boolean;
  enableInstantFallback?: boolean;
}

export interface DashboardData {
  statusRail: StatusItem[];
  liveBoard: BoardSlot[];
  approvalQueue: Proposal[];
  auditStrip: AuditEvent[];
  constraints: ConstraintProfile;
}