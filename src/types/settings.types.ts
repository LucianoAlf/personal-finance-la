// src/types/settings.types.ts
// Types completos para sistema de configurações

// ==================== USER SETTINGS ====================

export interface UserSettings {
  id: string;
  user_id: string;
  
  // Perfil
  display_name: string | null;
  avatar_url: string | null;
  
  // Preferências Gerais
  language: string;
  timezone: string;
  currency: string;
  date_format: string;
  number_format: string;
  
  // Tema
  theme: 'light' | 'dark' | 'auto';
  
  // Configurações Financeiras
  monthly_savings_goal_percentage: number;
  monthly_closing_day: number;
  default_bill_reminder_days: number;
  budget_allocation?: BudgetAllocation | null;
  budget_alert_threshold?: number | null; // 50-100
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocation {
  essentials: number; // % (50-70)
  investments: number; // % (10-30)
  leisure: number; // % (10-30)
  others: number; // % (0-20)
}

export interface UpdateUserSettingsInput {
  display_name?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  currency?: string;
  date_format?: string;
  number_format?: string;
  theme?: 'light' | 'dark' | 'auto';
  monthly_savings_goal_percentage?: number;
  monthly_closing_day?: number;
  default_bill_reminder_days?: number;
  budget_allocation?: BudgetAllocation;
  budget_alert_threshold?: number;
}

// ==================== AI PROVIDER CONFIGS ====================

export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'openrouter';
export type ResponseStyle = 'short' | 'medium' | 'long';
export type ResponseTone = 'formal' | 'friendly' | 'casual';

export interface AIProviderConfig {
  id: string;
  user_id: string;
  
  // Provedor
  provider: AIProviderType;
  is_default: boolean;
  is_active: boolean;
  
  // Credenciais
  api_key_encrypted?: string;
  api_key_last_4?: string;
  
  // Modelo
  model_name: string;
  
  // Parâmetros LLM
  temperature: number;
  max_tokens: number;
  
  // Personalização Ana Clara
  response_style: ResponseStyle;
  response_tone: ResponseTone;
  system_prompt: string;
  
  // Validação
  is_validated: boolean;
  last_validated_at: string | null;
  validation_error: string | null;
  
  // Plano
  plan_type: string;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface CreateAIProviderInput {
  provider: AIProviderType;
  api_key: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  response_style?: ResponseStyle;
  response_tone?: ResponseTone;
  system_prompt?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateAIProviderInput {
  api_key?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  response_style?: ResponseStyle;
  response_tone?: ResponseTone;
  system_prompt?: string;
  is_default?: boolean;
  is_active?: boolean;
}

// Modelos disponíveis por provedor
export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  costPer1kTokens: number;
  isFree: boolean;
}

export const AI_MODELS: Record<AIProviderType, AIModel[]> = {
  openai: [
    { id: 'gpt-5-mini', name: 'GPT-5 mini', description: 'Mais econômico para alto volume e baixa latência', contextWindow: 400000, costPer1kTokens: 0.00025, isFree: false },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', description: 'Mini mais forte da OpenAI para agentes, código e tarefas complexas', contextWindow: 400000, costPer1kTokens: 0.00075, isFree: false },
  ],
  gemini: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Preview agentic multimodal de maior capacidade da linha Flash', contextWindow: 1048576, costPer1kTokens: 0.0005, isFree: false },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash-Lite Preview', description: 'Versão mais barata e rápida para alto volume; substitui o nome informal "3.1 Flash Preview"', contextWindow: 1048576, costPer1kTokens: 0.00025, isFree: false },
  ],
  claude: [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Combinação atual de velocidade, inteligência e contexto longo da Anthropic', contextWindow: 1000000, costPer1kTokens: 0.003, isFree: false },
  ],
  openrouter: [
    { id: 'minimax/minimax-m2.7', name: 'MiniMax M2.7', description: 'Modelo agentic forte para produtividade e execução longa', contextWindow: 204800, costPer1kTokens: 0.0003, isFree: false },
    { id: 'z-ai/glm-5.1', name: 'GLM 5.1', description: 'Upgrade oficial da Z.ai para tarefas long-horizon e coding', contextWindow: 202752, costPer1kTokens: 0.00126, isFree: false },
    { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', description: 'Modelo multimodal com forte performance em raciocínio e tool-calling', contextWindow: 262144, costPer1kTokens: 0.0003827, isFree: false },
    { id: 'xiaomi/mimo-v2-pro', name: 'MiMo-V2-Pro', description: 'Flagship agentic de 1M de contexto para fluxos extensos', contextWindow: 1048576, costPer1kTokens: 0.001, isFree: false },
  ],
};

// ==================== INTEGRATION CONFIGS ====================

export type IntegrationType = 'whatsapp' | 'google_calendar' | 'ticktick';
export type IntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface IntegrationConfig {
  id: string;
  user_id: string;
  
  // Tipo
  integration_type: IntegrationType;
  
  // Status
  status: IntegrationStatus;
  is_active: boolean;
  
  // WhatsApp
  whatsapp_instance_id?: string;
  whatsapp_phone_number?: string;
  whatsapp_qr_code?: string;
  
  // Google Calendar
  google_calendar_id?: string;
  google_sync_frequency_minutes?: number;
  
  // Tick Tick
  ticktick_default_project_id?: string;
  
  // Metadados de conexão
  last_connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  
  // Config extra
  extra_config: Record<string, any>;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

// ==================== WEBHOOK ENDPOINTS ====================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic';

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  
  // Identificação
  name: string;
  description: string | null;
  
  // Endpoint
  url: string;
  http_method: HttpMethod;
  method?: HttpMethod;
  
  // Autenticação
  auth_type: AuthType;
  auth_token_encrypted?: string;
  auth_username?: string;
  auth_password_encrypted?: string;
  
  // Headers customizados
  custom_headers: Record<string, string>;
  
  // Retry
  retry_enabled: boolean;
  retry_max_attempts: number;
  retry_delay_seconds: number;
  
  // Status
  is_active: boolean;
  
  // Estatísticas
  total_calls: number;
  success_calls: number;
  success_count?: number;
  failed_calls: number;
  failure_count?: number;
  last_triggered_at: string | null;
  last_status_code: number | null;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  http_method?: HttpMethod;
  auth_type?: AuthType;
  auth_token_encrypted?: string;
  auth_username?: string;
  auth_password_encrypted?: string;
  custom_headers?: Record<string, string>;
  retry_enabled?: boolean;
  retry_max_attempts?: number;
  retry_delay_seconds?: number;
  is_active?: boolean;
}

export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  http_method?: HttpMethod;
  auth_type?: AuthType;
  auth_token_encrypted?: string;
  auth_username?: string;
  auth_password_encrypted?: string;
  custom_headers?: Record<string, string>;
  retry_enabled?: boolean;
  retry_max_attempts?: number;
  retry_delay_seconds?: number;
  is_active?: boolean;
}

// ==================== WEBHOOK LOGS ====================

export type WebhookLogStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookLog {
  id: string;
  user_id: string;
  webhook_id: string;
  
  // Request
  request_payload: any;
  request_headers: Record<string, string>;
  request_method: HttpMethod;
  
  // Response
  response_status_code: number | null;
  status_code?: number | null;
  response_body: string | null;
  response_headers: Record<string, string> | null;
  response_time_ms: number | null;
  
  // Status
  status: WebhookLogStatus;
  error_message: string | null;
  
  // Retry
  retry_count: number;
  next_retry_at: string | null;
  
  // Metadados
  triggered_at: string;
  completed_at: string | null;
  created_at: string;
}

// ==================== NOTIFICATION PREFERENCES ====================

export type NotificationChannel = 'push' | 'email' | 'whatsapp';
export type SummaryFrequency = 'daily' | 'weekly' | 'monthly';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  
  // Canais ativos
  push_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  
  // Modo Não Perturbe
  do_not_disturb_enabled: boolean;
  do_not_disturb_start_time: string | null;
  do_not_disturb_end_time: string | null;
  do_not_disturb_days_of_week: number[]; // ✨ NOVO
  
  // Horários permitidos (geral)
  allowed_hours_start: string;
  allowed_hours_end: string;
  
  // Resumos Automáticos
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  daily_summary_days_of_week: number[]; // ✨ NOVO
  
  weekly_summary_enabled: boolean;
  weekly_summary_day_of_week: number; // Manter compatibilidade
  weekly_summary_days_of_week: number[]; // ✨ NOVO
  weekly_summary_time: string;
  
  monthly_summary_enabled: boolean;
  monthly_summary_day_of_month: number; // Manter compatibilidade
  monthly_summary_days_of_month: number[]; // ✨ NOVO
  monthly_summary_time: string;
  
  // Alertas Específicos
  bill_reminders_enabled: boolean;
  bill_reminders_days_before: number; // Manter compatibilidade
  bill_reminders_days_before_array: number[]; // ✨ NOVO
  bill_reminders_time: string; // ✨ NOVO
  
  budget_alerts_enabled: boolean;
  budget_alert_threshold_percentage: number; // Manter compatibilidade
  budget_alert_thresholds: number[]; // ✨ NOVO
  budget_alert_cooldown_hours: number; // ✨ NOVO
  
  goal_milestones_enabled: boolean;
  goal_milestone_percentages: number[]; // ✨ NOVO
  achievements_enabled: boolean;
  
  ana_tips_enabled: boolean;
  ana_tips_frequency: SummaryFrequency;
  ana_tips_time: string; // ✨ NOVO
  ana_tips_day_of_week: number; // ✨ NOVO
  ana_tips_day_of_month: number; // ✨ NOVO
  
  // Novos Alertas ✨
  overdue_bill_alerts_enabled: boolean;
  overdue_bill_alert_days: number[];
  
  low_balance_alerts_enabled: boolean;
  low_balance_threshold: number;
  
  large_transaction_alerts_enabled: boolean;
  large_transaction_threshold: number;
  
  investment_summary_enabled: boolean;
  investment_summary_frequency: string;
  investment_summary_day_of_week: number;
  investment_summary_time: string;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  push_enabled?: boolean;
  email_enabled?: boolean;
  whatsapp_enabled?: boolean;
  
  do_not_disturb_enabled?: boolean;
  do_not_disturb_start_time?: string;
  do_not_disturb_end_time?: string;
  do_not_disturb_days_of_week?: number[]; // ✨ NOVO
  
  allowed_hours_start?: string;
  allowed_hours_end?: string;
  
  daily_summary_enabled?: boolean;
  daily_summary_time?: string;
  daily_summary_days_of_week?: number[]; // ✨ NOVO
  
  weekly_summary_enabled?: boolean;
  weekly_summary_day_of_week?: number;
  weekly_summary_days_of_week?: number[]; // ✨ NOVO
  weekly_summary_time?: string;
  
  monthly_summary_enabled?: boolean;
  monthly_summary_day_of_month?: number;
  monthly_summary_days_of_month?: number[]; // ✨ NOVO
  monthly_summary_time?: string;
  
  bill_reminders_enabled?: boolean;
  bill_reminders_days_before?: number;
  bill_reminders_days_before_array?: number[]; // ✨ NOVO
  bill_reminders_time?: string; // ✨ NOVO
  
  budget_alerts_enabled?: boolean;
  budget_alert_threshold_percentage?: number;
  budget_alert_thresholds?: number[]; // ✨ NOVO
  budget_alert_cooldown_hours?: number; // ✨ NOVO
  
  goal_milestones_enabled?: boolean;
  goal_milestone_percentages?: number[]; // ✨ NOVO
  achievements_enabled?: boolean;
  
  ana_tips_enabled?: boolean;
  ana_tips_frequency?: SummaryFrequency;
  ana_tips_time?: string; // ✨ NOVO
  ana_tips_day_of_week?: number; // ✨ NOVO
  ana_tips_day_of_month?: number; // ✨ NOVO
  
  // Novos Alertas ✨
  overdue_bill_alerts_enabled?: boolean;
  overdue_bill_alert_days?: number[];
  
  low_balance_alerts_enabled?: boolean;
  low_balance_threshold?: number;
  
  large_transaction_alerts_enabled?: boolean;
  large_transaction_threshold?: number;
  
  investment_summary_enabled?: boolean;
  investment_summary_frequency?: string;
  investment_summary_day_of_week?: number;
  investment_summary_time?: string;
}

// ==================== SAVINGS GOALS ====================

export type GoalCategory = 
  | 'travel' 
  | 'house' 
  | 'car' 
  | 'emergency' 
  | 'education' 
  | 'retirement' 
  | 'general';

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalStatus = 'active' | 'completed' | 'exceeded' | 'archived';
export type ContributionFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  category: GoalCategory;
  target_amount: number;
  current_amount: number;
  start_date: string; // ISO date
  target_date: string; // ISO date (era deadline)
  priority: GoalPriority;
  status: GoalStatus;
  icon?: string | null;
  deadline?: string | null;
  notify_milestones: boolean;
  notify_contribution: boolean;
  contribution_frequency?: ContributionFrequency | null;
  contribution_day?: number | null; // 1-28
  notify_delay: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  name: string;
  category: GoalCategory;
  target_amount: number;
  current_amount?: number;
  start_date?: string; // ISO date, default: hoje
  target_date: string; // ISO date, required
  priority?: GoalPriority;
  icon?: string;
  notify_milestones?: boolean;
  notify_contribution?: boolean;
  contribution_frequency?: ContributionFrequency;
  contribution_day?: number; // 1-28
  notify_delay?: boolean;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  status?: GoalStatus;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string; // ISO date
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalContributionInput {
  goal_id: string;
  amount: number;
  date?: string; // ISO date, default: hoje
  note?: string;
}

// Computed properties para UI
export interface GoalWithStats extends SavingsGoal {
  percentage: number; // 0-100
  remaining: number;
  daysRemaining: number;
  suggestedMonthly: number;
  isOverdue: boolean;
  isOnTrack: boolean;
}

// ==================== FINANCIAL CYCLES ====================

export type CycleType = 'salary' | 'credit_card' | 'rent' | 'custom';

export interface CycleAutoAction {
  type: 'reminder' | 'transaction' | 'budget_update';
  config: Record<string, any>;
}

export interface FinancialCycle {
  id: string;
  user_id: string;
  name: string;
  type: CycleType;
  day: number; // 1-28
  active: boolean;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  notify_start: boolean;
  notify_days_before?: number | null; // 1-7
  linked_goals?: string[] | null; // array de goal IDs
  auto_actions?: CycleAutoAction[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCycleInput {
  name: string;
  type: CycleType;
  day: number; // 1-28
  active?: boolean;
  description?: string;
  color?: string;
  icon?: string;
  notify_start?: boolean;
  notify_days_before?: number; // 1-7
  linked_goals?: string[];
  auto_actions?: CycleAutoAction[];
}

export type UpdateCycleInput = Partial<CreateCycleInput>;

// Computed properties para UI
export interface CycleWithStats extends FinancialCycle {
  nextCycleDate: string; // ISO date
  daysUntilNext: number;
  linkedGoalsData?: SavingsGoal[];
}

// ==================== RESPONSE TYPE ====================

export interface UserSettingsResponse {
  user_settings: UserSettings;
  ai_providers: AIProviderConfig[];
  integrations: IntegrationConfig[];
  webhooks: WebhookEndpoint[];
  notification_preferences: NotificationPreferences;
}

// ==================== LABELS (PT-BR) ====================

export const LABELS = {
  theme: {
    light: 'Claro',
    dark: 'Escuro',
    auto: 'Automático',
  },
  
  responseStyle: {
    short: 'Curta',
    medium: 'Média',
    long: 'Longa',
  },
  
  responseTone: {
    formal: 'Formal',
    friendly: 'Amigável',
    casual: 'Casual',
  },
  
  aiProvider: {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
    openrouter: 'Open Router',
  },
  
  integrationType: {
    whatsapp: 'WhatsApp',
    google_calendar: 'Google Calendar',
    ticktick: 'Tick Tick',
  },
  
  integrationStatus: {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    connected: 'Conectado',
    error: 'Erro',
  },
  
  httpMethod: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
  },
  
  authType: {
    none: 'Nenhuma',
    bearer: 'Bearer Token',
    api_key: 'API Key',
    basic: 'Basic Auth',
  },
  
  webhookLogStatus: {
    pending: 'Pendente',
    success: 'Sucesso',
    failed: 'Falhou',
    retrying: 'Tentando novamente',
  },
  
  notificationChannel: {
    push: 'Push',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
  },
  
  summaryFrequency: {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  },
  
  goalCategory: {
    travel: 'Viagem',
    house: 'Casa',
    car: 'Carro',
    emergency: 'Emergência',
    education: 'Educação',
    retirement: 'Aposentadoria',
    general: 'Geral',
  },
  
  goalPriority: {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  },
  
  goalStatus: {
    active: 'Ativa',
    completed: 'Concluída',
    exceeded: 'Excedida',
    archived: 'Arquivada',
  },
  
  contributionFrequency: {
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
  },
  
  cycleType: {
    salary: 'Salário',
    credit_card: 'Cartão de Crédito',
    rent: 'Aluguel',
    custom: 'Personalizado',
  },
  
  dayOfWeek: {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
  },
} as const;
