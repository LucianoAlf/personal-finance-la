import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useEstablishments() {
  const [establishments, setEstablishments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEstablishments = async (query: string) => {
    if (!query || query.length < 2) {
      setEstablishments([]);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select('establishment')
        .eq('user_id', user.id)
        .not('establishment', 'is', null)
        .ilike('establishment', `%${query}%`)
        .limit(10);

      if (error) throw error;

      // Remover duplicatas e ordenar
      const unique = [...new Set(data.map(item => item.establishment).filter(Boolean))];
      setEstablishments(unique);
    } catch (err) {
      console.error('Erro ao buscar estabelecimentos:', err);
      setEstablishments([]);
    } finally {
      setLoading(false);
    }
  };

  return { establishments, loading, fetchEstablishments };
}
