import { describe, expect, it } from 'vitest';

import {
  parsePaymentMethodReply,
  shouldStayInCreditCardContext,
} from '../context-detector';

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

describe('context-detector credit card context guard', () => {
  it('keeps explicit credit card follow-up inside credit_card_context', () => {
    expect(shouldStayInCreditCardContext('qual meu limite do nubank?')).toBe(true);
    expect(shouldStayInCreditCardContext('me mostra a fatura')).toBe(true);
    expect(shouldStayInCreditCardContext('compras de novembro')).toBe(true);
  });

  it('releases generic help and global intents from credit_card_context', () => {
    expect(shouldStayInCreditCardContext('me ajuda')).toBe(false);
    expect(shouldStayInCreditCardContext('meu saldo')).toBe(false);
    expect(shouldStayInCreditCardContext('o que eu tenho hoje?')).toBe(false);
    expect(shouldStayInCreditCardContext('valeu aninha')).toBe(false);
  });
});
