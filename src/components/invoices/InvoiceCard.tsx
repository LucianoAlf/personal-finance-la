import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCardInvoice, CreditCard } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { formatCardNumber, calculateUsagePercentage } from '@/utils/creditCardUtils';
import { INVOICE_STATUS_LABELS } from '@/constants/creditCards';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatLongDateBR } from '@/lib/date-utils';
import { FileText, Lock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface InvoiceCardProps {
  invoice: CreditCardInvoice;
  card: CreditCard;
  isHighlighted?: boolean;
  onViewDetails: () => void;
  onPayInvoice?: () => void;
}

export function InvoiceCard({ invoice, card, isHighlighted = false, onViewDetails, onPayInvoice }: InvoiceCardProps) {
  const usagePercentage = calculateUsagePercentage(invoice.total_amount, card.credit_limit);
  const daysUntilDue = differenceInDays(new Date(invoice.due_date), new Date());
  const isOverdue = invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'bg-red-500';
    if (usagePercentage >= 70) return 'bg-orange-500';
    if (usagePercentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Determinar variante do badge
  const getBadgeVariant = (): "default" | "outline" | "success" | "warning" | "danger" | "info" => {
    if (invoice.status === 'paid') return 'success';
    if (invoice.status === 'overdue') return 'danger';
    if (invoice.status === 'open') return 'info';
    if (invoice.status === 'closed') return 'warning';
    return 'default';
  };

  // Determinar ícone do status
  const getStatusIcon = () => {
    switch (invoice.status) {
      case 'open':
        return <FileText size={16} className="text-blue-600" />;
      case 'closed':
        return <Lock size={16} className="text-orange-600" />;
      case 'paid':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'overdue':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Card
        className={`hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${
          isOverdue ? 'border-red-500 border-2' : ''
        } ${isPaid ? 'opacity-75' : ''} ${
          isHighlighted ? 'ring-2 ring-primary ring-offset-2 shadow-2xl animate-pulse' : ''
        }`}
      >
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-600">{card.name}</span>
              <span className="text-xs text-gray-400">{formatCardNumber(card.last_four_digits)}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Fatura de {format(new Date(invoice.reference_month), 'MMMM yyyy', { locale: ptBR })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getBadgeVariant()}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Badge>
          </div>
        </div>

        {/* Valores */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Valor Total</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar size={14} />
              <span>Vencimento</span>
            </div>
            <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {formatLongDateBR(invoice.due_date).replace(/de \d{4}$/, '')}
            </span>
          </div>

          {!isPaid && daysUntilDue >= 0 && (
            <div className="text-xs text-gray-500">
              {daysUntilDue === 0
                ? 'Vence hoje!'
                : daysUntilDue === 1
                ? 'Vence amanhã'
                : `Vence em ${daysUntilDue} dias`}
            </div>
          )}

          {isOverdue && (
            <div className="text-xs text-red-600 font-semibold">
              Vencida há {Math.abs(daysUntilDue)} dias
            </div>
          )}
        </div>

        {/* Barra de Uso do Limite */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Uso do Limite</span>
            <span className={usagePercentage >= 80 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
              {usagePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
            <span>{formatCurrency(invoice.total_amount)} usado</span>
            <span>Limite: {formatCurrency(card.credit_limit)}</span>
          </div>
        </div>

        {/* Contador de Transações - será calculado via hook */}
        <div className="text-sm text-gray-600">
          Ver transações
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onViewDetails}>
            Ver Detalhes
          </Button>
          {!isPaid && onPayInvoice && (
            <Button className="flex-1" onClick={onPayInvoice}>
              Pagar Fatura
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
