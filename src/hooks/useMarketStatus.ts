// =====================================================
// HOOK: useMarketStatus - Status do mercado em tempo real
// =====================================================

import { useState, useEffect } from 'react';
import { isB3MarketOpen, isCryptoMarketOpen, formatTimeUntil } from '@/utils/market-hours';
import type { MarketHours } from '@/utils/market-hours';

export interface MarketStatusReturn {
  b3: MarketHours;
  crypto: MarketHours;
  timeUntilNextEvent: string | null;
  isAnyMarketOpen: boolean;
}

export function useMarketStatus(): MarketStatusReturn {
  const [b3Status, setB3Status] = useState<MarketHours>(isB3MarketOpen());
  const [cryptoStatus] = useState<MarketHours>(isCryptoMarketOpen());
  const [timeUntil, setTimeUntil] = useState<string | null>(null);

  useEffect(() => {
    // Atualizar status a cada minuto
    const updateStatus = () => {
      const newB3Status = isB3MarketOpen();
      setB3Status(newB3Status);

      // Calcular tempo até próximo evento
      if (newB3Status.nextOpen) {
        setTimeUntil(formatTimeUntil(newB3Status.nextOpen));
      } else if (newB3Status.nextClose) {
        setTimeUntil(formatTimeUntil(newB3Status.nextClose));
      } else {
        setTimeUntil(null);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60 * 1000); // 1 minuto

    return () => clearInterval(interval);
  }, []);

  return {
    b3: b3Status,
    crypto: cryptoStatus,
    timeUntilNextEvent: timeUntil,
    isAnyMarketOpen: b3Status.isOpen || cryptoStatus.isOpen,
  };
}
