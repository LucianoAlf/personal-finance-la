import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBankByCode, type BankCode } from '@/constants/banks';

// Importar logos disponíveis
import nubankLogo from '@/assets/bank-logos/Logo Nu_SVG.svg';
import itauLogo from '@/assets/bank-logos/Logo Itaú  _SVG.svg';

// Mapa de logos importados
const LOGO_MAP: Partial<Record<BankCode, string>> = {
  nubank: nubankLogo,
  itau: itauLogo,
  // Adicionar mais logos conforme forem disponibilizados
};

interface BankLogoProps {
  bankCode: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const ICON_SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

export function BankLogo({ 
  bankCode, 
  size = 'md', 
  className,
  showFallback = true 
}: BankLogoProps) {
  const bank = getBankByCode(bankCode);
  const logoSrc = LOGO_MAP[bankCode as BankCode];
  const hasLogo = !!logoSrc;

  // Bancos que precisam de fundo colorido (logos brancos)
  const needsColoredBackground = ['itau', 'bradesco', 'santander', 'bb', 'caixa'].includes(bankCode);
  
  if (hasLogo) {
    return (
      <div 
        className={cn(
          SIZE_MAP[size],
          'rounded-lg overflow-hidden flex items-center justify-center p-1',
          needsColoredBackground ? '' : 'bg-white border border-white/20',
          className
        )}
        style={needsColoredBackground ? { backgroundColor: bank.color } : undefined}
      >
        <img 
          src={logoSrc} 
          alt={`Logo ${bank.name}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error('Erro ao carregar logo:', logoSrc);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (!showFallback) {
    return null;
  }

  // Fallback: círculo colorido com inicial ou ícone
  return (
    <div 
      className={cn(
        SIZE_MAP[size],
        'rounded-lg flex items-center justify-center',
        className
      )}
      style={{ backgroundColor: bank.color }}
    >
      {bank.code === 'other' ? (
        <Building2 
          size={ICON_SIZE_MAP[size]} 
          className="text-white"
        />
      ) : (
        <span 
          className="font-bold text-white"
          style={{ fontSize: ICON_SIZE_MAP[size] * 0.6 }}
        >
          {bank.shortName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// Componente para exibir banco com nome
interface BankBadgeProps {
  bankCode: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function BankBadge({ bankCode, size = 'sm', className }: BankBadgeProps) {
  const bank = getBankByCode(bankCode);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BankLogo bankCode={bankCode} size={size} />
      <span className="text-sm font-medium text-gray-700">
        {bank.shortName}
      </span>
    </div>
  );
}
