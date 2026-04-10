import { describe, expect, it } from 'vitest';

import { parsePaymentMethodReply } from '../context-detector';

describe('context-detector payment reply parsing', () => {
  it('parses "1, Nu" as credit card + nubank alias', () => {
    expect(parsePaymentMethodReply('1, Nu')).toEqual({
      method: 'credit',
      label: 'Cartão de crédito',
      bankAlias: 'nubank',
    });
  });

  it('parses "1 nubank" as credit card + nubank alias', () => {
    expect(parsePaymentMethodReply('1 nubank')).toEqual({
      method: 'credit',
      label: 'Cartão de crédito',
      bankAlias: 'nubank',
    });
  });

  it('parses "cartão nu" as credit card + nubank alias', () => {
    expect(parsePaymentMethodReply('cartão nu')).toEqual({
      method: 'credit',
      label: 'Cartão de crédito',
      bankAlias: 'nubank',
    });
  });

  it('parses "3" as pix with no bank alias', () => {
    expect(parsePaymentMethodReply('3')).toEqual({
      method: 'pix',
      label: 'PIX',
      bankAlias: null,
    });
  });
});
