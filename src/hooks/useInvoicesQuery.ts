import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ✅ Buscar faturas
const fetchInvoices = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ✅ Hook com React Query (cache automático)
export const useInvoicesQuery = () => {
  const query = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return {
    invoices: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
