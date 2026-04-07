import { formatDateOnly } from '@/utils/formatters';

export function buildInvestmentTransactionDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getTime());
  }

  return new Date(`${dateInput}T12:00:00.000Z`);
}

export function getTransactionCalendarKey(transactionDate: string | Date): string {
  return formatDateOnly(transactionDate);
}
