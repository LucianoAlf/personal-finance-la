import {
  isExpiredReconciliationDecision,
  parseReconciliationDecisionReply,
  type PendingReconciliationDecision,
} from './reconciliation-confirmation.ts';
import type { ReconciliationActionInvoker } from './reconciliation-handler.ts';
import { detectDiagnosticTopicShift } from './accounts-diagnostic-conversations.ts';

// ---------------------------------------------------------------------------
// Ports (everything IO is injected so tests run without supabase).
// ---------------------------------------------------------------------------

export interface HandleAwaitingReconciliationDecisionReplyDeps {
  invokeReconciliationAction: ReconciliationActionInvoker;
  limparContexto: (userId: string) => Promise<void>;
  salvarContexto: (
    userId: string,
    type: 'awaiting_reconciliation_decision_confirm',
    data: PendingReconciliationDecision,
    phone: string,
  ) => Promise<void>;
  now?: () => string;
}

export interface HandleAwaitingReconciliationDecisionReplyParams
  extends HandleAwaitingReconciliationDecisionReplyDeps {
  texto: string;
  userId: string;
  pending: PendingReconciliationDecision;
  /**
   * Test seam: override topic-shift detection. Production uses the same
   * heuristic as accounts-safe-action so the two flows behave consistently
   * ("quanto gastei?" inside a pending reconciliation should NOT accidentally
   * confirm or re-ask; it should release the context and let NLP answer).
   */
  detectTopicShift?: (text: string) => boolean;
}

const ASSINATURA = '\n\n_Ana Clara • Personal Finance_ 🙋🏻‍♀️';

function renderSuccess(pending: PendingReconciliationDecision): string {
  switch (pending.action) {
    case 'link_payable':
      return `Pronto, vinculei e ja baixei o boleto como pago. ✅${ASSINATURA}`;
    case 'mark_transfer':
      return `Feito — marquei como transferencia interna e fechei o caso. ✅${ASSINATURA}`;
    case 'register_expense':
      return `Pronto, registrei como despesa e fechei a reconciliacao. ✅${ASSINATURA}`;
    case 'ignore':
      return `Ok, marquei como "nao reconheco" e fechei o caso sem mexer no ledger.${ASSINATURA}`;
    default:
      return `Feito. Atualizei o caso.${ASSINATURA}`;
  }
}

function renderDecline(): string {
  return `Beleza, cancelei essa decisao. O caso continua aberto pra voce revisar quando quiser.${ASSINATURA}`;
}

function renderDefer(): string {
  return `Sem problema — o caso fica pendente. Quando quiser me diz "o que ficou sem match?" que eu te mostro de novo.${ASSINATURA}`;
}

function renderReAsk(pending: PendingReconciliationDecision): string {
  return (
    `Nao tenho certeza se voce quer que eu siga. Sobre:\n• ${pending.caseHeadline}\n• Intencao: ${pending.summary}\n\n` +
    `Responde "sim" pra confirmar, "nao" pra cancelar, ou "depois" pra deixar pra mais tarde.`
  );
}

function renderExpired(): string {
  return (
    `Ja faz um tempo desde que te perguntei, entao prefiro nao aplicar sem confirmar de novo. ` +
    `Me pede "o que tem pra eu conferir?" que eu re-apresento a decisao certinha.` +
    ASSINATURA
  );
}

function renderError(error: string): string {
  return (
    `Ops, nao consegui finalizar. Motivo: ${error}. ` +
    `Prefere tentar de novo ou resolver pelo app?` +
    ASSINATURA
  );
}

export async function handleAwaitingReconciliationDecisionReply(
  params: HandleAwaitingReconciliationDecisionReplyParams,
): Promise<string> {
  const now = params.now ?? (() => new Date().toISOString());
  const nowIso = now();

  if (isExpiredReconciliationDecision(params.pending, nowIso)) {
    await params.limparContexto(params.userId);
    return renderExpired();
  }

  // Topic shift: if the user is clearly asking about something else (saldo,
  // gastei, fatura, etc.), we release the pending decision silently and let
  // the regular NLP flow answer. Returning an empty string tells the context
  // manager to fall through (see context-manager.ts handling).
  const topicShift = params.detectTopicShift ?? detectDiagnosticTopicShift;
  if (topicShift(params.texto)) {
    await params.limparContexto(params.userId);
    return '';
  }

  const parsed = parseReconciliationDecisionReply(params.texto);

  if (parsed.kind === 'decline') {
    await params.limparContexto(params.userId);
    return renderDecline();
  }

  if (parsed.kind === 'defer') {
    await params.limparContexto(params.userId);
    return renderDefer();
  }

  if (parsed.kind !== 'confirm') {
    // Ambiguous: keep the pending decision alive (same expiresAt — the
    // user still has their original TTL) and re-ask with the preview.
    await params.salvarContexto(
      params.userId,
      'awaiting_reconciliation_decision_confirm',
      params.pending,
      params.pending.phone,
    );
    return renderReAsk(params.pending);
  }

  const result = await params.invokeReconciliationAction({
    caseId: params.pending.caseId,
    action: params.pending.action,
    payload: params.pending.payload,
  });

  // Whether it succeeded or failed, we close the pending dialogue: a failed
  // decision should come back through a fresh ASK so Ana Clara can re-scan
  // the snapshot (maybe the case was resolved somewhere else in the
  // meantime).
  await params.limparContexto(params.userId);

  if (!result.ok) {
    return renderError(result.error ?? 'erro desconhecido');
  }
  return renderSuccess(params.pending);
}
