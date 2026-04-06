import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ✅ Buscar investimentos do usuário
const fetchInvestments = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useInvestmentsQuery = () => {
  const query = useQuery({
    queryKey: ['investments'],
    queryFn: fetchInvestments,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  return {
    investments: query.data || [],
    /** True only on first load with no cached data (v5: prefer over isLoading for “no data yet”). */
    isPending: query.isPending,
    /** Any in-flight request (initial or background refetch). */
    isFetching: query.isFetching,
    /** Backward-compatible alias: first fetch without usable data. */
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};
