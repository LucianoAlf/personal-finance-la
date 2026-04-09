import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { MonthlyDividends } from '@/hooks/useDividendCalendar';

interface DividendCalendarProps {
  monthlyBreakdown: MonthlyDividends[];
  totalEstimated: number;
  next30Days: number;
  next90Days: number;
}

const summaryCards = [
  {
    key: '30d',
    label: 'Próximos 30 dias',
    accent: 'emerald',
    icon: TrendingUp,
    getValue: (props: DividendCalendarProps) => props.next30Days,
  },
  {
    key: '90d',
    label: 'Próximos 90 dias',
    accent: 'sky',
    icon: Calendar,
    getValue: (props: DividendCalendarProps) => props.next90Days,
  },
  {
    key: 'total',
    label: 'Total estimado',
    accent: 'violet',
    icon: DollarSign,
    getValue: (props: DividendCalendarProps) => props.totalEstimated,
  },
] as const;

const accentClasses = {
  emerald: {
    badge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    value: 'text-emerald-500',
  },
  sky: {
    badge: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300',
    value: 'text-sky-500',
  },
  violet: {
    badge: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300',
    value: 'text-violet-500',
  },
} as const;

export function DividendCalendar(props: DividendCalendarProps) {
  const { monthlyBreakdown } = props;

  if (monthlyBreakdown.length === 0) {
    return (
      <Card className="border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-5 w-5 text-primary" />
            Calendário de dividendos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-surface shadow-sm">
            <DollarSign className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">Nenhum dividendo programado</h3>
          <p className="text-sm text-muted-foreground">
            Adicione ativos com dividend yield para acompanhar os próximos pagamentos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((item, index) => {
          const Icon = item.icon;
          const accent = accentClasses[item.accent];

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <Card className="border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
                <CardContent className="flex items-start justify-between p-6">
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">{item.label}</p>
                    <h2 className={`text-[1.7rem] font-semibold tracking-tight ${accent.value}`}>
                      {formatCurrency(item.getValue(props))}
                    </h2>
                  </div>

                  <div className={`rounded-2xl border p-3 shadow-sm ${accent.badge}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-2xl">Pagamentos por mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {monthlyBreakdown.map((month, index) => {
            const monthDate = new Date(`${month.month}-01T00:00:00`);
            const monthName = format(monthDate, 'MMMM yyyy', { locale: ptBR });

            return (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="rounded-[1.45rem] border border-border/70 bg-surface/55 p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold capitalize text-foreground">{monthName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {month.payments.length} {month.payments.length > 1 ? 'pagamentos' : 'pagamento'}
                    </p>
                  </div>

                  <p className="text-2xl font-semibold text-emerald-500">
                    {formatCurrency(month.total)}
                  </p>
                </div>

                <div className="space-y-3">
                  {month.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-center">
                          <p className="text-2xl font-semibold leading-none text-foreground">
                            {format(payment.paymentDate, 'd')}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {format(payment.paymentDate, 'MMM', { locale: ptBR })}
                          </p>
                        </div>

                        <div>
                          <p className="font-semibold text-foreground">{payment.ticker}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.quantity} ações
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-emerald-500">
                          {formatCurrency(payment.estimatedValue)}
                        </p>
                        <Badge variant="outline" className="mt-1 rounded-full">
                          {payment.dividendYield.toFixed(2)}% a.a.
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          <div className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Valores estimados:</strong> baseados no dividend
            yield anual e na cotação atual. Os valores reais podem variar conforme a política de
            dividendos de cada empresa.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
