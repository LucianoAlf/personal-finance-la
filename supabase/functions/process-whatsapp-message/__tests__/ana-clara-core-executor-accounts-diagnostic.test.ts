import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('ana-clara core executor diagnostic context persistence', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const executorPath = join(dir, '..', 'ana-clara-core-executor.ts');
  const src = readFileSync(executorPath, 'utf8');

  it('prefers explicit contextType over step when persisting follow-up context', () => {
    expect(src).toContain("const contextStep = (resultado.dados?.contextType || resultado.dados?.step) as ContextType;");
  });
});
