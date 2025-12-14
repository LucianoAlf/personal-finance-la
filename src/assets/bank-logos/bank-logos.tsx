// bank-logos.tsx
// Logos otimizados de bancos brasileiros para uso em React
// Todos os SVGs são inline para melhor performance

import React from 'react';

interface BankLogoProps {
  className?: string;
  size?: number;
}

// Nubank - Logo "Nu" roxo
export const NubankLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <path 
      fill="#8A05BE" 
      d="M5.5 3C3.57 3 2 4.57 2 6.5v11h4V6.5c0-.28.22-.5.5-.5s.5.22.5.5v11h4V6.5C11 4.57 9.43 3 7.5 3h-2zM18.5 3C16.57 3 15 4.57 15 6.5v11h4V6.5c0-.28.22-.5.5-.5s.5.22.5.5v11h4V6.5C24 4.57 22.43 3 20.5 3h-2z"
    />
  </svg>
);

// Itaú - Logo completo laranja
export const ItauLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="4" cy="5" r="2" fill="#EC7000"/>
    <rect x="3" y="9" width="2.5" height="11" fill="#EC7000"/>
    <path 
      fill="#EC7000" 
      d="M9 9h-2l3-3v3h4v2.5h-4v5c0 1.5.5 2 1.5 2H14v2.5h-3c-2.5 0-4-1.5-4-4V9z"
    />
    <path 
      fill="#EC7000" 
      d="M19 8.5c-3 0-5 2-5 5v6.5h2.5v-6.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v6.5H24v-6.5c0-3-2-5-5-5z"
    />
  </svg>
);

// Bradesco - Logo vermelho
export const BradescoLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <path 
      fill="#CC092F" 
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
    <path 
      fill="#CC092F" 
      d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
    />
  </svg>
);

// Santander - Logo vermelho
export const SantanderLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <path 
      fill="#EC0000" 
      d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L19 8v8l-7 3.5L5 16V8l7-3.5z"
    />
    <path 
      fill="#EC0000" 
      d="M12 6l-5 2.5v7L12 18l5-2.5v-7L12 6z"
    />
  </svg>
);

// Banco do Brasil - Logo amarelo
export const BancoDoBrasilLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#FCBF00"/>
    <text 
      x="12" 
      y="16" 
      textAnchor="middle" 
      fill="#003882" 
      fontSize="10" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      BB
    </text>
  </svg>
);

// Caixa - Logo azul
export const CaixaLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#005CA9"/>
    <text 
      x="12" 
      y="14" 
      textAnchor="middle" 
      fill="#F37021" 
      fontSize="6" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      CAIXA
    </text>
  </svg>
);

// Inter - Logo laranja
export const InterLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#FF7A00"/>
    <path 
      fill="white" 
      d="M8 8h2v8H8zM14 8h2v8h-2z"
    />
  </svg>
);

// C6 Bank - Logo preto/cinza
export const C6Logo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#1A1A1A"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="white" 
      fontSize="8" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      C6
    </text>
  </svg>
);

// PicPay - Logo verde
export const PicPayLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#21C25E"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="white" 
      fontSize="6" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      PP
    </text>
  </svg>
);

// Mercado Pago - Logo azul claro
export const MercadoPagoLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#00B1EA"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="white" 
      fontSize="6" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      MP
    </text>
  </svg>
);

// Neon - Logo verde água
export const NeonLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#00E5A0"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="white" 
      fontSize="5" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      NEON
    </text>
  </svg>
);

// Will Bank - Logo rosa/magenta
export const WillBankLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#FF0066"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="white" 
      fontSize="6" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      will
    </text>
  </svg>
);

// PagBank/PagSeguro - Logo verde
export const PagBankLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#00A651"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="white" 
      fontSize="5" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      PAG
    </text>
  </svg>
);

// BTG Pactual - Logo azul escuro
export const BTGLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#00263A"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="#B4975A" 
      fontSize="6" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      BTG
    </text>
  </svg>
);

// XP Investimentos - Logo preto/amarelo
export const XPLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#1E1E1E"/>
    <text 
      x="12" 
      y="15" 
      textAnchor="middle" 
      fill="#FFD700" 
      fontSize="8" 
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
    >
      XP
    </text>
  </svg>
);

// Next - Logo verde
export const NextLogo: React.FC<BankLogoProps> = ({ className = '', size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className}
    fill="none"
  >
    <circle cx="12" cy="12" r="10" fill="#00DC5A"/>
    <path 
      fill="white" 
      d="M8 8l4 4-4 4M12 12h6"
    />
  </svg>
);

// Mapa de logos por nome do banco (case insensitive)
export const BANK_LOGOS: Record<string, React.FC<BankLogoProps>> = {
  'nubank': NubankLogo,
  'nu': NubankLogo,
  'itau': ItauLogo,
  'itaú': ItauLogo,
  'bradesco': BradescoLogo,
  'santander': SantanderLogo,
  'banco do brasil': BancoDoBrasilLogo,
  'bb': BancoDoBrasilLogo,
  'caixa': CaixaLogo,
  'cef': CaixaLogo,
  'inter': InterLogo,
  'banco inter': InterLogo,
  'c6': C6Logo,
  'c6 bank': C6Logo,
  'picpay': PicPayLogo,
  'mercado pago': MercadoPagoLogo,
  'mercadopago': MercadoPagoLogo,
  'neon': NeonLogo,
  'will': WillBankLogo,
  'will bank': WillBankLogo,
  'willbank': WillBankLogo,
  'pagbank': PagBankLogo,
  'pagseguro': PagBankLogo,
  'btg': BTGLogo,
  'btg pactual': BTGLogo,
  'xp': XPLogo,
  'xp investimentos': XPLogo,
  'next': NextLogo,
};

// Cores dos bancos para usar em fundos de cartão
export const BANK_COLORS: Record<string, { primary: string; secondary: string; text: string }> = {
  'nubank': { primary: '#8A05BE', secondary: '#6B02A0', text: '#FFFFFF' },
  'itau': { primary: '#003399', secondary: '#002266', text: '#FFFFFF' },
  'bradesco': { primary: '#CC092F', secondary: '#990722', text: '#FFFFFF' },
  'santander': { primary: '#EC0000', secondary: '#CC0000', text: '#FFFFFF' },
  'banco do brasil': { primary: '#003882', secondary: '#002255', text: '#FCBF00' },
  'caixa': { primary: '#005CA9', secondary: '#004080', text: '#FFFFFF' },
  'inter': { primary: '#FF7A00', secondary: '#E66A00', text: '#FFFFFF' },
  'c6': { primary: '#1A1A1A', secondary: '#000000', text: '#FFFFFF' },
  'picpay': { primary: '#21C25E', secondary: '#1AA050', text: '#FFFFFF' },
  'mercado pago': { primary: '#00B1EA', secondary: '#0090C0', text: '#FFFFFF' },
  'neon': { primary: '#00E5A0', secondary: '#00C080', text: '#FFFFFF' },
  'will': { primary: '#FF0066', secondary: '#DD0055', text: '#FFFFFF' },
  'pagbank': { primary: '#00A651', secondary: '#008040', text: '#FFFFFF' },
  'btg': { primary: '#00263A', secondary: '#001520', text: '#B4975A' },
  'xp': { primary: '#1E1E1E', secondary: '#000000', text: '#FFD700' },
  'next': { primary: '#00DC5A', secondary: '#00C050', text: '#FFFFFF' },
};

// Função utilitária para obter o logo pelo nome
export function getBankLogo(bankName: string): React.FC<BankLogoProps> | null {
  const normalized = bankName.toLowerCase().trim();
  return BANK_LOGOS[normalized] || null;
}

// Função utilitária para obter as cores pelo nome
export function getBankColors(bankName: string): { primary: string; secondary: string; text: string } {
  const normalized = bankName.toLowerCase().trim();
  return BANK_COLORS[normalized] || { primary: '#6B7280', secondary: '#4B5563', text: '#FFFFFF' };
}

// Componente genérico que renderiza o logo correto baseado no nome
export const BankLogo: React.FC<BankLogoProps & { bankName: string }> = ({ 
  bankName, 
  className = '', 
  size = 24 
}) => {
  const LogoComponent = getBankLogo(bankName);
  
  if (!LogoComponent) {
    // Fallback: primeira letra do banco em um círculo
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        className={className}
        fill="none"
      >
        <circle cx="12" cy="12" r="10" fill="#6B7280"/>
        <text 
          x="12" 
          y="16" 
          textAnchor="middle" 
          fill="white" 
          fontSize="10" 
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
        >
          {bankName.charAt(0).toUpperCase()}
        </text>
      </svg>
    );
  }
  
  return <LogoComponent className={className} size={size} />;
};

export default BankLogo;
