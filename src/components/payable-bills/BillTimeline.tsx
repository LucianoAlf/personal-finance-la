import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/utils/billCalculations';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BillTimelineProps {
  bills: PayableBill[];
  onPay?: (bill: PayableBill) => void;
}

export function BillTimeline({ bills, onPay }: BillTimelineProps) {
  // Agrupar contas por dia nos próximos 7 dias
  const timelineData = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const billsForDay = bills.filter((bill) =>
        isSameDay(parseISO(bill.due_date), date)
      );

      days.push({
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayOfWeek: format(date, 'EEEE', { locale: ptBR }),
        dayOfMonth: format(date, 'd', { locale: ptBR }),
        monthShort: format(date, 'MMM', { locale: ptBR }),
        isToday: i === 0,
        bills: billsForDay,
        totalAmount: billsForDay.reduce((sum, b) => sum + b.amount, 0),
      });
    }

    return days;
  }, [bills]);

  return (
    <div className="space-y-4">
      {timelineData.map((day, index) => (
        <motion.div
          key={day.dateStr}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className={`${day.isToday ? 'border-2 border-primary' : ''}`}>
            <div className="p-6">
              {/* Cabeçalho do Dia */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`text-center ${day.isToday ? 'text-primary' : ''}`}>
                    <div className="text-2xl font-bold">{day.dayOfMonth}</div>
                    <div className="text-xs uppercase text-muted-foreground">
                      {day.monthShort}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold capitalize">
                      {day.dayOfWeek}
                      {day.isToday && (
                        <Badge variant="default" className="ml-2">
                          Hoje
                        </Badge>
                      )}
                    </h3>
                    {day.bills.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {day.bills.length} {day.bills.length === 1 ? 'conta' : 'contas'} •{' '}
                        {formatCurrency(day.totalAmount)}
                      </p>
                    )}
                  </div>
                </div>

                {day.bills.length === 0 && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Nenhuma conta
                  </Badge>
                )}
              </div>

              {/* Lista de Contas do Dia */}
              {day.bills.length > 0 && (
                <div className="space-y-2">
                  {day.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{bill.description}</h4>
                          {bill.priority === 'critical' && (
                            <Badge variant="danger" className="shrink-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Crítica
                            </Badge>
                          )}
                          {bill.status === 'overdue' && (
                            <Badge variant="danger" className="shrink-0">
                              Vencida
                            </Badge>
                          )}
                        </div>
                        {bill.provider_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {bill.provider_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="font-semibold text-lg">
                          {formatCurrency(bill.status === 'paid' && bill.paid_amount ? bill.paid_amount : bill.amount)}
                        </span>
                        {bill.status !== 'paid' && onPay && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPay(bill)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                        {bill.status === 'paid' && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Paga
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
