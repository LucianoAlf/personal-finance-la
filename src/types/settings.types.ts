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
  
  // Metadados
  created_at: string;
  updated_at: string;
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
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Mais recente e poderoso', contextWindow: 128000, costPer1kTokens: 0.005, isFree: false },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Rápido e econômico', contextWindow: 128000, costPer1kTokens: 0.00015, isFree: false },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Anterior, ainda potente', contextWindow: 128000, costPer1kTokens: 0.01, isFree: false },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Econômico', contextWindow: 16385, costPer1kTokens: 0.0005, isFree: false },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Mais avançado', contextWindow: 1000000, costPer1kTokens: 0.00125, isFree: false },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente', contextWindow: 1000000, costPer1kTokens: 0.000075, isFree: false },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Versão gratuita', contextWindow: 32760, costPer1kTokens: 0, isFree: true },
  ],
  claude: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Mais poderoso', contextWindow: 200000, costPer1kTokens: 0.015, isFree: false },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanceado', contextWindow: 200000, costPer1kTokens: 0.003, isFree: false },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Rápido', contextWindow: 200000, costPer1kTokens: 0.00025, isFree: false },
  ],
  openrouter: [
    { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', description: 'Gratuito', contextWindow: 8192, costPer1kTokens: 0, isFree: true },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B', description: 'Gratuito', contextWindow: 8192, costPer1kTokens: 0, isFree: true },
    { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini', description: 'Gratuito', contextWindow: 128000, costPer1kTokens: 0, isFree: true },
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
  failed_calls: number;
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
  
  // Horários permitidos (geral)
  allowed_hours_start: string;
  allowed_hours_end: string;
  
  // Resumos Automáticos
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  
  weekly_summary_enabled: boolean;
  weekly_summary_day_of_week: number;
  weekly_summary_time: string;
  
  monthly_summary_enabled: boolean;
  monthly_summary_day_of_month: number;
  monthly_summary_time: string;
  
  // Alertas Específicos
  bill_reminders_enabled: boolean;
  bill_reminders_days_before: number;
  
  budget_alerts_enabled: boolean;
  budget_alert_threshold_percentage: number;
  
  goal_milestones_enabled: boolean;
  achievements_enabled: boolean;
  
  ana_tips_enabled: boolean;
  ana_tips_frequency: SummaryFrequency;
  
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
  allowed_hours_start?: string;
  allowed_hours_end?: string;
  daily_summary_enabled?: boolean;
  daily_summary_time?: string;
  weekly_summary_enabled?: boolean;
  weekly_summary_day_of_week?: number;
  weekly_summary_time?: string;
  monthly_summary_enabled?: boolean;
  monthly_summary_day_of_month?: number;
  monthly_summary_time?: string;
  bill_reminders_enabled?: boolean;
  bill_reminders_days_before?: number;
  budget_alerts_enabled?: boolean;
  budget_alert_threshold_percentage?: number;
  goal_milestones_enabled?: boolean;
  achievements_enabled?: boolean;
  ana_tips_enabled?: boolean;
  ana_tips_frequency?: SummaryFrequency;
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
