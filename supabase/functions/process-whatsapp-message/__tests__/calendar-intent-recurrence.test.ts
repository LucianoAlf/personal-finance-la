import { describe, it, expect } from 'vitest';
import { isCalendarIntent, parseCalendarIntent } from '../calendar-intent-parser';

describe('parseCalendarIntent recurrenceHint', () => {
  it('detects todo dia (daily)', () => {
    const result = parseCalendarIntent('tenho yoga todo dia as 7h');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'daily' });
  });

  it('detects todos os dias (daily)', () => {
    const result = parseCalendarIntent('marcar standup todos os dias');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'daily' });
  });

  it('detects toda semana (weekly)', () => {
    const result = parseCalendarIntent('tenho terapia toda semana');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'weekly' });
  });

  it('detects todas as semanas (weekly)', () => {
    const result = parseCalendarIntent('agendar revisão todas as semanas');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'weekly' });
  });

  it('detects todo mês (monthly)', () => {
    const result = parseCalendarIntent('tenho corte de cabelo todo mês');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'monthly' });
  });

  it('detects todo mes without accent (monthly)', () => {
    const result = parseCalendarIntent('marcar dentista todo mes');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'monthly' });
  });

  it('detects a cada N semanas', () => {
    const result = parseCalendarIntent('tenho pilates a cada 2 semanas');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'weekly', interval: 2 });
  });

  it('detects a cada N dias', () => {
    const result = parseCalendarIntent('compromisso a cada 3 dias');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'daily', interval: 3 });
  });

  it('detects a cada N meses', () => {
    const result = parseCalendarIntent('tenho checkup a cada 6 meses');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'monthly', interval: 6 });
  });

  it('prefers a cada N over fixed todo dia when both could apply', () => {
    const result = parseCalendarIntent('tenho algo a cada 2 dias todo dia');
    expect(result.recurrenceHint).toEqual({ frequency: 'daily', interval: 2 });
  });

  it('plain create has no recurrenceHint', () => {
    const result = parseCalendarIntent('amanha tenho reuniao com dentista as 14h');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toBeUndefined();
  });

  it('non-create intents do not include recurrenceHint', () => {
    expect(parseCalendarIntent('agenda').recurrenceHint).toBeUndefined();
    expect(parseCalendarIntent('cancelar compromisso de amanha').recurrenceHint).toBeUndefined();
    expect(parseCalendarIntent('remarcar reuniao para sexta').recurrenceHint).toBeUndefined();
  });
});

describe('calendar recurrence routing guardrails', () => {
  it('real WhatsApp route reaches daily recurrence when calendar keywords are present', () => {
    const text = 'quero agendar yoga todo dia as 7h';
    expect(isCalendarIntent(text)).toBe(true);
    expect(parseCalendarIntent(text).recurrenceHint).toEqual({ frequency: 'daily' });
  });

  it('real WhatsApp route reaches monthly recurrence via a cada N meses wording', () => {
    const text = 'quero agendar checkup a cada 6 meses';
    expect(isCalendarIntent(text)).toBe(true);
    expect(parseCalendarIntent(text).recurrenceHint).toEqual({ frequency: 'monthly', interval: 6 });
  });

  it('keeps financial recurring todo mes wording out of the calendar router', () => {
    expect(isCalendarIntent('me lembra do aluguel todo mes')).toBe(false);
  });
});
