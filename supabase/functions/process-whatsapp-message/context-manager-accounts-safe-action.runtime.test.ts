import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  handleAwaitingAccountsSafeActionConfirmReply,
  type ContextoConversa,
} from './context-manager.ts';
import type { PendingAccountsSafeAction } from './accounts-safe-actions.ts';

const USER_ID = 'user-1';
const PHONE = '5511999999999';

function createPendingAction(): PendingAccountsSafeAction {
  return {
    anomalyType: 'overdue_without_settlement',
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before: { due_date: '2026-04-05' },
    after: { due_date: '2026-04-20' },
    effectSummary: 'Ela passa a vencer na nova data.',
    diagnosticBasis: {
      conclusionKey: 'still_open',
      conclusionText: 'essa conta continua em aberto segundo o usuario',
      source: 'explicit_health_check',
    },
    confirmationPrompt: "Vou reagendar o vencimento da conta 'Celular (1/12)'.\n\nConfirma? (sim/nao)",
    idempotencyKey: 'safe-key-1',
    surfacedAt: '2026-04-11T10:00:00.000Z',
    previewExpiresAt: '2026-04-11T10:15:00.000Z',
  };
}

function createContext(): ContextoConversa {
  return {
    id: 'ctx-1',
    user_id: USER_ID,
    phone: PHONE,
    context_type: 'awaiting_accounts_safe_action_confirm',
    context_data: createPendingAction(),
    last_interaction: '2026-04-11T10:00:00.000Z',
    expires_at: '2026-04-11T11:00:00.000Z',
  };
}

Deno.test('safe-action confirmation topic shift exits and clears context without mutation', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'qual a fatura do nubank esse mes?',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation mixed confirm plus unrelated finance request exits as topic shift', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'sim, mas me mostra a fatura do nubank',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation mixed diagnosis reply plus unrelated finance request exits as topic shift', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'foi paga. qual meu saldo?',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation mixed confirm plus card request without pivot word exits as topic shift', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'sim e me mostra a fatura do nubank',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation mixed decline plus balance request exits as topic shift', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'nao, me mostra meu saldo',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation mixed defer plus balance request exits as topic shift', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'depois vejo, qual meu saldo?',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation mixed decline plus agenda request exits as topic shift', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'nao, olha minha agenda amanha',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertEquals(reply, '');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation ambiguous reply keeps context alive and asks for clarification', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let savedPayload: Record<string, unknown> | null = null;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'acho que sim',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async (_userId, _contextType, contextData) => {
        savedPayload = contextData as Record<string, unknown>;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertStringIncludes(reply, 'So pra eu ler isso direito:');
  assertStringIncludes(reply, 'voce quer que eu aplique essa alteracao');
  assertEquals(clearCalls, 0);
  assertEquals(executeCalls, 0);
  assertEquals(typeof savedPayload?.clarificationRequestedAt, 'string');
  assertEquals(savedPayload?.targetId, 'bill-1');
});

Deno.test('safe-action confirmation explicit confirm routes through executor with explicit user id', async () => {
  let clearCalls = 0;
  let executeArgs:
    | {
      pending: PendingAccountsSafeAction;
      context: { userId: string; now: string };
    }
    | null = null;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'sim',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        throw new Error('should not save context on explicit confirm');
      },
      executePendingAccountsSafeAction: async (_supabase, pending, context) => {
        executeArgs = {
          pending,
          context: context as { userId: string; now: string },
        };
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
      getSupabase: () => ({}) as never,
      now: () => '2026-04-11T10:02:00.000Z',
    },
  });

  assertEquals(reply, 'Pronto.');
  assertEquals(clearCalls, 1);
  assertEquals(executeArgs?.context.userId, USER_ID);
  assertEquals(executeArgs?.context.now, '2026-04-11T10:02:00.000Z');
  assertEquals(executeArgs?.pending.confirmationSource, 'explicit_yes');
  assertEquals(executeArgs?.pending.confirmationText, 'sim');
  assertEquals(executeArgs?.pending.confirmedAt, '2026-04-11T10:02:00.000Z');
});

Deno.test('safe-action confirmation decline clears context without mutation', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'nao',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertStringIncludes(reply, 'Nao alterei nada nessa conta.');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation defer clears context without mutation', async () => {
  let clearCalls = 0;
  let executeCalls = 0;
  let saveCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'depois vejo',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        saveCalls += 1;
      },
      executePendingAccountsSafeAction: async () => {
        executeCalls += 1;
        return { finalState: 'SAFE_ACTION_SUCCEEDED', message: 'Pronto.' };
      },
    },
  });

  assertStringIncludes(reply, 'Nao alterei nada agora.');
  assertEquals(clearCalls, 1);
  assertEquals(saveCalls, 0);
  assertEquals(executeCalls, 0);
});

Deno.test('safe-action confirmation surfaces executor abort outcome and clears context', async () => {
  let clearCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'sim',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        throw new Error('should not save context on executor abort');
      },
      executePendingAccountsSafeAction: async () => {
        return {
          finalState: 'SAFE_ACTION_ABORTED',
          message: 'Parei essa acao antes de alterar o sistema porque o preview expirou.',
        };
      },
      getSupabase: () => ({}) as never,
      now: () => '2026-04-11T10:02:00.000Z',
    },
  });

  assertStringIncludes(reply, 'preview expirou');
  assertEquals(clearCalls, 1);
});

Deno.test('safe-action confirmation surfaces executor failure outcome and clears context', async () => {
  let clearCalls = 0;

  const reply = await handleAwaitingAccountsSafeActionConfirmReply({
    texto: 'sim',
    contexto: createContext(),
    userId: USER_ID,
    phone: PHONE,
    deps: {
      limparContexto: async () => {
        clearCalls += 1;
      },
      salvarContexto: async () => {
        throw new Error('should not save context on executor failure');
      },
      executePendingAccountsSafeAction: async () => {
        return {
          finalState: 'SAFE_ACTION_FAILED',
          message: 'Nao consegui concluir essa alteracao com seguranca.',
        };
      },
      getSupabase: () => ({}) as never,
      now: () => '2026-04-11T10:02:00.000Z',
    },
  });

  assertStringIncludes(reply, 'Nao consegui concluir essa alteracao com seguranca.');
  assertEquals(clearCalls, 1);
});
