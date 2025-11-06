import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCardSummary } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard as CreditCardIcon, Calendar, TrendingUp, Wallet, AlertCircle } from 'lucide-react';
import { CARD_BRANDS } from '@/constants/creditCards';
import { calculateUsagePercentage, getUsageColor } from '@/utils/creditCardUtils';

interface CreditCardDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCardSummary;
}

export function CreditCardDetailsDialog({ open, onOpenChange, card }: CreditCardDetailsDialogProps) {
  const usagePercentage =
    typeof card.usage_percentage === 'number'
      ? card.usage_percentage
      : calculateUsagePercentage(card.used_limit, card.credit_limit);
  const usageColor = getUsageColor(usagePercentage);
  const brand = CARD_BRANDS[card.brand];

  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon size={24} />
            Detalhes do Cartão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Visual */}
          <div
            className="rounded-2xl p-6 text-white shadow-lg"
            style={{ backgroundColor: card.color || '#6366f1' }}
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                {brand && (
                  <div className="text-sm font-medium opacity-90 mb-1">{brand.name}</div>
                )}
                <div className="text-2xl font-bold">{card.name}</div>
              </div>
              <div className="text-sm opacity-75">
                {brand?.icon && <span className="text-2xl">{brand.icon}</span>}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm opacity-75 mb-1">Número do Cartão</div>
                <div className="text-xl font-mono tracking-wider">
                  •••• •••• •••• {card.last_four_digits}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs opacity-75 mb-1">Vencimento</div>
                  <div className="text-sm font-medium">Dia {card.due_day}</div>
                </div>
                <div>
                  <div className="text-xs opacity-75 mb-1">Fechamento</div>
                  <div className="text-sm font-medium">Dia {card.closing_day}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Informações de Limite */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Wallet size={16} />
                <span className="text-sm font-medium">Limite Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(card.credit_limit)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <TrendingUp size={16} />
                <span className="text-sm font-medium">Limite Usado</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(card.used_limit)}
              </div>
            </div>
          </div>

          {/* Limite Disponível */}
          <div className={`rounded-lg p-4 ${colorClasses[usageColor]}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">Limite Disponível</span>
              </div>
              <Badge variant={usageColor === 'red' ? 'danger' : usageColor === 'orange' ? 'warning' : 'success'}>
                {usagePercentage}% usado
              </Badge>
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(card.available_limit)}
            </div>
            <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usageColor === 'red'
                    ? 'bg-red-600'
                    : usageColor === 'orange'
                    ? 'bg-orange-600'
                    : usageColor === 'yellow'
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>

          {/* Datas Importantes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-3">
              <Calendar size={16} />
              <span className="text-sm font-medium">Datas Importantes</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Melhor dia para compras:</span>
                <div className="font-semibold text-blue-900">
                  Logo após o dia {card.closing_day}
                </div>
              </div>
              <div>
                <span className="text-blue-600">Próximo vencimento:</span>
                <div className="font-semibold text-blue-900">
                  Dia {card.due_day} do mês
                </div>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              <span className="font-medium">Criado em:</span>{' '}
              {format(new Date(card.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            {card.updated_at && (
              <div>
                <span className="font-medium">Última atualização:</span>{' '}
                {format(new Date(card.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
