import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260417172700_reconciliation_audit_log_extended_actions.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('reconciliation_audit_log extended actions migration', () => {
  it('drops the legacy action CHECK before redefining it', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS reconciliation_audit_log_action_check/);
  });

  it('keeps all onda 1 verbs that downstream code still emits', () => {
    const sql = loadMigration();
    for (const verb of ['confirmed', 'rejected', 'deferred', 'classified', 'linked', 'unlinked', 'auto_closed']) {
      expect(sql.includes(`'${verb}'`)).toBe(true);
    }
  });

  it('adds onda 2 parte 1 verbs that the edge function already emits', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/'marked_transfer'/);
    expect(sql).toMatch(/'ignored'/);
  });

  it('adds onda 2 parte 2 verbs so link_payable + register_expense can land', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/'linked_payable'/);
    expect(sql).toMatch(/'registered_expense'/);
  });

  it('never drops or truncates audit data', () => {
    const sql = loadMigration().toLowerCase();
    expect(sql).not.toMatch(/drop table/);
    expect(sql).not.toMatch(/delete from/);
    expect(sql).not.toMatch(/truncate/);
  });

  it('documents that the CHECK must stay in sync with the edge function', () => {
    const sql = loadMigration();
    expect(sql).toMatch(/mapAuditAction/);
    expect(sql).toMatch(/reconciliation-action/);
  });
});
