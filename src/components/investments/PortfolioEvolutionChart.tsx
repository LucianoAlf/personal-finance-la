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
import { formatCurrency } from '@/utils/formatters';
import { format, subMonths } from 'date-fns';
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

export function PortfolioEvolutionChart({
  totalInvested,
  currentValue,
}: PortfolioEvolutionChartProps) {
  // Gerar dados simulados dos últimos 6 meses
  // TODO: Substituir por dados reais quando tivermos histórico
  const generateMockData = (): EvolutionData[] => {
    const data: EvolutionData[] = [];
    const months = 6;
    
    for (let i = months; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const progress = (months - i) / months;
      
      // Simular crescimento gradual do investido
      const invested = totalInvested * progress;
      
      // Simular variação do valor atual (com alguma volatilidade)
      const volatility = Math.sin(i) * 0.05; // -5% a +5%
      const current = invested * (1 + volatility) * (currentValue / totalInvested);
      
      data.push({
        date: format(date, 'MMM/yy', { locale: ptBR }),
        invested: Math.round(invested),
        current: Math.round(current),
      });
    }
    
    return data;
  };

  const data = generateMockData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Investido:</span>
              <span className="font-medium">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Valor Atual:</span>
              <span className="font-medium">{formatCurrency(payload[1].value)}</span>
            </p>
            <p className="text-sm font-semibold text-green-600 mt-2">
              Ganho: {formatCurrency(payload[1].value - payload[0].value)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do Portfólio</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
              strokeWidth={2}
              name="Investido"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#10b981"
              strokeWidth={2}
              name="Valor Atual"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Info card */}
        <div className="mt-6 flex gap-3 rounded-lg bg-muted p-4">
          <Info className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Este gráfico mostra uma simulação baseada nos valores atuais.
            </p>
            <p className="text-xs text-muted-foreground">
              O histórico real será gerado conforme você registrar transações ao longo do tempo.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
