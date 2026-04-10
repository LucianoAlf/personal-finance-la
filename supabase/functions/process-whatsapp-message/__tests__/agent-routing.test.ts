import { describe, expect, it } from 'vitest';

import {
  detectDayContextQuery,
  detectResumoFinanceiroPeriodo,
  isHypotheticalFinancialMessage,
  shouldBypassFlowContext,
} from '../agent-routing';

describe('agent-routing', () => {
  it('routes "o que eu tenho hoje" to direct day context', () => {
    expect(detectDayContextQuery('o que eu tenho hoje?')).toEqual({
      kind: 'day_context',
      dayOffset: 0,
    });
  });

  it('routes "o que tenho amanhã" to direct day context', () => {
    expect(detectDayContextQuery('o que tenho amanha?')).toEqual({
      kind: 'day_context',
      dayOffset: 1,
    });
  });

  it('maps "me dá um resumo do meu dia" to daily summary', () => {
    expect(detectResumoFinanceiroPeriodo('Me dá um resumo do meu dia')).toBe('hoje');
  });

  it('maps "resumo de hoje" to daily summary', () => {
    expect(detectResumoFinanceiroPeriodo('resumo de hoje')).toBe('hoje');
  });

  it('treats hypothetical spending as planning, not a real transaction', () => {
    expect(isHypotheticalFinancialMessage('acho que vou gastar 3 mil em besteira esse mês')).toBe(true);
  });

  it('bypasses active flow context for explicit preference messages', () => {
    expect(shouldBypassFlowContext('Sempre que eu falar mercado, considera alimentação')).toBe(true);
  });

  it('bypasses active flow context for identity preference messages', () => {
    expect(shouldBypassFlowContext('Pode me chamar de Alf')).toBe(true);
  });

  it('does not bypass context for a real method reply', () => {
    expect(shouldBypassFlowContext('Cartão de crédito Nubank')).toBe(false);
  });
});
