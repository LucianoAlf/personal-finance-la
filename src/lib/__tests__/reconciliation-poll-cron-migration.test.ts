import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadReconciliationCronMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260416110417_create_reconciliation_poll_cron.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('reconciliation poll cron migration', () => {
  it('schedules the poller with vault-backed cron auth and a stable job name', () => {
    const sql = loadReconciliationCronMigration();

    expect(sql).toContain(`cron.unschedule('poll-pluggy-reconciliation-every-6h')`);
    expect(sql).toMatch(
      /cron\.schedule\(\s*'poll-pluggy-reconciliation-every-6h',\s*'15 \*\/6 \* \* \*',/s,
    );
    expect(sql).toContain(
      `'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/poll-pluggy-reconciliation'`,
    );
    expect(sql).toContain(
      `'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)`,
    );
  });

  it('creates explicit lock helpers to prevent overlapping reruns', () => {
    const sql = loadReconciliationCronMigration();

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.reconciliation_job_locks');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.acquire_reconciliation_job_lock');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.release_reconciliation_job_lock');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.acquire_reconciliation_job_lock(text, text, integer) TO service_role;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.release_reconciliation_job_lock(text, text) TO service_role;');
  });
});
