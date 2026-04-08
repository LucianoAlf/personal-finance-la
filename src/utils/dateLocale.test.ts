import { describe, expect, it } from 'vitest';
import { getDateFnsLocale } from './dateLocale';

describe('getDateFnsLocale', () => {
  it('maps supported locales and falls back to pt-BR', () => {
    expect(getDateFnsLocale('pt-BR').code).toBe('pt-BR');
    expect(getDateFnsLocale('en-US').code).toBe('en-US');
    expect(getDateFnsLocale('es-ES').code).toBe('es');
    expect(getDateFnsLocale('fr-FR').code).toBe('pt-BR');
  });
});
