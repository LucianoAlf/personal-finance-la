import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { DividendPayment, MonthlyDividends } from '@/hooks/useDividendCalendar';

interface DividendCalendarProps {
  monthlyBreakdown: MonthlyDividends[];
  totalEstimated: number;
  next30Days: number;
  next90Days: number;
}

export function DividendCalendar({
  monthlyBreakdown,
  totalEstimated,
  next30Days,
  next90Days,
}: DividendCalendarProps) {
  if (monthlyBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendário de Dividendos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhum dividendo programado</h3>
            <p className="text-sm text-muted-foreground">
              Adicione investimentos com dividend_yield para ver os próximos pagamentos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Próximos 30 Dias</p>
                  <h2 className="text-2xl font-bold text-green-600">
                    {formatCurrency(next30Days)}
                  </h2>
                </div>
                <div className="rounded-lg p-3 bg-green-50">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Próximos 90 Dias</p>
                  <h2 className="text-2xl font-bold text-blue-600">
                    {formatCurrency(next90Days)}
                  </h2>
                </div>
                <div className="rounded-lg p-3 bg-blue-50">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Estimado</p>
                  <h2 className="text-2xl font-bold text-purple-600">
                    {formatCurrency(totalEstimated)}
                  </h2>
                </div>
                <div className="rounded-lg p-3 bg-purple-50">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {monthlyBreakdown.map((month, index) => {
              const monthDate = new Date(month.month + '-01');
              const monthName = format(monthDate, 'MMMM yyyy', { locale: ptBR });

              return (
                <motion.div
                  key={month.month}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border-l-4 border-green-500 pl-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {month.payments.length} pagamento{month.payments.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(month.total)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {month.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {format(payment.paymentDate, 'd')}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase">
                              {format(payment.paymentDate, 'MMM', { locale: ptBR })}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">{payment.ticker}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.quantity} ações
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(payment.estimatedValue)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {payment.dividendYield.toFixed(2)}% a.a.
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Valores estimados:</strong> Baseados no dividend yield anual e cotação
              atual. Os valores reais podem variar conforme a política de dividendos de cada
              empresa.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
