import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('context manager accounts safe action flow', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const contextManagerPath = join(dir, '..', 'context-manager.ts');
  const src = readFileSync(contextManagerPath, 'utf8');

  it('registers awaiting_accounts_safe_action_confirm as a prioritized flow context', () => {
    const flowContextBlock = src.slice(
      src.indexOf('const FLOW_CONTEXT_TYPES'),
      src.indexOf('// Contextos de referência'),
    );

    expect(src).toContain("'awaiting_accounts_safe_action_confirm'");
    expect(flowContextBlock).toContain("'awaiting_accounts_safe_action_confirm'");
  });

  it('routes awaiting_accounts_safe_action_confirm through the dedicated helper branch', () => {
    const branch = src.slice(
      src.indexOf("if (contextType === 'awaiting_accounts_safe_action_confirm')"),
      src.indexOf('// ✅ CORREÇÃO BUG #5 e #9'),
    );

    expect(branch).toContain("if (contextType === 'awaiting_accounts_safe_action_confirm')");
    expect(branch).toContain('handleAwaitingAccountsSafeActionConfirmReply');
    expect(branch).toContain('texto,');
    expect(branch).toContain('contexto,');
    expect(branch).toContain('userId,');
    expect(branch).toContain('phone,');
    expect(src).toContain('export async function handleAwaitingAccountsSafeActionConfirmReply');
    expect(src).toContain('parseSafeActionConfirmation');
    expect(src).toContain('executePendingAccountsSafeAction');
    expect(src).toContain('templateAccountsSafeActionDecline');
    expect(src).toContain('templateAccountsSafeActionDefer');
    expect(src).toContain('templateAccountsDiagnosticClarifyingQuestion');
    expect(src).toContain('detectDiagnosticTopicShift');
  });
});
