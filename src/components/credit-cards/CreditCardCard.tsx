import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCardSummary } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { calculateUsagePercentage } from '@/utils/creditCardUtils';
import { CARD_BRANDS, INVOICE_STATUS_LABELS } from '@/constants/creditCards';
import { CreditCardMenu } from './CreditCardMenu';
import { useAuth } from '@/hooks/useAuth';

// Mapa de logos por banco (arquivos em /public/logos/banks/)
const BANK_LOGOS: Record<string, string> = {
  'nubank': '/logos/banks/nubank.svg',
  'itau': '/logos/banks/itau.svg',
  'santander': '/logos/banks/santander.svg',
  'c6': '/logos/banks/c6.svg',
};

// Mapa de tamanhos individuais por banco (altura em Tailwind)
// AJUSTE AQUI: h-6=24px, h-8=32px, h-10=40px, h-11=44px, h-12=48px, h-14=56px
const BANK_LOGO_SIZES: Record<string, string> = {
  'nubank': 'h-8',       // Nubank - 32px
  'itau': 'h-11',        // Itaú - 44px
  'santander': 'h-10',   // Santander - 40px
  'c6': 'h-6',           // C6 Bank - 24px
};

// Mapa de logos de bandeiras
const BRAND_LOGOS: Record<string, string> = {
  'mastercard': '/logos/banks/mastercard.svg',
};

// Função para detectar banco pelo nome do cartão
function getBankKey(cardName: string): string | null {
  const name = cardName.toLowerCase();
  if (name.includes('nubank') || name.includes('nu ') || name.includes('roxinho')) return 'nubank';
  if (name.includes('itau') || name.includes('itaú')) return 'itau';
  if (name.includes('santander')) return 'santander';
  if (name.includes('c6')) return 'c6';
  return null;
}

// Retorna o caminho do logo
function getBankLogo(cardName: string): string | null {
  const key = getBankKey(cardName);
  return key ? BANK_LOGOS[key] : null;
}

// Retorna o tamanho do logo
function getBankLogoSize(cardName: string): string {
  const key = getBankKey(cardName);
  return key ? (BANK_LOGO_SIZES[key] || 'h-10') : 'h-10';
}

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

interface CreditCardCardProps {
  card: CreditCardSummary;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  onPayInvoice?: () => void;
}

export function CreditCardCard({ card, onClick, onEdit, onArchive, onDelete, onViewDetails, onPayInvoice }: CreditCardCardProps) {
  const { profile } = useAuth();
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

  const bankLogo = getBankLogo(card.name);
  const brandLogo = BRAND_LOGOS[card.brand];

  return (
    <Card className="hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
      {/* Card Visual - Design limpo estilo cartão real */}
      <div
        className="relative p-5 text-white"
        style={{
          aspectRatio: '1.586 / 1',
          background: card.color || '#8A05BE',
        }}
        onClick={onClick}
      >
        {/* Header: Logo do banco + Menu */}
        <div className="flex justify-between items-start">
          {/* Logo do banco (topo esquerdo) */}
          {bankLogo ? (
            <img 
              src={bankLogo} 
              alt="Logo do banco"
              className={`${getBankLogoSize(card.name)} w-auto`}
            />
          ) : (
            <div className="text-2xl font-bold">{card.name}</div>
          )}

          {/* Menu (topo direito) */}
          <CreditCardMenu
            card={card}
            onEdit={onEdit || (() => {})}
            onArchive={onArchive || (() => {})}
            onDelete={onDelete || (() => {})}
            onViewInvoices={() => {}}
          />
        </div>

        {/* Bandeira (abaixo do logo, à direita) */}
        <div className="absolute top-14 right-5">
          {brandLogo ? (
            <img 
              src={brandLogo} 
              alt={CARD_BRANDS[card.brand].name}
              className="h-7 w-auto"
            />
          ) : (
            <span className="text-xs font-medium uppercase opacity-80">
              {CARD_BRANDS[card.brand].name}
            </span>
          )}
        </div>

        {/* Footer: Nome do usuário + Dígitos + Crédito/Contactless */}
        <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
          <div>
            <div className="text-white text-sm font-medium uppercase tracking-wide">
              {profile?.full_name || card.name}
            </div>
            <div className="text-white/80 text-sm font-mono tracking-widest">
              •••• •••• •••• {card.last_four_digits}
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="text-xs">crédito</span>
            <ContactlessIcon className="h-4 w-4" />
          </div>
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
                Vence dia {card.due_day}
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
          {card.current_invoice_amount && card.current_invoice_amount > 0 && onPayInvoice && (
            <Button 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onPayInvoice();
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
