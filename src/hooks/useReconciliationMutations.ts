import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ReconciliationDecisionInput } from '@/types/reconciliation';

import { RECONCILIATION_WORKSPACE_QUERY_KEY } from './useReconciliationWorkspaceQuery';

export function useReconciliationMutations() {
  const queryClient = useQueryClient();

  const applyDecision = useMutation({
    mutationFn: async (input: ReconciliationDecisionInput) => {
      const { data, error } = await supabase.functions.invoke('reconciliation-action', {
        body: {
          caseId: input.caseId,
          action: input.action,
          confirmationSource: input.confirmationSource,
          reason: input.reason,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY });
    },
  });

  return { applyDecision };
}
