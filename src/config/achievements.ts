import { Trophy, Flame, Target, PiggyBank, TrendingUp, Award, Zap, Crown, Star, Gem, Shield, Rocket, Heart, DollarSign, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================
export interface AchievementTier {
  tier: 'bronze' | 'silver' | 'gold';
  target: number;
  xp_reward: number;
  color: string;
  emoji: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'savings' | 'spending' | 'streak' | 'goals' | 'special';
  tiers: AchievementTier[];
}

// =====================================================
// CONFIGURAÇÃO DE TIERS
// =====================================================
export const TIER_CONFIG: Record<'bronze' | 'silver' | 'gold', { color: string; emoji: string; label: string }> = {
  bronze: {
    color: '#CD7F32',
    emoji: '🥉',
    label: 'Bronze',
  },
  silver: {
    color: '#C0C0C0',
    emoji: '🥈',
    label: 'Prata',
  },
  gold: {
    color: '#FFD700',
    emoji: '🥇',
    label: 'Ouro',
  },
};

// =====================================================
// CONQUISTAS: 15 badges em 3 tiers cada (45 total)
// =====================================================
export const ACHIEVEMENTS: Achievement[] = [
  // =====================================================
  // CATEGORIA: ECONOMIA (Savings)
  // =====================================================
  {
    id: 'savings_master',
    name: 'Mestre da Economia',
    description: 'Economize dinheiro e construa seu futuro',
    icon: PiggyBank,
    category: 'savings',
    tiers: [
      { tier: 'bronze', target: 1000, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 10000, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 50000, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'investment_guru',
    name: 'Guru dos Investimentos',
    description: 'Acumule patrimônio através de investimentos',
    icon: TrendingUp,
    category: 'savings',
    tiers: [
      { tier: 'bronze', target: 5000, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 25000, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 100000, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'emergency_fund',
    name: 'Fundo de Emergência',
    description: 'Construa sua reserva de segurança',
    icon: Shield,
    category: 'savings',
    tiers: [
      { tier: 'bronze', target: 3000, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 10000, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 30000, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },

  // =====================================================
  // CATEGORIA: CONTROLE DE GASTOS (Spending)
  // =====================================================
  {
    id: 'spending_control',
    name: 'Controle Total',
    description: 'Mantenha seus gastos sob controle',
    icon: Target,
    category: 'spending',
    tiers: [
      { tier: 'bronze', target: 3, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 6, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 12, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'budget_ninja',
    name: 'Ninja do Orçamento',
    description: 'Fique abaixo do limite em todas as categorias',
    icon: Zap,
    category: 'spending',
    tiers: [
      { tier: 'bronze', target: 1, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 3, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 6, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },

  // =====================================================
  // CATEGORIA: STREAKS (Consistência)
  // =====================================================
  {
    id: 'consistency_king',
    name: 'Rei da Consistência',
    description: 'Mantenha uma sequência de meses cumprindo metas',
    icon: Flame,
    category: 'streak',
    tiers: [
      { tier: 'bronze', target: 3, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 6, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 12, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'unstoppable',
    name: 'Imparável',
    description: 'Sequência épica de meses sem falhas',
    icon: Rocket,
    category: 'streak',
    tiers: [
      { tier: 'bronze', target: 6, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 12, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 24, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },

  // =====================================================
  // CATEGORIA: METAS (Goals)
  // =====================================================
  {
    id: 'goal_achiever',
    name: 'Realizador de Sonhos',
    description: 'Complete suas metas financeiras',
    icon: Trophy,
    category: 'goals',
    tiers: [
      { tier: 'bronze', target: 1, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 5, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 15, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'goal_creator',
    name: 'Planejador Mestre',
    description: 'Crie metas para organizar suas finanças',
    icon: CheckCircle2,
    category: 'goals',
    tiers: [
      { tier: 'bronze', target: 3, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 10, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 25, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'multi_category',
    name: 'Diversificador',
    description: 'Crie metas em diferentes categorias',
    icon: Star,
    category: 'goals',
    tiers: [
      { tier: 'bronze', target: 3, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 7, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 12, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },

  // =====================================================
  // CATEGORIA: ESPECIAIS (Marcos Importantes)
  // =====================================================
  {
    id: 'first_steps',
    name: 'Primeiros Passos',
    description: 'Comece sua jornada financeira',
    icon: Heart,
    category: 'special',
    tiers: [
      { tier: 'bronze', target: 1, xp_reward: 100, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 1, xp_reward: 0, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji }, // Não aplicável
      { tier: 'gold', target: 1, xp_reward: 0, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji }, // Não aplicável
    ],
  },
  {
    id: 'wealth_builder',
    name: 'Construtor de Riqueza',
    description: 'Acumule patrimônio significativo',
    icon: Gem,
    category: 'special',
    tiers: [
      { tier: 'bronze', target: 50000, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 200000, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 1000000, xp_reward: 500, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'financial_freedom',
    name: 'Liberdade Financeira',
    description: 'Atinja a independência financeira',
    icon: Crown,
    category: 'special',
    tiers: [
      { tier: 'bronze', target: 100000, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 500000, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 2000000, xp_reward: 500, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'contribution_hero',
    name: 'Herói dos Aportes',
    description: 'Faça aportes regulares em suas metas',
    icon: DollarSign,
    category: 'special',
    tiers: [
      { tier: 'bronze', target: 10, xp_reward: 50, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 50, xp_reward: 150, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 200, xp_reward: 300, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
  {
    id: 'perfect_month',
    name: 'Mês Perfeito',
    description: 'Complete todas as metas em um único mês',
    icon: Award,
    category: 'special',
    tiers: [
      { tier: 'bronze', target: 1, xp_reward: 100, color: TIER_CONFIG.bronze.color, emoji: TIER_CONFIG.bronze.emoji },
      { tier: 'silver', target: 3, xp_reward: 200, color: TIER_CONFIG.silver.color, emoji: TIER_CONFIG.silver.emoji },
      { tier: 'gold', target: 6, xp_reward: 400, color: TIER_CONFIG.gold.color, emoji: TIER_CONFIG.gold.emoji },
    ],
  },
];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Busca uma conquista por ID
 */
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

/**
 * Filtra conquistas por categoria
 */
export const getAchievementsByCategory = (category: Achievement['category']): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

/**
 * Retorna o próximo tier de uma conquista
 */
export const getNextTier = (
  currentTier: 'bronze' | 'silver' | 'gold' | null
): 'bronze' | 'silver' | 'gold' | null => {
  if (!currentTier) return 'bronze';
  if (currentTier === 'bronze') return 'silver';
  if (currentTier === 'silver') return 'gold';
  return null; // Já está no máximo
};

/**
 * Calcula o progresso percentual para o próximo tier
 */
export const calculateTierProgress = (
  achievement: Achievement,
  currentProgress: number,
  currentTier: 'bronze' | 'silver' | 'gold' | null
): { percentage: number; nextTarget: number; nextTier: 'bronze' | 'silver' | 'gold' | null } => {
  const nextTier = getNextTier(currentTier);
  
  if (!nextTier) {
    return { percentage: 100, nextTarget: 0, nextTier: null };
  }
  
  const tierConfig = achievement.tiers.find(t => t.tier === nextTier);
  if (!tierConfig) {
    return { percentage: 100, nextTarget: 0, nextTier: null };
  }
  
  const percentage = Math.min((currentProgress / tierConfig.target) * 100, 100);
  
  return {
    percentage,
    nextTarget: tierConfig.target,
    nextTier,
  };
};
