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

// ============================================
// SISTEMA CENTRALIZADO DE LOGOS DE BANCOS
// Use estas funções em TODOS os componentes
// ============================================

// Mapa de tamanhos individuais por banco (altura em Tailwind)
// Tamanhos calibrados para visual consistente no cartão
const BANK_LOGO_SIZES: Record<BankCode, { card: string; details: string }> = {
  'nubank': { card: 'h-8', details: 'h-10' },
  'itau': { card: 'h-11', details: 'h-14' },
  'santander': { card: 'h-10', details: 'h-12' },
  'c6': { card: 'h-6', details: 'h-8' },
  'bradesco': { card: 'h-10', details: 'h-12' },
  'bb': { card: 'h-10', details: 'h-12' },
  'caixa': { card: 'h-10', details: 'h-12' },
  'inter': { card: 'h-10', details: 'h-12' },
  'btg': { card: 'h-10', details: 'h-12' },
  'xp': { card: 'h-10', details: 'h-12' },
  'picpay': { card: 'h-10', details: 'h-12' },
  'mercadopago': { card: 'h-10', details: 'h-12' },
  'other': { card: 'h-10', details: 'h-12' },
};

// Detecta o banco pelo nome do cartão
export function detectBankFromCardName(cardName: string): BankCode | null {
  const name = cardName.toLowerCase();
  if (name.includes('nubank') || name.includes('nu ') || name.includes('roxinho')) return 'nubank';
  if (name.includes('itau') || name.includes('itaú')) return 'itau';
  if (name.includes('santander')) return 'santander';
  if (name.includes('c6')) return 'c6';
  if (name.includes('bradesco')) return 'bradesco';
  if (name.includes('banco do brasil') || name.includes(' bb ') || name.includes('bb ')) return 'bb';
  if (name.includes('caixa')) return 'caixa';
  if (name.includes('inter')) return 'inter';
  if (name.includes('btg')) return 'btg';
  if (name.includes('xp ') || name.includes('xp.')) return 'xp';
  if (name.includes('picpay')) return 'picpay';
  if (name.includes('mercado pago') || name.includes('mercadopago')) return 'mercadopago';
  return null;
}

// Retorna o caminho do logo do banco (ou null se não tiver)
export function getBankLogoPath(cardName: string): string | null {
  const bankCode = detectBankFromCardName(cardName);
  if (!bankCode) return null;
  
  const bank = BANKS[bankCode];
  if (!bank.hasLogo || !bank.logoFile) return null;
  
  return `/logos/banks/${bank.logoFile}`;
}

// Retorna o tamanho do logo para o card de listagem
export function getBankLogoSizeForCard(cardName: string): string {
  const bankCode = detectBankFromCardName(cardName);
  return bankCode ? BANK_LOGO_SIZES[bankCode].card : 'h-10';
}

// Retorna o tamanho do logo para o dialog de detalhes
export function getBankLogoSizeForDetails(cardName: string): string {
  const bankCode = detectBankFromCardName(cardName);
  return bankCode ? BANK_LOGO_SIZES[bankCode].details : 'h-12';
}
