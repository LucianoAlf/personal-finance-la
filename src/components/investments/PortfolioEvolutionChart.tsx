import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EvolutionData {
  date: string;
  invested: number;
  current: number;
}

interface PortfolioEvolutionChartProps {
  totalInvested: number;
  currentValue: number;
}

const shellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

function normalizeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PortfolioEvolutionChart({
  totalInvested,
  currentValue,
}: PortfolioEvolutionChartProps) {
  const { history, loading } = usePortfolioHistory(365);

  const data = useMemo(() => {
    if (history.length === 0) {
      if (totalInvested === 0 && currentValue === 0) return [];

      return [
        {
          date: format(new Date(), 'MMM/yy', { locale: ptBR }),
          invested: Math.round(totalInvested),
          current: Math.round(currentValue),
        },
      ];
    }

    const snapshotsByMonth = new Map<string, EvolutionData>();

    history.forEach((snapshot) => {
      const snapshotDate = new Date(`${snapshot.snapshot_date}T12:00:00`);
      const monthKey = format(snapshotDate, 'yyyy-MM');
      snapshotsByMonth.set(monthKey, {
        date: format(snapshotDate, 'MMM/yy', { locale: ptBR }),
        invested: Math.round(snapshot.total_invested),
        current: Math.round(snapshot.current_value),
      });
    });

    return Array.from(snapshotsByMonth.values());
  }, [currentValue, history, totalInvested]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const invested = normalizeNumber(payload[0]?.value);
      const current = normalizeNumber(payload[1]?.value);

      return (
        <div className="rounded-2xl border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-xl">
          <p className="mb-2 font-semibold tracking-tight">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Investido:</span>
              <span className="font-medium text-foreground">{formatCurrency(invested)}</span>
            </p>
            <p className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Valor atual:</span>
              <span className="font-medium text-foreground">{formatCurrency(current)}</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-500 dark:text-emerald-400">
              Ganho: {formatCurrency(current - invested)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  return (
    <Card className={shellClassName}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight">Evolução do Portfólio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/60 bg-surface-elevated/35 p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.55} />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="#3b82f6"
                strokeWidth={2.5}
                name="Investido"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#10b981"
                strokeWidth={2.5}
                name="Valor atual"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 flex gap-3 rounded-2xl border border-border/60 bg-surface-elevated/45 p-4">
          <Info className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Carregando snapshots reais do portfólio...'
                : history.length > 0
                  ? 'Este gráfico mostra a evolução real do portfólio com base nos snapshots registrados.'
                  : 'Ainda não há histórico suficiente de snapshots. O gráfico exibirá a evolução real assim que novos registros forem gerados.'}
            </p>
            {history.length === 0 && (
              <p className="text-xs text-muted-foreground">
                O valor atual continua visível, mas a série histórica depende da criação periódica de snapshots do portfólio.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
