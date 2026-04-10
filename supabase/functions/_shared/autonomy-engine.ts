/**
 * Autonomy Engine — observational only in v1.
 * Runs AFTER handler execution, logs the autonomy decision, does NOT block flow.
 *
 * Purpose: collect data on what the agent would do if given more autonomy,
 * enabling safe graduation from "observe" to "auto" based on real patterns.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logAgentAction } from './agent-memory.ts';
import type { AutonomyRules } from './ana-clara-soul.ts';
import { DEFAULT_AUTONOMY } from './ana-clara-soul.ts';

export type AutonomyLevel =
  | 'auto_execute'
  | 'soft_confirmation'
  | 'require_confirmation'
  | 'unknown';

export interface AutonomyDecision {
  action: string;
  level: AutonomyLevel;
  reason: string;
  would_auto_execute: boolean;
}

const ACTION_MAP: Record<string, string> = {
  REGISTRAR_DESPESA: 'register_transaction_high_confidence',
  REGISTRAR_RECEITA: 'register_transaction_high_confidence',
  CONSULTAR_SALDO: 'read_agenda',
  LISTAR_CONTAS: 'read_agenda',
  LISTAR_CONTAS_PAGAR: 'read_agenda',
  EXTRATO: 'read_agenda',
  CONSULTAR_METAS: 'read_agenda',
  RELATORIO_GASTOS: 'generate_insights',
  MARCAR_CONTA_PAGA: 'mark_bill_as_paid',
  EXCLUIR_TRANSACAO: 'delete_any_data',
  EXCLUIR_CONTA_PAGAR: 'delete_any_data',
  EDITAR_TRANSACAO: 'edit_transaction_amount',
  CADASTRAR_CONTA_PAGAR: 'create_recurring_bill',
  COMPRA_CARTAO: 'register_transaction_high_confidence',
};

function classifyAction(
  intentAction: string,
  rules: AutonomyRules,
): AutonomyLevel {
  const mappedAction = ACTION_MAP[intentAction];
  if (!mappedAction) return 'unknown';

  if (rules.auto_execute.includes(mappedAction)) return 'auto_execute';
  if (rules.soft_confirmation.includes(mappedAction)) return 'soft_confirmation';
  if (rules.require_confirmation.includes(mappedAction))
    return 'require_confirmation';

  return 'unknown';
}

/**
 * Observational autonomy evaluation — runs after handler, logs decision.
 * DOES NOT BLOCK OR ALTER THE HANDLER FLOW.
 */
export async function evaluateAutonomy(
  supabase: SupabaseClient,
  userId: string,
  intent: string,
  confidence: number,
  autonomyRules?: AutonomyRules,
): Promise<AutonomyDecision> {
  const rules = autonomyRules ?? DEFAULT_AUTONOMY;
  const level = classifyAction(intent, rules);

  const wouldAutoExecute =
    level === 'auto_execute' && confidence >= 0.85;

  const decision: AutonomyDecision = {
    action: intent,
    level,
    reason: wouldAutoExecute
      ? `High confidence (${confidence}) + auto_execute rule`
      : level === 'require_confirmation'
        ? `Action "${intent}" requires explicit user confirmation`
        : level === 'soft_confirmation'
          ? `Action "${intent}" could use soft confirmation (category only)`
          : `Action "${intent}" at confidence ${confidence} — ${level}`,
    would_auto_execute: wouldAutoExecute,
  };

  // Log for observability (non-blocking)
  try {
    await logAgentAction(supabase, userId, 'autonomy_evaluation', {
      intent,
      confidence,
      level,
      would_auto_execute: wouldAutoExecute,
      reason: decision.reason,
    });
  } catch {
    // never block
  }

  return decision;
}
