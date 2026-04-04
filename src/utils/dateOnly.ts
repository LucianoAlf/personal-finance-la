export function parseDateOnlyAsLocal(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  // Date-only values must be interpreted in local time to avoid month/day shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }

  return new Date(value);
}

export function toYearMonthKey(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 7);
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

