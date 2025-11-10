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
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
