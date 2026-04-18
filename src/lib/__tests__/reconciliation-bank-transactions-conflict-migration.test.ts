import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConflictFixMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260416130000_fix_reconciliation_bank_transactions_on_conflict.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('reconciliation bank transaction conflict migration', () => {
  it('replaces the partial unique index with a conflict-compatible unique index', () => {
    const sql = loadConflictFixMigration();

    expect(sql).toContain('DROP INDEX IF EXISTS public.bank_transactions_user_source_external_id_key');
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX\s+bank_transactions_user_source_external_id_key\s+ON public\.bank_transactions\s*\(user_id, source, external_id\);/s,
    );
    expect(sql).not.toContain('WHERE external_id IS NOT NULL');
  });
});
