import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('context manager accounts diagnostic flow', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const contextManagerPath = join(dir, '..', 'context-manager.ts');
  const src = readFileSync(contextManagerPath, 'utf8');

  it('registers accounts_diagnostic_context as a prioritized flow context', () => {
    const flowContextBlock = src.slice(
      src.indexOf('const FLOW_CONTEXT_TYPES'),
      src.indexOf('// Contextos de referência'),
    );

    expect(flowContextBlock).toContain("'accounts_diagnostic_context'");
  });

  it('routes accounts_diagnostic_context through a dedicated non-mutative handler branch', () => {
    const branch = src.slice(
      src.indexOf("if (contextType === 'accounts_diagnostic_context')"),
      src.indexOf('// ✅ CORREÇÃO BUG #5 e #9'),
    );

    expect(branch).toContain('continueAccountsDiagnosticConversation');
    expect(branch).toContain('startAccountsDiagnosticConversation');
    expect(branch).toContain('command.includes(\'analisa minhas contas\')');
    expect(branch).not.toContain('marcarComoPago');
  });
});
