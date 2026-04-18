import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  buildReconciliationContextForAnaClara,
  type AnaClaraReconciliationCase,
  type AnaClaraReconciliationSnapshot,
  type BuildReconciliationContextOptions,
  type HypothesisSuggestion,
} from '../_shared/reconciliation-ana-clara-context.ts';
import {
  buildReconciliationConfirmationPrompt,
  buildReconciliationExpiresAt,
  type PendingReconciliationDecision,
} from './reconciliation-confirmation.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ReconciliationIntent = 'ASK_RECONCILIATION' | 'DECIDE_RECONCILIATION';

export type ReconciliationDecisionAction =
  | 'link_payable'
  | 'mark_transfer'
  | 'register_expense'
  | 'ignore'
  | 'confirm'
  | 'reject'
  | 'defer';

export interface ReconciliationEntities {
  case_id?: string;
  reconciliation_action?: ReconciliationDecisionAction;
  /** Optional free-form reason the user gave (for audit). */
  reason?: string;
}

/**
 * Payload the bridge forwards to the `reconciliation-action` edge function.
 * Kept deliberately narrow so the handler is easy to test and so we never
 * send a field the edge function doesn't recognize.
 */
export interface ReconciliationActionPayload {
  caseId: string;
  action: ReconciliationDecisionAction;
  payload: Record<string, unknown>;
}

export type ReconciliationActionInvoker = (
  args: ReconciliationActionPayload,
) => Promise<{ ok: boolean; error?: string }>;

export type ReconciliationSnapshotBuilder = (
  supabase: SupabaseClient,
  userId: string,
  options?: BuildReconciliationContextOptions,
) => Promise<AnaClaraReconciliationSnapshot>;

/**
 * Port used when a DECIDE_RECONCILIATION answer needs confirmation. The
 * handler never directly touches conversation_context so tests can run
 * deterministically and the handler doesn't reach back into the state
 * manager. Production wires this to `salvarContexto`.
 */
export type SaveDecisionContext = (
  userId: string,
  pending: PendingReconciliationDecision,
  phone: string,
) => Promise<void>;

export interface HandleReconciliationIntentParams {
  supabase: SupabaseClient;
  userId: string;
  phone: string;
  intent: ReconciliationIntent;
  content: string;
  entities: ReconciliationEntities;
  /** Override for tests. Production should leave this empty. */
  buildSnapshot?: ReconciliationSnapshotBuilder;
  /** Override for tests. Production should leave this empty. */
  invokeReconciliationAction?: ReconciliationActionInvoker;
  /**
   * Persist a pending confirmation. Required when running from WhatsApp;
   * tests can pass an in-memory spy. If omitted, the handler falls back to
   * direct dispatch — preserving backward compatibility for integration
   * tests that pre-date the confirmation flow.
   */
  saveDecisionContext?: SaveDecisionContext;
  /** Override for tests / deterministic timestamps. */
  now?: () => string;
  sendReply: (text: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const ASSINATURA = '\n\n_Ana Clara • Personal Finance_ 🙋🏻‍♀️';

function defaultSnapshotBuilder(
  supabase: SupabaseClient,
  userId: string,
  options?: BuildReconciliationContextOptions,
): Promise<AnaClaraReconciliationSnapshot> {
  return buildReconciliationContextForAnaClara(supabase, userId, options);
}

/**
 * Public re-export of `defaultInvoker` used by the confirmation handler in
 * the context manager. Kept as a thin wrapper so tests can still mock the
 * invoker via dependency injection, while the production WhatsApp path has
 * a stable import target that doesn't leak internals.
 */
export function invokeReconciliationActionViaEdgeFunction(
  supabase: SupabaseClient,
  args: ReconciliationActionPayload,
): Promise<{ ok: boolean; error?: string }> {
  return defaultInvoker(args, supabase);
}

async function defaultInvoker(
  args: ReconciliationActionPayload,
  supabase: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  // Ana Clara runs inside process-whatsapp-message, which already has a
  // service-role client. We reuse `functions.invoke` so auth/headers are
  // propagated the same way as every other internal edge call.
  const { data, error } = await supabase.functions.invoke('reconciliation-action', {
    body: {
      caseId: args.caseId,
      action: args.action,
      confirmationSource: 'whatsapp',
      ...args.payload,
    },
  });
  if (error) {
    return { ok: false, error: error.message ?? String(error) };
  }
  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    return { ok: false, error: (data as { error?: string }).error ?? 'reconciliation-action failed' };
  }
  return { ok: true };
}

function formatBrlAmount(value: number): string {
  const abs = Math.abs(value);
  return abs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function renderCaseLine(index: number, kase: AnaClaraReconciliationCase): string {
  const signedAmount = kase.bank.isDebit ? '-' : '+';
  const head = `${index}. ${signedAmount}${formatBrlAmount(kase.bank.amount)} em ${formatBrDate(kase.bank.date)} na ${kase.bank.accountLabel} — ${kase.bank.description}`;
  const lead = kase.leadHypothesis
    ? `\n   Hipotese: ${kase.leadHypothesis.summary}`
    : '';
  const caseHint = `\n   (case_id=${kase.caseId})`;
  return head + lead + caseHint;
}

function renderListMessage(snapshot: AnaClaraReconciliationSnapshot): string {
  const total = snapshot.totalOpen;
  const lines: string[] = [];
  lines.push(
    `Achei ${total} ${total === 1 ? 'caso pendente de reconciliacao' : 'casos pendentes de reconciliacao'} pra voce conferir:`,
  );
  snapshot.cases.forEach((kase, i) => {
    lines.push(renderCaseLine(i + 1, kase));
  });
  lines.push('');
  lines.push(
    'Me diz qual voce quer resolver e como (ex: "vincula o boleto", "era transferencia", "registra como despesa" ou "ignora"). Se quiser eu confirmo antes de efetivar.',
  );
  return lines.join('\n') + ASSINATURA;
}

function renderEmptyMessage(): string {
  return (
    'Conferi aqui e ta tudo em dia — nenhum caso de reconciliacao pendente no momento. 🎉' +
    ASSINATURA
  );
}

function findCase(
  snapshot: AnaClaraReconciliationSnapshot,
  caseId: string | undefined,
): AnaClaraReconciliationCase | null {
  if (!caseId) return null;
  return snapshot.cases.find((c) => c.caseId === caseId) ?? null;
}

function pickHypothesis(
  kase: AnaClaraReconciliationCase,
  action: ReconciliationDecisionAction,
): HypothesisSuggestion | null {
  const pool: HypothesisSuggestion[] = [];
  if (kase.leadHypothesis) pool.push(kase.leadHypothesis);
  pool.push(...kase.alternatives);
  return pool.find((h) => h.action === action) ?? null;
}

/**
 * Convert a stored HypothesisSuggestion.params block into the body fragment
 * the `reconciliation-action` edge function expects. This is the ONLY place
 * the two schemas meet; keep it narrow.
 */
function hypothesisToPayload(hypothesis: HypothesisSuggestion): Record<string, unknown> | null {
  const p = hypothesis.params;
  switch (p.kind) {
    case 'link_payable':
      return { payableBillId: p.payableBillId };
    case 'mark_transfer':
      return { counterpartBankTransactionId: p.counterpartBankTransactionId };
    case 'register_expense':
      return {
        registerExpense: {
          accountId: p.accountId ?? undefined,
          categoryId: p.suggestedCategory ?? undefined,
        },
      };
    case 'ignore':
      return {};
    default:
      return null;
  }
}

function renderSuccessMessage(
  kase: AnaClaraReconciliationCase,
  action: ReconciliationDecisionAction,
): string {
  const humanAmount = formatBrlAmount(kase.bank.amount);
  switch (action) {
    case 'link_payable':
      return `Pronto, vinculei esse movimento ao boleto e ja baixei ele como pago (${humanAmount}, ${kase.bank.accountLabel}).${ASSINATURA}`;
    case 'mark_transfer':
      return `Feito — marquei como transferencia interna. Esse caso saiu da fila de reconciliacao (${humanAmount}, ${kase.bank.accountLabel}).${ASSINATURA}`;
    case 'register_expense':
      return `Pronto, registrei como despesa e fechei a reconciliacao (${humanAmount}, ${kase.bank.accountLabel}).${ASSINATURA}`;
    case 'ignore':
      return `Ok, marquei como "nao reconheco" e fechei o caso sem mexer no ledger (${humanAmount}, ${kase.bank.accountLabel}).${ASSINATURA}`;
    default:
      return `Feito. Atualizei o caso.${ASSINATURA}`;
  }
}

function renderErrorMessage(caseRef: string, error: string): string {
  return (
    `Ops, nao consegui finalizar aqui (${caseRef}). Motivo: ${error}. ` +
    'Quer tentar de novo ou prefere resolver pelo app?' +
    ASSINATURA
  );
}

function renderClarificationMissingCase(snapshot: AnaClaraReconciliationSnapshot): string {
  if (snapshot.totalOpen === 0) {
    return renderEmptyMessage();
  }
  return (
    'Nao achei esse caso especifico na fila atual. Me diz qual das movimentacoes abaixo voce quer resolver:\n\n' +
    snapshot.cases.map((k, i) => renderCaseLine(i + 1, k)).join('\n') +
    ASSINATURA
  );
}

function renderClarificationMissingParams(
  kase: AnaClaraReconciliationCase,
  action: ReconciliationDecisionAction,
): string {
  if (action === 'link_payable') {
    return (
      `Qual boleto eu vinculo? Nao achei um candidato claro pra ${formatBrlAmount(kase.bank.amount)} em ${kase.bank.accountLabel} (${kase.bank.description}). ` +
      'Me diz o nome do boleto ou o valor que voce espera que bata.' +
      ASSINATURA
    );
  }
  if (action === 'mark_transfer') {
    return (
      `Pra marcar como transferencia interna preciso saber a outra perna. Nao achei automaticamente. ` +
      'Me diz qual conta recebeu/enviou o dinheiro.' +
      ASSINATURA
    );
  }
  return (
    `Nao tenho contexto suficiente pra resolver esse caso como "${action}". Me diz mais uma pista, por favor.` +
    ASSINATURA
  );
}

export async function handleReconciliationIntent(
  params: HandleReconciliationIntentParams,
): Promise<void> {
  const buildSnapshot = params.buildSnapshot ?? defaultSnapshotBuilder;
  const invokeAction =
    params.invokeReconciliationAction ?? ((args) => defaultInvoker(args, params.supabase));

  const snapshot = await buildSnapshot(params.supabase, params.userId, { limit: 5 });

  if (params.intent === 'ASK_RECONCILIATION') {
    if (snapshot.totalOpen === 0) {
      await params.sendReply(renderEmptyMessage());
      return;
    }
    await params.sendReply(renderListMessage(snapshot));
    return;
  }

  // DECIDE_RECONCILIATION
  const kase = findCase(snapshot, params.entities.case_id);
  if (!kase) {
    await params.sendReply(renderClarificationMissingCase(snapshot));
    return;
  }

  const action = params.entities.reconciliation_action;
  if (!action) {
    await params.sendReply(renderListMessage(snapshot));
    return;
  }

  const hypothesis = pickHypothesis(kase, action);
  if (!hypothesis) {
    await params.sendReply(renderClarificationMissingParams(kase, action));
    return;
  }

  const payload = hypothesisToPayload(hypothesis);
  if (payload === null) {
    await params.sendReply(renderClarificationMissingParams(kase, action));
    return;
  }

  if (params.entities.reason) {
    payload.reason = params.entities.reason;
  }

  // Low-risk actions are dispatched directly: `ignore` doesn't touch the
  // ledger (just marks the case as "not mine"). Everything else mutates
  // money (`link_payable` marks a bill paid, `register_expense` creates a
  // transaction, `mark_transfer` re-classifies two bank rows) and MUST go
  // through a yes/no confirmation so the user doesn't fire-and-forget.
  const needsConfirmation = action !== 'ignore' && action !== 'defer';

  if (needsConfirmation && params.saveDecisionContext) {
    const nowIso = (params.now ?? (() => new Date().toISOString()))();
    const pending: PendingReconciliationDecision = {
      caseId: kase.caseId,
      action,
      payload,
      summary: hypothesis.summary,
      caseHeadline: kase.headline,
      phone: params.phone,
      createdAt: nowIso,
      expiresAt: buildReconciliationExpiresAt(nowIso),
    };
    await params.saveDecisionContext(params.userId, pending, params.phone);
    await params.sendReply(buildReconciliationConfirmationPrompt(pending));
    return;
  }

  // Fallback direct-dispatch path (used for `ignore` and for integration
  // tests / older callers that don't provide `saveDecisionContext`).
  const result = await invokeAction({ caseId: kase.caseId, action, payload });
  if (!result.ok) {
    await params.sendReply(renderErrorMessage(kase.caseId, result.error ?? 'erro desconhecido'));
    return;
  }

  await params.sendReply(renderSuccessMessage(kase, action));
}
