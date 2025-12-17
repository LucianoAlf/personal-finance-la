import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Tipagem leve para evitar erros de tipos ausentes
type Bill = any;

const fetchBills = async (): Promise<Bill[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data || [];
};

export const usePayableBillsQuery = () => {
  const query = useQuery({
    queryKey: ['payable_bills'],
    queryFn: fetchBills,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const bills = (query.data || []) as Bill[];

  // Hoje (início do dia para comparação)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Overdue: não paga E data de vencimento < hoje
  const overdueBills = bills.filter((b) => {
    if (b.status === 'paid') return false;
    const due = new Date(b.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });

  // Próximos 7 dias
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const upcomingBills = bills.filter((b) => {
    if (!(b.status === 'pending' || b.status === 'scheduled')) return false;
    const due = new Date(b.due_date);
    due.setHours(0, 0, 0, 0);
    return due >= today && due <= in7Days;
  });

  // Pendentes: status pending/scheduled E data de vencimento >= hoje
  const pendingBills = bills.filter((b) => {
    if (b.status !== 'pending' && b.status !== 'scheduled') return false;
    const due = new Date(b.due_date);
    due.setHours(0, 0, 0, 0);
    return due >= today;
  });
  const paidBills = bills.filter((b) => b.status === 'paid');
  const partialBills = bills.filter((b) => b.status === 'partial');

  const summary = {
    total_bills: bills.length,
    pending_count: pendingBills.length,
    overdue_count: overdueBills.length,
    paid_count: paidBills.length,
    partial_count: partialBills.length,
    total_amount: bills.reduce((s, b) => s + Number(b.amount || 0), 0),
    pending_amount: pendingBills.reduce((s, b) => s + Number(b.amount || 0), 0),
    overdue_amount: overdueBills.reduce((s, b) => s + Number(b.amount || 0), 0),
    paid_amount: paidBills.reduce((s, b) => s + Number(b.amount || 0), 0),
    partial_amount: partialBills.reduce((s, b) => s + Number(b.paid_amount || 0), 0),
  };

  return {
    bills,
    upcomingBills,
    overdueBills,
    summary,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
