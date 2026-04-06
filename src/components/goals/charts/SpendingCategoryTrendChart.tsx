import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { endOfMonth, startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly, parseDateOnly } from '@/utils/formatters';

interface Props {
  goal: FinancialGoalWithCategory;
}

interface Row {
  amount: number;
  date: string;
}

export function SpendingCategoryTrendChart({ goal }: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchRows() {
      const end = endOfMonth(new Date());
      const start = startOfMonth(subMonths(new Date(), 5));

      const startDate = formatDateOnly(start);
      const endDate = formatDateOnly(end);

      const [{ data: regularData, error: regularError }, { data: creditData, error: creditError }] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, transaction_date')
          .eq('category_id', goal.category_id)
          .eq('type', 'expense')
          .eq('is_paid', true)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate),
        supabase
          .from('credit_card_transactions')
          .select('amount, purchase_date')
          .eq('category_id', goal.category_id)
          .gte('purchase_date', startDate)
          .lte('purchase_date', endDate),
      ]);

      if (!mounted) return;

      if (!regularError && !creditError) {
        setRows([
          ...((regularData || []).map((row) => ({
            amount: Number(row.amount || 0),
            date: row.transaction_date,
          }))),
          ...((creditData || []).map((row) => ({
            amount: Number(row.amount || 0),
            date: row.purchase_date,
          }))),
        ]);
      }
    }
    if (goal.goal_type === 'spending_limit' && goal.category_id) fetchRows();
    return () => { mounted = false; };
  }, [goal.goal_type, goal.category_id]);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'MMM/yyyy', { locale: ptBR });
      map.set(key, 0);
    }
    rows.forEach((r) => {
      const d = parseDateOnly(r.date);
      const key = format(d, 'MMM/yyyy', { locale: ptBR });
      map.set(key, (map.get(key) || 0) + Number(r.amount));
    });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount }));
  }, [rows]);

  const hasData = data.some(d => d.amount > 0);

  return (
    <div className="bg-gray-50 border rounded-xl p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Gastos por mês (6m)</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '11px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
          <Tooltip formatter={(v: any) => ['R$ ' + Number(v).toFixed(2), 'Gastos']} />
          <Area type="monotone" dataKey="amount" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpend)" />
        </AreaChart>
      </ResponsiveContainer>
      {!hasData && (
        <div className="text-[11px] text-gray-500 mt-2">Sem dados suficientes ainda</div>
      )}
    </div>
  );
}
