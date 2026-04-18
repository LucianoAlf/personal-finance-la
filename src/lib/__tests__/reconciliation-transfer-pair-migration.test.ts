import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260417150000_reconciliation_transfer_pair_and_ignore.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('reconciliation transfer pair + ignore migration', () => {
  it('adds transfer_pair_id as nullable so historical rows are not violated', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS transfer_pair_id uuid(?!\s+NOT NULL)/);
  });

  it('indexes the pair lookup scoped per user', () => {
    const sql = loadMigration();
    expect(sql).toMatch(
      /CREATE INDEX IF NOT EXISTS bank_transactions_transfer_pair_idx[\s\S]*\(user_id, transfer_pair_id\)/,
    );
    expect(sql).toMatch(/WHERE transfer_pair_id IS NOT NULL/);
  });

  it('extends the reconciliation_status CHECK with ignored + transfer_matched', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS bank_transactions_reconciliation_status_check/);
    expect(sql).toMatch(/'ignored'/);
    expect(sql).toMatch(/'transfer_matched'/);
    for (const keep of ['pending', 'matched', 'reconciled', 'rejected', 'deferred']) {
      expect(sql.includes(`'${keep}'`)).toBe(true);
    }
  });

  it('does not drop or delete existing rows', () => {
    const sql = loadMigration();
    expect(sql.toLowerCase()).not.toMatch(/drop table/);
    expect(sql.toLowerCase()).not.toMatch(/delete from/);
    expect(sql.toLowerCase()).not.toMatch(/truncate/);
  });
});
