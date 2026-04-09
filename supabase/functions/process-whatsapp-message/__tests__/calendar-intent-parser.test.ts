import { describe, it, expect } from 'vitest';
import {
  isCalendarIntent,
  parseCalendarIntent,
} from '../calendar-intent-parser';

describe('calendar-intent-parser', () => {
  describe('isCalendarIntent', () => {
    it('detects "agenda" keyword', () => {
      expect(isCalendarIntent('minha agenda')).toBe(true);
    });

    it('detects "compromisso" keyword', () => {
      expect(isCalendarIntent('tenho um compromisso amanha')).toBe(true);
    });

    it('detects non-financial reminder wording for agenda flow', () => {
      expect(isCalendarIntent('me lembra da reuniao as 9h')).toBe(true);
    });

    it('detects "remarcar" keyword', () => {
      expect(isCalendarIntent('quero remarcar a reuniao')).toBe(true);
    });

    it('detects "cancelar compromisso" phrase', () => {
      expect(isCalendarIntent('cancelar compromisso de amanha')).toBe(true);
    });

    it('detects "agendar" keyword', () => {
      expect(isCalendarIntent('quero agendar uma consulta')).toBe(true);
    });

    it('rejects unrelated messages', () => {
      expect(isCalendarIntent('gastei 50 no mercado')).toBe(false);
    });

    it('rejects financial reminder phrases even with "lembra"', () => {
      expect(isCalendarIntent('me lembra de pagar a luz dia 10')).toBe(false);
    });

    it('rejects financial reminder phrases with "lembrete"', () => {
      expect(isCalendarIntent('lembrete do aluguel')).toBe(false);
    });

    it('rejects due-date financial messages that should stay in bills pipeline', () => {
      expect(isCalendarIntent('a netflix vence dia 15')).toBe(false);
    });

    it('rejects recurring payment language that belongs to payable bills', () => {
      expect(isCalendarIntent('me lembra do aluguel todo mes')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isCalendarIntent('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isCalendarIntent('   ')).toBe(false);
    });
  });

  describe('parseCalendarIntent', () => {
    it('parses create intent with "tenho"', () => {
      const result = parseCalendarIntent('amanha tenho reuniao com dentista as 14h');
      expect(result.intent).toBe('create');
      expect(result.rawText).toBe('amanha tenho reuniao com dentista as 14h');
    });

    it('parses create intent with reminder offset "meia hora antes"', () => {
      const result = parseCalendarIntent('compromisso amanha, me lembra meia hora antes');
      expect(result.intent).toBe('create');
      expect(result.reminderOffsetMinutes).toBe(30);
    });

    it('parses create intent with reminder offset "15 minutos antes"', () => {
      const result = parseCalendarIntent('tenho reuniao, me lembra 15 minutos antes');
      expect(result.intent).toBe('create');
      expect(result.reminderOffsetMinutes).toBe(15);
    });

    it('parses create intent with reminder offset "1 hora antes"', () => {
      const result = parseCalendarIntent('tenho compromisso, me lembra 1 hora antes');
      expect(result.intent).toBe('create');
      expect(result.reminderOffsetMinutes).toBe(60);
    });

    it('parses list intent with "agenda" alone', () => {
      const result = parseCalendarIntent('agenda');
      expect(result.intent).toBe('list');
    });

    it('parses list intent with "minha agenda"', () => {
      const result = parseCalendarIntent('minha agenda');
      expect(result.intent).toBe('list');
    });

    it('parses list intent with "o que tenho"', () => {
      const result = parseCalendarIntent('o que tenho essa semana?');
      expect(result.intent).toBe('list');
    });

    it('parses cancel intent', () => {
      const result = parseCalendarIntent('cancelar compromisso de amanha');
      expect(result.intent).toBe('cancel');
    });

    it('parses reschedule intent with "remarcar"', () => {
      const result = parseCalendarIntent('remarcar reuniao para sexta');
      expect(result.intent).toBe('reschedule');
    });

    it('parses reschedule intent with "adiar"', () => {
      const result = parseCalendarIntent('adiar o compromisso');
      expect(result.intent).toBe('reschedule');
    });

    it('extracts title from create message', () => {
      const result = parseCalendarIntent('tenho consulta no medico');
      expect(result.intent).toBe('create');
      expect(result.title).toBeTruthy();
      expect(result.title!.length).toBeGreaterThan(0);
    });

    it('defaults title to "Compromisso" when nothing extractable', () => {
      const result = parseCalendarIntent('tenho compromisso');
      expect(result.intent).toBe('create');
      expect(result.title).toBe('Compromisso');
    });

    it('keeps existing list regression for agenda wording', () => {
      const result = parseCalendarIntent('minha agenda de amanha');
      expect(result.intent).toBe('list');
    });
  });
});
