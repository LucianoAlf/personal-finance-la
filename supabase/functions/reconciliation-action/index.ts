import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type ReconciliationAction =
  | 'confirm'
  | 'reject'
  | 'defer'
  | 'classify'
  | 'auto_close'
  | 'mark_transfer'
  | 'ignore'
  | 'link_payable'
  | 'register_expense';

export interface RegisterExpenseInput {
  /**
   * Internal account.id where the expense should land. Falls back to
   * `bank_transactions.internal_account_id` when omitted; the action rejects
   * if neither is present.
   */
  accountId?: string;
  /** Optional category.id. When absent the row is inserted uncategorized. */
  categoryId?: string;
  /** Optional pretty description overriding `bank_transactions.description`. */
  description?: string;
  /**
   * Optional payment_method matching the `transactions_payment_method_check`
   * values (pix, debit_card, etc.). When omitted the row stores NULL.
   */
  paymentMethod?: string;
}

export interface ApplyReconciliationInput {
  userId: string;
  caseId: string;
  action: ReconciliationAction;
  confirmationSource?: 'workspace' | 'whatsapp';
  reason?: string;
  /**
   * For action='mark_transfer': the other bank_transaction id that pairs with
   * this one as the opposite leg of the same internal transfer. Optional;
   * when omitted the current row is flagged as "awaiting counterpart" so the
   * operator can finish the pairing later.
   */
  counterpartBankTransactionId?: string;
  /**
   * For action='link_payable': the payable_bills.id the operator (or Ana Clara)
   * confirmed is the real bill behind this bank movement. Required for the
   * action; the payable is flipped to 'paid' and linked to the bank row.
   */
  payableBillId?: string;
  /** For action='register_expense': override/augment the new transactions row. */
  registerExpense?: RegisterExpenseInput;
}

export interface ApplyReconciliationResult {
  outcome: string;
  financialMutationPerformed: false;
  auditEntry: {
    user_id: string;
    case_id: string;
    action: string;
    confidence_at_decision: number;
    bank_transaction_snapshot: Record<string, unknown>;
    system_record_snapshot: Record<string, unknown> | null;
    actor: string;
    notes: string | null;
  };
  /**
   * Populated on mark_transfer so the client can invalidate both legs in one
   * round-trip instead of polling for the second one to flip.
   */
  transferPair?: {
    pairId: string;
    primaryBankTransactionId: string;
    counterpartBankTransactionId: string | null;
    counterpartCaseId: string | null;
  };
  /**
   * Populated on link_payable so the client can refresh the payable_bills
   * screen in one round-trip and surface "Conta X marcada como paga" to the
   * user without a second fetch.
   */
  linkedPayable?: {
    payableBillId: string;
    previousStatus: string;
    paidAmount: number;
  };
  /**
   * Populated on register_expense so the client can link the new transaction
   * in the UI (e.g. jump-to-transaction after action).
   */
  registeredExpense?: {
    transactionId: string;
    accountId: string;
    categoryId: string | null;
    amount: number;
  };
}

function mapAuditAction(action: ReconciliationAction): string {
  if (action === 'confirm') return 'linked';
  if (action === 'auto_close') return 'auto_closed';
  if (action === 'reject') return 'rejected';
  if (action === 'defer') return 'deferred';
  if (action === 'classify') return 'classified';
  if (action === 'mark_transfer') return 'marked_transfer';
  if (action === 'ignore') return 'ignored';
  if (action === 'link_payable') return 'linked_payable';
  if (action === 'register_expense') return 'registered_expense';
  return action;
}

function nextCaseStatus(action: ReconciliationAction): string {
  switch (action) {
    case 'confirm':
    case 'link_payable':
    case 'register_expense':
      return 'confirmed';
    case 'reject':
      return 'rejected';
    case 'defer':
      return 'deferred';
    case 'classify':
      return 'awaiting_user';
    case 'auto_close':
    case 'mark_transfer':
    case 'ignore':
      return 'auto_closed';
    default:
      return 'open';
  }
}

function bankStatusForAction(action: ReconciliationAction): string | null {
  if (action === 'mark_transfer') return 'transfer_matched';
  if (action === 'ignore') return 'ignored';
  if (action === 'confirm') return 'reconciled';
  if (action === 'reject') return 'rejected';
  if (action === 'defer') return 'deferred';
  if (action === 'link_payable') return 'reconciled';
  if (action === 'register_expense') return 'reconciled';
  return null;
}

function generatePairId(): string {
  // Prefer the runtime crypto primitive; fall back to a pseudo-random only for
  // test harnesses that stub the SupabaseClient without exposing crypto.
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `pair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function loadBankRow(supabase: SupabaseClient, userId: string, bankTransactionId: string) {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', bankTransactionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load bank_transaction ${bankTransactionId}: ${error.message ?? 'unknown'}`);
  }
  return data as Record<string, unknown> | null;
}

async function loadCaseForBankTransaction(
  supabase: SupabaseClient,
  userId: string,
  bankTransactionId: string,
) {
  const { data, error } = await supabase
    .from('reconciliation_cases')
    .select('*')
    .eq('user_id', userId)
    .eq('bank_transaction_id', bankTransactionId)
    .in('status', ['open', 'awaiting_user'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load counterpart case: ${error.message ?? 'unknown'}`);
  }
  return data as Record<string, unknown> | null;
}

async function loadPayableBill(
  supabase: SupabaseClient,
  userId: string,
  billId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load payable_bill ${billId}: ${error.message ?? 'unknown'}`);
  }
  return data as Record<string, unknown> | null;
}

/**
 * Link a pending/scheduled payable_bill to the bank_transaction and mark it
 * paid. Tolerance is intentionally permissive (5 percent) because provider
 * fees, rounding and late interest mean the exact posted amount rarely matches
 * the expected amount to the cent.
 */
function assertPayableLinkable(
  payable: Record<string, unknown>,
  bank: Record<string, unknown>,
) {
  const payableStatus = payable.status as string;
  if (payableStatus === 'paid') {
    throw new Error('Payable is already marked as paid');
  }
  if (payableStatus === 'cancelled') {
    throw new Error('Payable is cancelled and cannot be linked');
  }
  const expected = Number(payable.amount ?? 0);
  const posted = Math.abs(Number(bank.amount ?? 0));
  if (!Number.isFinite(expected) || expected <= 0) {
    throw new Error('Payable amount is invalid');
  }
  if (!Number.isFinite(posted) || posted <= 0) {
    throw new Error('Bank transaction amount is invalid for linking');
  }
  const tolerance = expected * 0.05;
  if (Math.abs(expected - posted) > tolerance && Math.abs(expected - posted) > 0.5) {
    throw new Error(
      `Bank amount ${posted.toFixed(2)} diverges from payable amount ${expected.toFixed(2)} beyond 5% tolerance`,
    );
  }
}

/**
 * Validates the counterpart: it MUST belong to the same user, be different from
 * the primary leg, and have the opposite sign of amount (a transfer has a
 * credit on one side and a debit on the other). Value must match within 1 cent.
 */
function assertTransferCounterpartShape(
  primary: Record<string, unknown>,
  counterpart: Record<string, unknown>,
) {
  if (primary.id === counterpart.id) {
    throw new Error('Transfer counterpart cannot be the same bank_transaction');
  }
  if (primary.user_id !== counterpart.user_id) {
    throw new Error('Transfer counterpart must belong to the same user');
  }
  const primaryAmount = Number(primary.amount ?? 0);
  const counterpartAmount = Number(counterpart.amount ?? 0);
  if (Number.isNaN(primaryAmount) || Number.isNaN(counterpartAmount)) {
    throw new Error('Transfer counterpart amounts must be numeric');
  }
  if (primaryAmount === 0 || counterpartAmount === 0) {
    throw new Error('Transfer legs cannot be zero');
  }
  if (Math.sign(primaryAmount) === Math.sign(counterpartAmount)) {
    throw new Error('Transfer counterpart must have opposite sign (one debit, one credit)');
  }
  if (Math.abs(Math.abs(primaryAmount) - Math.abs(counterpartAmount)) > 0.01) {
    throw new Error('Transfer counterpart amount must match the primary leg within 1 cent');
  }
}

export async function applyReconciliationDecision(
  supabase: SupabaseClient,
  input: ApplyReconciliationInput,
): Promise<ApplyReconciliationResult> {
  const { data: currentCase, error: caseError } = await supabase
    .from('reconciliation_cases')
    .select('*')
    .eq('id', input.caseId)
    .eq('user_id', input.userId)
    .single();

  if (caseError || !currentCase) {
    throw new Error('Reconciliation case not found');
  }

  if (input.action === 'confirm' && !input.confirmationSource) {
    throw new Error('confirmationSource is required for confirm');
  }

  const primaryBankId = currentCase.bank_transaction_id as string;
  const primaryBankRow = await loadBankRow(supabase, input.userId, primaryBankId);
  const bankSnapshot = (primaryBankRow ?? {}) as Record<string, unknown>;

  const previous = {
    status: currentCase.status as string,
    resolved_at: currentCase.resolved_at as string | null,
    resolved_by: currentCase.resolved_by as string | null,
    auto_close_reason: currentCase.auto_close_reason as string | null,
  };

  const nextStatus = nextCaseStatus(input.action);
  const resolvedBy = input.action === 'auto_close' ? 'system' : 'ana_clara';
  const auditAction = mapAuditAction(input.action);
  const now = new Date().toISOString();

  let transferPairPayload: ApplyReconciliationResult['transferPair'] | undefined;
  let counterpartCaseId: string | null = null;
  let counterpartBankId: string | null = null;
  let pairId: string | null = null;

  let linkedPayablePayload: ApplyReconciliationResult['linkedPayable'] | undefined;
  let registeredExpensePayload: ApplyReconciliationResult['registeredExpense'] | undefined;

  // Compensating actions to run if audit log insert fails. We fill these as we
  // mutate sibling tables, then replay them in reverse order on rollback.
  const compensations: Array<() => Promise<void>> = [];

  if (input.action === 'mark_transfer') {
    if (!primaryBankRow) {
      throw new Error('Primary bank_transaction missing for mark_transfer');
    }
    pairId = generatePairId();
    counterpartBankId = input.counterpartBankTransactionId ?? null;

    if (counterpartBankId) {
      const counterpartBankRow = await loadBankRow(supabase, input.userId, counterpartBankId);
      if (!counterpartBankRow) {
        throw new Error('Counterpart bank_transaction not found');
      }
      assertTransferCounterpartShape(primaryBankRow, counterpartBankRow);

      const { error: counterpartBtError } = await supabase
        .from('bank_transactions')
        .update({
          transfer_pair_id: pairId,
          reconciliation_status: 'transfer_matched',
          updated_at: now,
        })
        .eq('id', counterpartBankId)
        .eq('user_id', input.userId);

      if (counterpartBtError) {
        throw new Error(
          `Failed to mark counterpart bank_transaction: ${counterpartBtError.message ?? 'unknown'}`,
        );
      }

      const counterpartCase = await loadCaseForBankTransaction(supabase, input.userId, counterpartBankId);
      if (counterpartCase) {
        counterpartCaseId = counterpartCase.id as string;
        const { error: counterpartCaseError } = await supabase
          .from('reconciliation_cases')
          .update({
            status: 'auto_closed',
            resolved_at: now,
            resolved_by: resolvedBy,
            auto_close_reason: `internal_transfer_pair:${pairId}`,
            updated_at: now,
          })
          .eq('id', counterpartCase.id as string)
          .eq('user_id', input.userId);

        if (counterpartCaseError) {
          throw new Error(
            `Failed to auto-close counterpart case: ${counterpartCaseError.message ?? 'unknown'}`,
          );
        }
      }
    }

    const { error: primaryBtError } = await supabase
      .from('bank_transactions')
      .update({
        transfer_pair_id: pairId,
        reconciliation_status: 'transfer_matched',
        updated_at: now,
      })
      .eq('id', primaryBankId)
      .eq('user_id', input.userId);

    if (primaryBtError) {
      throw new Error(
        `Failed to mark primary bank_transaction as transfer: ${primaryBtError.message ?? 'unknown'}`,
      );
    }

    transferPairPayload = {
      pairId,
      primaryBankTransactionId: primaryBankId,
      counterpartBankTransactionId: counterpartBankId,
      counterpartCaseId,
    };
  }

  if (input.action === 'ignore') {
    const { error: ignoreBtError } = await supabase
      .from('bank_transactions')
      .update({
        reconciliation_status: 'ignored',
        updated_at: now,
      })
      .eq('id', primaryBankId)
      .eq('user_id', input.userId);

    if (ignoreBtError) {
      throw new Error(
        `Failed to mark bank_transaction as ignored: ${ignoreBtError.message ?? 'unknown'}`,
      );
    }
  }

  if (input.action === 'link_payable') {
    if (!input.payableBillId) {
      throw new Error('payableBillId is required for link_payable');
    }
    if (!primaryBankRow) {
      throw new Error('Primary bank_transaction missing for link_payable');
    }

    const payable = await loadPayableBill(supabase, input.userId, input.payableBillId);
    if (!payable) {
      throw new Error('Payable bill not found');
    }
    assertPayableLinkable(payable, primaryBankRow);

    const previousPayableStatus = payable.status as string;
    const paidAmount = Math.abs(Number(primaryBankRow.amount ?? 0));
    const paymentAccountId =
      (payable.payment_account_id as string | null) ??
      (primaryBankRow.internal_account_id as string | null) ??
      null;

    const payablePatch: Record<string, unknown> = {
      status: 'paid',
      paid_at: now,
      paid_amount: paidAmount,
      updated_at: now,
    };
    if (paymentAccountId && !payable.payment_account_id) {
      payablePatch.payment_account_id = paymentAccountId;
    }

    const { error: payableError } = await supabase
      .from('payable_bills')
      .update(payablePatch)
      .eq('id', input.payableBillId)
      .eq('user_id', input.userId);

    if (payableError) {
      throw new Error(
        `Failed to mark payable bill as paid: ${payableError.message ?? 'unknown'}`,
      );
    }

    compensations.push(async () => {
      await supabase
        .from('payable_bills')
        .update({
          status: previousPayableStatus,
          paid_at: payable.paid_at ?? null,
          paid_amount: payable.paid_amount ?? null,
          payment_account_id: payable.payment_account_id ?? null,
          updated_at: payable.updated_at ?? now,
        })
        .eq('id', input.payableBillId as string)
        .eq('user_id', input.userId);
    });

    const { error: bankError } = await supabase
      .from('bank_transactions')
      .update({
        reconciliation_status: 'reconciled',
        updated_at: now,
      })
      .eq('id', primaryBankId)
      .eq('user_id', input.userId);

    if (bankError) {
      // Run the compensation so the payable flip does not leak through.
      for (const undo of compensations.reverse()) {
        try {
          await undo();
        } catch {
          /* best effort */
        }
      }
      throw new Error(
        `Failed to mark bank_transaction as reconciled: ${bankError.message ?? 'unknown'}`,
      );
    }

    const previousBankStatus = (primaryBankRow.reconciliation_status as string) ?? 'pending';
    compensations.push(async () => {
      await supabase
        .from('bank_transactions')
        .update({
          reconciliation_status: previousBankStatus,
          updated_at: primaryBankRow.updated_at ?? now,
        })
        .eq('id', primaryBankId)
        .eq('user_id', input.userId);
    });

    linkedPayablePayload = {
      payableBillId: input.payableBillId,
      previousStatus: previousPayableStatus,
      paidAmount,
    };
  }

  if (input.action === 'register_expense') {
    if (!primaryBankRow) {
      throw new Error('Primary bank_transaction missing for register_expense');
    }

    const accountId =
      input.registerExpense?.accountId ??
      (primaryBankRow.internal_account_id as string | null) ??
      null;
    if (!accountId) {
      throw new Error(
        'register_expense requires an accountId (neither override nor bank_transaction.internal_account_id is set)',
      );
    }

    const rawAmount = Number(primaryBankRow.amount ?? 0);
    if (!Number.isFinite(rawAmount) || rawAmount === 0) {
      throw new Error('Bank transaction amount is invalid for register_expense');
    }
    const absAmount = Math.abs(rawAmount);
    const description =
      input.registerExpense?.description ??
      (primaryBankRow.description as string | null) ??
      'Lancamento conciliado via extrato bancario';
    const transactionDate = (primaryBankRow.date as string | null) ?? now.slice(0, 10);
    const categoryId = input.registerExpense?.categoryId ?? null;
    const paymentMethod = input.registerExpense?.paymentMethod ?? null;

    const newTransactionPayload: Record<string, unknown> = {
      user_id: input.userId,
      account_id: accountId,
      category_id: categoryId,
      type: 'expense',
      amount: absAmount,
      description,
      transaction_date: transactionDate,
      is_paid: true,
      source: 'bank_reconciliation',
      status: 'completed',
      payment_method: paymentMethod,
      notes: `Registrado via conciliacao bancaria (case ${input.caseId})`,
    };

    const { data: insertedTransaction, error: insertTxError } = await supabase
      .from('transactions')
      .insert(newTransactionPayload)
      .select('id, account_id, category_id, amount')
      .single();

    if (insertTxError || !insertedTransaction) {
      throw new Error(
        `Failed to insert reconciled transaction: ${insertTxError?.message ?? 'unknown'}`,
      );
    }
    const newTransactionId = insertedTransaction.id as string;

    compensations.push(async () => {
      await supabase
        .from('transactions')
        .delete()
        .eq('id', newTransactionId)
        .eq('user_id', input.userId);
    });

    const { error: bankError } = await supabase
      .from('bank_transactions')
      .update({
        reconciliation_status: 'reconciled',
        updated_at: now,
      })
      .eq('id', primaryBankId)
      .eq('user_id', input.userId);

    if (bankError) {
      for (const undo of compensations.reverse()) {
        try {
          await undo();
        } catch {
          /* best effort */
        }
      }
      throw new Error(
        `Failed to mark bank_transaction as reconciled: ${bankError.message ?? 'unknown'}`,
      );
    }

    const previousBankStatus = (primaryBankRow.reconciliation_status as string) ?? 'pending';
    compensations.push(async () => {
      await supabase
        .from('bank_transactions')
        .update({
          reconciliation_status: previousBankStatus,
          updated_at: primaryBankRow.updated_at ?? now,
        })
        .eq('id', primaryBankId)
        .eq('user_id', input.userId);
    });

    registeredExpensePayload = {
      transactionId: newTransactionId,
      accountId,
      categoryId,
      amount: absAmount,
    };
  }

  const reasonForPatch = (() => {
    if (input.action === 'mark_transfer') {
      return counterpartBankId
        ? `internal_transfer_pair:${pairId}`
        : `internal_transfer_single_leg:${pairId}`;
    }
    if (input.action === 'ignore') {
      return input.reason ?? 'unrecognized_by_operator';
    }
    if (input.action === 'link_payable' && linkedPayablePayload) {
      return `linked_to_payable:${linkedPayablePayload.payableBillId}`;
    }
    if (input.action === 'register_expense' && registeredExpensePayload) {
      return `registered_as_expense:${registeredExpensePayload.transactionId}`;
    }
    return input.reason ?? null;
  })();

  const patch: Record<string, unknown> = {
    status: nextStatus,
    resolved_at: now,
    resolved_by: resolvedBy,
    auto_close_reason: reasonForPatch,
    updated_at: now,
  };

  if (input.action === 'link_payable' && linkedPayablePayload) {
    patch.matched_record_type = 'payable_bill';
    patch.matched_record_id = linkedPayablePayload.payableBillId;
  }
  if (input.action === 'register_expense' && registeredExpensePayload) {
    patch.matched_record_type = 'transaction';
    patch.matched_record_id = registeredExpensePayload.transactionId;
  }

  const { error: updateError } = await supabase
    .from('reconciliation_cases')
    .update(patch)
    .eq('id', input.caseId)
    .eq('user_id', input.userId);

  if (updateError) {
    // Undo sibling mutations so the ledger does not drift.
    for (const undo of compensations.slice().reverse()) {
      try {
        await undo();
      } catch {
        /* best effort */
      }
    }
    throw new Error(updateError.message ?? 'Failed to update reconciliation case');
  }

  const systemRecordSnapshot = (() => {
    if (input.action === 'mark_transfer' && transferPairPayload) {
      return { transfer_pair: transferPairPayload };
    }
    if (input.action === 'link_payable' && linkedPayablePayload) {
      return { linked_payable: linkedPayablePayload };
    }
    if (input.action === 'register_expense' && registeredExpensePayload) {
      return { registered_expense: registeredExpensePayload };
    }
    return null;
  })();

  const auditEntry = {
    user_id: input.userId,
    case_id: input.caseId,
    action: auditAction,
    confidence_at_decision: Number(currentCase.confidence),
    bank_transaction_snapshot: bankSnapshot,
    system_record_snapshot: systemRecordSnapshot,
    actor: resolvedBy,
    notes: reasonForPatch,
  };

  const { error: insertError } = await supabase.from('reconciliation_audit_log').insert(auditEntry);

  if (insertError) {
    await supabase
      .from('reconciliation_cases')
      .update({
        status: previous.status,
        resolved_at: previous.resolved_at,
        resolved_by: previous.resolved_by,
        auto_close_reason: previous.auto_close_reason,
      })
      .eq('id', input.caseId)
      .eq('user_id', input.userId);

    // Undo sibling mutations so the ledger does not end up with a paid
    // payable / a phantom transaction when the audit row refuses to persist.
    for (const undo of compensations.slice().reverse()) {
      try {
        await undo();
      } catch {
        /* best effort */
      }
    }

    throw new Error(
      `Audit persistence failed; case not finalized: ${insertError.message ?? 'unknown'}`,
    );
  }

  return {
    outcome: nextStatus,
    financialMutationPerformed: false,
    auditEntry,
    transferPair: transferPairPayload,
    linkedPayable: linkedPayablePayload,
    registeredExpense: registeredExpensePayload,
  };
}

if (import.meta.main) {
  serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase environment');
      }

      const supabase = createClient(supabaseUrl, serviceKey);

      const rawAuth = req.headers.get('x-supabase-authorization') || req.headers.get('authorization');
      if (!rawAuth) {
        return new Response(JSON.stringify({ error: 'Authorization token missing' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userToken = rawAuth.replace(/^Bearer\s+/i, '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = (await req.json()) as Omit<ApplyReconciliationInput, 'userId'>;

      // Full forwarding: every optional field the core function understands has to
      // be plumbed here. Historic gap: counterpartBankTransactionId was being
      // dropped, so mark_transfer always degraded to single-leg pairing.
      const result = await applyReconciliationDecision(supabase, {
        userId: user.id,
        caseId: body.caseId,
        action: body.action,
        confirmationSource: body.confirmationSource,
        reason: body.reason,
        counterpartBankTransactionId: body.counterpartBankTransactionId,
        payableBillId: body.payableBillId,
        registerExpense: body.registerExpense,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unexpected error';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
}
