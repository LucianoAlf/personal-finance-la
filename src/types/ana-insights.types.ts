// WIDGET ANA CLARA DASHBOARD - Tipos TypeScript

export type InsightPriority = 'celebration' | 'warning' | 'info' | 'critical';

export type InsightType = 
  | 'goal_achievement' 
  | 'bill_alert' 
  | 'investment_opportunity' 
  | 'budget_warning' 
  | 'portfolio_health' 
  | 'savings_tip';

export interface AnaInsight {
  priority: InsightPriority;
  type: InsightType;
  headline: string;
  description: string;
  action?: {
    label: string;
    route: string;
  };
  visualization?: {
    type: 'progress' | 'chart' | 'comparison';
    data: any;
  };
}

export interface DashboardInsightsResponse {
  primary: AnaInsight;
  secondary: AnaInsight[];
  healthScore: number;
  motivationalQuote: string;
}

// Configurações de cores por prioridade
export const INSIGHT_COLORS: Record<InsightPriority, {
  gradient: string;
  bg: string;
  border: string;
  text: string;
}> = {
  celebration: {
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
    border: 'border-purple-300',
    text: 'text-purple-700',
  },
  warning: {
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
  },
  critical: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-gradient-to-r from-red-50 to-red-100',
    border: 'border-red-300',
    text: 'text-red-700',
  },
  info: {
    gradient: 'from-blue-500 to-purple-500',
    bg: 'bg-gradient-to-r from-blue-50 to-purple-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
  },
};

// Labels traduzidos
export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  goal_achievement: 'Meta Alcançada',
  bill_alert: 'Alerta de Conta',
  investment_opportunity: 'Oportunidade',
  budget_warning: 'Orçamento',
  portfolio_health: 'Carteira',
  savings_tip: 'Dica',
};

// Mapeamento de ícones Lucide por tipo (mais diversificados e criativos)
export const INSIGHT_TYPE_ICONS: Record<InsightType, string> = {
  goal_achievement: 'Trophy',           // Troféu para conquistas
  bill_alert: 'Receipt',                // Recibo para contas
  investment_opportunity: 'Rocket',     // Foguete para oportunidades
  budget_warning: 'Wallet',             // Carteira para orçamento
  portfolio_health: 'Activity',         // Gráfico de atividade para saúde
  savings_tip: 'Sparkles',              // Brilho para dicas
};

// Mapeamento de ícones Lucide por prioridade (mais distintos e expressivos)
export const INSIGHT_PRIORITY_ICONS: Record<InsightPriority, string> = {
  celebration: 'PartyPopper',           // 🎉 Festa para celebração
  warning: 'TriangleAlert',             // ⚠️ Triângulo para atenção
  critical: 'Siren',                    // 🚨 Sirene para crítico
  info: 'Sparkles',                     // ✨ Brilho para info
};
