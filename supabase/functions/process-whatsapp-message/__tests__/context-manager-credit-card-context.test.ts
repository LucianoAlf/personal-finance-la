import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('context manager credit-card handoff', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const contextManagerPath = join(dir, '..', 'context-manager.ts');
  const src = readFileSync(contextManagerPath, 'utf8');

  it('clears creating_transaction flow before saving credit_card_context after direct card detection', () => {
    const directCardBranch = src.slice(
      src.indexOf('if (cartaoSelecionado) {'),
      src.indexOf('if (cartoes.length === 1) {'),
    );

    expect(directCardBranch).toContain('await limparContexto(userId);');
    expect(directCardBranch.indexOf('await limparContexto(userId);')).toBeLessThan(
      directCardBranch.indexOf("await salvarContexto(userId, 'credit_card_context'"),
    );
  });

  it('clears creating_transaction flow before saving credit_card_context for single-card fast path', () => {
    const singleCardBranch = src.slice(
      src.indexOf('if (cartoes.length === 1) {'),
      src.indexOf('// Múltiplos cartões → perguntar qual'),
    );

    expect(singleCardBranch).toContain('await limparContexto(userId);');
    expect(singleCardBranch.indexOf('await limparContexto(userId);')).toBeLessThan(
      singleCardBranch.indexOf("await salvarContexto(userId, 'credit_card_context'"),
    );
  });
});
