import * as LucideIcons from 'lucide-react';

export interface BillCategory {
  id: string;
  name: string;
  icon: keyof typeof LucideIcons;
  color: string;
  description?: string;
}

export const BILL_CATEGORIES: BillCategory[] = [
  {
    id: 'housing',
    name: 'Moradia',
    icon: 'Home',
    color: '#3b82f6',
    description: 'Aluguel, condomínio, IPTU',
  },
  {
    id: 'telecom',
    name: 'Telecomunicações',
    icon: 'Wifi',
    color: '#8b5cf6',
    description: 'Internet, telefone, TV',
  },
  {
    id: 'service',
    name: 'Serviços Públicos',
    icon: 'Zap',
    color: '#10b981',
    description: 'Água, luz, gás',
  },
  {
    id: 'subscription',
    name: 'Assinaturas',
    icon: 'Play',
    color: '#f59e0b',
    description: 'Streaming, apps, clubes',
  },
  {
    id: 'education',
    name: 'Educação',
    icon: 'GraduationCap',
    color: '#06b6d4',
    description: 'Escola, cursos, livros',
  },
  {
    id: 'healthcare',
    name: 'Saúde',
    icon: 'Heart',
    color: '#ec4899',
    description: 'Plano de saúde, remédios',
  },
  {
    id: 'insurance',
    name: 'Seguros',
    icon: 'Shield',
    color: '#14b8a6',
    description: 'Seguro auto, vida, residencial',
  },
  {
    id: 'loan',
    name: 'Empréstimos',
    icon: 'Banknote',
    color: '#f97316',
    description: 'Financiamentos, parcelamentos',
  },
  {
    id: 'credit_card',
    name: 'Cartão de Crédito',
    icon: 'CreditCard',
    color: '#a855f7',
    description: 'Fatura do cartão',
  },
  {
    id: 'tax',
    name: 'Impostos',
    icon: 'Receipt',
    color: '#ef4444',
    description: 'IRPF, veículos, propriedades',
  },
  {
    id: 'other',
    name: 'Outros',
    icon: 'MoreHorizontal',
    color: '#6b7280',
    description: 'Diversas despesas',
  },
];

/**
 * Busca categoria por ID
 */
export function getBillCategoryById(id: string): BillCategory | undefined {
  return BILL_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Obtém componente de ícone de categoria
 */
export function getBillCategoryIcon(
  iconName: keyof typeof LucideIcons
): React.ComponentType<any> | null {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || null;
}
