export type ReconciliationPriority = 'urgent' | 'high' | 'medium' | 'low' | 'infra';

export type ReconciliationCaseStatus =
  | 'open'
  | 'awaiting_user'
  | 'confirmed'
  | 'rejected'
  | 'deferred'
  | 'auto_closed';

/** Linha de `reconciliation_cases` (snake_case do Postgres). */
export interface ReconciliationCaseRow {
  id: string;
  user_id: string;
  bank_transaction_id: string;
  divergence_type: string;
  matched_record_type: string | null;
  matched_record_id: string | null;
  confidence: number;
  confidence_reasoning: Record<string, unknown>;
  hypotheses: unknown[];
  status: ReconciliationCaseStatus;
  priority: ReconciliationPriority;
  auto_close_reason: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PluggyConnectionRow {
  id: string;
  user_id: string;
  item_id: string;
  institution_name: string;
  status: string;
  last_synced_at: string | null;
  staleness_threshold_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationAuditLogRow {
  id: string;
  user_id: string;
  case_id: string | null;
  action: string;
  confidence_at_decision: number;
  bank_transaction_snapshot: Record<string, unknown>;
  system_record_snapshot: Record<string, unknown> | null;
  actor: string;
  notes: string | null;
  created_at: string;
}

export interface ReconciliationWorkspaceSummary {
  balanceDelta: number;
  openCases: number;
  highConfidenceCount: number;
  staleConnections: number;
  activeSources: string[];
}

export interface ReconciliationWorkspaceData {
  cases: ReconciliationCaseRow[];
  connections: PluggyConnectionRow[];
  summary: ReconciliationWorkspaceSummary;
  selectedCase: ReconciliationCaseRow | null;
  auditEntries: ReconciliationAuditLogRow[];
}

export interface ReconciliationCaseListItem {
  id: string;
  divergenceType: string;
  priority: ReconciliationPriority;
  confidence: number;
  title: string;
  subtitle: string;
  sourceHealth: 'healthy' | 'stale';
}

export type ReconciliationDecisionAction =
  | 'confirm'
  | 'reject'
  | 'defer'
  | 'classify'
  | 'auto_close';

export interface ReconciliationDecisionInput {
  caseId: string;
  action: ReconciliationDecisionAction;
  confirmationSource?: 'workspace' | 'whatsapp';
  reason?: string;
}
