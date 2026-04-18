import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260417172800_transactions_allow_bank_reconciliation_source.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('transactions bank_reconciliation source migration', () => {
  it('drops the legacy source CHECK and re-adds the constraint', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS transactions_source_check/);
    expect(sql).toMatch(/ADD CONSTRAINT transactions_source_check/);
  });

  it('keeps every pre-existing source value', () => {
    const sql = loadMigration();
    for (const legacy of ['manual', 'whatsapp', 'import', 'open_finance']) {
      expect(sql.includes(`'${legacy}'`)).toBe(true);
    }
  });

  it('adds bank_reconciliation as an explicit source', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/'bank_reconciliation'/);
  });

  it('never drops or truncates ledger data', () => {
    const sql = loadMigration().toLowerCase();
    expect(sql).not.toMatch(/drop table/);
    expect(sql).not.toMatch(/delete from/);
    expect(sql).not.toMatch(/truncate/);
  });
});
