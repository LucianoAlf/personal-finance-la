import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReconciliationPriority = 'urgent' | 'high' | 'medium' | 'low' | 'infra';

export interface AnaClaraReconciliationCase {
  caseId: string;
  bankTransactionId: string;
  divergenceType: string;
  priority: ReconciliationPriority;
  confidence: number;
  bank: {
    amount: number;
    date: string;
    description: string;
    accountLabel: string;
    isDebit: boolean;
  };
  /**
   * Operator-facing one-liner, safe to read verbatim in a WhatsApp bubble.
   * Example: "R$ 100,00 em 12/04 na Nubank (ENEL debito automatico)".
   */
  headline: string;
  /**
   * Natural-language hypothesis Ana Clara can read aloud as her first guess.
   * Populated with at most one suggestion across link_payable /
   * mark_transfer / register_expense; the others appear in `alternatives`.
   */
  leadHypothesis: HypothesisSuggestion | null;
  alternatives: HypothesisSuggestion[];
}

export interface HypothesisSuggestion {
  action: 'link_payable' | 'mark_transfer' | 'register_expense' | 'ignore';
  /** Human-facing summary Ana Clara can quote in a question. */
  summary: string;
  /** Structured params the bridge can feed into `applyReconciliationDecision`. */
  params:
    | { kind: 'link_payable'; payableBillId: string; billDescription: string; billAmount: number; billDueDate: string }
    | { kind: 'mark_transfer'; counterpartBankTransactionId: string; counterpartDescription: string; counterpartDate: string }
    | { kind: 'register_expense'; accountId: string | null; suggestedCategory: string | null }
    | { kind: 'ignore' };
  /** Heuristic confidence score in 0..1. Used to rank alternatives. */
  score: number;
}

export interface AnaClaraReconciliationSnapshot {
  /** Total open (status in {open, awaiting_user}) cases for the user. */
  totalOpen: number;
  byPriority: Record<ReconciliationPriority, number>;
  /** Up to `limit` cases the operator should answer today, richest first. */
  cases: AnaClaraReconciliationCase[];
  /**
   * Pre-formatted multi-line text suitable to inject into Ana Clara's system
   * prompt. When `totalOpen === 0` this is an empty string so the prompt
   * builder can skip the whole section without string-emptiness checks.
   */
  promptBlock: string;
}

export interface BuildReconciliationContextOptions {
  /** Max cases to return (and to render in the prompt). Defaults to 5. */
  limit?: number;
  /**
   * Max candidate payables to consider per case. Defaults to 6 to keep the
   * Ana Clara prompt compact.
   */
  payableCandidateLimit?: number;
  /**
   * Max counterpart bank_transactions to consider per case for mark_transfer
   * suggestions. Defaults to 6.
   */
  transferCandidateLimit?: number;
  /**
   * Only consider bank rows within +/- this many days of the case posted
   * date when scanning for transfer counterparts. Defaults to 3.
   */
  transferWindowInDays?: number;
  /**
   * Day window for payable candidates. Defaults to 14 to mirror the frontend
   * `findPayableCandidates`.
   */
  payableWindowInDays?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers (intentionally duplicated from
// src/lib/reconciliation-payable-candidates.ts and
// src/lib/reconciliation-transfer-candidates.ts so this module can run in the
// Deno edge runtime without pulling in the frontend bundle. Keep the heuristic
// identical between the two files; ALWAYS update both when tuning.)
// ---------------------------------------------------------------------------

interface BankRow {
  id: string;
  user_id: string;
  account_name: string;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
  category_suggestion: string | null;
  reconciliation_status: string | null;
}

interface CaseRow {
  id: string;
  user_id: string;
  bank_transaction_id: string;
  divergence_type: string;
  status: string;
  priority: ReconciliationPriority;
  confidence: number;
  hypotheses: unknown;
  updated_at: string;
}

interface PayableRow {
  id: string;
  user_id: string;
  description: string | null;
  provider_name: string | null;
  amount: number | string;
  due_date: string | null;
  status: string;
  payment_account_id: string | null;
  category_id: string | null;
}

function daysBetween(a?: string | null, b?: string | null): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round((ta - tb) / 86400000));
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sharedKeyword(a: string, b: string): boolean {
  if (!a || !b) return false;
  const tokensA = new Set(a.split(' ').filter((t) => t.length >= 4));
  if (tokensA.size === 0) return false;
  for (const token of b.split(' ')) {
    if (token.length >= 4 && tokensA.has(token)) return true;
  }
  return false;
}

function looksLikeTransferDescription(description: string | null | undefined): boolean {
  if (!description) return false;
  const h = description.toLowerCase();
  return (
    h.includes('transf') ||
    h.includes('ted') ||
    h.includes('doc') ||
    h.includes('pix') ||
    h.includes('entre contas') ||
    h.includes('enviado') ||
    h.includes('recebido')
  );
}

function formatBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatBrDate(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '--';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads a conversational snapshot of the user's reconciliation inbox. Used by
 * Ana Clara's WhatsApp prompt builder so the assistant can proactively ask:
 * "oi! tem 3 movimentacoes no teu extrato que eu nao consegui parear. quer
 *  resolver agora?" instead of waiting for the user to open the workspace.
 *
 * The function is deliberately read-only: it never mutates the DB. The
 * actual resolution goes through `applyReconciliationDecision` (or a thin
 * WhatsApp handler wrapping it) after the user confirms which hypothesis to
 * apply.
 */
export async function buildReconciliationContextForAnaClara(
  supabase: SupabaseClient,
  userId: string,
  options: BuildReconciliationContextOptions = {},
): Promise<AnaClaraReconciliationSnapshot> {
  const limit = options.limit ?? 5;
  const payableLimit = options.payableCandidateLimit ?? 6;
  const transferLimit = options.transferCandidateLimit ?? 6;
  const transferWindow = options.transferWindowInDays ?? 3;
  const payableWindow = options.payableWindowInDays ?? 14;

  const emptyByPriority: Record<ReconciliationPriority, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
    infra: 0,
  };

  // 1. Fetch the open cases ordered by priority + confidence (asc confidence
  //    surfaces the weakest matches first, those are the ones Ana Clara
  //    needs to ask the user about).
  const { data: openCasesRaw, error: caseError } = await supabase
    .from('reconciliation_cases')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['open', 'awaiting_user'])
    .order('priority', { ascending: true })
    .order('updated_at', { ascending: false });

  if (caseError) {
    throw new Error(
      `Failed to load reconciliation cases for Ana Clara: ${caseError.message ?? 'unknown'}`,
    );
  }

  const openCases = (openCasesRaw ?? []) as CaseRow[];
  const totalOpen = openCases.length;

  if (totalOpen === 0) {
    return {
      totalOpen: 0,
      byPriority: emptyByPriority,
      cases: [],
      promptBlock: '',
    };
  }

  const byPriority: Record<ReconciliationPriority, number> = { ...emptyByPriority };
  for (const c of openCases) {
    const p = (c.priority ?? 'medium') as ReconciliationPriority;
    byPriority[p] = (byPriority[p] ?? 0) + 1;
  }

  const focus = openCases
    .slice()
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, limit);

  // 2. Preload every bank_transaction referenced by the focus cases AND any
  //    other recent bank_transactions that could serve as transfer
  //    counterparts. A single union query keeps us to 1 round-trip instead
  //    of N.
  const focusBankIds = focus.map((c) => c.bank_transaction_id).filter(Boolean);

  const { data: focusBanksRaw } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('user_id', userId)
    .in('id', focusBankIds);
  const focusBanks = ((focusBanksRaw ?? []) as BankRow[])
    .map((row) => ({ ...row, amount: Number(row.amount ?? 0) }));

  // Pool of bank rows for transfer pairing: same user, recent dates, not yet
  // reconciled. We scope by date-range derived from the focus rows.
  const focusDates = focusBanks
    .map((b) => b.date)
    .filter(Boolean)
    .sort();
  const earliestFocusDate = focusDates[0];
  const latestFocusDate = focusDates[focusDates.length - 1];
  const poolStart = shiftIsoDate(earliestFocusDate, -transferWindow);
  const poolEnd = shiftIsoDate(latestFocusDate, transferWindow);

  const { data: transferPoolRaw } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('user_id', userId)
    .in('reconciliation_status', ['pending', 'matched'])
    .gte('date', poolStart ?? '1970-01-01')
    .lte('date', poolEnd ?? '2999-12-31');
  const transferPool = ((transferPoolRaw ?? []) as BankRow[]).map((row) => ({
    ...row,
    amount: Number(row.amount ?? 0),
  }));

  // 3. Preload payable_bills candidates (not paid/cancelled, same user).
  const { data: billsRaw } = await supabase
    .from('payable_bills')
    .select('id, user_id, description, provider_name, amount, due_date, status, payment_account_id, category_id')
    .eq('user_id', userId)
    .not('status', 'in', '("paid","cancelled")');
  const bills = ((billsRaw ?? []) as PayableRow[]).map((row) => ({
    ...row,
    amount: Number(row.amount ?? 0),
  }));

  // 4. Preload account labels so we can surface something nicer than "Conta N".
  const accountIds = new Set(
    focusBanks
      .map((b) => b.internal_account_id)
      .filter((id): id is string => Boolean(id)),
  );
  const accountLabels: Record<string, string> = {};
  if (accountIds.size > 0) {
    const { data: accountsRaw } = await supabase
      .from('accounts')
      .select('id, name')
      .in('id', Array.from(accountIds));
    for (const acc of (accountsRaw ?? []) as Array<{ id: string; name: string }>) {
      accountLabels[acc.id] = acc.name;
    }
  }

  // 5. For each focus case, compute hypotheses.
  const bankById = new Map(focusBanks.map((b) => [b.id, b] as const));
  const cases: AnaClaraReconciliationCase[] = focus.map((caseRow) => {
    const bank = bankById.get(caseRow.bank_transaction_id);
    if (!bank) {
      return fallbackCase(caseRow);
    }

    const accountLabel =
      (bank.internal_account_id && accountLabels[bank.internal_account_id]) ||
      bank.account_name ||
      'Conta nao mapeada';
    const isDebit = Number(bank.amount) < 0;

    const hypotheses: HypothesisSuggestion[] = [];

    // Payable candidate (only when the row looks like an expense).
    if (isDebit) {
      const payables = findPayableCandidatesDeno(bank, bills, {
        windowInDays: payableWindow,
        limit: payableLimit,
      });
      for (const candidate of payables.slice(0, 2)) {
        hypotheses.push({
          action: 'link_payable',
          summary: `vincular a "${candidate.bill.description ?? candidate.bill.provider_name ?? 'conta'}" (venc ${formatBrDate(candidate.bill.due_date)}, ${formatBrl(Number(candidate.bill.amount))})`,
          params: {
            kind: 'link_payable',
            payableBillId: candidate.bill.id,
            billDescription: String(candidate.bill.description ?? candidate.bill.provider_name ?? 'conta'),
            billAmount: Number(candidate.bill.amount),
            billDueDate: candidate.bill.due_date ?? '',
          },
          score: Math.min(0.95, Math.max(0.3, candidate.score / 240)),
        });
      }
    }

    // Transfer candidate (only when there is at least one plausible counterpart).
    const transfers = findTransferCandidatesDeno(bank, transferPool, {
      windowInDays: transferWindow,
      limit: transferLimit,
    });
    for (const cand of transfers.slice(0, 1)) {
      hypotheses.push({
        action: 'mark_transfer',
        summary: `marcar como transferencia interna com "${cand.bankTransaction.description}" (${formatBrDate(cand.bankTransaction.date)}, ${formatBrl(Math.abs(cand.bankTransaction.amount))})`,
        params: {
          kind: 'mark_transfer',
          counterpartBankTransactionId: cand.bankTransaction.id,
          counterpartDescription: cand.bankTransaction.description,
          counterpartDate: cand.bankTransaction.date,
        },
        score: Math.min(0.9, cand.score / 120),
      });
    }

    // Always offer "register as expense" as the fallback ledger action when
    // the bank row is a debit, and "register as income" is deliberately NOT
    // offered here (out of MVP scope).
    if (isDebit) {
      hypotheses.push({
        action: 'register_expense',
        summary: `registrar como despesa em "${accountLabel}" (${formatBrl(Math.abs(bank.amount))}, ${formatBrDate(bank.date)})`,
        params: {
          kind: 'register_expense',
          accountId: bank.internal_account_id ?? null,
          suggestedCategory: bank.category_suggestion ?? null,
        },
        // Baseline score - always offered, but lower than concrete matches.
        score: 0.35,
      });
    }

    // Finally, ignore as the "I don't recognize this at all" escape.
    hypotheses.push({
      action: 'ignore',
      summary: 'marcar como "nao reconheco" (fecha o caso sem movimentar o ledger)',
      params: { kind: 'ignore' },
      score: 0.2,
    });

    hypotheses.sort((a, b) => b.score - a.score);

    const headline = buildHeadline(bank, accountLabel);

    return {
      caseId: caseRow.id,
      bankTransactionId: caseRow.bank_transaction_id,
      divergenceType: caseRow.divergence_type,
      priority: caseRow.priority,
      confidence: Number(caseRow.confidence ?? 0),
      bank: {
        amount: Number(bank.amount),
        date: bank.date,
        description: bank.description,
        accountLabel,
        isDebit,
      },
      headline,
      leadHypothesis: hypotheses[0] ?? null,
      alternatives: hypotheses.slice(1, 4),
    };
  });

  const promptBlock = renderPromptBlock({ totalOpen, byPriority, cases });

  return { totalOpen, byPriority, cases, promptBlock };
}

// ---------------------------------------------------------------------------
// Headline + prompt rendering
// ---------------------------------------------------------------------------

function buildHeadline(bank: BankRow, accountLabel: string): string {
  const signPrefix = Number(bank.amount) < 0 ? '-' : '+';
  return `${signPrefix}${formatBrl(Math.abs(Number(bank.amount)))} em ${formatBrDate(bank.date)} na ${accountLabel} (${bank.description})`;
}

function renderPromptBlock(snapshot: {
  totalOpen: number;
  byPriority: Record<ReconciliationPriority, number>;
  cases: AnaClaraReconciliationCase[];
}): string {
  if (snapshot.totalOpen === 0) return '';

  const lines: string[] = [];
  lines.push('## Reconciliacao bancaria pendente');
  lines.push('');
  lines.push(
    `Existem ${snapshot.totalOpen} caso(s) em aberto no extrato do usuario aguardando decisao: ` +
      `${snapshot.byPriority.urgent} urgente, ${snapshot.byPriority.high} alta, ` +
      `${snapshot.byPriority.medium} media, ${snapshot.byPriority.low} baixa, ` +
      `${snapshot.byPriority.infra} infra.`,
  );
  lines.push('');
  lines.push('Top casos (priorize resolver os urgentes primeiro):');

  snapshot.cases.forEach((c, i) => {
    lines.push('');
    lines.push(`${i + 1}. case_id=${c.caseId} | prioridade=${c.priority} | ${c.headline}`);
    if (c.leadHypothesis) {
      lines.push(`   hipotese principal (${c.leadHypothesis.action}): ${c.leadHypothesis.summary}`);
    }
    if (c.alternatives.length > 0) {
      lines.push(
        `   alternativas: ${c.alternatives
          .map((alt) => `${alt.action} -> ${alt.summary}`)
          .join(' | ')}`,
      );
    }
  });

  lines.push('');
  lines.push(
    'Como agir: se o usuario pedir para resolver/conferir/ignorar alguma dessas movimentacoes, ' +
      'colete a resposta natural dele e chame o handler de reconciliation-decision com ' +
      '{ case_id, action, params }. Nunca assuma sozinho: SEMPRE confirme a hipotese principal ' +
      'com o usuario ("posso registrar como despesa?", "era transferencia pra conta Y, certo?") ' +
      'antes de efetivar. Para casos que o usuario nao reconhece, use action=ignore.',
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Candidate finders (Deno-local copies)
// ---------------------------------------------------------------------------

interface PayableCandidateInternal {
  bill: PayableRow;
  dayDistance: number;
  amountDelta: number;
  score: number;
}

function findPayableCandidatesDeno(
  bank: BankRow,
  bills: PayableRow[],
  opts: { windowInDays: number; limit: number },
): PayableCandidateInternal[] {
  const posted = Math.abs(Number(bank.amount ?? 0));
  if (!Number.isFinite(posted) || posted <= 0) return [];

  const normalizedBankText = normalizeText(
    [bank.description, bank.raw_description].filter(Boolean).join(' '),
  );

  const results: PayableCandidateInternal[] = [];
  for (const bill of bills) {
    const status = (bill.status ?? '').toLowerCase();
    if (status === 'paid' || status === 'cancelled') continue;

    const expected = Number(bill.amount ?? 0);
    if (!Number.isFinite(expected) || expected <= 0) continue;

    const amountDelta = Math.abs(expected - posted);
    const tolerance = Math.max(expected * 0.05, 0.5);
    if (amountDelta > tolerance) continue;

    const dayDistance = daysBetween(bill.due_date, bank.date);
    if (dayDistance > opts.windowInDays) continue;

    let score = 200 - dayDistance * 6 - (amountDelta * 40) / Math.max(expected, 1);
    const normalizedBillText = normalizeText(
      [bill.description, bill.provider_name].filter(Boolean).join(' '),
    );
    if (sharedKeyword(normalizedBillText, normalizedBankText)) score += 25;
    if (amountDelta <= 0.01) score += 15;
    if (status === 'scheduled') score += 8;

    results.push({ bill, dayDistance, amountDelta, score });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.amountDelta !== b.amountDelta) return a.amountDelta - b.amountDelta;
    return a.dayDistance - b.dayDistance;
  });
  return results.slice(0, opts.limit);
}

interface TransferCandidateInternal {
  bankTransaction: BankRow;
  dayDistance: number;
  score: number;
}

function findTransferCandidatesDeno(
  primary: BankRow,
  pool: BankRow[],
  opts: { windowInDays: number; limit: number },
): TransferCandidateInternal[] {
  const primaryAbs = Math.abs(Number(primary.amount ?? 0));
  const primarySign = Math.sign(Number(primary.amount ?? 0));
  if (primaryAbs === 0 || primarySign === 0) return [];

  const results: TransferCandidateInternal[] = [];
  for (const row of pool) {
    if (row.id === primary.id) continue;
    if (row.user_id !== primary.user_id) continue;
    const status = row.reconciliation_status ?? 'pending';
    if (
      status === 'reconciled' ||
      status === 'rejected' ||
      status === 'ignored' ||
      status === 'transfer_matched'
    ) {
      continue;
    }
    const amount = Number(row.amount ?? 0);
    if (Math.sign(amount) === primarySign) continue;
    if (Math.abs(Math.abs(amount) - primaryAbs) > 0.01) continue;

    const dayDistance = daysBetween(primary.date, row.date);
    if (dayDistance > opts.windowInDays) continue;

    let score = 100 - dayDistance * 10;
    if (
      looksLikeTransferDescription(primary.description) &&
      looksLikeTransferDescription(row.description)
    ) {
      score += 8;
    }
    results.push({ bankTransaction: row, dayDistance, score });
  }

  results.sort((a, b) => b.score - a.score || a.dayDistance - b.dayDistance);
  return results.slice(0, opts.limit);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function priorityRank(p: ReconciliationPriority | string | null | undefined): number {
  switch (p) {
    case 'urgent':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    case 'low':
      return 3;
    case 'infra':
      return 4;
    default:
      return 5;
  }
}

function shiftIsoDate(iso: string | undefined, deltaDays: number): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  const shifted = new Date(time + deltaDays * 86400000);
  return shifted.toISOString().slice(0, 10);
}

function fallbackCase(caseRow: CaseRow): AnaClaraReconciliationCase {
  return {
    caseId: caseRow.id,
    bankTransactionId: caseRow.bank_transaction_id,
    divergenceType: caseRow.divergence_type,
    priority: caseRow.priority,
    confidence: Number(caseRow.confidence ?? 0),
    bank: {
      amount: 0,
      date: '',
      description: 'movimentacao bancaria (sem snapshot disponivel)',
      accountLabel: 'Conta nao mapeada',
      isDebit: true,
    },
    headline: 'movimentacao bancaria sem snapshot disponivel',
    leadHypothesis: null,
    alternatives: [],
  };
}
