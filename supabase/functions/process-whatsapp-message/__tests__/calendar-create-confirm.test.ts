import { describe, expect, it } from 'vitest';

import { isCalendarConfirmationNo, isCalendarConfirmationYes } from '../calendar-confirm-reply.ts';

describe('calendar-confirm-reply', () => {
  it('detects affirmative replies', () => {
    expect(isCalendarConfirmationYes('sim')).toBe(true);
    expect(isCalendarConfirmationYes('SIM')).toBe(true);
    expect(isCalendarConfirmationYes('sim!')).toBe(true);
    expect(isCalendarConfirmationYes('ok')).toBe(true);
    expect(isCalendarConfirmationYes('pode')).toBe(true);
    expect(isCalendarConfirmationYes('beleza')).toBe(true);
  });

  it('detects negative replies', () => {
    expect(isCalendarConfirmationNo('não')).toBe(true);
    expect(isCalendarConfirmationNo('nao')).toBe(true);
    expect(isCalendarConfirmationNo('cancelar')).toBe(true);
  });

  it('does not treat unrelated text as confirmation', () => {
    expect(isCalendarConfirmationYes('gastei 50')).toBe(false);
    expect(isCalendarConfirmationNo('minha agenda')).toBe(false);
  });
});
