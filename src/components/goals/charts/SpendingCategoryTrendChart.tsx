import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  type TooltipProps,
} from 'recharts';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { supabase } from '@/lib/supabase';
import { endOfMonth, startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatDateOnly, parseDateOnly } from '@/utils/formatters';

interface Props {
  goal: FinancialGoalWithCategory;
}

interface Row {
  amount: number;
  date: string;
}

export function SpendingTrendTooltipContent({
  active,
  payload,
}: Pick<TooltipProps<number, string>, 'active' | 'payload'>) {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  const month = String(point?.payload?.month ?? '');
  const rawValue = Number(point?.value ?? 0);

  return (
    <div
      data-testid="spending-trend-tooltip"
      className="min-w-[12rem] rounded-2xl border border-border/70 bg-card/95 px-4 py-3 text-foreground shadow-[0_20px_48px_rgba(2,6,23,0.34)] backdrop-blur-xl"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/55">{month}</p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground/72">Gastos</span>
        <span className="text-base font-semibold text-danger">{formatCurrency(rawValue)}</span>
      </div>
    </div>
  );
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
    <div className="rounded-[1.4rem] border border-border/70 bg-surface-elevated/55 p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold tracking-wide text-foreground">Gastos por mês (6m)</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
          <XAxis dataKey="month" stroke="rgba(148,163,184,0.88)" style={{ fontSize: '11px' }} />
          <YAxis stroke="rgba(148,163,184,0.88)" style={{ fontSize: '11px' }} />
          <Tooltip
            cursor={{ stroke: 'rgba(148,163,184,0.24)', strokeWidth: 1 }}
            content={<SpendingTrendTooltipContent />}
          />
          <Area type="monotone" dataKey="amount" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpend)" />
        </AreaChart>
      </ResponsiveContainer>
      {!hasData && (
        <div className="mt-2 text-[11px] text-muted-foreground">Sem dados suficientes ainda</div>
      )}
    </div>
  );
}
