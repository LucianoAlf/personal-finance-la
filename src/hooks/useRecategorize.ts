import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRecategorize() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recategorizeTransaction = async (
    transactionId: string,
    newCategoryId: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('credit_card_transactions')
        .update({ category_id: newCategoryId })
        .eq('id', transactionId);

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
    description: string,
    newCategoryId: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('credit_card_transactions')
        .update({ category_id: newCategoryId })
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
