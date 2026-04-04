import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { cn } from '@/lib/utils';

interface BillCalendarProps {
  bills: PayableBill[];
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
  showEmbeddedHeader?: boolean;
  onPay: (bill: PayableBill) => void;
  onEdit: (bill: PayableBill) => void;
  onDelete: (bill: PayableBill) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BillCalendar({
  bills,
  currentMonth: controlledCurrentMonth,
  onMonthChange,
  showEmbeddedHeader = true,
  onPay,
  onEdit,
  onDelete,
}: BillCalendarProps) {
  const [internalCurrentMonth, setInternalCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentMonth = controlledCurrentMonth ?? internalCurrentMonth;

  const updateCurrentMonth = (date: Date) => {
    if (onMonthChange) {
      onMonthChange(date);
      return;
    }

    setInternalCurrentMonth(date);
  };

  // Agrupar contas por data de vencimento
  const billsByDate = useMemo(() => {
    const grouped: Record<string, PayableBill[]> = {};
    bills.forEach((bill) => {
      const dateKey = bill.due_date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(bill);
    });
    return grouped;
  }, [bills]);

  // Dias do mês atual
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Dias vazios no início (para alinhar com dia da semana)
  const startDayOfWeek = getDay(startOfMonth(currentMonth));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getBillsForDate = (date: Date): PayableBill[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return billsByDate[dateKey] || [];
  };

  const getDayStatus = (dayBills: PayableBill[]) => {
    if (dayBills.length === 0) return null;
    
    const hasOverdue = dayBills.some((b) => b.status === 'overdue');
    const allPaid = dayBills.every((b) => b.status === 'paid');
    const hasPending = dayBills.some((b) => b.status === 'pending');

    if (hasOverdue) return 'overdue';
    if (allPaid) return 'paid';
    if (hasPending) return 'pending';
    return null;
  };

  const getTotalForDate = (dayBills: PayableBill[]) => {
    return dayBills.reduce((sum, bill) => sum + bill.amount, 0);
  };

  const handleDayClick = (date: Date) => {
    const dayBills = getBillsForDate(date);
    if (dayBills.length > 0) {
      setSelectedDate(date);
      setDialogOpen(true);
    }
  };

  // Ordenar contas do dia selecionado por valor (maior primeiro)
  const selectedDateBills = selectedDate 
    ? getBillsForDate(selectedDate).sort((a, b) => b.amount - a.amount) 
    : [];

  // Calcular totais do mês
  const monthTotals = useMemo(() => {
    const monthBills = bills.filter((bill) => {
      const billDate = parseISO(bill.due_date);
      return isSameMonth(billDate, currentMonth);
    });

    return {
      total: monthBills.reduce((sum, b) => sum + b.amount, 0),
      pending: monthBills.filter((b) => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0),
      paid: monthBills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
      overdue: monthBills.filter((b) => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0),
      count: monthBills.length,
    };
  }, [bills, currentMonth]);

  return (
    <div className="space-y-4">
      {/* Header do Calendário */}
      <Card className="p-4">
        {showEmbeddedHeader && (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-xl font-bold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Resumo do Mês */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center text-sm">
          <div className="p-2 rounded-lg bg-muted">
            <p className="text-muted-foreground">Total</p>
            <p className="font-bold">{formatCurrency(monthTotals.total)}</p>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <p className="text-yellow-600">Pendente</p>
            <p className="font-bold text-yellow-600">{formatCurrency(monthTotals.pending)}</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10">
            <p className="text-red-600">Vencido</p>
            <p className="font-bold text-red-600">{formatCurrency(monthTotals.overdue)}</p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10">
            <p className="text-green-600">Pago</p>
            <p className="font-bold text-green-600">{formatCurrency(monthTotals.paid)}</p>
          </div>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dias do Mês */}
        <div className="grid grid-cols-7 border-t border-l border-border/50">
          {/* Espaços vazios antes do primeiro dia */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square border-r border-b border-border/50" />
          ))}

          {/* Dias do mês */}
          {monthDays.map((day) => {
            const dayBills = getBillsForDate(day);
            const status = getDayStatus(dayBills);
            const total = getTotalForDate(dayBills);
            const hasContent = dayBills.length > 0;

            return (
              <motion.button
                key={day.toISOString()}
                whileHover={hasContent ? { scale: 1.05 } : {}}
                whileTap={hasContent ? { scale: 0.95 } : {}}
                onClick={() => handleDayClick(day)}
                disabled={!hasContent}
                className={cn(
                  "aspect-square p-1 text-sm transition-all relative",
                  "flex flex-col items-center justify-start",
                  "border-r border-b border-border/50",
                  isToday(day) && "ring-2 ring-inset ring-blue-500",
                  hasContent && "cursor-pointer hover:bg-muted/50",
                  !hasContent && "cursor-default",
                  status === 'overdue' && "bg-red-500/10",
                  status === 'pending' && "bg-yellow-500/10",
                  status === 'paid' && "bg-green-500/10"
                )}
              >
                <span
                  className={cn(
                    "font-medium",
                    isToday(day) && "text-blue-600",
                    !isSameMonth(day, currentMonth) && "text-muted-foreground"
                  )}
                >
                  {format(day, 'd')}
                </span>

                {hasContent && (
                  <div className="mt-1 w-full">
                    <div
                      className={cn(
                        "text-[10px] font-bold truncate px-1 rounded",
                        status === 'overdue' && "text-red-600",
                        status === 'pending' && "text-yellow-600",
                        status === 'paid' && "text-green-600"
                      )}
                    >
                      {formatCurrency(total)}
                    </div>
                    {dayBills.length > 1 && (
                      <div className="text-[9px] text-muted-foreground">
                        {dayBills.length} contas
                      </div>
                    )}
                  </div>
                )}

                {/* Indicador de status */}
                {status && (
                  <div
                    className={cn(
                      "absolute top-1 right-1 w-2 h-2 rounded-full",
                      status === 'overdue' && "bg-red-500",
                      status === 'pending' && "bg-yellow-500",
                      status === 'paid' && "bg-green-500"
                    )}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Dialog com detalhes do dia */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedDateBills.map((bill) => (
              <Card
                key={bill.id}
                className={cn(
                  "p-4",
                  bill.status === 'overdue' && "border-l-4 border-l-red-500",
                  bill.status === 'pending' && "border-l-4 border-l-yellow-500",
                  bill.status === 'paid' && "border-l-4 border-l-green-500"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{bill.description}</h4>
                    {bill.provider_name && (
                      <p className="text-sm text-muted-foreground">
                        {bill.provider_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(bill.status === 'paid' && bill.paid_amount ? bill.paid_amount : bill.amount)}
                    </p>
                    <Badge
                      variant={
                        bill.status === 'paid'
                          ? 'success'
                          : bill.status === 'overdue'
                          ? 'danger'
                          : 'warning'
                      }
                      className="mt-1"
                    >
                      {bill.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {bill.status === 'overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {bill.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {bill.status === 'paid' ? 'Paga' : bill.status === 'overdue' ? 'Vencida' : 'Pendente'}
                    </Badge>
                  </div>
                </div>

                {bill.status !== 'paid' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        onPay(bill);
                        setDialogOpen(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Pagar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onEdit(bill);
                        setDialogOpen(false);
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </Card>
            ))}

            {/* Total do dia */}
            {selectedDateBills.length > 1 && (
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total do dia:</span>
                  <span className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(getTotalForDate(selectedDateBills))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
