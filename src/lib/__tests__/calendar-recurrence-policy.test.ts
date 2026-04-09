import { describe, expect, it } from 'vitest';

/** Espelha a regra "mês sem esse dia -> skip" (sem clamp para último dia). */
function monthHasCalendarDay(year: number, monthIndex0: number, day: number): boolean {
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  return day >= 1 && day <= last;
}

/**
 * Sufixo alinhado ao estilo `trim(both '"' from to_json(timestamptz)::text)` quando o
 * instante já está como string ISO estável (o servidor pode normalizar offset; o formato
 * exato do Postgres pode divergir de `toISOString()` em edge cases de TZ).
 */
function occurrenceKeyFromEventAndIsoInstant(eventId: string, isoInstant: string): string {
  const quoted = JSON.stringify(isoInstant);
  const suffix = quoted.slice(1, Math.max(1, quoted.length - 1));
  return `${eventId}:${suffix}`;
}

describe('monthly recurrence policy (V1)', () => {
  it('skips February when day is 30', () => {
    expect(monthHasCalendarDay(2026, 1, 30)).toBe(false);
  });

  it('allows January 31', () => {
    expect(monthHasCalendarDay(2026, 0, 31)).toBe(true);
  });

  it('skips day 31 in April', () => {
    expect(monthHasCalendarDay(2026, 3, 31)).toBe(false);
  });
});

describe('occurrence_key shape (client-side mirror)', () => {
  it('prefixa event_id e separador, sem espaços', () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    const key = occurrenceKeyFromEventAndIsoInstant(eventId, '2026-01-15T12:00:00.000Z');
    expect(key.startsWith(`${eventId}:`)).toBe(true);
    expect(key).not.toMatch(/\s/);
  });
});
