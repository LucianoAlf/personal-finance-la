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
import {
  MoreVertical,
  CheckCircle2,
  Edit,
  Trash2,
  Calendar,
  CreditCard,
  Repeat,
  Split,
  AlertTriangle,
  Bell,
  Tag as TagIcon,
} from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import {
  formatCurrency,
  formatDueDateWithContext,
  getStatusColor,
  getDueDateColor,
  getPriorityColor,
  canMarkAsPaid,
  formatInstallment,
} from '@/utils/billCalculations';
import { BILL_STATUS_LABELS, BILL_TYPE_LABELS } from '@/types/payable-bills.types';

interface BillCardProps {
  bill: PayableBill;
  onPay?: (bill: PayableBill) => void;
  onEdit?: (bill: PayableBill) => void;
  onDelete?: (bill: PayableBill) => void;
  onConfigReminders?: (bill: PayableBill) => void;
}

export function BillCard({ bill, onPay, onEdit, onDelete, onConfigReminders }: BillCardProps) {
  const statusColor = getStatusColor(bill.status);
  const dueDateColor = getDueDateColor(bill.due_date);
  const priorityColor = getPriorityColor(bill.priority);

  const getStatusBadgeVariant = (color: string) => {
    switch (color) {
      case 'success':
        return 'success';
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'outline';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">
                  {bill.description}
                </h3>
                {bill.is_recurring && (
                  <Badge variant="outline" className="shrink-0">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recorrente
                  </Badge>
                )}
                {bill.is_installment && (
                  <Badge variant="outline" className="shrink-0">
                    <Split className="h-3 w-3 mr-1" />
                    {formatInstallment(bill.installment_number!, bill.installment_total!)}
                  </Badge>
                )}
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
                {canMarkAsPaid(bill) && onPay && (
                  <>
                    <DropdownMenuItem onClick={() => onPay(bill)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como Paga
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(bill)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onConfigReminders && bill.status !== 'paid' && (
                  <DropdownMenuItem onClick={() => onConfigReminders(bill)}>
                    <Bell className="mr-2 h-4 w-4" />
                    Configurar Lembretes
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(bill)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Valor */}
          <div className="mb-4">
            <p className="text-3xl font-bold">{formatCurrency(bill.amount)}</p>
            {bill.status === 'partial' && bill.paid_amount && (
              <p className="text-sm text-muted-foreground mt-1">
                Pago: {formatCurrency(bill.paid_amount)} (
                {Math.round((bill.paid_amount / bill.amount) * 100)}%)
              </p>
            )}
          </div>

          {/* Vencimento */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className={`h-4 w-4 ${
              dueDateColor === 'danger' ? 'text-red-500' :
              dueDateColor === 'warning' ? 'text-yellow-500' :
              'text-green-500'
            }`} />
            <span className={`text-sm font-medium ${
              dueDateColor === 'danger' ? 'text-red-500' :
              dueDateColor === 'warning' ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {formatDueDateWithContext(bill.due_date)}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusBadgeVariant(statusColor)}>
              {BILL_STATUS_LABELS[bill.status]}
            </Badge>
            <Badge variant="outline">
              {BILL_TYPE_LABELS[bill.bill_type]}
            </Badge>
            {bill.priority === 'critical' && (
              <Badge variant="danger">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Crítica
              </Badge>
            )}
            {bill.priority === 'high' && (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Alta
              </Badge>
            )}
            {bill.tags && bill.tags.length > 0 && bill.tags.slice(0, 3).map((tag: any) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                <TagIcon className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>
            ))}
            {bill.tags && bill.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">+{bill.tags.length - 3}</Badge>
            )}
            {bill.payment_method && (
              <Badge variant="outline">
                <CreditCard className="h-3 w-3 mr-1" />
                {bill.payment_method === 'pix' ? 'PIX' : bill.payment_method}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
