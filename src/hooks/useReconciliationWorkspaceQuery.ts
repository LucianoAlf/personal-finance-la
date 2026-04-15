import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type {
  ReconciliationAuditLogRow,
  ReconciliationCaseRow,
  PluggyConnectionRow,
  ReconciliationWorkspaceData,
  ReconciliationWorkspaceSummary,
} from '@/types/reconciliation';

export const RECONCILIATION_WORKSPACE_QUERY_KEY = ['reconciliation-workspace'] as const;

function buildSummary(
  cases: ReconciliationCaseRow[],
  connections: PluggyConnectionRow[],
): ReconciliationWorkspaceSummary {
  const openStatuses = new Set<ReconciliationCaseRow['status']>(['open', 'awaiting_user']);
  const openCases = cases.filter((c) => openStatuses.has(c.status)).length;
  const highConfidenceCount = cases.filter((c) => c.confidence >= 0.85).length;
  const staleConnections = connections.filter((c) => c.status !== 'UPDATED').length;

  return {
    balanceDelta: 0,
    openCases,
    highConfidenceCount,
    staleConnections,
    activeSources: ['manual', 'pluggy'],
  };
}

export function useReconciliationWorkspaceQuery() {
  return useQuery({
    queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY,
    queryFn: async (): Promise<ReconciliationWorkspaceData | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const [casesResult, connectionsResult, auditResult] = await Promise.all([
        supabase
          .from('reconciliation_cases')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase.from('pluggy_connections').select('*').eq('user_id', user.id),
        supabase
          .from('reconciliation_audit_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(80),
      ]);

      const cases = (casesResult.data ?? []) as ReconciliationCaseRow[];
      const connections = (connectionsResult.data ?? []) as PluggyConnectionRow[];
      const auditEntries = (auditResult.data ?? []) as ReconciliationAuditLogRow[];

      return {
        cases,
        connections,
        summary: buildSummary(cases, connections),
        selectedCase: null,
        auditEntries,
      };
    },
  });
}
