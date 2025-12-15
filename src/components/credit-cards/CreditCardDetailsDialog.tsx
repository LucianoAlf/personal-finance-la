import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCardSummary } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard as CreditCardIcon, Calendar, TrendingUp, Wallet, AlertCircle } from 'lucide-react';
import { CARD_BRANDS } from '@/constants/creditCards';
import { calculateUsagePercentage, getUsageColor } from '@/utils/creditCardUtils';
import { getBankLogoPath, getBankLogoSizeForDetails } from '@/constants/banks';

// Mapa de logos de bandeiras
const BRAND_LOGOS: Record<string, string> = {
  'mastercard': '/logos/banks/mastercard.svg',
};

// Componente Contactless
function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8.5 14.5c2-2 5-2 7 0"/>
      <path d="M5.5 11.5c4-4 9-4 13 0"/>
      <path d="M2.5 8.5c6-6 13-6 19 0"/>
    </svg>
  );
}

// Componente Chip
function ChipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 36" className={className}>
      <rect x="2" y="2" width="44" height="32" rx="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1"/>
      <rect x="8" y="8" width="12" height="8" fill="#C5A028" />
      <rect x="8" y="20" width="12" height="8" fill="#C5A028" />
      <rect x="24" y="8" width="16" height="20" fill="#E8C547" opacity="0.6"/>
      <line x1="8" y1="18" x2="40" y2="18" stroke="#B8960C" strokeWidth="1"/>
    </svg>
  );
}

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
          {/* Card Visual - Proporção real de cartão de crédito */}
          <div
            className="relative rounded-2xl p-6 text-white shadow-lg"
            style={{ 
              backgroundColor: card.color || '#8A05BE',
              aspectRatio: '1.586 / 1',
            }}
          >
            {/* Header: Logo do banco + Bandeira */}
            <div className="flex justify-between items-start">
              {/* Logo do banco (topo esquerdo) */}
              {getBankLogoPath(card.name) ? (
                <img 
                  src={getBankLogoPath(card.name)!} 
                  alt="Logo do banco"
                  className={`${getBankLogoSizeForDetails(card.name)} w-auto`}
                />
              ) : (
                <div className="h-12" />
              )}

              {/* Bandeira (topo direito) */}
              {BRAND_LOGOS[card.brand] ? (
                <img 
                  src={BRAND_LOGOS[card.brand]} 
                  alt={brand?.name}
                  className="h-8 w-auto"
                />
              ) : (
                <span className="text-sm font-medium uppercase opacity-80">
                  {brand?.name}
                </span>
              )}
            </div>

            {/* Chip (centro-direita) */}
            <div className="absolute top-1/2 right-6 -translate-y-1/2">
              <ChipIcon className="h-10 w-14" />
            </div>

            {/* Footer: Nome + Dígitos + Vencimento/Fechamento + Crédito/Contactless */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-white text-lg font-medium mb-1">{card.name}</div>
                  <div className="text-white/70 text-sm font-mono tracking-widest mb-3">
                    •••• •••• •••• {card.last_four_digits}
                  </div>
                  <div className="flex gap-6 text-xs">
                    <div>
                      <div className="text-white/60 mb-0.5">Vencimento</div>
                      <div className="text-white font-medium">Dia {card.due_day}</div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-0.5">Fechamento</div>
                      <div className="text-white font-medium">Dia {card.closing_day}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <span className="text-xs">crédito</span>
                  <ContactlessIcon className="h-5 w-5" />
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
