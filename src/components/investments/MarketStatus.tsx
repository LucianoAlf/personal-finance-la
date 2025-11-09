// =====================================================
// COMPONENTE: MarketStatus - Indicador status mercado
// =====================================================

import { useMarketStatus } from '@/hooks/useMarketStatus';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp } from 'lucide-react';

interface MarketStatusProps {
  showCrypto?: boolean;
  className?: string;
}

export function MarketStatus({ showCrypto = true, className }: MarketStatusProps) {
  const { b3, crypto, timeUntilNextEvent } = useMarketStatus();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status B3 */}
      <div className="flex items-center gap-2">
        <Badge
          variant={b3.isOpen ? 'success' : 'outline'}
          className="gap-1.5"
        >
          {b3.isOpen ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>B3 Aberta</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-400"></span>
              <span>B3 Fechada</span>
            </>
          )}
        </Badge>
        {timeUntilNextEvent && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {b3.isOpen ? 'Fecha em' : 'Abre em'} {timeUntilNextEvent}
          </span>
        )}
      </div>

      {/* Status Crypto */}
      {showCrypto && (
        <Badge variant="warning" className="gap-1.5">
          <TrendingUp className="h-3 w-3" />
          <span>Crypto 24/7</span>
        </Badge>
      )}
    </div>
  );
}
