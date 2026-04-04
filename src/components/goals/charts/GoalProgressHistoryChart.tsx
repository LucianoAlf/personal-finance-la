import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  goal: FinancialGoalWithCategory;
}

interface ContributionRow {
  amount: number;
  created_at: string;
}

export function GoalProgressHistoryChart({ goal }: Props) {
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchContributions() {
      setLoading(true);
      const { data, error } = await supabase
        .from('financial_goal_contributions')
        .select('amount, created_at')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (!error && data) {
        setRows(data as any);
      }
      setLoading(false);
    }
    if (goal.goal_type === 'savings') fetchContributions();
    return () => {
      mounted = false;
    };
  }, [goal.id, goal.goal_type]);

  const data = useMemo(() => {
    // Agregar por mês e calcular acumulado
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const key = format(d, 'MMM/yyyy', { locale: ptBR });
      map.set(key, (map.get(key) || 0) + Number(r.amount));
    });
    const months = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    months.sort((a, b) => {
      const [am, ay] = a.label.split('/');
      const [bm, by] = b.label.split('/');
      const mMap = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
      const ai = mMap.indexOf(am.toLowerCase());
      const bi = mMap.indexOf(bm.toLowerCase());
      return Number(ay) !== Number(by) ? Number(ay) - Number(by) : ai - bi;
    });
    let acc = 0;
    return months.map((m) => {
      acc += m.value;
      return { month: m.label, contributed: acc };
    });
  }, [rows]);

  const hasData = data.length > 0;
  const percentage = Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100);

  return (
    <ChartCard
      title="Progresso no Tempo"
      icon={TrendingUp}
      isEmpty={!hasData}
      emptyMessage="Sem contribuições registradas"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip formatter={(v: any) => ['R$ ' + Number(v).toFixed(2), 'Acumulado']} />
          <ReferenceLine y={goal.target_amount} label="Meta" stroke="#10b981" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="contributed" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProgress)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-gray-600">
        Alcançado: {percentage}% — Atual: R$ {goal.current_amount.toFixed(2)} de R$ {goal.target_amount.toFixed(2)}
      </div>
    </ChartCard>
  );
}
