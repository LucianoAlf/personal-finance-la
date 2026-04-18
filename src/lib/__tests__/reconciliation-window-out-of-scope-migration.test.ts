import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadWindowMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260417120000_reconciliation_window_and_out_of_scope.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('reconciliation window + out_of_scope migration', () => {
  it('adds an out_of_scope flag to bank_transactions with a safe default', () => {
    const sql = loadWindowMigration();
    expect(sql).toMatch(/ALTER TABLE public\.bank_transactions\s+ADD COLUMN IF NOT EXISTS out_of_scope boolean NOT NULL DEFAULT false/);
  });

  it('creates an index that keeps the filtered inbox query fast', () => {
    const sql = loadWindowMigration();
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS bank_transactions_user_scope_date_idx[\s\S]+\(user_id, out_of_scope, date DESC\)/);
  });

  it('extends user_settings with reconciliation_window_start defaulting to 2026-04-01', () => {
    const sql = loadWindowMigration();
    expect(sql).toMatch(
      /ALTER TABLE public\.user_settings\s+ADD COLUMN IF NOT EXISTS reconciliation_window_start date NOT NULL DEFAULT DATE '2026-04-01'/,
    );
  });

  it('backfills existing rows by marking pre-window transactions as out_of_scope without deleting history', () => {
    const sql = loadWindowMigration();

    expect(sql).toContain('UPDATE public.bank_transactions bt');
    expect(sql).toMatch(/SET\s+out_of_scope = true/);
    expect(sql).toMatch(/bt\.date < uc\.window_start/);
    expect(sql).not.toMatch(/DELETE FROM public\.bank_transactions/i);
  });

  it('auto-closes reconciliation cases attached to newly-archived rows via the existing SECURITY DEFINER helper', () => {
    const sql = loadWindowMigration();

    expect(sql).toContain('auto_close_reconciliation_case(');
    expect(sql).toContain("'out_of_scope_archive");
    expect(sql).not.toMatch(/DELETE FROM public\.reconciliation_cases/i);
  });

  it('keeps the backfill idempotent by skipping rows already flagged', () => {
    const sql = loadWindowMigration();
    expect(sql).toContain('AND bt.out_of_scope = false');
  });
});
