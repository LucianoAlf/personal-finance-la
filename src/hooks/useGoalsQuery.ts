import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const fetchGoals = async (): Promise<any[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('financial_goals')
    .select(`
      *,
      category:categories(name, icon)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useGoalsQuery = () => {
  const query = useQuery({
    queryKey: ['financial_goals'],
    queryFn: fetchGoals,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const goals = (query.data || []) as any[];

  const getStats = () => {
    const savingsGoals = goals.filter(g => g.goal_type === 'savings');
    const spendingGoals = goals.filter(g => g.goal_type === 'spending_limit');

    const total_savings = savingsGoals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
    const best_streak = Math.max(0, ...goals.map(g => Number(g.best_streak || 0)));

    return {
      total_goals: goals.length,
      active_goals: goals.filter(g => g.status === 'active').length,
      completed_goals: goals.filter(g => g.status === 'completed').length,
      exceeded_goals: goals.filter(g => g.status === 'exceeded').length,
      total_savings,
      best_streak,
      completion_rate: goals.length > 0
        ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
        : 0,
    };
  };

  return {
    goals,
    loading: query.isLoading,
    error: query.error,
    getStats,
    refetch: query.refetch,
  };
};
