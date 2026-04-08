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
  Copy,
  Undo2,
} from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import type { Category } from '@/types/categories';
import type { Account } from '@/types/accounts';
import {
  formatCurrency,
  formatDueDateWithContext,
  getStatusColor,
  getDueDateColor,
  getPriorityColor,
  canMarkAsPaid,
  formatInstallment,
} from '@/utils/billCalculations';
import { BILL_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/payable-bills.types';
import { getBillCategoryName } from '@/utils/billCalculations';

interface BillCardProps {
  bill: PayableBill;
  categories: Category[];
  accounts: Account[];
  onPay?: (bill: PayableBill) => void;
  onEdit?: (bill: PayableBill) => void;
  onDelete?: (bill: PayableBill) => void;
  onCopy?: (bill: PayableBill) => void;
  onConfigReminders?: (bill: PayableBill) => void;
  onRevertPayment?: (bill: PayableBill) => void;
  highlight?: boolean;
}

export function BillCard({
  bill,
  categories,
  accounts,
  onPay,
  onEdit,
  onDelete,
  onCopy,
  onConfigReminders,
  onRevertPayment,
  highlight,
}: BillCardProps) {
  const statusColor = getStatusColor(bill.status);
  // Passar status para não mostrar alerta vermelho em contas pagas
  const dueDateColor = getDueDateColor(bill.due_date, bill.status);
  
  // Buscar categoria pelo ID ou usar fallback
  const getCategoryName = () => {
    if (bill.category_id) {
      const cat = categories.find(c => c.id === bill.category_id);
      if (cat) return cat.name;
    }
    return getBillCategoryName(bill.bill_type);
  };
  const priorityColor = getPriorityColor(bill.priority);
  const paymentAccount = bill.payment_account_id
    ? accounts.find((account) => account.id === bill.payment_account_id)
    : null;
  const paymentSummary = [
    PAYMENT_METHOD_LABELS[bill.payment_method || 'pix'] || bill.payment_method || 'PIX',
    paymentAccount?.name || null,
  ].filter(Boolean).join(' • ');

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
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${highlight ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}>
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
                  <DropdownMenuItem onClick={() => onPay(bill)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar como Paga
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(bill)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onCopy && (
                  <DropdownMenuItem onClick={() => onCopy(bill)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                )}
                {onConfigReminders && bill.status !== 'paid' && (
                  <DropdownMenuItem onClick={() => onConfigReminders(bill)}>
                    <Bell className="mr-2 h-4 w-4" />
                    Lembretes
                  </DropdownMenuItem>
                )}
                {onRevertPayment && (bill.status === 'paid' || bill.status === 'partial') && (
                  <DropdownMenuItem 
                    onClick={() => onRevertPayment(bill)}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Reverter Pagamento
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(bill)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Valor - mostrar paid_amount se conta está paga */}
          <div className="mb-4">
            <p className="text-3xl font-bold">
              {formatCurrency(bill.status === 'paid' && bill.paid_amount ? bill.paid_amount : bill.amount)}
            </p>
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
              bill.status === 'paid' ? 'text-muted-foreground' : 'text-green-500'
            }`} />
            <span className={`text-sm font-medium ${
              dueDateColor === 'danger' ? 'text-red-500' :
              dueDateColor === 'warning' ? 'text-yellow-500' :
              bill.status === 'paid' ? 'text-muted-foreground' : 'text-green-500'
            }`}>
              {formatDueDateWithContext(bill.due_date, bill.status)}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusBadgeVariant(statusColor)}>
              {BILL_STATUS_LABELS[bill.status]}
            </Badge>
            <Badge variant="outline">
              {getCategoryName()}
            </Badge>
            {/* Só mostrar prioridade se NÃO estiver paga */}
            {bill.status !== 'paid' && bill.priority === 'critical' && (
              <Badge variant="danger">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Crítica
              </Badge>
            )}
            {bill.status !== 'paid' && bill.priority === 'high' && (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Alta
              </Badge>
            )}
            {bill.tags && bill.tags.length > 0 && bill.tags.slice(0, 3).map((tag) => (
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
                {PAYMENT_METHOD_LABELS[bill.payment_method] || bill.payment_method}
              </Badge>
            )}
          </div>

          <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Pagamento rapido: <span className="font-medium text-foreground">{paymentSummary}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
