import { getSupabase } from './utils.ts';
import {
  templateAccountsHealthCheckReport,
  templatePassiveAccountsDiagnosticAppendix,
  type AccountsDiagnosticAnomalyType,
  type AccountsDiagnosticSeverity,
  type AccountsObservationPresentation,
} from './accounts-response-templates.ts';

interface AccountsObservationBillRow {
  id: string;
  description: string;
  provider_name?: string | null;
  amount: number | null;
  due_date: string;
  status: 'pending' | 'overdue' | 'paid' | 'cancelled';
  paid_at?: string | null;
  paid_amount?: number | null;
}

interface AccountsBalanceRow {
  id: string;
  name: string;
  current_balance: number | null;
  is_active: boolean;
}

interface QueryBuilderLike<T = Record<string, unknown>> extends PromiseLike<{ data: T[] | null; error: unknown | null }> {
  eq(column: string, value: unknown): QueryBuilderLike<T>;
  in(column: string, values: unknown[]): QueryBuilderLike<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilderLike<T>;
}

interface SupabaseReadClientLike {
  from(table: string): {
    select(query?: string): QueryBuilderLike<any>;
  };
}

export interface AccountsDiagnosticDependencies {
  supabase?: SupabaseReadClientLike;
  today?: Date;
}

export interface AccountsObservationAnomaly extends AccountsObservationPresentation {}

function parseDueDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value: string): string {
  return parseDueDate(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function normalizeToday(value: Date): Date {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getSeverityWeight(severity: AccountsDiagnosticSeverity): number {
  switch (severity) {
    case 'S1':
      return 1;
    case 'S2':
      return 2;
    case 'S3':
      return 3;
    case 'S5':
      return 5;
  }
}

function compareAnomalies(left: AccountsObservationAnomaly, right: AccountsObservationAnomaly): number {
  const severityDiff = getSeverityWeight(left.severity) - getSeverityWeight(right.severity);
  if (severityDiff !== 0) return severityDiff;
  const leftWeight = left.dueDate ? parseDueDate(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const rightWeight = right.dueDate ? parseDueDate(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  return leftWeight - rightWeight;
}

function buildStatusLabel(status: AccountsObservationBillRow['status']): string {
  return status === 'overdue' ? 'Vencida' : 'Pendente';
}

function buildObservationNote(row: AccountsObservationBillRow, type: AccountsObservationAnomaly['type']): string {
  const dueDate = formatDate(row.due_date);

  if (type === 'overdue_without_settlement') {
    return `A conta '${row.description}' venceu em ${dueDate} e ainda nao tem pagamento registrado.`;
  }

  if (type === 'paid_inconsistent') {
    return `A conta '${row.description}' esta marcada como paga, mas o registro esta incompleto.`;
  }

  const providerSegment = row.provider_name ? ` (${row.provider_name})` : '';
  return `A conta '${row.description}'${providerSegment} com vencimento em ${dueDate} esta com valor zerado.`;
}

async function fetchAccountsObservationBills(
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<AccountsObservationBillRow[]> {
  const supabase = deps.supabase ?? getSupabase();
  const { data, error } = await supabase
    .from('payable_bills')
    .select('id, description, provider_name, amount, due_date, status, paid_at, paid_amount')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true });

  if (error) {
    console.error('[ACCOUNTS-DIAGNOSTIC] Erro ao buscar contas para observacao:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: row.amount == null ? null : Number(row.amount),
  }));
}

export function detectAccountsObservationAnomalies(
  bills: AccountsObservationBillRow[],
  deps: Pick<AccountsDiagnosticDependencies, 'today'> = {},
): AccountsObservationAnomaly[] {
  const today = normalizeToday(deps.today ?? new Date());
  const anomalies: AccountsObservationAnomaly[] = [];

  for (const bill of bills) {
    const dueDate = parseDueDate(bill.due_date);
    const statusLabel = buildStatusLabel(bill.status);

    if (bill.status === 'pending' && dueDate.getTime() < today.getTime() && !bill.paid_at) {
      anomalies.push({
        type: 'overdue_without_settlement',
        severity: 'S1',
        billId: bill.id,
        description: bill.description,
        providerName: bill.provider_name ?? null,
        amount: bill.amount,
        dueDate: bill.due_date,
        status: bill.status,
        statusLabel,
        diagnosticNote: buildObservationNote(bill, 'overdue_without_settlement'),
      });
    }

    if ((bill.amount == null || bill.amount === 0) && (bill.status === 'pending' || bill.status === 'overdue')) {
      anomalies.push({
        type: 'zeroed_bill',
        severity: 'S2',
        billId: bill.id,
        description: bill.description,
        providerName: bill.provider_name ?? null,
        amount: bill.amount,
        dueDate: bill.due_date,
        status: bill.status,
        statusLabel,
        diagnosticNote: buildObservationNote(bill, 'zeroed_bill'),
      });
    }
  }

  return anomalies.sort(compareAnomalies);
}

export async function listAccountsObservationAnomalies(
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<AccountsObservationAnomaly[]> {
  const bills = await fetchAccountsObservationBills(userId, deps);
  return detectAccountsObservationAnomalies(bills, deps);
}

export function selectPassivePresentationAnomalies(
  anomalies: AccountsObservationAnomaly[],
): AccountsObservationAnomaly[] {
  const byBill = new Map<string, AccountsObservationAnomaly>();

  for (const anomaly of anomalies) {
    const key = anomaly.billId ?? anomaly.accountId ?? anomaly.description;
    const current = byBill.get(key);
    if (!current || compareAnomalies(anomaly, current) < 0) {
      byBill.set(key, anomaly);
    }
  }

  return [...byBill.values()].sort(compareAnomalies);
}

export async function appendPassiveAccountsDiagnosticsToListing(
  baseMessage: string,
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<string> {
  const anomalies = await listAccountsObservationAnomalies(userId, deps);
  if (anomalies.length === 0) return baseMessage;

  // TODO: Phase 1 intentionally ships only cap/order/full explicit health-check.
  // Memory/session cooldowns should be added once the supporting infra is wired.
  return `${baseMessage}${templatePassiveAccountsDiagnosticAppendix(selectPassivePresentationAnomalies(anomalies))}`;
}

export async function generateAccountsHealthCheckResponse(
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<string> {
  const anomalies = await listAccountsObservationAnomalies(userId, deps);
  return templateAccountsHealthCheckReport(anomalies);
}

async function fetchAccountsDiagnosableBills(
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<AccountsObservationBillRow[]> {
  const supabase = deps.supabase ?? getSupabase();
  const { data, error } = await supabase
    .from('payable_bills')
    .select('id, description, provider_name, amount, due_date, status, paid_at, paid_amount')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue', 'paid'])
    .order('due_date', { ascending: true });

  if (error) {
    console.error('[ACCOUNTS-DIAGNOSTIC] Erro ao buscar contas para diagnostico:', error);
    return [];
  }

  return (data ?? []).map((row: AccountsObservationBillRow) => ({
    ...row,
    amount: row.amount == null ? null : Number(row.amount),
    paid_amount: row.paid_amount == null ? null : Number(row.paid_amount),
  }));
}

async function fetchAccountsBalanceRows(
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<AccountsBalanceRow[]> {
  const supabase = deps.supabase ?? getSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, current_balance, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[ACCOUNTS-DIAGNOSTIC] Erro ao buscar contas bancarias para diagnostico:', error);
    return [];
  }

  return (data ?? []).map((row: AccountsBalanceRow) => ({
    ...row,
    current_balance: row.current_balance == null ? null : Number(row.current_balance),
  }));
}

function buildZeroBalanceAccountNote(account: AccountsBalanceRow): string {
  return `A conta bancaria '${account.name}' esta com saldo zerado.`;
}

export function detectAccountsDiagnosableAnomalies(
  bills: AccountsObservationBillRow[],
  accounts: AccountsBalanceRow[],
  deps: Pick<AccountsDiagnosticDependencies, 'today'> = {},
): AccountsObservationAnomaly[] {
  const anomalies = detectAccountsObservationAnomalies(bills, deps);

  for (const bill of bills) {
    if (bill.status === 'paid' && (!bill.paid_at || bill.paid_amount == null || bill.paid_amount === 0)) {
      anomalies.push({
        type: 'paid_inconsistent',
        severity: 'S3',
        billId: bill.id,
        accountId: null,
        description: bill.description,
        providerName: bill.provider_name ?? null,
        amount: bill.amount,
        dueDate: bill.due_date,
        status: bill.status,
        statusLabel: 'Paga',
        diagnosticNote: buildObservationNote(bill, 'paid_inconsistent'),
      });
    }
  }

  for (const account of accounts) {
    if ((account.current_balance ?? 0) === 0 && account.is_active) {
      anomalies.push({
        type: 'zero_balance_account',
        severity: 'S5',
        billId: null,
        accountId: account.id,
        description: account.name,
        providerName: null,
        amount: account.current_balance,
        dueDate: null,
        status: 'active',
        statusLabel: 'Saldo zerado',
        diagnosticNote: buildZeroBalanceAccountNote(account),
      });
    }
  }

  return anomalies.sort(compareAnomalies);
}

export async function listAccountsDiagnosableAnomalies(
  userId: string,
  deps: AccountsDiagnosticDependencies = {},
): Promise<AccountsObservationAnomaly[]> {
  const [bills, accounts] = await Promise.all([
    fetchAccountsDiagnosableBills(userId, deps),
    fetchAccountsBalanceRows(userId, deps),
  ]);

  return detectAccountsDiagnosableAnomalies(bills, accounts, deps);
}

export function isDiagnosableAccountsAnomalyType(type: string): type is AccountsDiagnosticAnomalyType {
  return [
    'overdue_without_settlement',
    'zeroed_bill',
    'paid_inconsistent',
    'zero_balance_account',
  ].includes(type);
}

export function isExplicitAccountsHealthCheckRequest(text: string): boolean {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  return (
    normalized.includes('analisa minhas contas') ||
    normalized.includes('tem algo errado nas contas') ||
    normalized.includes('faz um checkup') ||
    normalized.includes('faz um check-up')
  );
}
