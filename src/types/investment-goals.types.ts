// Types para Metas de Investimento

export type InvestmentGoalCategory = 
  | 'retirement'        // Aposentadoria
  | 'financial_freedom' // Independência Financeira
  | 'education'         // Educação
  | 'real_estate'       // Imóvel
  | 'general';          // Geral

export type InvestmentGoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type InvestmentGoalPriority = 'low' | 'medium' | 'high' | 'critical';

export interface InvestmentGoal {
  id: string;
  user_id: string;
  
  // Básico
  name: string;
  description?: string | null;
  category: InvestmentGoalCategory;
  
  // Valores e Prazos
  target_amount: number;
  current_amount: number;
  start_date: string; // ISO date
  target_date: string; // ISO date
  
  // Rentabilidade e Aportes
  expected_return_rate: number; // % anual
  monthly_contribution: number;
  contribution_day?: number | null; // 1-28
  
  // Vinculação
  linked_investments: string[]; // UUIDs
  auto_invest: boolean;
  
  // Status
  status: InvestmentGoalStatus;
  priority: InvestmentGoalPriority;
  
  // Notificações
  notify_milestones: boolean;
  notify_contribution: boolean;
  notify_rebalancing: boolean;
  
  // UI
  icon?: string | null;
  color?: string | null;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface CreateInvestmentGoalInput {
  name: string;
  description?: string;
  category: InvestmentGoalCategory;
  target_amount: number;
  current_amount?: number;
  start_date?: string; // ISO date, default: hoje
  target_date: string; // ISO date, required
  expected_return_rate: number; // % anual
  monthly_contribution?: number;
  contribution_day?: number; // 1-28
  linked_investments?: string[];
  auto_invest?: boolean;
  priority?: InvestmentGoalPriority;
  notify_milestones?: boolean;
  notify_contribution?: boolean;
  notify_rebalancing?: boolean;
  icon?: string;
  color?: string;
}

export interface UpdateInvestmentGoalInput extends Partial<CreateInvestmentGoalInput> {
  status?: InvestmentGoalStatus;
}

// Projeção mensal
export interface InvestmentProjectionMonth {
  month: number;
  contribution: number;
  interest: number;
  balance: number;
}

// Métricas calculadas
export interface InvestmentGoalMetrics {
  goal_id: string;
  current_amount: number;
  target_amount: number;
  percentage: number; // 0-100
  months_total: number;
  months_elapsed: number;
  months_remaining: number;
  final_projection: number;
  total_contributions: number;
  total_interest: number;
  is_on_track: boolean;
  shortfall: number; // Quanto falta se não atingir
}

export interface LinkedInvestmentSnapshot {
  id: string;
  name: string;
  ticker?: string | null;
  current_value: number;
  total_invested: number;
}

export interface InvestmentGoalPortfolioMetrics extends InvestmentGoalMetrics {
  manual_current_amount: number;
  linked_current_amount: number;
  effective_current_amount: number;
  linked_investments_count: number;
  current_gap: number;
  projected_gap: number;
}

// Goal com métricas (para UI)
export interface InvestmentGoalWithMetrics extends InvestmentGoal {
  metrics: InvestmentGoalPortfolioMetrics;
  projection: InvestmentProjectionMonth[];
  linked_investment_details: LinkedInvestmentSnapshot[];
}

// Labels PT-BR
export const INVESTMENT_GOAL_LABELS = {
  category: {
    retirement: 'Aposentadoria',
    financial_freedom: 'Independência Financeira',
    education: 'Educação',
    real_estate: 'Imóvel',
    general: 'Geral',
  },
  status: {
    active: 'Ativa',
    completed: 'Concluída',
    paused: 'Pausada',
    cancelled: 'Cancelada',
  },
  priority: {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  },
} as const;

// Ícones sugeridos por categoria
export const INVESTMENT_GOAL_ICONS = {
  retirement: 'Palmtree',
  financial_freedom: 'TrendingUp',
  education: 'GraduationCap',
  real_estate: 'Home',
  general: 'Target',
} as const;

// Cores sugeridas por categoria
export const INVESTMENT_GOAL_COLORS = {
  retirement: '#8B5CF6', // Purple
  financial_freedom: '#10B981', // Green
  education: '#3B82F6', // Blue
  real_estate: '#F59E0B', // Orange
  general: '#6366F1', // Indigo
} as const;

// Contribuições/Aportes
export interface InvestmentGoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string; // ISO date
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContributionInput {
  goal_id: string;
  amount: number;
  date?: string; // Default: hoje
  note?: string;
}
