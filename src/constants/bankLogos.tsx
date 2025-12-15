// Imports estáticos (seguro em Vite + ESM)
import type { ComponentType } from 'react';
// Logos SVG customizados (inline)
import { 
  NubankLogo,
  ItauLogo,
  BradescoLogo,
  SantanderLogo,
  BancoDoBrasilLogo,
  CaixaLogo,
  InterLogo,
  C6Logo,
} from '@/assets/bank-logos/bank-logos';
// Fallbacks (lucide e react-icons)
import { 
  FaUniversity,
  FaWallet,
  FaCreditCard,
  FaMoneyBillWave,
  FaPiggyBank,
} from 'react-icons/fa';
import { 
  Building2, 
  Wallet,
} from 'lucide-react';

// Mapeamento de códigos de banco para logos
export const BANK_LOGOS: Record<string, ComponentType<any>> = {
  // Bancos Digitais - Logos SVG customizados
  'nubank': NubankLogo, // 🟣 Logo oficial do Nubank
  'c6': C6Logo, // ⚫ C6 Bank
  'inter': InterLogo, // 🟠 Inter
  'neon': FaCreditCard, // 🟢 Neon (cartão)
  'next': Building2, // 🟢 Next
  'original': Building2, // 🟢 Original
  'bs2': FaUniversity, // 🟠 BS2
  'mercadopago': FaMoneyBillWave, // 🔵 Mercado Pago
  'picpay': FaWallet, // 🟢 PicPay
  
  // Bancos Tradicionais - Logos SVG customizados
  'itau': ItauLogo, // 🟠 Itaú
  'bradesco': BradescoLogo, // 🔴 Bradesco
  'santander': SantanderLogo, // 🔴 Santander
  'bb': BancoDoBrasilLogo, // 🟡 Banco do Brasil
  'caixa': CaixaLogo, // 🔵 Caixa Econômica
  'safra': FaUniversity, // 🔵 Safra
  'banrisul': FaUniversity, // 🔵 Banrisul
  'sicoob': FaUniversity, // 🟢 Sicoob
  'sicredi': FaUniversity, // 🟢 Sicredi
  
  // Outros - Ícones específicos
  'carteira': FaWallet, // 💰 Carteira
  'dinheiro': FaMoneyBillWave, // 💵 Dinheiro
  'poupanca': FaPiggyBank, // 🐷 Poupança
  'default': FaWallet, // Padrão
};

// Cores dos bancos (para usar como fallback ou background)
export const BANK_COLORS: Record<string, string> = {
  'nubank': '#8A05BE',
  'c6': '#000000',
  'inter': '#FF7A00',
  'neon': '#00D9B5',
  'next': '#00A868',
  'original': '#00C853',
  'bs2': '#FF6B00',
  'mercadopago': '#009EE3',
  'picpay': '#21C25E',
  'itau': '#EC7000',
  'bradesco': '#CC092F',
  'santander': '#EC0000',
  'bb': '#FFED00',
  'caixa': '#0066B3',
  'safra': '#0047BB',
  'banrisul': '#003DA5',
  'sicoob': '#00A859',
  'sicredi': '#00923F',
  'carteira': '#6B7280',
  'dinheiro': '#10B981',
  'poupanca': '#F59E0B',
  'default': '#6366F1',
};

// Função helper para obter logo do banco
export function getBankLogo(bankCode: string | null | undefined): ComponentType<any> {
  if (!bankCode) return BANK_LOGOS.default;
  
  const normalizedCode = bankCode.toLowerCase().trim();
  return BANK_LOGOS[normalizedCode] || BANK_LOGOS.default;
}

// Função helper para obter cor do banco
export function getBankColor(bankCode: string | null | undefined): string {
  if (!bankCode) return BANK_COLORS.default;
  
  const normalizedCode = bankCode.toLowerCase().trim();
  return BANK_COLORS[normalizedCode] || BANK_COLORS.default;
}

// Função para detectar banco pelo nome da conta
export function detectBankFromName(accountName: string): string | null {
  if (!accountName) return null;
  
  // Normalizar: lowercase e remover acentos
  const normalize = (str: string) => 
    str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  
  const name = normalize(accountName);
  
  // Mapeamento de palavras-chave para códigos de banco (ordem importa!)
  const keywords: Record<string, string> = {
    // Nubank (várias variações)
    'nubank': 'nubank',
    'nu bank': 'nubank',
    'roxinho': 'nubank',
    'roxo': 'nubank',
    
    // C6 Bank
    'c6': 'c6',
    'c6 bank': 'c6',
    'c 6': 'c6',
    
    // Inter
    'inter': 'inter',
    'banco inter': 'inter',
    
    // Neon
    'neon': 'neon',
    
    // Next
    'next': 'next',
    
    // Original
    'original': 'original',
    'banco original': 'original',
    
    // BS2
    'bs2': 'bs2',
    'bs 2': 'bs2',
    
    // Mercado Pago
    'mercado pago': 'mercadopago',
    'mercadopago': 'mercadopago',
    'mp': 'mercadopago',
    
    // PicPay
    'picpay': 'picpay',
    'pic pay': 'picpay',
    
    // Itaú
    'itau': 'itau',
    'itaú': 'itau',
    
    // Bradesco
    'bradesco': 'bradesco',
    
    // Santander
    'santander': 'santander',
    
    // Banco do Brasil
    'banco do brasil': 'bb',
    'bb': 'bb',
    
    // Caixa
    'caixa': 'caixa',
    'cef': 'caixa',
    'caixa economica': 'caixa',
    
    // Safra
    'safra': 'safra',
    
    // Banrisul
    'banrisul': 'banrisul',
    
    // Sicoob
    'sicoob': 'sicoob',
    
    // Sicredi
    'sicredi': 'sicredi',
    
    // Outros
    'carteira': 'carteira',
    'dinheiro': 'dinheiro',
    'poupanca': 'poupanca',
    'poupança': 'poupanca',
  };
  
  // Buscar palavra-chave no nome (ordem importa para evitar falsos positivos)
  for (const [keyword, code] of Object.entries(keywords)) {
    if (name.includes(keyword)) {
      return code;
    }
  }
  
  return null;
}
