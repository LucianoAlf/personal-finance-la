import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { endOfMonth, startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  goal: FinancialGoalWithCategory;
}

interface Row { amount: number; purchase_date: string; }

export function SpendingCategoryTrendChart({ goal }: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchRows() {
      // Últimos 6 meses
      const end = endOfMonth(new Date());
      const start = startOfMonth(subMonths(new Date(), 5));
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select('amount, purchase_date')
        .eq('category_id', goal.category_id)
        .gte('purchase_date', start.toISOString().split('T')[0])
        .lte('purchase_date', end.toISOString().split('T')[0]);
      if (!mounted) return;
      if (!error && data) setRows(data as any);
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
      const d = new Date(r.purchase_date);
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
