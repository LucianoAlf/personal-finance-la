import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ReconciliationDecisionInput, ReconciliationImportRequest } from '@/types/reconciliation';

import { RECONCILIATION_WORKSPACE_QUERY_KEY } from './useReconciliationWorkspaceQuery';

export function useReconciliationMutations() {
  const queryClient = useQueryClient();

  const applyDecision = useMutation({
    mutationFn: async (input: ReconciliationDecisionInput) => {
      // Every optional field the edge function supports MUST be forwarded
      // explicitly. Missing any of them (as was the case for
      // counterpartBankTransactionId until this change) degrades the action
      // silently on the server side.
      const { data, error } = await supabase.functions.invoke('reconciliation-action', {
        body: {
          caseId: input.caseId,
          action: input.action,
          confirmationSource: input.confirmationSource,
          reason: input.reason,
          counterpartBankTransactionId: input.counterpartBankTransactionId,
          payableBillId: input.payableBillId,
          registerExpense: input.registerExpense,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY });
    },
  });

  const syncPluggy = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('poll-pluggy-reconciliation');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY });
    },
  });

  const importTransactions = useMutation({
    mutationFn: async (input: ReconciliationImportRequest) => {
      const { data, error } = await supabase.functions.invoke('reconciliation-import', {
        body: input,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY });
    },
  });

  return { applyDecision, syncPluggy, importTransactions };
}
