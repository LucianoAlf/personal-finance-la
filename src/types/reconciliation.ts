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

export interface BankTransactionRow {
  id: string;
  user_id: string;
  source: 'manual_paste' | 'csv_upload' | 'manual_entry' | 'pluggy';
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
  category_suggestion?: string | null;
  currency_code?: string;
  imported_at?: string;
  reconciliation_status?: string;
  /**
   * When true, this row predates the active reconciliation window and should
   * not drive KPIs, inbox counters, or priority escalation. Defaults to false
   * for any row ingested after the window migration.
   */
  out_of_scope?: boolean;
}

export type ReconciliationWindowPresetId =
  | 'window_default'
  | 'last_30d'
  | 'last_90d'
  | 'all_time';

export interface ReconciliationWindow {
  /**
   * Preset the user picked in the UI. `window_default` means "respect the
   * configured per-user reconciliation_window_start" (today: 2026-04-01).
   * `all_time` intentionally bypasses the window and is exposed only as a
   * historical view.
   */
  presetId: ReconciliationWindowPresetId;
  /**
   * ISO date (YYYY-MM-DD) corresponding to the active start of the window.
   * For `all_time` this is null so callers can detect historical mode
   * explicitly instead of hunting for sentinel dates.
   */
  startDate: string | null;
  /** Optional upper bound; null means "up to now". */
  endDate: string | null;
  /** Surfaced so the UI can display "Janela aplicada: 01/04/2026 \u2192 hoje" without formatting drift. */
  label: string;
}

export interface ReconciliationWorkspaceSummary {
  /**
   * Absolute value of bank movements that have open/awaiting cases with no matched system record.
   * Operationally: "how much money the operator still needs to explain or pair".
   * This replaces the old `saldo sistema vs banco` KPI, which was hardcoded to zero and
   * therefore misled the workspace into showing "sem divergência material" with 2500 open cases.
   */
  pendingUnmatchedValue: number;
  pendingUnmatchedCount: number;
  openCases: number;
  highConfidenceCount: number;
  unmatchedCount: number;
  staleConnections: number;
  activeSources: string[];
  /**
   * Distribution of priorities across currently open cases. Helps the summary card answer
   * "how many of these 2500 are actually urgent?" instead of relying on a single worst-priority label.
   */
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
    infra: number;
  };
  /**
   * Ingestion-health counters scoped to the active window. Lets the operator
   * answer the trust question "is the pipeline really pulling everything and
   * not dragging in garbage?" without digging into the DB.
   */
  ingestionHealth: {
    /** Total bank rows stored for the user (all sources, in and out of scope). */
    totalIngested: number;
    /** Rows that fall inside the active window. */
    inScopeCount: number;
    /** Rows archived as out_of_scope (pre-window historical noise). */
    outOfScopeCount: number;
    /** Of the in-scope rows, how many are still pending reconciliation. */
    pendingInScope: number;
    /** Of the in-scope rows, how many are already conciliated. */
    reconciledInScope: number;
    /** Of the in-scope rows, how many entered the deferred / auto_closed bucket. */
    archivedInScope: number;
    /** Most recent successful Pluggy sync timestamp across user connections. */
    lastPluggySyncAt: string | null;
    /** Structural alert surface: how many Pluggy items are stale beyond threshold. */
    staleConnections: number;
  };
  window: ReconciliationWindow;
}

export interface ReconciliationWorkspaceData {
  cases: ReconciliationCaseRow[];
  connections: PluggyConnectionRow[];
  bankTransactions: BankTransactionRow[];
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
  | 'auto_close'
  | 'mark_transfer'
  | 'ignore'
  | 'link_payable'
  | 'register_expense';

export interface ReconciliationRegisterExpenseInput {
  /**
   * Internal account.id where the new transaction should land. When omitted,
   * the backend falls back to `bank_transactions.internal_account_id` and
   * rejects the action if neither is set.
   */
  accountId?: string;
  /** Optional category.id for the created expense. */
  categoryId?: string;
  /** Optional user-friendly description overriding the raw bank description. */
  description?: string;
  /** Optional payment_method matching transactions_payment_method_check. */
  paymentMethod?: string;
}

export interface ReconciliationDecisionInput {
  caseId: string;
  action: ReconciliationDecisionAction;
  confirmationSource?: 'workspace' | 'whatsapp';
  reason?: string;
  /**
   * Only used when action === 'mark_transfer'. The id of the opposite-side
   * bank_transaction that forms the other leg of the same internal transfer.
   * Optional: when omitted, the backend records this leg as "awaiting pair"
   * and the operator can complete the pairing later.
   */
  counterpartBankTransactionId?: string;
  /**
   * Required when action === 'link_payable'. The payable_bills.id the user
   * confirmed is the real bill behind the bank movement; the backend will
   * flip it to 'paid' and reconcile the bank row.
   */
  payableBillId?: string;
  /**
   * Optional payload for action === 'register_expense'. When omitted the
   * backend uses sensible defaults from the bank_transaction row.
   */
  registerExpense?: ReconciliationRegisterExpenseInput;
}

export type ReconciliationImportMode = 'paste' | 'csv' | 'manual';

export type ReconciliationImportSource = 'manual_paste' | 'csv_upload' | 'manual_entry';

export interface ReconciliationImportRowInput {
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
}

export interface ReconciliationImportRequest {
  source: ReconciliationImportSource;
  rows: ReconciliationImportRowInput[];
}

export interface ReconciliationImportPreview {
  source: ReconciliationImportMode;
  itemCount: number;
  note: string;
  readyToImport?: boolean;
}
