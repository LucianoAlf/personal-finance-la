import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { isWithinWindow, resolveReconciliationWindow } from '@/lib/reconciliation-window';
import type {
  ReconciliationAuditLogRow,
  BankTransactionRow,
  ReconciliationCaseRow,
  PluggyConnectionRow,
  ReconciliationWindow,
  ReconciliationWorkspaceData,
  ReconciliationWorkspaceSummary,
} from '@/types/reconciliation';

export const RECONCILIATION_WORKSPACE_QUERY_KEY = ['reconciliation-workspace'] as const;
const RECONCILIATION_FETCH_PAGE_SIZE = 1000;

function toReadableTableName(table: string) {
  return `public.${table}`;
}

function normalizeWorkspaceQueryError(table: string, error: { code?: string; message?: string } | null) {
  if (!error) return null;

  const message = error.message ?? 'unknown query error';
  const relationName = toReadableTableName(table);
  const isMissingInfraError =
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('schema cache') ||
    message.includes(`'${relationName}'`) ||
    message.includes(relationName);

  if (isMissingInfraError) {
    return new Error(
      `Infraestrutura da conciliacao indisponivel: ${relationName} nao existe ou nao esta exposta no ambiente remoto.`,
    );
  }

  return new Error(`Falha ao carregar conciliacao em ${relationName}: ${message}`);
}

async function fetchAllRows<T>(
  table: string,
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { code?: string; message?: string } | null }>,
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + RECONCILIATION_FETCH_PAGE_SIZE - 1;
    const result = await fetchPage(from, to);

    if (result.error) {
      return { data: null, error: result.error };
    }

    const page = result.data ?? [];
    rows.push(...page);

    if (page.length < RECONCILIATION_FETCH_PAGE_SIZE) {
      return { data: rows, error: null };
    }

    from += RECONCILIATION_FETCH_PAGE_SIZE;
  }
}

/**
 * Partitions the raw, unfiltered ingestion snapshot into the in-scope subset
 * plus ingestion health counters. Keeping this pure lets us test it without a
 * supabase mock and reuse it when we expose the "Tudo (hist\u00f3rico)" view later.
 */
export function deriveWorkspaceView(
  cases: ReconciliationCaseRow[],
  bankTransactions: BankTransactionRow[],
  connections: PluggyConnectionRow[],
  window: ReconciliationWindow,
): {
  inScopeCases: ReconciliationCaseRow[];
  inScopeBankTransactions: BankTransactionRow[];
  summary: ReconciliationWorkspaceSummary;
} {
  const inScopeBankTransactions = bankTransactions.filter((bt) => {
    if (bt.out_of_scope === true) return false;
    return isWithinWindow(bt.date, window);
  });
  const inScopeBtIds = new Set(inScopeBankTransactions.map((bt) => bt.id));
  const outOfScopeBtIds = new Set(
    bankTransactions
      .filter((bt) => bt.out_of_scope === true || !isWithinWindow(bt.date, window))
      .map((bt) => bt.id),
  );

  const inScopeCases = cases.filter((caseRow) => {
    if (!caseRow.bank_transaction_id) return true;
    if (outOfScopeBtIds.has(caseRow.bank_transaction_id)) return false;
    if (inScopeBtIds.has(caseRow.bank_transaction_id)) return true;
    // Fail-open: if we did not fetch the bank transaction yet (e.g. partial data),
    // do not silently hide the case. Better to show and let operator act than
    // drop work without any signal.
    return true;
  });

  const openStatuses = new Set<ReconciliationCaseRow['status']>(['open', 'awaiting_user']);
  const openCases = inScopeCases.filter((c) => openStatuses.has(c.status));
  const highConfidenceCount = inScopeCases.filter(
    (c) => c.confidence >= 0.7 && c.status === 'open',
  ).length;
  const unmatchedCount = inScopeCases.filter(
    (c) => c.divergence_type === 'unmatched_bank_transaction',
  ).length;
  const staleConnections = connections.filter((c) => c.status !== 'UPDATED').length;
  const activeSources = Array.from(
    new Set(
      inScopeBankTransactions.map((transaction) =>
        transaction.source === 'pluggy' ? 'pluggy' : 'manual',
      ),
    ),
  );

  const bankTransactionIndex = new Map(inScopeBankTransactions.map((bt) => [bt.id, bt]));
  const pendingUnmatched = openCases.filter(
    (c) => c.matched_record_type == null && c.divergence_type === 'unmatched_bank_transaction',
  );
  const pendingUnmatchedValue = pendingUnmatched.reduce((accumulator, caseRow) => {
    const bankTransaction = caseRow.bank_transaction_id
      ? bankTransactionIndex.get(caseRow.bank_transaction_id)
      : undefined;
    if (!bankTransaction) return accumulator;
    return accumulator + Math.abs(Number(bankTransaction.amount) || 0);
  }, 0);

  const priorityBreakdown = openCases.reduce(
    (accumulator, caseRow) => {
      const bucket = (caseRow.priority ?? 'medium') as keyof typeof accumulator;
      if (bucket in accumulator) {
        accumulator[bucket] += 1;
      } else {
        accumulator.medium += 1;
      }
      return accumulator;
    },
    { urgent: 0, high: 0, medium: 0, low: 0, infra: 0 },
  );

  const totalIngested = bankTransactions.length;
  const outOfScopeCount = totalIngested - inScopeBankTransactions.length;
  const pendingInScope = inScopeBankTransactions.filter(
    (bt) => (bt.reconciliation_status ?? 'pending') === 'pending',
  ).length;
  const reconciledInScope = inScopeBankTransactions.filter(
    (bt) => bt.reconciliation_status === 'reconciled' || bt.reconciliation_status === 'matched',
  ).length;
  const archivedInScope = inScopeBankTransactions.filter(
    (bt) => bt.reconciliation_status === 'rejected' || bt.reconciliation_status === 'deferred',
  ).length;

  const lastPluggySyncAt = connections.reduce<string | null>((latest, connection) => {
    if (!connection.last_synced_at) return latest;
    if (!latest) return connection.last_synced_at;
    return connection.last_synced_at > latest ? connection.last_synced_at : latest;
  }, null);

  const summary: ReconciliationWorkspaceSummary = {
    pendingUnmatchedValue,
    pendingUnmatchedCount: pendingUnmatched.length,
    openCases: openCases.length,
    highConfidenceCount,
    unmatchedCount,
    staleConnections,
    activeSources,
    priorityBreakdown,
    ingestionHealth: {
      totalIngested,
      inScopeCount: inScopeBankTransactions.length,
      outOfScopeCount,
      pendingInScope,
      reconciledInScope,
      archivedInScope,
      lastPluggySyncAt,
      staleConnections,
    },
    window,
  };

  return { inScopeCases, inScopeBankTransactions, summary };
}

export interface UseReconciliationWorkspaceQueryOptions {
  window: ReconciliationWindow;
}

export function useReconciliationWorkspaceQuery(options: UseReconciliationWorkspaceQueryOptions) {
  const queryClient = useQueryClient();
  const { window } = options;

  useEffect(() => {
    const channel = supabase
      .channel('reconciliation_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reconciliation_cases' }, () => {
        void queryClient.invalidateQueries({ queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pluggy_connections' }, () => {
        void queryClient.invalidateQueries({ queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: [...RECONCILIATION_WORKSPACE_QUERY_KEY, window.presetId, window.startDate ?? 'all'],
    queryFn: async (): Promise<ReconciliationWorkspaceData | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const [casesResult, bankTransactionsResult, connectionsResult, auditResult] = await Promise.all([
        fetchAllRows<ReconciliationCaseRow>('reconciliation_cases', (from, to) =>
          supabase
            .from('reconciliation_cases')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .range(from, to),
        ),
        fetchAllRows<BankTransactionRow>('bank_transactions', (from, to) =>
          supabase
            .from('bank_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .range(from, to),
        ),
        supabase.from('pluggy_connections').select('*').eq('user_id', user.id),
        supabase
          .from('reconciliation_audit_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(80),
      ]);

      const queryError =
        normalizeWorkspaceQueryError('reconciliation_cases', casesResult.error) ??
        normalizeWorkspaceQueryError('bank_transactions', bankTransactionsResult.error) ??
        normalizeWorkspaceQueryError('pluggy_connections', connectionsResult.error) ??
        normalizeWorkspaceQueryError('reconciliation_audit_log', auditResult.error);

      if (queryError) {
        throw queryError;
      }

      const cases = (casesResult.data ?? []) as ReconciliationCaseRow[];
      const bankTransactions = (bankTransactionsResult.data ?? []) as BankTransactionRow[];
      const connections = (connectionsResult.data ?? []) as PluggyConnectionRow[];
      const auditEntries = (auditResult.data ?? []) as ReconciliationAuditLogRow[];

      const view = deriveWorkspaceView(cases, bankTransactions, connections, window);

      return {
        cases: view.inScopeCases,
        connections,
        bankTransactions: view.inScopeBankTransactions,
        summary: view.summary,
        selectedCase: null,
        auditEntries,
      };
    },
  });
}
