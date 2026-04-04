/**
 * TIPOS TYPESCRIPT - WHATSAPP INTEGRATION
 * Responsabilidade: Definir interfaces para integração WhatsApp
 */

// =====================================================
// ENUMS
// =====================================================

export type WhatsAppMessageType = 
  | 'text'
  | 'audio'
  | 'image'
  | 'document'
  | 'video'
  | 'location'
  | 'contact';

export type MessageDirection = 'inbound' | 'outbound';

export type ProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type IntentType = 
  | 'transaction'
  | 'quick_command'
  | 'conversation'
  | 'help'
  | 'unknown';

// =====================================================
// INTERFACES - DATABASE
// =====================================================

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  
  // Identificação WhatsApp
  whatsapp_message_id?: string;
  phone_number: string;
  
  // Conteúdo
  message_type: WhatsAppMessageType;
  direction: MessageDirection;
  content?: string;
  media_url?: string;
  media_mime_type?: string;
  
  // Processamento
  intent?: IntentType;
  processing_status: ProcessingStatus;
  processed_at?: string;
  
  // Dados extraídos
  extracted_data?: ExtractedTransactionData;
  
  // Resposta
  response_text?: string;
  response_sent_at?: string;
  
  // Metadados
  error_message?: string;
  retry_count: number;
  metadata?: Record<string, any>;
  
  // Timestamps
  received_at: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppQuickCommand {
  id: string;
  command: string;
  aliases: string[];
  description: string;
  example?: string;
  category?: string;
  response_template?: string;
  requires_params: boolean;
  usage_count: number;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversationContext {
  id: string;
  user_id: string;
  conversation_id: string;
  last_message_id?: string;
  current_intent?: IntentType;
  awaiting_confirmation: boolean;
  confirmation_data?: Record<string, any>;
  message_count: number;
  last_interaction_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConnectionStatus {
  id: string;
  user_id: string;
  
  // Dados da instância UAZAPI
  instance_id: string;
  instance_token: string;
  instance_name?: string;
  
  // Status da conexão
  status: string; // 'disconnected' | 'connecting' | 'connected'
  connected: boolean;
  logged_in: boolean;
  jid?: string;
  
  // QR Code para conexão
  qr_code?: string;
  qr_code_expires_at?: string;
  
  // Informações do perfil
  phone_number?: string;
  profile_name?: string;
  profile_pic_url?: string;
  is_business: boolean;
  
  // Desconexão
  last_disconnect?: string;
  last_disconnect_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// =====================================================
// INTERFACES - DADOS EXTRAÍDOS
// =====================================================

export interface ExtractedTransactionData {
  amount?: number;
  category?: string;
  description?: string;
  date?: string;
  type?: 'income' | 'expense';
  confidence?: number; // 0-1 (confiança da extração)
  raw_text?: string;
}

export interface ExtractedReceiptData extends ExtractedTransactionData {
  merchant_name?: string;
  merchant_cnpj?: string;
  items?: ReceiptItem[];
  payment_method?: string;
  receipt_number?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// =====================================================
// INTERFACES - COMANDOS
// =====================================================

export interface QuickCommandResponse {
  command: string;
  success: boolean;
  message: string;
  data?: Record<string, any>;
  suggestions?: string[];
}

export interface CommandContext {
  user_id: string;
  command: string;
  params?: string[];
  raw_message: string;
}

// =====================================================
// INTERFACES - INPUTS
// =====================================================

export interface SendWhatsAppMessageInput {
  phone_number: string;
  content: string;
  message_type?: WhatsAppMessageType;
  media_url?: string;
  reply_to_message_id?: string;
}

export interface ProcessWhatsAppMessageInput {
  whatsapp_message_id: string;
  phone_number: string;
  message_type: WhatsAppMessageType;
  content?: string;
  media_url?: string;
  media_mime_type?: string;
  received_at?: string;
}

export interface TranscribeAudioInput {
  audio_url: string;
  audio_format?: string; // mp3, ogg, wav
  language?: string; // pt-BR
}

export interface ExtractReceiptInput {
  image_url: string;
  image_format?: string; // jpg, png, pdf
}

// =====================================================
// INTERFACES - RESPONSES
// =====================================================

export interface TranscriptionResponse {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  error?: string;
}

export interface ExtractionResponse {
  success: boolean;
  data?: ExtractedReceiptData;
  confidence?: number;
  error?: string;
}

export interface MessageProcessingResponse {
  success: boolean;
  message_id: string;
  intent?: IntentType;
  response_text?: string;
  extracted_data?: ExtractedTransactionData;
  requires_confirmation?: boolean;
  error?: string;
}

// =====================================================
// INTERFACES - WEBHOOKS N8N
// =====================================================

export interface N8NWebhookPayload {
  trigger: string;
  user_id: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface UazapiWebhookPayload {
  event: 'message' | 'status' | 'qr' | 'connection';
  instance_id: string;
  data: {
    from?: string;
    to?: string;
    message?: {
      type: WhatsAppMessageType;
      text?: string;
      media?: {
        url: string;
        mimetype: string;
      };
    };
    status?: 'connected' | 'disconnected' | 'qr';
    qr_code?: string;
  };
}

// =====================================================
// INTERFACES - ESTATÍSTICAS
// =====================================================

export interface WhatsAppStats {
  total_messages: number;
  messages_sent: number;
  messages_received: number;
  avg_response_time_seconds: number;
  success_rate: number;
  most_used_commands: Array<{
    command: string;
    count: number;
  }>;
  messages_by_type: Record<WhatsAppMessageType, number>;
  messages_by_intent: Record<IntentType, number>;
}

// =====================================================
// LABELS PT-BR
// =====================================================

export const MESSAGE_TYPE_LABELS: Record<WhatsAppMessageType, string> = {
  text: 'Texto',
  audio: 'Áudio',
  image: 'Imagem',
  document: 'Documento',
  video: 'Vídeo',
  location: 'Localização',
  contact: 'Contato',
};

export const DIRECTION_LABELS: Record<MessageDirection, string> = {
  inbound: 'Recebida',
  outbound: 'Enviada',
};

export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

export const INTENT_LABELS: Record<IntentType, string> = {
  transaction: 'Lançamento',
  quick_command: 'Comando Rápido',
  conversation: 'Conversa',
  help: 'Ajuda',
  unknown: 'Desconhecido',
};

// =====================================================
// COMANDOS DISPONÍVEIS
// =====================================================

export const AVAILABLE_COMMANDS = [
  {
    command: 'saldo',
    description: 'Ver saldo total de todas as contas',
    example: 'saldo',
    category: 'finance',
  },
  {
    command: 'resumo',
    description: 'Resumo financeiro do período',
    example: 'resumo mês',
    category: 'finance',
  },
  {
    command: 'contas',
    description: 'Contas a vencer nos próximos 7 dias',
    example: 'contas',
    category: 'bills',
  },
  {
    command: 'meta',
    description: 'Status de uma meta específica',
    example: 'meta viagem',
    category: 'goals',
  },
  {
    command: 'investimentos',
    description: 'Resumo do portfólio de investimentos',
    example: 'investimentos',
    category: 'investments',
  },
  {
    command: 'cartões',
    description: 'Status de faturas de cartão',
    example: 'cartões',
    category: 'bills',
  },
  {
    command: 'ajuda',
    description: 'Lista todos os comandos disponíveis',
    example: 'ajuda',
    category: 'help',
  },
  {
    command: 'relatório',
    description: 'Relatório completo do mês',
    example: 'relatório novembro',
    category: 'finance',
  },
] as const;
