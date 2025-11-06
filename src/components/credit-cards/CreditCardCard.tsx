import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCardSummary } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { formatCardNumber, calculateUsagePercentage } from '@/utils/creditCardUtils';
import { CARD_BRANDS, INVOICE_STATUS_LABELS } from '@/constants/creditCards';
import { CreditCardMenu } from './CreditCardMenu';
import { formatLongDateBR } from '@/lib/date-utils';

interface CreditCardCardProps {
  card: CreditCardSummary;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
}

export function CreditCardCard({ card, onClick, onEdit, onArchive, onDelete, onViewDetails }: CreditCardCardProps) {
  const usagePercentage = calculateUsagePercentage(card.used_limit, card.credit_limit);
  
  // Determinar cor da barra de progresso
  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'bg-red-500';
    if (usagePercentage >= 70) return 'bg-orange-500';
    if (usagePercentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Determinar variante do badge
  const getBadgeVariant = (): "default" | "outline" | "success" | "warning" | "danger" | "info" => {
    if (!card.current_invoice_status) return 'default';
    if (card.current_invoice_status === 'paid') return 'success';
    if (card.current_invoice_status === 'overdue') return 'danger';
    if (card.current_invoice_status === 'open') return 'info';
    return 'warning';
  };

  return (
    <Card className="hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
      {/* Header com gradiente */}
      <div
        className="h-48 p-6 text-white flex flex-col justify-between"
        style={{
          background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
        }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-white/30"
              style={{ backgroundColor: CARD_BRANDS[card.brand].color }}
            />
            <span className="text-sm font-medium uppercase">
              {CARD_BRANDS[card.brand].name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {card.current_invoice_status && (
              <Badge variant={getBadgeVariant()} className="bg-white/20 text-white border-white/30">
                {INVOICE_STATUS_LABELS[card.current_invoice_status]}
              </Badge>
            )}
            <CreditCardMenu
              card={card}
              onEdit={onEdit || (() => {})}
              onArchive={onArchive || (() => {})}
              onDelete={onDelete || (() => {})}
              onViewInvoices={() => {}}
            />
          </div>
        </div>

        <div>
          <p className="text-sm opacity-80 mb-1">{card.name}</p>
          <p className="text-xl font-mono">{formatCardNumber(card.last_four_digits)}</p>
        </div>
      </div>

      {/* Corpo do Card */}
      <CardContent className="p-6 space-y-4">
        {/* Informações da Fatura Atual */}
        {card.current_invoice_amount !== undefined && card.current_invoice_amount > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-1">Fatura Atual</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(card.current_invoice_amount)}
            </h3>
            {card.current_due_date && (
              <p className="text-xs text-gray-500 mt-1">
                Vence em {formatLongDateBR(card.current_due_date).replace(/de \d{4}$/, '')}
              </p>
            )}
          </div>
        )}

        {/* Barra de Uso do Limite */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Limite Utilizado</span>
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
          <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
            <span>{formatCurrency(card.used_limit)} usado</span>
            <span>Limite: {formatCurrency(card.credit_limit)}</span>
          </div>
        </div>

        {/* Limite Disponível */}
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">Limite Disponível</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(card.available_limit)}
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
          >
            Ver Detalhes
          </Button>
          {card.current_invoice_amount && card.current_invoice_amount > 0 && (
            <Button 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Abrir modal de pagamento
              }}
            >
              Pagar Fatura
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
