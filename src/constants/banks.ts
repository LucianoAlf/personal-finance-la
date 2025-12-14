// Constantes de bancos emissores de cartão de crédito
// Logos serão adicionadas posteriormente em src/assets/bank-logos/

export type BankCode = 
  | 'nubank'
  | 'itau'
  | 'bradesco'
  | 'santander'
  | 'bb'
  | 'caixa'
  | 'inter'
  | 'c6'
  | 'btg'
  | 'xp'
  | 'picpay'
  | 'mercadopago'
  | 'other';

export interface BankInfo {
  code: BankCode;
  name: string;
  shortName: string;
  color: string;
  hasLogo: boolean;
  logoFile?: string;
}

export const BANKS: Record<BankCode, BankInfo> = {
  nubank: {
    code: 'nubank',
    name: 'Nubank',
    shortName: 'Nu',
    color: '#8A05BE',
    hasLogo: true,
    logoFile: 'nubank.svg',
  },
  itau: {
    code: 'itau',
    name: 'Itaú Unibanco',
    shortName: 'Itaú',
    color: '#FF6100',
    hasLogo: true,
    logoFile: 'itau.svg',
  },
  bradesco: {
    code: 'bradesco',
    name: 'Bradesco',
    shortName: 'Bradesco',
    color: '#CC092F',
    hasLogo: false,
    logoFile: 'bradesco.svg',
  },
  santander: {
    code: 'santander',
    name: 'Santander',
    shortName: 'Santander',
    color: '#EC0000',
    hasLogo: true,
    logoFile: 'santander.svg',
  },
  bb: {
    code: 'bb',
    name: 'Banco do Brasil',
    shortName: 'BB',
    color: '#FFEF00',
    hasLogo: false,
    logoFile: 'bb.svg',
  },
  caixa: {
    code: 'caixa',
    name: 'Caixa Econômica Federal',
    shortName: 'Caixa',
    color: '#005CA9',
    hasLogo: false,
    logoFile: 'caixa.svg',
  },
  inter: {
    code: 'inter',
    name: 'Banco Inter',
    shortName: 'Inter',
    color: '#FF7A00',
    hasLogo: false,
    logoFile: 'inter.svg',
  },
  c6: {
    code: 'c6',
    name: 'C6 Bank',
    shortName: 'C6',
    color: '#1A1A1A',
    hasLogo: true,
    logoFile: 'c6.svg',
  },
  btg: {
    code: 'btg',
    name: 'BTG Pactual',
    shortName: 'BTG',
    color: '#001E62',
    hasLogo: false,
    logoFile: 'btg.svg',
  },
  xp: {
    code: 'xp',
    name: 'XP Investimentos',
    shortName: 'XP',
    color: '#FFD100',
    hasLogo: false,
    logoFile: 'xp.svg',
  },
  picpay: {
    code: 'picpay',
    name: 'PicPay',
    shortName: 'PicPay',
    color: '#21C25E',
    hasLogo: false,
    logoFile: 'picpay.svg',
  },
  mercadopago: {
    code: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'MP',
    color: '#00B1EA',
    hasLogo: false,
    logoFile: 'mercadopago.svg',
  },
  other: {
    code: 'other',
    name: 'Outro Banco',
    shortName: 'Outro',
    color: '#6B7280',
    hasLogo: false,
  },
};

// Lista ordenada para select/dropdown
export const BANK_LIST: BankInfo[] = [
  BANKS.nubank,
  BANKS.itau,
  BANKS.bradesco,
  BANKS.santander,
  BANKS.bb,
  BANKS.caixa,
  BANKS.inter,
  BANKS.c6,
  BANKS.btg,
  BANKS.xp,
  BANKS.picpay,
  BANKS.mercadopago,
  BANKS.other,
];

// Helper para buscar banco por código
export function getBankByCode(code: string): BankInfo {
  return BANKS[code as BankCode] || BANKS.other;
}

// Helper para buscar banco por nome (case-insensitive)
export function getBankByName(name: string): BankInfo | undefined {
  const normalized = name.toLowerCase().trim();
  return BANK_LIST.find(
    (bank) =>
      bank.name.toLowerCase().includes(normalized) ||
      bank.shortName.toLowerCase().includes(normalized) ||
      bank.code.includes(normalized)
  );
}
