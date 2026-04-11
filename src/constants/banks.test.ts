import { describe, expect, it } from 'vitest';

import {
  getBankLogoClassForCard,
  getBankLogoClassForDetails,
  getBankLogoPath,
} from './banks';

describe('bank logo layout helpers', () => {
  it('keeps Mercado Pago card logos within the same proportional envelope as the other cards', () => {
    const cardClassName = getBankLogoClassForCard('Mercado Pago');
    const detailsClassName = getBankLogoClassForDetails('Mercado Pago');

    expect(cardClassName).toBe('h-10 w-auto');
    expect(detailsClassName).toBe('h-12 w-auto');
    expect(cardClassName).not.toContain('-ml-3');
    expect(cardClassName).not.toContain('-mt-3');
  });

  it('uses the trimmed Mercado Pago wordmark asset so the logo fills the same visual area as the others', () => {
    expect(getBankLogoPath('Mercado Pago')).toBe('/logos/Mercado Pago.svg');
  });
});
