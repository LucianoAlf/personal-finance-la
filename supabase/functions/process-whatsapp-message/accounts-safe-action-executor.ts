import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import type {
  AccountsSafeActionType,
  PendingAccountsSafeAction,
} from './accounts-safe-actions.ts';
import {
  atualizarContaBancariaSegura,
  atualizarContaPagarSegura,
  carregarContaBancariaSegura,
  carregarContaPagarSegura,
} from './contas-pagar.ts';

type AccountsSafeActionFinalState =
  | 'SAFE_ACTION_SUCCEEDED'
  | 'SAFE_ACTION_FAILED'
  | 'SAFE_ACTION_ABORTED'
  | 'SAFE_ACTION_INFRASTRUCTURE_ERROR';

type TargetRecord = Record<string, unknown>;
type ExecutionContext = {
  userId: string;
  now?: string;
};
type ReplayLookupResult =
  | { kind: 'none' }
  | { kind: 'matching_success'; details: Record<string, unknown> }
  | { kind: 'contract_conflict'; details: Record<string, unknown> }
  | { kind: 'read_error'; error: string };

const VALID_CONFIRMATION_SOURCES = new Set<
  NonNullable<PendingAccountsSafeAction['confirmationSource']>
>([
  'explicit_yes',
  'explicit_confirm_phrase',
  'button_confirm',
  'reply_to_preview',
]);

const VALID_DIAGNOSTIC_SOURCES = new Set<PendingAccountsSafeAction['diagnosticBasis']['source']>([
  'passive_listing',
  'explicit_health_check',
  'direct_diagnostic_prompt',
]);

function matchesFields(
  record: TargetRecord | null,
  expected: Record<string, unknown>,
): boolean {
  if (!record) return false;
  return Object.entries(expected).every(([field, value]) =>
    normalizeComparableFieldValue(field, record[field]) === normalizeComparableFieldValue(field, value)
  );
}

function pickFields(
  record: TargetRecord | null,
  expected: Record<string, unknown>,
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of Object.keys(expected)) {
    picked[field] = normalizeComparableFieldValue(field, record?.[field] ?? null);
  }
  return picked;
}

const DATE_COMPARISON_FIELDS = new Set(['paid_at', 'due_date', 'next_occurrence_date']);

function normalizeComparableFieldValue(field: string, value: unknown): unknown {
  if (typeof value !== 'string' || !DATE_COMPARISON_FIELDS.has(field)) {
    return value;
  }

  const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateOnlyMatch ? dateOnlyMatch[1] : value;
}

function getString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === 'string' ? value : null;
}

function getNullableString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === 'string' ? value : value == null ? null : null;
}

function getNumber(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getBoolean(record: Record<string, unknown>, field: string): boolean | null {
  const value = record[field];
  return typeof value === 'boolean' ? value : null;
}

function getNowIso(context: ExecutionContext): string {
  return context.now ?? new Date().toISOString();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidConfirmationSource(
  value: unknown,
): value is NonNullable<PendingAccountsSafeAction['confirmationSource']> {
  return typeof value === 'string' && VALID_CONFIRMATION_SOURCES.has(
    value as NonNullable<PendingAccountsSafeAction['confirmationSource']>,
  );
}

function hasValidDiagnosticBasis(
  value: unknown,
): value is PendingAccountsSafeAction['diagnosticBasis'] {
  if (!value || typeof value !== 'object') return false;
  const basis = value as Record<string, unknown>;
  return (
    isNonEmptyString(basis.conclusionKey) &&
    isNonEmptyString(basis.conclusionText) &&
    typeof basis.source === 'string' &&
    VALID_DIAGNOSTIC_SOURCES.has(
      basis.source as PendingAccountsSafeAction['diagnosticBasis']['source'],
    )
  );
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, normalizeValue(nestedValue)]),
    );
  }

  return value;
}

function sameContractShape(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

function buildReplayContract(pending: PendingAccountsSafeAction): Record<string, unknown> {
  return {
    actionType: pending.actionType,
    targetType: pending.targetType,
    targetId: pending.targetId,
    before: pending.before,
    after: pending.after,
  };
}

function hasRequiredConfirmationAuditInputs(
  pending: PendingAccountsSafeAction,
): pending is PendingAccountsSafeAction & {
  confirmationText: string;
  confirmationSource: NonNullable<PendingAccountsSafeAction['confirmationSource']>;
  confirmedAt: string;
} {
  return (
    isNonEmptyString(pending.confirmationText) &&
    isValidConfirmationSource(pending.confirmationSource) &&
    isValidIsoTimestamp(pending.confirmedAt)
  );
}

function validateMandatoryAuditContract(
  pending: PendingAccountsSafeAction,
): { ok: true } | { ok: false; reason: string } {
  if (!isNonEmptyString(pending.confirmationPrompt)) {
    return { ok: false, reason: 'missing_confirmation_prompt' };
  }
  if (!isNonEmptyString(pending.effectSummary)) {
    return { ok: false, reason: 'missing_effect_summary' };
  }
  if (!hasValidDiagnosticBasis(pending.diagnosticBasis)) {
    return { ok: false, reason: 'invalid_diagnostic_basis' };
  }
  if (!isNonEmptyString(pending.idempotencyKey)) {
    return { ok: false, reason: 'missing_idempotency_key' };
  }
  if (!isValidIsoTimestamp(pending.surfacedAt)) {
    return { ok: false, reason: 'invalid_surfaced_at' };
  }
  if (!isValidIsoTimestamp(pending.previewExpiresAt)) {
    return { ok: false, reason: 'invalid_preview_expires_at' };
  }
  if (!hasRequiredConfirmationAuditInputs(pending)) {
    return { ok: false, reason: 'missing_confirmation_audit_inputs' };
  }

  return { ok: true };
}

function isReplayAuditPayloadComplete(details: Record<string, unknown>): boolean {
  const anomalyType = details.anomalyType;
  const effectSummary = details.effectSummary;
  const diagnosticBasis = details.diagnosticBasis;
  const confirmationPrompt = details.confirmationPrompt;
  const confirmationText = details.confirmationText;
  const confirmationSource = details.confirmationSource;
  const surfacedAt = details.surfacedAt;
  const previewExpiresAt = details.previewExpiresAt;
  const confirmedAt = details.confirmedAt;
  const executedAt = details.executedAt;
  const verifiedAt = details.verifiedAt;
  const executionResult = details.executionResult;
  const postWriteVerification = details.postWriteVerification;

  return (
    isNonEmptyString(anomalyType) &&
    isNonEmptyString(effectSummary) &&
    hasValidDiagnosticBasis(diagnosticBasis) &&
    isNonEmptyString(confirmationPrompt) &&
    isNonEmptyString(confirmationText) &&
    isValidConfirmationSource(confirmationSource) &&
    isValidIsoTimestamp(surfacedAt) &&
    isValidIsoTimestamp(previewExpiresAt) &&
    isValidIsoTimestamp(confirmedAt) &&
    isValidIsoTimestamp(executedAt) &&
    isValidIsoTimestamp(verifiedAt) &&
    !!executionResult &&
    typeof executionResult === 'object' &&
    !!postWriteVerification &&
    typeof postWriteVerification === 'object'
  );
}

async function findExistingActionByIdempotencyKey(
  supabase: SupabaseClient,
  pending: PendingAccountsSafeAction,
  userId: string,
): Promise<ReplayLookupResult> {
  const { data, error } = await supabase
    .from('agent_action_log')
    .select('details')
    .eq('action_type', 'accounts_safe_action')
    .eq('user_id', userId);

  if (error || !Array.isArray(data)) {
    return {
      kind: 'read_error',
      error: error?.message ?? 'Failed to read idempotency audit rows safely.',
    };
  }

  const pendingContract = buildReplayContract(pending);
  let conflict: ReplayLookupResult | null = null;

  for (const row of data) {
    const details = row?.details;
    if (
      details &&
      typeof details === 'object' &&
      (details as Record<string, unknown>).idempotencyKey === pending.idempotencyKey
    ) {
      const typedDetails = details as Record<string, unknown>;
      const existingContract = {
        actionType: typedDetails.actionType,
        targetType: typedDetails.targetType,
        targetId: typedDetails.targetId,
        before: typedDetails.before,
        after: typedDetails.after,
      };

      if (!sameContractShape(existingContract, pendingContract)) {
        conflict = { kind: 'contract_conflict', details: typedDetails };
        continue;
      }

      if (
        typedDetails.finalState === 'SAFE_ACTION_SUCCEEDED' &&
        isReplayAuditPayloadComplete(typedDetails)
      ) {
        return { kind: 'matching_success', details: typedDetails };
      }
    }
  }

  if (conflict) {
    return conflict;
  }

  return { kind: 'none' };
}

async function loadCurrentTargetRecord(
  supabase: SupabaseClient,
  userId: string,
  pending: PendingAccountsSafeAction,
): Promise<TargetRecord | null> {
  if (pending.targetType === 'payable_bill') {
    return await carregarContaPagarSegura(userId, pending.targetId, supabase);
  }

  return await carregarContaBancariaSegura(userId, pending.targetId, supabase);
}

function isExpiredPreview(pending: PendingAccountsSafeAction, now: string): boolean {
  return new Date(now).getTime() >= new Date(pending.previewExpiresAt).getTime();
}

function validateCurrentEligibility(
  pending: PendingAccountsSafeAction,
  current: TargetRecord | null,
): { ok: boolean; reason: string } {
  if (!current) {
    return { ok: false, reason: 'target_not_found' };
  }

  switch (pending.actionType) {
    case 'mark_as_paid': {
      const status = getString(current, 'status');
      if (status !== 'pending' && status !== 'overdue') {
        return { ok: false, reason: 'bill_not_open_for_payment' };
      }
      return { ok: true, reason: 'eligible' };
    }

    case 'reschedule_due_date':
    case 'update_amount': {
      const status = getString(current, 'status');
      if (status !== 'pending' && status !== 'overdue') {
        return { ok: false, reason: 'bill_not_open_for_update' };
      }
      return { ok: true, reason: 'eligible' };
    }

    case 'cancel_one_off_bill': {
      const status = getString(current, 'status');
      const isRecurring = getBoolean(current, 'is_recurring');
      if ((status !== 'pending' && status !== 'overdue') || isRecurring !== false) {
        return { ok: false, reason: 'bill_no_longer_one_off_cancellable' };
      }
      return { ok: true, reason: 'eligible' };
    }

    case 'disable_recurrence': {
      const isRecurring = getBoolean(current, 'is_recurring');
      if (isRecurring !== true) {
        return { ok: false, reason: 'bill_no_longer_recurring' };
      }
      return { ok: true, reason: 'eligible' };
    }

    case 'cancel_current_occurrence': {
      const status = getString(current, 'status');
      const isRecurring = getBoolean(current, 'is_recurring');
      if ((status !== 'pending' && status !== 'overdue') || isRecurring !== true) {
        return { ok: false, reason: 'current_occurrence_no_longer_cancellable' };
      }
      return { ok: true, reason: 'eligible' };
    }

    case 'update_paid_amount':
    case 'update_paid_at':
    case 'update_paid_record': {
      const status = getString(current, 'status');
      if (status !== 'paid') {
        return { ok: false, reason: 'bill_not_paid_for_paid_record_fix' };
      }
      return { ok: true, reason: 'eligible' };
    }

    case 'adjust_account_balance':
    case 'deactivate_account': {
      const isActive = getBoolean(current, 'is_active');
      if (isActive !== true) {
        return { ok: false, reason: 'account_no_longer_active' };
      }
      return { ok: true, reason: 'eligible' };
    }
  }
}

function buildLockedFieldsForVerification(
  pending: PendingAccountsSafeAction,
  current: TargetRecord,
): Record<string, unknown> {
  const locked: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(pending.before)) {
    if (!(field in pending.after)) {
      locked[field] = value;
    }
  }

  switch (pending.actionType) {
    case 'mark_as_paid':
      locked.amount = current.amount ?? null;
      locked.payment_method = current.payment_method ?? null;
      break;

    case 'cancel_one_off_bill':
    case 'cancel_current_occurrence':
      if (getBoolean(current, 'is_recurring') != null) {
        locked.is_recurring = current.is_recurring;
      }
      break;

    case 'reschedule_due_date':
    case 'update_amount':
    case 'disable_recurrence':
    case 'update_paid_amount':
    case 'update_paid_at':
    case 'update_paid_record':
      if (getString(current, 'status')) {
        locked.status = current.status;
      }
      break;

    case 'adjust_account_balance':
      if (getBoolean(current, 'is_active') != null) {
        locked.is_active = current.is_active;
      }
      break;
  }

  return locked;
}

function verifyPostWriteState(
  pending: PendingAccountsSafeAction,
  verifiedRecord: TargetRecord | null,
  lockedFields: Record<string, unknown>,
): {
  ok: boolean;
  expectedAfter: Record<string, unknown>;
  actualAfter: Record<string, unknown>;
  lockedFields: Record<string, unknown>;
  actualLockedFields: Record<string, unknown>;
} {
  const actualAfter = pickFields(verifiedRecord, pending.after);
  const actualLockedFields = pickFields(verifiedRecord, lockedFields);
  const afterMatches = matchesFields(verifiedRecord, pending.after);
  const lockedFieldsMatch = matchesFields(verifiedRecord, lockedFields);

  return {
    ok: afterMatches && lockedFieldsMatch,
    expectedAfter: pending.after,
    actualAfter,
    lockedFields,
    actualLockedFields,
  };
}

async function runBillMutation(
  supabase: SupabaseClient,
  pending: PendingAccountsSafeAction,
  userId: string,
): Promise<{ ok: boolean; message?: string }> {
  switch (pending.actionType) {
    case 'mark_as_paid': {
      const paidAmount = getNumber(pending.after, 'paid_amount');
      const paidAt = getNullableString(pending.after, 'paid_at');
      const status = getString(pending.after, 'status');
      if (status !== 'paid' || paidAmount == null || paidAt == null) {
        return { ok: false, message: 'Pending payload for mark_as_paid is incomplete.' };
      }
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        {
          status: 'paid',
          paid_amount: paidAmount,
          paid_at: paidAt,
        },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'reschedule_due_date': {
      const dueDate = getString(pending.after, 'due_date');
      if (!dueDate) {
        return { ok: false, message: 'Pending payload for reschedule_due_date is incomplete.' };
      }
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        { due_date: dueDate },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'update_amount': {
      const amount = getNumber(pending.after, 'amount');
      if (amount == null) {
        return { ok: false, message: 'Pending payload for update_amount is incomplete.' };
      }
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        { amount },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'cancel_one_off_bill': {
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        { status: 'cancelled' },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'disable_recurrence': {
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        {
          is_recurring: false,
          next_occurrence_date: null,
        },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'cancel_current_occurrence': {
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        { status: 'cancelled' },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'update_paid_amount': {
      const paidAmount = getNumber(pending.after, 'paid_amount');
      if (paidAmount == null) {
        return { ok: false, message: 'Pending payload for update_paid_amount is incomplete.' };
      }
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        { paid_amount: paidAmount },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'update_paid_at': {
      const paidAt = getNullableString(pending.after, 'paid_at');
      if (paidAt == null) {
        return { ok: false, message: 'Pending payload for update_paid_at is incomplete.' };
      }
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        { paid_at: paidAt },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'update_paid_record': {
      const paidAmount = getNumber(pending.after, 'paid_amount');
      const paidAt = getNullableString(pending.after, 'paid_at');
      if (paidAmount == null || paidAt == null) {
        return { ok: false, message: 'Pending payload for update_paid_record is incomplete.' };
      }
      const result = await atualizarContaPagarSegura(
        userId,
        pending.targetId,
        {
          paid_amount: paidAmount,
          paid_at: paidAt,
        },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    default:
      return {
        ok: false,
        message: `Unsupported bill action: ${pending.actionType satisfies AccountsSafeActionType}`,
      };
  }
}

async function runAccountMutation(
  supabase: SupabaseClient,
  pending: PendingAccountsSafeAction,
  userId: string,
): Promise<{ ok: boolean; message?: string }> {
  switch (pending.actionType) {
    case 'adjust_account_balance': {
      const currentBalance = getNumber(pending.after, 'current_balance');
      if (currentBalance == null) {
        return { ok: false, message: 'Pending payload for adjust_account_balance is incomplete.' };
      }
      const result = await atualizarContaBancariaSegura(
        userId,
        pending.targetId,
        { current_balance: currentBalance },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    case 'deactivate_account': {
      const result = await atualizarContaBancariaSegura(
        userId,
        pending.targetId,
        { is_active: false },
        supabase,
      );
      return { ok: result.sucesso, message: result.mensagem };
    }

    default:
      return {
        ok: false,
        message: `Unsupported account action: ${pending.actionType satisfies AccountsSafeActionType}`,
      };
  }
}

async function runMutation(
  supabase: SupabaseClient,
  pending: PendingAccountsSafeAction,
  userId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (pending.targetType === 'payable_bill') {
    return await runBillMutation(supabase, pending, userId);
  }

  return await runAccountMutation(supabase, pending, userId);
}

async function persistSafeActionAudit(
  supabase: SupabaseClient,
  userId: string,
  pending: PendingAccountsSafeAction,
  finalState: AccountsSafeActionFinalState,
  executionResult: Record<string, unknown>,
  postWriteVerification: Record<string, unknown>,
  lifecycle: {
    executedAt: string | null;
    verifiedAt: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const details = {
    anomalyType: pending.anomalyType,
    actionType: pending.actionType,
    targetType: pending.targetType,
    targetId: pending.targetId,
    before: pending.before,
    after: pending.after,
    effectSummary: pending.effectSummary,
    diagnosticBasis: pending.diagnosticBasis,
    confirmationPrompt: pending.confirmationPrompt,
    confirmationSource: pending.confirmationSource ?? null,
    confirmationText: pending.confirmationText ?? null,
    idempotencyKey: pending.idempotencyKey,
    surfacedAt: pending.surfacedAt,
    previewExpiresAt: pending.previewExpiresAt,
    confirmedAt: pending.confirmedAt ?? null,
    executedAt: lifecycle.executedAt,
    verifiedAt: lifecycle.verifiedAt,
    executionResult,
    postWriteVerification,
    finalState,
  };

  const { error } = await supabase.from('agent_action_log').insert({
    user_id: userId,
    action_type: 'accounts_safe_action',
    details,
  });

  if (error) {
    return { ok: false, error: error.message ?? 'Failed to persist safe action audit row.' };
  }

  return { ok: true };
}

async function finalizeWithAudit(
  supabase: SupabaseClient,
  context: ExecutionContext,
  pending: PendingAccountsSafeAction,
  intendedFinalState: AccountsSafeActionFinalState,
  intendedMessage: string,
  executionResult: Record<string, unknown>,
  postWriteVerification: Record<string, unknown>,
  lifecycle: {
    executedAt: string | null;
    verifiedAt: string | null;
  },
  extra: { idempotentReplay?: boolean } = {},
): Promise<{ finalState: AccountsSafeActionFinalState; message: string; idempotentReplay?: boolean }> {
  const audit = await persistSafeActionAudit(
    supabase,
    context.userId,
    pending,
    intendedFinalState,
    executionResult,
    postWriteVerification,
    lifecycle,
  );

  if (!audit.ok) {
    return {
      finalState: 'SAFE_ACTION_INFRASTRUCTURE_ERROR',
      message: 'Nao consegui finalizar essa alteracao com seguranca porque nao consegui registrar a auditoria obrigatoria.',
    };
  }

  return {
    finalState: intendedFinalState,
    message: intendedMessage,
    ...extra,
  };
}

export async function executePendingAccountsSafeAction(
  supabase: SupabaseClient,
  pending: PendingAccountsSafeAction,
  context: ExecutionContext,
): Promise<{ finalState: AccountsSafeActionFinalState; message: string; idempotentReplay?: boolean }> {
  const replay = await findExistingActionByIdempotencyKey(supabase, pending, context.userId);
  if (replay.kind === 'matching_success') {
    return {
      finalState: 'SAFE_ACTION_SUCCEEDED',
      message: 'Pronto.',
      idempotentReplay: true,
    };
  }

  const auditContract = validateMandatoryAuditContract(pending);
  if (!auditContract.ok) {
    return {
      finalState: 'SAFE_ACTION_INFRASTRUCTURE_ERROR',
      message:
        'Nao consegui iniciar essa alteracao com seguranca porque o contrato obrigatorio de auditoria esta incompleto ou invalido.',
    };
  }

  if (replay.kind === 'read_error') {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_ABORTED',
      'Parei essa acao antes de alterar o sistema porque nao consegui validar a idempotencia com seguranca.',
      {
        ok: false,
        reason: 'idempotency_lookup_read_error',
        error: replay.error,
      },
      { ok: false, expectedAfter: pending.after, actualAfter: {} },
      {
        executedAt: null,
        verifiedAt: null,
      },
    );
  }

  if (replay.kind === 'contract_conflict') {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_ABORTED',
      'Parei essa acao porque essa idempotency key ja foi usada para outro contrato de alteracao segura.',
      {
        ok: false,
        reason: 'idempotency_key_contract_conflict',
        existingContract: replay.details,
      },
      { ok: false, expectedAfter: pending.after, actualAfter: {} },
      {
        executedAt: null,
        verifiedAt: null,
      },
      {},
    );
  }

  const now = getNowIso(context);
  if (isExpiredPreview(pending, now)) {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_ABORTED',
      'Parei essa acao antes de alterar o sistema porque o preview expirou.',
      { ok: false, reason: 'preview_expired', evaluatedAt: now },
      { ok: false, expectedAfter: pending.after, actualAfter: {} },
      {
        executedAt: null,
        verifiedAt: null,
      },
    );
  }

  const current = await loadCurrentTargetRecord(supabase, context.userId, pending);
  if (!matchesFields(current, pending.before)) {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_ABORTED',
      'Parei essa acao antes de alterar o sistema porque os dados mudaram desde o preview.',
      { ok: false, reason: 'before_snapshot_mismatch' },
      {
        ok: false,
        expectedBefore: pending.before,
        actualBefore: pickFields(current, pending.before),
      },
      {
        executedAt: null,
        verifiedAt: null,
      },
    );
  }

  const eligibility = validateCurrentEligibility(pending, current);
  if (!eligibility.ok) {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_ABORTED',
      'Parei essa acao antes de alterar o sistema porque ela nao esta mais elegivel.',
      { ok: false, reason: eligibility.reason },
      { ok: false, expectedAfter: pending.after, actualAfter: {} },
      {
        executedAt: null,
        verifiedAt: null,
      },
    );
  }

  const lockedFields = buildLockedFieldsForVerification(pending, current as TargetRecord);
  const executedAt = getNowIso(context);
  const writeResult = await runMutation(supabase, pending, context.userId);
  if (!writeResult.ok) {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_FAILED',
      'Nao consegui concluir essa alteracao com seguranca.',
      {
        ok: false,
        reason: 'write_failed',
        message: writeResult.message ?? null,
      },
      { ok: false, expectedAfter: pending.after, actualAfter: {} },
      {
        executedAt,
        verifiedAt: null,
      },
    );
  }

  const verifiedRecord = await loadCurrentTargetRecord(supabase, context.userId, pending);
  const verifiedAt = getNowIso(context);
  const verification = verifyPostWriteState(pending, verifiedRecord, lockedFields);
  if (!verification.ok) {
    return await finalizeWithAudit(
      supabase,
      context,
      pending,
      'SAFE_ACTION_FAILED',
      'Nao consegui concluir essa alteracao com seguranca.',
      { ok: true, reason: 'write_completed' },
      { ok: false, ...verification },
      {
        executedAt,
        verifiedAt,
      },
    );
  }

  return await finalizeWithAudit(
    supabase,
    context,
    pending,
    'SAFE_ACTION_SUCCEEDED',
    'Pronto.',
    { ok: true },
    { ok: true, ...verification },
    {
      executedAt,
      verifiedAt,
    },
  );
}
