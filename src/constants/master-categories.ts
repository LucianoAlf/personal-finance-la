/**
 * MASTER CATEGORIES - Fonte centralizada de categorias do sistema
 * 
 * Este arquivo é a ÚNICA fonte de verdade para categorias.
 * Todas as páginas e componentes devem usar estas definições.
 * 
 * IMPORTANTE: As categorias do banco de dados (tabela `categories`) 
 * são sincronizadas com estas definições.
 * 
 * Atualizado em: 16/12/2025
 * Total: 29 despesas + 12 receitas = 41 categorias
 */

import * as LucideIcons from 'lucide-react';

// Tipos
export type CategoryType = 'income' | 'expense';

export interface MasterCategory {
  id: string;
  name: string;
  icon: keyof typeof LucideIcons;
  color: string;
  type: CategoryType;
  order: number;
  keywords?: string[];
}

// ============================================
// CATEGORIAS DE DESPESA (29 categorias)
// ============================================
export const EXPENSE_CATEGORIES: MasterCategory[] = [
  { id: 'food', name: 'Alimentação', icon: 'Utensils', color: '#F97316', type: 'expense', order: 1, keywords: ['comida', 'almoço', 'jantar', 'café', 'padaria', 'lanche', 'marmita', 'cantina', 'cafeteria', 'food truck'] },
  { id: 'transport', name: 'Transporte', icon: 'Car', color: '#3B82F6', type: 'expense', order: 2, keywords: ['uber', '99', 'ônibus', 'metrô', 'táxi'] },
  { id: 'housing', name: 'Moradia', icon: 'Home', color: '#8B5CF6', type: 'expense', order: 3, keywords: ['aluguel', 'condomínio', 'iptu', 'casa'] },
  { id: 'health', name: 'Saúde', icon: 'HeartPulse', color: '#EF4444', type: 'expense', order: 4, keywords: ['médico', 'hospital', 'plano de saúde', 'consulta'] },
  { id: 'education', name: 'Educação', icon: 'GraduationCap', color: '#06B6D4', type: 'expense', order: 5, keywords: ['escola', 'faculdade', 'curso', 'livro'] },
  { id: 'entertainment', name: 'Lazer', icon: 'Film', color: '#EC4899', type: 'expense', order: 6, keywords: ['cinema', 'teatro', 'show', 'festa', 'bar'] },
  { id: 'shopping', name: 'Compras', icon: 'ShoppingBag', color: '#F59E0B', type: 'expense', order: 7, keywords: ['loja', 'shopping', 'compra'] },
  { id: 'subscriptions', name: 'Assinaturas', icon: 'Repeat', color: '#6366F1', type: 'expense', order: 8, keywords: ['netflix', 'spotify', 'amazon', 'disney', 'hbo', 'streaming', 'internet', 'wifi', 'telefone', 'plano celular'] },
  { id: 'restaurant', name: 'Restaurante', icon: 'UtensilsCrossed', color: '#FB923C', type: 'expense', order: 9, keywords: ['restaurante', 'lanchonete', 'pizzaria', 'churrascaria'] },
  { id: 'market', name: 'Mercado', icon: 'ShoppingCart', color: '#22C55E', type: 'expense', order: 10, keywords: ['mercado', 'supermercado', 'feira', 'hortifruti'] },
  { id: 'fuel', name: 'Combustível', icon: 'Fuel', color: '#FBBF24', type: 'expense', order: 11, keywords: ['gasolina', 'etanol', 'diesel', 'posto', 'combustível'] },
  { id: 'delivery', name: 'Delivery', icon: 'Bike', color: '#FB7185', type: 'expense', order: 12, keywords: ['ifood', 'rappi', 'uber eats', 'delivery', 'entrega'] },
  { id: 'utility_bills', name: 'Contas de Consumo', icon: 'Zap', color: '#F59E0B', type: 'expense', order: 13, keywords: ['luz', 'água', 'gás', 'energia', 'conta de luz', 'conta de água', 'conta de gás'] },
  { id: 'services', name: 'Reparos e Manutenções', icon: 'Wrench', color: '#78716C', type: 'expense', order: 14, keywords: ['manutenção', 'reparo', 'conserto', 'mecânico', 'encanador', 'eletricista', 'técnico', 'serviço'] },
  { id: 'other_expense', name: 'Outros', icon: 'Package', color: '#9CA3AF', type: 'expense', order: 15, keywords: [] },
  { id: 'clothing', name: 'Vestuário', icon: 'Shirt', color: '#A855F7', type: 'expense', order: 16, keywords: ['roupa', 'sapato', 'tênis', 'calçado', 'moda'] },
  { id: 'beauty', name: 'Beleza', icon: 'Sparkles', color: '#F472B6', type: 'expense', order: 17, keywords: ['salão', 'cabelo', 'manicure', 'estética', 'cosmético'] },
  { id: 'pet', name: 'Pet', icon: 'PawPrint', color: '#A3E635', type: 'expense', order: 18, keywords: ['pet', 'cachorro', 'gato', 'veterinário', 'ração'] },
  { id: 'kids', name: 'Filhos', icon: 'Baby', color: '#FDA4AF', type: 'expense', order: 19, keywords: ['filho', 'criança', 'escola', 'brinquedo'] },
  { id: 'gifts', name: 'Presentes', icon: 'Gift', color: '#C084FC', type: 'expense', order: 20, keywords: ['presente', 'aniversário', 'natal'] },
  { id: 'taxes', name: 'Impostos', icon: 'Receipt', color: '#78716C', type: 'expense', order: 21, keywords: ['ipva', 'iptu', 'ir', 'imposto', 'taxa', 'multa'] },
  { id: 'insurance', name: 'Seguros', icon: 'Shield', color: '#0EA5E9', type: 'expense', order: 22, keywords: ['seguro', 'seguro auto', 'seguro vida'] },
  { id: 'travel', name: 'Viagem', icon: 'Plane', color: '#14B8A6', type: 'expense', order: 23, keywords: ['viagem', 'passagem', 'hotel', 'hospedagem', 'turismo'] },
  { id: 'pharmacy', name: 'Farmácia', icon: 'Pill', color: '#F87171', type: 'expense', order: 24, keywords: ['farmácia', 'remédio', 'medicamento', 'drogaria'] },
  { id: 'parking', name: 'Estacionamento', icon: 'ParkingCircle', color: '#60A5FA', type: 'expense', order: 25, keywords: ['estacionamento', 'parking', 'vaga'] },
  { id: 'financing', name: 'Financiamento', icon: 'Landmark', color: '#7C3AED', type: 'expense', order: 26, keywords: ['financiamento', 'parcela do carro', 'prestação', 'financiado'] },
  { id: 'loan', name: 'Empréstimo', icon: 'HandCoins', color: '#DC2626', type: 'expense', order: 27, keywords: ['empréstimo', 'consignado', 'crédito pessoal', 'dívida'] },
  { id: 'transfer', name: 'Transferência entre Contas', icon: 'ArrowLeftRight', color: '#6B7280', type: 'expense', order: 28, keywords: ['transferência', 'ted', 'doc', 'pix'] },
];

// ============================================
// CATEGORIAS DE RECEITA (12 categorias)
// ============================================
export const INCOME_CATEGORIES: MasterCategory[] = [
  { id: 'salary', name: 'Salário', icon: 'Briefcase', color: '#22C55E', type: 'income', order: 1, keywords: ['salário', 'pagamento', 'holerite'] },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', color: '#3B82F6', type: 'income', order: 2, keywords: ['freelance', 'projeto', 'trabalho extra'] },
  { id: 'investments', name: 'Investimentos', icon: 'TrendingUp', color: '#8B5CF6', type: 'income', order: 3, keywords: ['dividendo', 'rendimento', 'juros', 'lucro'] },
  { id: 'bonus', name: 'Bônus', icon: 'Gift', color: '#10B981', type: 'income', order: 4, keywords: ['bônus', 'prêmio', 'comissão'] },
  { id: 'rental', name: 'Aluguel', icon: 'Home', color: '#F59E0B', type: 'income', order: 5, keywords: ['aluguel recebido', 'renda de aluguel'] },
  { id: 'other_income', name: 'Outras Receitas', icon: 'Wallet', color: '#9CA3AF', type: 'income', order: 6, keywords: [] },
  { id: 'pension', name: 'Pensão', icon: 'Users', color: '#EC4899', type: 'income', order: 7, keywords: ['pensão', 'pensão alimentícia'] },
  { id: 'retirement', name: 'Aposentadoria', icon: 'User', color: '#64748B', type: 'income', order: 8, keywords: ['aposentadoria', 'inss'] },
  { id: '13th_salary', name: '13º Salário', icon: 'Calendar', color: '#EF4444', type: 'income', order: 9, keywords: ['13º', 'décimo terceiro'] },
  { id: 'vacation', name: 'Férias', icon: 'Sun', color: '#06B6D4', type: 'income', order: 10, keywords: ['férias', 'abono de férias'] },
  { id: 'tax_refund', name: 'Restituição IR', icon: 'Receipt', color: '#A855F7', type: 'income', order: 11, keywords: ['restituição', 'imposto de renda'] },
  { id: 'gift_income', name: 'Presente', icon: 'Gift', color: '#F472B6', type: 'income', order: 12, keywords: ['presente recebido', 'doação'] },
];

// ============================================
// CATEGORIAS PARA CONTAS A PAGAR (bill_type)
// Usa as mesmas categorias de despesa para consistência
// ============================================
export const BILL_TYPE_CATEGORIES: MasterCategory[] = [
  ...EXPENSE_CATEGORIES,
];

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Busca categoria de despesa por ID
 */
export function getExpenseCategoryById(id: string): MasterCategory | undefined {
  return EXPENSE_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Busca categoria de receita por ID
 */
export function getIncomeCategoryById(id: string): MasterCategory | undefined {
  return INCOME_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Busca categoria de contas a pagar por ID (bill_type)
 */
export function getBillTypeCategoryById(id: string): MasterCategory | undefined {
  return BILL_TYPE_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Obtém componente de ícone Lucide por nome
 */
export function getCategoryIcon(iconName: string): React.ComponentType<any> | null {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || null;
}

/**
 * Todas as categorias de despesa ordenadas
 */
export function getOrderedExpenseCategories(): MasterCategory[] {
  return [...EXPENSE_CATEGORIES].sort((a, b) => a.order - b.order);
}

/**
 * Todas as categorias de receita ordenadas
 */
export function getOrderedIncomeCategories(): MasterCategory[] {
  return [...INCOME_CATEGORIES].sort((a, b) => a.order - b.order);
}

/**
 * Todas as categorias de contas a pagar ordenadas
 */
export function getOrderedBillTypeCategories(): MasterCategory[] {
  return [...BILL_TYPE_CATEGORIES].sort((a, b) => a.order - b.order);
}
