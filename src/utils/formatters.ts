import {
  formatCompactNumber as formatCompactNumberIntl,
  formatCurrency as formatCurrencyIntl,
  formatDate as formatDateIntl,
  formatPercentage as formatPercentageIntl,
  formatRelativeDate as formatRelativeDateIntl,
} from '@/lib/formatters';
import { getAppliedUserPreferences } from './appliedUserPreferences';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateOnly = (date: string | Date): Date => {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }

  if (DATE_ONLY_REGEX.test(date)) {
    return new Date(`${date}T12:00:00`);
  }

  return new Date(date);
};

export const formatDateOnly = (date: string | Date): string => {
  const d = parseDateOnly(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (value: number): string => {
  const preferences = getAppliedUserPreferences();
  return formatCurrencyIntl(value, preferences.currency, preferences.numberFormat);
};

export const formatDate = (date: Date | string, pattern: string = 'dd/MM/yyyy'): string => {
  const preferences = getAppliedUserPreferences();
  const normalizedPattern =
    pattern === 'MM/dd/yyyy'
      ? 'MM/DD/YYYY'
      : pattern === 'yyyy-MM-dd'
        ? 'YYYY-MM-DD'
        : preferences.dateFormat;

  return formatDateIntl(date, normalizedPattern, preferences.language, preferences.timezone);
};

export const formatPercentage = (value: number): string => {
  const preferences = getAppliedUserPreferences();
  return formatPercentageIntl(value, preferences.numberFormat, false);
};

export const formatCompactNumber = (value: number): string => {
  const preferences = getAppliedUserPreferences();
  return formatCompactNumberIntl(value, preferences.numberFormat);
};

export const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Formatar data para input (YYYY-MM-DD)
export const formatDateForInput = (date: string | Date): string => {
  return formatDateOnly(date);
};

// Formatar data relativa (hoje, ontem, etc)
export const formatRelativeDate = (date: string | Date): string => {
  const preferences = getAppliedUserPreferences();
  return formatRelativeDateIntl(date, preferences.language, preferences.timezone);
};
