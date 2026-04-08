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
  healthBreakdown?: {
    bills: number;
    investments: number;
    budget: number;
    planning: number;
  };
  meta?: {
    hasSufficientData?: boolean;
    [key: string]: any;
  };
}

// Configurações de cores por prioridade
export const INSIGHT_COLORS: Record<InsightPriority, {
  gradient: string;
  bg: string;
  border: string;
  text: string;
  mutedText: string;
  iconSurface: string;
  badge: string;
  progressTrack: string;
}> = {
  celebration: {
    gradient: 'from-fuchsia-300 via-violet-400 to-sky-300',
    bg: 'bg-surface/95 bg-[linear-gradient(135deg,rgba(129,34,183,0.12),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(135deg,rgba(129,34,183,0.34),rgba(15,23,42,0.96))]',
    border: 'border-border/70 shadow-[0_18px_36px_rgba(148,163,184,0.18)] dark:shadow-[0_20px_46px_rgba(3,8,20,0.24)]',
    text: 'text-foreground',
    mutedText: 'text-foreground/80 dark:text-foreground/80',
    iconSurface: 'bg-surface-elevated/85 dark:bg-surface-elevated/85 ring-1 ring-primary/15 dark:ring-fuchsia-400/25',
    badge: 'border-border/70 bg-surface-elevated/70 dark:bg-surface-elevated/70 text-foreground/80',
    progressTrack: 'bg-surface-overlay/75 dark:bg-surface-overlay/80',
  },
  warning: {
    gradient: 'from-amber-300 via-orange-300 to-rose-300',
    bg: 'bg-surface/95 bg-[linear-gradient(135deg,rgba(146,64,14,0.12),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(135deg,rgba(146,64,14,0.28),rgba(15,23,42,0.96))]',
    border: 'border-border/70 shadow-[0_18px_36px_rgba(148,163,184,0.18)] dark:shadow-[0_20px_46px_rgba(3,8,20,0.24)]',
    text: 'text-foreground',
    mutedText: 'text-foreground/80 dark:text-foreground/80',
    iconSurface: 'bg-surface-elevated/85 dark:bg-surface-elevated/85 ring-1 ring-warning-border dark:ring-amber-400/25',
    badge: 'border-border/70 bg-surface-elevated/70 dark:bg-surface-elevated/70 text-foreground/80',
    progressTrack: 'bg-surface-overlay/75 dark:bg-surface-overlay/80',
  },
  critical: {
    gradient: 'from-rose-300 via-red-400 to-orange-300',
    bg: 'bg-surface/95 bg-[linear-gradient(135deg,rgba(127,29,29,0.12),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.32),rgba(15,23,42,0.96))]',
    border: 'border-border/70 shadow-[0_18px_36px_rgba(148,163,184,0.18)] dark:shadow-[0_20px_46px_rgba(3,8,20,0.24)]',
    text: 'text-foreground',
    mutedText: 'text-foreground/80 dark:text-foreground/80',
    iconSurface: 'bg-surface-elevated/85 dark:bg-surface-elevated/85 ring-1 ring-danger-border dark:ring-red-400/25',
    badge: 'border-border/70 bg-surface-elevated/70 dark:bg-surface-elevated/70 text-foreground/80',
    progressTrack: 'bg-surface-overlay/75 dark:bg-surface-overlay/80',
  },
  info: {
    gradient: 'from-sky-300 via-violet-400 to-fuchsia-300',
    bg: 'bg-surface/95 bg-[linear-gradient(135deg,rgba(37,99,235,0.1),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.26),rgba(15,23,42,0.96))]',
    border: 'border-border/70 shadow-[0_18px_36px_rgba(148,163,184,0.18)] dark:shadow-[0_20px_46px_rgba(3,8,20,0.24)]',
    text: 'text-foreground',
    mutedText: 'text-foreground/80 dark:text-foreground/80',
    iconSurface: 'bg-surface-elevated/85 dark:bg-surface-elevated/85 ring-1 ring-info-border dark:ring-sky-400/25',
    badge: 'border-border/70 bg-surface-elevated/70 dark:bg-surface-elevated/70 text-foreground/80',
    progressTrack: 'bg-surface-overlay/75 dark:bg-surface-overlay/80',
  },
};

// Labels traduzidos
export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  goal_achievement: 'Meta Alcançada',
  bill_alert: 'Alerta de Conta',
  investment_opportunity: 'Oportunidade',
  budget_warning: 'Meta de Gasto',
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
