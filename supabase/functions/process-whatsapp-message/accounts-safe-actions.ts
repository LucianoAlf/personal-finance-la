import {
  templateAccountsSafeActionPreview,
  type AccountsObservationPresentation,
} from './accounts-response-templates.ts';

export type AccountsSafeActionType =
  | 'mark_as_paid'
  | 'reschedule_due_date'
  | 'update_amount'
  | 'cancel_one_off_bill'
  | 'disable_recurrence'
  | 'cancel_current_occurrence'
  | 'update_paid_amount'
  | 'update_paid_at'
  | 'update_paid_record'
  | 'adjust_account_balance'
  | 'deactivate_account';

export type SafeActionEligibilityReason =
  | 'missing_required_fields'
  | 'multiple_plausible_actions'
  | 'target_not_confidently_identified'
  | 'diagnosis_not_concluded'
  | 'unsupported_action_for_conclusion';

export interface PendingAccountsSafeAction {
  anomalyType: AccountsObservationPresentation['type'];
  actionType: AccountsSafeActionType;
  targetType: 'payable_bill' | 'account';
  targetId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  effectSummary: string;
  diagnosticBasis: {
    conclusionKey: string;
    conclusionText: string;
    source: 'passive_listing' | 'explicit_health_check' | 'direct_diagnostic_prompt';
  };
  confirmationPrompt: string;
  confirmationSource?: 'explicit_yes' | 'explicit_confirm_phrase' | 'button_confirm' | 'reply_to_preview';
  confirmationText?: string;
  idempotencyKey: string;
  surfacedAt: string;
  previewExpiresAt: string;
  confirmedAt?: string;
}

export interface SafeActionEligibilityResult {
  eligible: boolean;
  actionType?: AccountsSafeActionType;
  reason?: SafeActionEligibilityReason;
}

function getResolvedValue(
  resolvedFields: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (key in resolvedFields) return resolvedFields[key];
  }
  return undefined;
}

function getResolvedString(
  resolvedFields: Record<string, unknown>,
  ...keys: string[]
): string | null {
  const value = getResolvedValue(resolvedFields, ...keys);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getResolvedNumber(
  resolvedFields: Record<string, unknown>,
  ...keys: string[]
): number | null {
  const value = getResolvedValue(resolvedFields, ...keys);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getResolvedBoolean(
  resolvedFields: Record<string, unknown>,
  ...keys: string[]
): boolean | null {
  const value = getResolvedValue(resolvedFields, ...keys);
  return typeof value === 'boolean' ? value : null;
}

function hasPayableBillTarget(anomaly: AccountsObservationPresentation): boolean {
  return typeof anomaly.billId === 'string' && anomaly.billId.trim().length > 0;
}

function hasAccountTarget(anomaly: AccountsObservationPresentation): boolean {
  return typeof anomaly.accountId === 'string' && anomaly.accountId.trim().length > 0;
}

function isDiagnosisConcluded(kind: string): boolean {
  return Boolean(kind) && kind !== 'not_sure' && kind !== 'unknown' && kind !== 'defer';
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function formatStatus(value: string): string {
  switch (value) {
    case 'pending':
      return 'Pendente';
    case 'paid':
      return 'Paga';
    case 'cancelled':
      return 'Cancelada';
    case 'overdue':
      return 'Vencida';
    case 'active':
      return 'Ativa';
    default:
      return value;
  }
}

function formatPreviewValue(field: string, value: unknown): string {
  if (value == null) return 'vazio';
  if (field === 'status' && typeof value === 'string') {
    return formatStatus(value);
  }
  if (
    (field === 'amount' || field === 'paid_amount' || field === 'current_balance') &&
    typeof value === 'number'
  ) {
    return formatCurrency(value);
  }
  if (
    (field === 'due_date' || field === 'paid_at' || field === 'next_occurrence_date') &&
    typeof value === 'string'
  ) {
    return formatDate(value);
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  return String(value);
}

function buildPreviewChangeLines(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  return Object.entries(after).map(([field, nextValue]) => {
    const previousValue = before[field] ?? null;
    return `• ${field}: ${formatPreviewValue(field, previousValue)} -> ${formatPreviewValue(field, nextValue)}`;
  });
}

export function getSafeActionEligibility(params: {
  anomaly: AccountsObservationPresentation;
  diagnosticConclusion: { kind: string };
  resolvedFields: Record<string, unknown>;
}): SafeActionEligibilityResult {
  const { anomaly, diagnosticConclusion, resolvedFields } = params;
  const conclusionKind = diagnosticConclusion.kind;

  if (!isDiagnosisConcluded(conclusionKind)) {
    return { eligible: false, reason: 'diagnosis_not_concluded' };
  }

  switch (anomaly.type) {
    case 'overdue_without_settlement': {
      if (!hasPayableBillTarget(anomaly)) {
        return { eligible: false, reason: 'target_not_confidently_identified' };
      }

      if (conclusionKind === 'paid_already') {
        if (
          !getResolvedString(resolvedFields, 'paid_at') ||
          getResolvedNumber(resolvedFields, 'paid_amount') == null
        ) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'mark_as_paid' };
      }

      if (conclusionKind === 'still_open') {
        if (!getResolvedString(resolvedFields, 'new_due_date', 'newDueDate')) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'reschedule_due_date' };
      }

      return { eligible: false, reason: 'unsupported_action_for_conclusion' };
    }

    case 'zeroed_bill': {
      if (!hasPayableBillTarget(anomaly)) {
        return { eligible: false, reason: 'target_not_confidently_identified' };
      }

      if (conclusionKind === 'value_missing') {
        if (getResolvedNumber(resolvedFields, 'amount') == null) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'update_amount' };
      }

      if (conclusionKind === 'already_settled') {
        if (
          !getResolvedString(resolvedFields, 'paid_at') ||
          getResolvedNumber(resolvedFields, 'paid_amount') == null
        ) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'mark_as_paid' };
      }

      if (conclusionKind === 'no_longer_applies') {
        const isRecurring = getResolvedBoolean(resolvedFields, 'is_recurring', 'isRecurring');
        if (isRecurring == null) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return {
          eligible: true,
          actionType: isRecurring ? 'disable_recurrence' : 'cancel_one_off_bill',
        };
      }

      if (conclusionKind === 'current_occurrence_only') {
        const isRecurring = getResolvedBoolean(resolvedFields, 'is_recurring', 'isRecurring');
        if (isRecurring == null) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        if (!isRecurring) {
          return { eligible: false, reason: 'unsupported_action_for_conclusion' };
        }
        return { eligible: true, actionType: 'cancel_current_occurrence' };
      }

      return { eligible: false, reason: 'unsupported_action_for_conclusion' };
    }

    case 'paid_inconsistent': {
      if (!hasPayableBillTarget(anomaly)) {
        return { eligible: false, reason: 'target_not_confidently_identified' };
      }

      if (conclusionKind === 'missing_paid_amount') {
        if (getResolvedNumber(resolvedFields, 'paid_amount') == null) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'update_paid_amount' };
      }

      if (conclusionKind === 'missing_payment_date') {
        if (!getResolvedString(resolvedFields, 'paid_at')) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'update_paid_at' };
      }

      if (conclusionKind === 'missing_both') {
        if (
          getResolvedNumber(resolvedFields, 'paid_amount') == null ||
          !getResolvedString(resolvedFields, 'paid_at')
        ) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'update_paid_record' };
      }

      return { eligible: false, reason: 'unsupported_action_for_conclusion' };
    }

    case 'zero_balance_account': {
      if (!hasAccountTarget(anomaly)) {
        return { eligible: false, reason: 'target_not_confidently_identified' };
      }

      if (conclusionKind === 'account_still_active') {
        if (getResolvedNumber(resolvedFields, 'current_balance') == null) {
          return { eligible: false, reason: 'missing_required_fields' };
        }
        return { eligible: true, actionType: 'adjust_account_balance' };
      }

      if (conclusionKind === 'account_inactive') {
        return { eligible: true, actionType: 'deactivate_account' };
      }

      return { eligible: false, reason: 'unsupported_action_for_conclusion' };
    }
  }
}

// This builder creates the pre-confirmation pending payload only.
// Confirmation fields are attached later after explicit confirmation.
export function buildPendingAccountsSafeAction(
  params: Omit<
    PendingAccountsSafeAction,
    'anomalyType' | 'idempotencyKey' | 'surfacedAt' | 'confirmationSource' | 'confirmationText' | 'confirmedAt'
  > & { anomaly: AccountsObservationPresentation },
): PendingAccountsSafeAction {
  return {
    anomalyType: params.anomaly.type,
    actionType: params.actionType,
    targetType: params.targetType,
    targetId: params.targetId,
    before: structuredClone(params.before),
    after: structuredClone(params.after),
    effectSummary: params.effectSummary,
    diagnosticBasis: structuredClone(params.diagnosticBasis),
    confirmationPrompt: params.confirmationPrompt,
    previewExpiresAt: params.previewExpiresAt,
    surfacedAt: new Date().toISOString(),
    idempotencyKey: crypto.randomUUID(),
  };
}

export function buildSafeActionPreviewFromDiagnosis(params: {
  anomaly: AccountsObservationPresentation;
  diagnosticConclusion: { kind: string; text: string };
  diagnosticSource: PendingAccountsSafeAction['diagnosticBasis']['source'];
  resolvedFields: Record<string, unknown>;
  previewExpiresAt: string;
}): PendingAccountsSafeAction | null {
  const eligibility = getSafeActionEligibility(params);
  if (!eligibility.eligible || !eligibility.actionType) return null;

  const amount = getResolvedNumber(params.resolvedFields, 'amount');
  const paidAmount = getResolvedNumber(params.resolvedFields, 'paid_amount');
  const paidAt = getResolvedString(params.resolvedFields, 'paid_at');
  const newDueDate = getResolvedString(params.resolvedFields, 'new_due_date', 'newDueDate');
  const currentBalance = getResolvedNumber(params.resolvedFields, 'current_balance');
  const nextOccurrenceDate = getResolvedString(
    params.resolvedFields,
    'next_occurrence_date',
    'current_next_occurrence_date',
  );

  let targetType: PendingAccountsSafeAction['targetType'];
  let targetId: string;
  let before: Record<string, unknown>;
  let after: Record<string, unknown>;
  let title: string;
  let effectSummary: string;

  switch (eligibility.actionType) {
    case 'mark_as_paid':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { status: params.anomaly.status, paid_amount: null, paid_at: null };
      after = { status: 'paid', paid_amount: paidAmount, paid_at: paidAt };
      title = `Vou marcar a conta '${params.anomaly.description}' como paga.`;
      effectSummary = 'Essa conta sai da lista de pendentes e passa a constar como quitada.';
      break;

    case 'reschedule_due_date':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { due_date: params.anomaly.dueDate };
      after = { due_date: newDueDate };
      title = `Vou reagendar o vencimento da conta '${params.anomaly.description}'.`;
      effectSummary = 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.';
      break;

    case 'update_amount':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { amount: params.anomaly.amount };
      after = { amount };
      title = `Vou atualizar o valor da conta '${params.anomaly.description}'.`;
      effectSummary = 'A conta continua pendente, mas agora com o valor correto no sistema.';
      break;

    case 'cancel_one_off_bill':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { status: params.anomaly.status };
      after = { status: 'cancelled' };
      title = `Vou cancelar a conta '${params.anomaly.description}'.`;
      effectSummary = 'Ela deixa de aparecer como pendente, e o historico continua preservado.';
      break;

    case 'disable_recurrence':
      if (nextOccurrenceDate == null) {
        return null;
      }
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { is_recurring: true, next_occurrence_date: nextOccurrenceDate };
      after = { is_recurring: false, next_occurrence_date: null };
      title = `Vou desativar a recorrencia da conta '${params.anomaly.description}'.`;
      effectSummary = 'Ela deixa de gerar proximas ocorrencias, e o historico ja existente continua preservado.';
      break;

    case 'cancel_current_occurrence':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { status: params.anomaly.status };
      after = { status: 'cancelled' };
      title = `Vou cancelar so a ocorrencia atual da conta '${params.anomaly.description}'.`;
      effectSummary = 'Essa ocorrencia atual deixa de aparecer como pendente, sem interromper as proximas recorrencias.';
      break;

    case 'update_paid_amount':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { paid_amount: null };
      after = { paid_amount: paidAmount };
      title = `Vou completar o valor pago da conta '${params.anomaly.description}'.`;
      effectSummary = 'O registro pago continua pago, mas agora fica com o valor correto.';
      break;

    case 'update_paid_at':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { paid_at: null };
      after = { paid_at: paidAt };
      title = `Vou completar a data de pagamento da conta '${params.anomaly.description}'.`;
      effectSummary = 'O registro pago continua pago, mas agora fica com a data correta.';
      break;

    case 'update_paid_record':
      targetType = 'payable_bill';
      targetId = params.anomaly.billId!;
      before = { paid_amount: null, paid_at: null };
      after = { paid_amount: paidAmount, paid_at: paidAt };
      title = `Vou completar o registro da conta '${params.anomaly.description}'.`;
      effectSummary = 'O registro pago continua pago, mas agora fica completo.';
      break;

    case 'adjust_account_balance':
      targetType = 'account';
      targetId = params.anomaly.accountId!;
      before = { current_balance: params.anomaly.amount };
      after = { current_balance: currentBalance };
      title = `Vou ajustar o saldo da conta '${params.anomaly.description}'.`;
      effectSummary = 'Ela volta a refletir o saldo correto nas leituras de contas ativas.';
      break;

    case 'deactivate_account':
      targetType = 'account';
      targetId = params.anomaly.accountId!;
      before = { is_active: params.anomaly.status === 'active' };
      after = { is_active: false };
      title = `Vou desativar a conta '${params.anomaly.description}'.`;
      effectSummary =
        'Ela deixa de aparecer nas listas de contas ativas, sai das leituras de saldo diagnostico de contas ativas, e o historico continua preservado.';
      break;
  }

  return buildPendingAccountsSafeAction({
    anomaly: params.anomaly,
    actionType: eligibility.actionType,
    targetType,
    targetId,
    before,
    after,
    effectSummary,
    diagnosticBasis: {
      conclusionKey: params.diagnosticConclusion.kind,
      conclusionText: params.diagnosticConclusion.text,
      source: params.diagnosticSource,
    },
    confirmationPrompt: templateAccountsSafeActionPreview({
      title,
      changes: buildPreviewChangeLines(before, after),
      effectSummary,
    }),
    previewExpiresAt: params.previewExpiresAt,
  });
}

export function parseSafeActionConfirmation(
  text: string,
): { kind: 'confirm' | 'decline' | 'defer' | 'ambiguous' } {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  if (normalized === 'sim' || normalized === 'confirmo' || normalized === 'sim, confirmo') {
    return { kind: 'confirm' };
  }

  if (normalized === 'nao') {
    return { kind: 'decline' };
  }

  if (normalized === 'depois vejo') {
    return { kind: 'defer' };
  }

  return { kind: 'ambiguous' };
}

export function isExpiredSafeActionPreview(params: {
  now: string;
  previewExpiresAt: string;
  beforeSnapshotStillMatches: boolean;
  sameContext: boolean;
}): boolean {
  return (
    new Date(params.now).getTime() >= new Date(params.previewExpiresAt).getTime() ||
    !params.beforeSnapshotStillMatches ||
    !params.sameContext
  );
}
