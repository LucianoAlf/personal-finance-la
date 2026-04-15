import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type ReconciliationAction = 'confirm' | 'reject' | 'defer' | 'classify' | 'auto_close';

export interface ApplyReconciliationInput {
  userId: string;
  caseId: string;
  action: ReconciliationAction;
  confirmationSource?: 'workspace' | 'whatsapp';
  reason?: string;
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
}

function mapAuditAction(action: ReconciliationAction): string {
  if (action === 'confirm') return 'linked';
  if (action === 'auto_close') return 'auto_closed';
  if (action === 'reject') return 'rejected';
  if (action === 'defer') return 'deferred';
  if (action === 'classify') return 'classified';
  return action;
}

function nextCaseStatus(action: ReconciliationAction): string {
  switch (action) {
    case 'confirm':
      return 'confirmed';
    case 'reject':
      return 'rejected';
    case 'defer':
      return 'deferred';
    case 'classify':
      return 'awaiting_user';
    case 'auto_close':
      return 'auto_closed';
    default:
      return 'open';
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

  const { data: bankRow } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', currentCase.bank_transaction_id as string)
    .single();

  const bankSnapshot = (bankRow ?? {}) as Record<string, unknown>;

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

  const patch = {
    status: nextStatus,
    resolved_at: now,
    resolved_by: resolvedBy,
    auto_close_reason: input.reason ?? null,
  };

  const { error: updateError } = await supabase
    .from('reconciliation_cases')
    .update(patch)
    .eq('id', input.caseId)
    .eq('user_id', input.userId);

  if (updateError) {
    throw new Error(updateError.message ?? 'Failed to update reconciliation case');
  }

  const auditEntry = {
    user_id: input.userId,
    case_id: input.caseId,
    action: auditAction,
    confidence_at_decision: Number(currentCase.confidence),
    bank_transaction_snapshot: bankSnapshot,
    system_record_snapshot: {} as Record<string, unknown> | null,
    actor: resolvedBy,
    notes: input.reason ?? null,
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

    throw new Error(
      `Audit persistence failed; case not finalized: ${insertError.message ?? 'unknown'}`,
    );
  }

  return {
    outcome: nextStatus,
    financialMutationPerformed: false,
    auditEntry,
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

      const result = await applyReconciliationDecision(supabase, {
        userId: user.id,
        caseId: body.caseId,
        action: body.action,
        confirmationSource: body.confirmationSource,
        reason: body.reason,
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
