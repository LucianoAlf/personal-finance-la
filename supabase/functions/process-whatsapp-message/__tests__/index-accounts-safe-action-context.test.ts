import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('index contas context persistence', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const indexPath = join(dir, '..', 'index.ts');
  const src = readFileSync(indexPath, 'utf8');

  it('keeps contextType ahead of step when persisting contas contexts', () => {
    expect(src).toContain(
      "const contextStep = (resultado.dados?.contextType || resultado.dados?.step) as ContextType;",
    );
  });
});
