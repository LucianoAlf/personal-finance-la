// src/hooks/useUserPreferences.ts
// Hook que retorna as preferências de formatação do usuário (currency, locale, dateFormat)

import { useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';
import {
  DEFAULT_APPLIED_USER_PREFERENCES,
  getAppliedUserPreferences,
} from '@/utils/appliedUserPreferences';
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
  const appliedPreferences = getAppliedUserPreferences();

  // Valores padrão se ainda não carregou
  const currency =
    userSettings?.currency || appliedPreferences.currency || DEFAULT_APPLIED_USER_PREFERENCES.currency;
  const locale =
    userSettings?.language || appliedPreferences.language || DEFAULT_APPLIED_USER_PREFERENCES.language;
  const dateFormat =
    userSettings?.date_format ||
    appliedPreferences.dateFormat ||
    DEFAULT_APPLIED_USER_PREFERENCES.dateFormat;
  const numberFormat =
    userSettings?.number_format ||
    appliedPreferences.numberFormat ||
    DEFAULT_APPLIED_USER_PREFERENCES.numberFormat;
  const timezone =
    userSettings?.timezone ||
    appliedPreferences.timezone ||
    DEFAULT_APPLIED_USER_PREFERENCES.timezone;

  // Funções helpers pré-configuradas com as preferências do usuário
  const helpers = useMemo(() => {
    return {
      /**
       * Formata valor monetário com a moeda e locale do usuário
       */
      formatCurrency: (value: number | string) => {
        return formatCurrencyUtil(value, currency, numberFormat);
      },

      /**
       * Formata data com o formato preferido do usuário
       */
      formatDate: (date: Date | string | number) => {
        return formatDateUtil(date, dateFormat, locale, timezone);
      },

      /**
       * Formata data e hora com o formato preferido do usuário
       */
      formatDateTime: (date: Date | string | number) => {
        return formatDateTimeUtil(date, dateFormat, locale, timezone);
      },

      /**
       * Formata horário com o locale do usuário
       */
      formatTime: (date: Date | string | number, includeSeconds: boolean = false) => {
        return formatTimeUtil(date, locale, timezone, includeSeconds);
      },

      /**
       * Formata data de forma relativa (ex: "há 2 dias")
       */
      formatRelativeDate: (date: Date | string | number) => {
        return formatRelativeDateUtil(date, locale, timezone);
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
        return formatPercentageUtil(value, numberFormat, isDecimal);
      },

      /**
       * Formata número de forma compacta (1.5K, 2.3M)
       */
      formatCompactNumber: (value: number) => {
        return formatCompactNumberUtil(value, numberFormat);
      },
    };
  }, [currency, locale, dateFormat, numberFormat, timezone]);

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
