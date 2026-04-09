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
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      {/* Status B3 */}
      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-surface/88 px-3 py-2 shadow-sm dark:bg-surface-elevated/80">
        <Badge
          variant={b3.isOpen ? 'success' : 'outline'}
          className="gap-1.5 border-border/60 bg-surface/70"
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
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {b3.isOpen ? 'Fecha em' : 'Abre em'} {timeUntilNextEvent}
          </span>
        )}
      </div>

      {/* Status Crypto */}
      {showCrypto && (
        <Badge variant="warning" className="gap-1.5 border-warning/30 bg-warning/12 px-3 py-2 text-warning">
          <TrendingUp className="h-3 w-3" />
          <span>Crypto 24/7</span>
        </Badge>
      )}
    </div>
  );
}
