import type { ReconciliationDecisionAction } from './reconciliation-handler.ts';

// ---------------------------------------------------------------------------
// Pending decision (persisted into conversation_context while we wait for
// the user's yes/no). Kept intentionally minimal: just what we need to
// re-invoke `reconciliation-action` with a fresh snapshot check.
// ---------------------------------------------------------------------------

export interface PendingReconciliationDecision {
  /** Reconciliation case the decision will apply to. */
  caseId: string;
  /** Action we'll dispatch when the user confirms. */
  action: ReconciliationDecisionAction;
  /**
   * Payload fragment for `reconciliation-action` (e.g. `payableBillId`,
   * `counterpartBankTransactionId`, `registerExpense`). Pre-computed from
   * the snapshot at preview time so the handler never has to re-query.
   */
  payload: Record<string, unknown>;
  /** Short one-liner Ana Clara reads out loud ("vincular a X R$ 100"). */
  summary: string;
  /** Operator-facing bank movement line for context. */
  caseHeadline: string;
  phone: string;
  createdAt: string;
  /** After this ISO timestamp the preview is stale and must be refused. */
  expiresAt: string;
}

export const RECONCILIATION_PREVIEW_TTL_MINUTES = 10;

export function buildReconciliationExpiresAt(nowIso: string): string {
  const t = new Date(nowIso);
  t.setMinutes(t.getMinutes() + RECONCILIATION_PREVIEW_TTL_MINUTES);
  return t.toISOString();
}

export function isExpiredReconciliationDecision(
  pending: PendingReconciliationDecision,
  nowIso: string,
): boolean {
  return new Date(nowIso).getTime() >= new Date(pending.expiresAt).getTime();
}

// ---------------------------------------------------------------------------
// Reply parsing
// ---------------------------------------------------------------------------

// We explicitly DO NOT fall back to a fuzzy "positive word somewhere" match:
// that caused accounts-safe-action false positives in the past (the user
// answering a totally different question would accidentally confirm).
// Instead: canonical phrases only, but broader than the safe-action parser
// because reconciliation replies are usually single-word yes/no.
const CONFIRM_PHRASES = new Set<string>([
  'sim',
  'sim confirmo',
  'sim, confirmo',
  'confirmo',
  'confirma',
  'confirmar',
  'pode',
  'pode sim',
  'pode fechar',
  'pode ir',
  'pode mandar',
  'manda',
  'manda ver',
  'bora',
  'vai',
  'vai la',
  'vai sim',
  'ok',
  'okay',
  'beleza',
  'blz',
  'certo',
  'correto',
  'isso',
  'isso mesmo',
  'isso ai',
  'eh isso',
  'fecha',
  'fechado',
  'combinado',
  'perfeito',
  'perfeita',
  'positivo',
  'afirmativo',
]);

const DECLINE_PHRASES = new Set<string>([
  'nao',
  'nao quero',
  'nao eh',
  'nao e',
  'nao faz',
  'nao faca',
  'nao confirma',
  'nao pode',
  'cancela',
  'cancelar',
  'cancela isso',
  'esquece',
  'esqueca',
  'deixa',
  'deixa pra la',
  'deixa pra depois nao',
  'nao, deixa',
  'nao, esquece',
  'nada disso',
  'negativo',
  'desconsidera',
  'desconsiderar',
  'nao preciso',
  'errado',
  'ta errado',
]);

const DEFER_PHRASES = new Set<string>([
  'depois',
  'depois vejo',
  'mais tarde',
  'amanha',
  'amanha vejo',
  'deixa pra depois',
  'daqui a pouco',
  'depois a gente ve',
]);

function normalize(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function parseReconciliationDecisionReply(
  text: string,
): { kind: 'confirm' | 'decline' | 'defer' | 'ambiguous' } {
  const normalized = normalize(text);
  if (!normalized) return { kind: 'ambiguous' };

  if (DECLINE_PHRASES.has(normalized)) return { kind: 'decline' };
  if (DEFER_PHRASES.has(normalized)) return { kind: 'defer' };
  if (CONFIRM_PHRASES.has(normalized)) return { kind: 'confirm' };

  // Guard against "sim, mas..." / "nao, mas..." where user is adding a
  // qualifier the handler can't act on — keep ambiguous so we re-ask.
  if (/^sim[, ]/.test(normalized) && !CONFIRM_PHRASES.has(normalized)) {
    return { kind: 'ambiguous' };
  }
  if (/^nao[, ]/.test(normalized) && !DECLINE_PHRASES.has(normalized)) {
    // Exception: "nao, deixa" / "nao, esquece" ARE declines and already in the
    // set. Anything else is ambiguous.
    return { kind: 'ambiguous' };
  }

  return { kind: 'ambiguous' };
}

// ---------------------------------------------------------------------------
// Prompt rendering
// ---------------------------------------------------------------------------

function verbForAction(action: ReconciliationDecisionAction): string {
  switch (action) {
    case 'link_payable':
      return 'vincular e baixar esse boleto como pago';
    case 'mark_transfer':
      return 'marcar como transferencia interna';
    case 'register_expense':
      return 'registrar como despesa';
    case 'ignore':
      return 'fechar sem reconhecer';
    case 'confirm':
      return 'confirmar a sugestao';
    case 'reject':
      return 'rejeitar a sugestao';
    case 'defer':
      return 'deixar para depois';
    default:
      return 'aplicar essa decisao';
  }
}

export function buildReconciliationConfirmationPrompt(
  pending: PendingReconciliationDecision,
): string {
  const verb = verbForAction(pending.action);
  return (
    `Quer que eu ${verb}?\n\n` +
    `• ${pending.caseHeadline}\n` +
    `• O que vou fazer: ${pending.summary}\n\n` +
    `Responde "sim" pra confirmar, "nao" pra cancelar ou "depois" pra deixar essa decisao pra mais tarde.`
  );
}
