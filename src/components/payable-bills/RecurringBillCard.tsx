import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Repeat, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { formatCurrency, formatDate } from '@/utils/billCalculations';
import { BILL_TYPE_LABELS } from '@/types/payable-bills.types';

interface RecurringBillCardProps {
  bill: PayableBill;
  onEdit?: (bill: PayableBill) => void;
  onDelete?: (bill: PayableBill) => void;
  lastAmount?: number; // Valor da última ocorrência para comparação
  variation?: number; // Variação percentual
}

export function RecurringBillCard({
  bill,
  onEdit,
  onDelete,
  lastAmount,
  variation,
}: RecurringBillCardProps) {
  const frequency = bill.recurrence_config?.frequency;
  const nextDate = bill.next_occurrence_date;

  const frequencyLabels = {
    monthly: 'Mensal',
    bimonthly: 'Bimestral',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    yearly: 'Anual',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="h-5 w-5 text-blue-500 shrink-0" />
                <h3 className="font-semibold text-lg truncate">
                  {bill.description}
                </h3>
                <Badge variant="info" className="shrink-0">
                  {frequency && frequencyLabels[frequency]}
                </Badge>
              </div>
              {bill.provider_name && (
                <p className="text-sm text-muted-foreground truncate">
                  {bill.provider_name}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(bill)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Template
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(bill)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Valor */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{formatCurrency(bill.amount)}</p>
              {variation !== undefined && variation !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm ${
                    variation > 0 ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  {variation > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{Math.abs(variation).toFixed(1)}%</span>
                </div>
              )}
            </div>
            {lastAmount && (
              <p className="text-sm text-muted-foreground mt-1">
                Última: {formatCurrency(lastAmount)}
              </p>
            )}
          </div>

          {/* Próxima Ocorrência */}
          {nextDate && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Próxima geração</p>
                <p className="text-sm font-medium text-blue-500">
                  {formatDate(nextDate)}
                </p>
              </div>
            </div>
          )}

          {/* Info Adicional */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{BILL_TYPE_LABELS[bill.bill_type]}</Badge>
            {bill.recurrence_config?.end_date && (
              <Badge variant="warning">
                Encerra em {formatDate(bill.recurrence_config.end_date)}
              </Badge>
            )}
            {!bill.recurrence_config?.end_date && (
              <Badge variant="success">Recorrência infinita</Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
