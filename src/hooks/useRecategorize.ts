import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CanonicalCategoryEntityType } from '@/types/categories';

export type RecategorizeLedgerEntity = Extract<
  CanonicalCategoryEntityType,
  'transaction' | 'credit_card_transaction'
>;

function tableForLedgerEntity(entity: RecategorizeLedgerEntity) {
  return entity === 'transaction' ? 'transactions' : 'credit_card_transactions';
}

export function useRecategorize() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recategorizeTransaction = async (
    ledgerEntity: RecategorizeLedgerEntity,
    transactionId: string,
    newCategoryId: string,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const table = tableForLedgerEntity(ledgerEntity);
      const { error: updateError } = await supabase
        .from(table)
        .update({ category_id: newCategoryId })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Erro ao recategorizar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao recategorizar');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const recategorizeBulk = async (
    ledgerEntity: RecategorizeLedgerEntity,
    description: string,
    newCategoryId: string,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const table = tableForLedgerEntity(ledgerEntity);
      const { error: updateError } = await supabase
        .from(table)
        .update({ category_id: newCategoryId })
        .eq('user_id', user.id)
        .ilike('description', `%${description}%`);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Erro ao recategorizar em massa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao recategorizar');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    recategorizeTransaction,
    recategorizeBulk,
    loading,
    error,
  };
}
