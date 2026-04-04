// src/hooks/useUserPreferences.ts
// Hook que retorna as preferências de formatação do usuário (currency, locale, dateFormat)

import { useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';
import {
  formatCurrency as formatCurrencyUtil,
  formatDate as formatDateUtil,
  formatNumber as formatNumberUtil,
  formatDateTime as formatDateTimeUtil,
  formatTime as formatTimeUtil,
  formatRelativeDate as formatRelativeDateUtil,
  formatPercentage as formatPercentageUtil,
  formatCompactNumber as formatCompactNumberUtil,
} from '@/lib/formatters';

/**
 * Hook que retorna as preferências do usuário e helpers de formatação
 * Centraliza acesso às configurações de formato (moeda, data, número, locale)
 */
export function useUserPreferences() {
  const { userSettings, loading } = useSettings();

  // Valores padrão se ainda não carregou
  const currency = userSettings?.currency || 'BRL';
  const locale = userSettings?.language || 'pt-BR';
  const dateFormat = userSettings?.date_format || 'DD/MM/YYYY';
  const numberFormat = userSettings?.number_format || 'pt-BR';
  const timezone = userSettings?.timezone || 'America/Sao_Paulo';

  // Funções helpers pré-configuradas com as preferências do usuário
  const helpers = useMemo(() => {
    return {
      /**
       * Formata valor monetário com a moeda e locale do usuário
       */
      formatCurrency: (value: number | string) => {
        return formatCurrencyUtil(value, currency, locale);
      },

      /**
       * Formata data com o formato preferido do usuário
       */
      formatDate: (date: Date | string | number) => {
        return formatDateUtil(date, dateFormat, locale);
      },

      /**
       * Formata data e hora com o formato preferido do usuário
       */
      formatDateTime: (date: Date | string | number) => {
        return formatDateTimeUtil(date, dateFormat, locale);
      },

      /**
       * Formata horário com o locale do usuário
       */
      formatTime: (date: Date | string | number, includeSeconds: boolean = false) => {
        return formatTimeUtil(date, locale, includeSeconds);
      },

      /**
       * Formata data de forma relativa (ex: "há 2 dias")
       */
      formatRelativeDate: (date: Date | string | number) => {
        return formatRelativeDateUtil(date, locale);
      },

      /**
       * Formata número com o formato do usuário
       */
      formatNumber: (value: number | string, decimals: number = 2) => {
        return formatNumberUtil(value, numberFormat, decimals);
      },

      /**
       * Formata percentual com o locale do usuário
       */
      formatPercentage: (value: number, isDecimal: boolean = false) => {
        return formatPercentageUtil(value, locale, isDecimal);
      },

      /**
       * Formata número de forma compacta (1.5K, 2.3M)
       */
      formatCompactNumber: (value: number) => {
        return formatCompactNumberUtil(value, locale);
      },
    };
  }, [currency, locale, dateFormat, numberFormat]);

  return {
    // Preferências brutas
    preferences: {
      currency,
      locale,
      dateFormat,
      numberFormat,
      timezone,
    },

    // Status
    loading,

    // Helpers de formatação pré-configurados
    ...helpers,
  };
}
