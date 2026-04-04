// ============================================
// TYPES.TS - Interfaces TypeScript
// Modularização v1.0 - Dezembro 2025
// ============================================

// ============================================
// PAYLOAD UAZAPI (Webhook)
// ============================================

export interface UazapiWebhookPayload {
  EventType?: string;
  event?: string;
  token?: string;
  owner?: string;
  data?: UazapiData;
  body?: UazapiBody; // Payload via N8N
  message?: UazapiMessage;
  chat?: UazapiChat;
}

export interface UazapiData {
  from?: string;
  message?: UazapiMessageData;
}

export interface UazapiBody {
  EventType?: string;
  message?: UazapiMessageData;
  chat?: UazapiChat;
}

export interface UazapiMessage {
  chatid?: string;
  messageid?: string;
  messageType?: string;
  type?: 'text' | 'media' | 'interactive';
  mediaType?: 'ptt' | 'image' | 'document' | 'video';
  fromMe?: boolean;
  sender?: string;
  senderName?: string;
  messageTimestamp?: number;
  text?: string;
  content?: string | UazapiMessageContent;
}

export interface UazapiMessageData {
  type?: string;
  messageType?: string;
  text?: string;
  caption?: string;
  content?: string;
  sender?: string;
  buttonOrListid?: string;
  buttonOrListId?: string;
  selectedButtonId?: string;
  buttonId?: string;
  interactive?: {
    type?: string;
    button_reply?: { id: string };
    list_reply?: { id: string };
  };
}

export interface UazapiMessageContent {
  text?: string;
  URL?: string;
  PTT?: boolean;
  buttonResponse?: {
    id: string;
    displayText: string;
  };
}

export interface UazapiChat {
  phone?: string;
  wa_chatid?: string;
  wa_name?: string;
}

// ============================================
// INTENÇÕES E NLP
// ============================================

export type IntencaoTipo = 
  | 'REGISTRAR_RECEITA'
  | 'REGISTRAR_DESPESA'
  | 'REGISTRAR_TRANSFERENCIA'
  | 'CONSULTAR_SALDO'
  | 'CONSULTAR_EXTRATO'
  | 'CONSULTAR_RESUMO'
  | 'LISTAR_CONTAS'
  | 'LISTAR_CARTOES'
  | 'LISTAR_METAS'
  | 'CONSULTAR_INVESTIMENTOS'
  | 'CONSULTAR_CONTAS_PAGAR'
  | 'EDITAR_TRANSACAO'
  | 'EXCLUIR_TRANSACAO'
  | 'COMANDO_RAPIDO'
  | 'SAUDACAO'
  | 'AJUDA'
  | 'ANALYTICS_QUERY'
  | 'TRANSACTION'
  | 'OUTRO';

export interface IntencaoClassificada {
  intencao: IntencaoTipo;
  confianca: number;
  entidades: EntidadesExtraidas;
  texto_original: string;
}

export interface EntidadesExtraidas {
  valor?: number;
  categoria?: string;
  conta?: string;
  cartao?: string;
  descricao?: string;
  data?: string;
  periodo?: string;
  merchant?: string;
}

// ============================================
// CONTEXTO DE CONVERSA
// ============================================

export type EstadoContexto = 
  | 'idle'
  | 'aguardando_confirmacao'
  | 'aguardando_valor'
  | 'aguardando_conta'
  | 'aguardando_categoria'
  | 'aguardando_descricao'
  | 'aguardando_confirmacao_exclusao'
  | 'aguardando_novo_valor_campo'
  | 'aguardando_selecao_conta';

export interface ContextoConversa {
  user_id: string;
  estado: EstadoContexto;
  intencao_pendente?: IntencaoClassificada;
  transacao_id?: string;
  transacao_tipo?: 'transaction' | 'credit_card_transaction';
  dados_temporarios?: Record<string, unknown>;
  ultima_atividade?: string;
  expires_at: string;
}

// ============================================
// TRANSAÇÕES
// ============================================

export interface TransacaoInput {
  user_id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category_id?: string;
  account_id?: string;
  description?: string;
  transaction_date?: string;
}

export interface TransacaoResponse {
  success: boolean;
  transacao_id?: string;
  mensagem: string;
  dados?: Record<string, unknown>;
}

// ============================================
// BOTÕES
// ============================================

export interface BotaoInterativo {
  texto: string;
  id: string;
}

export interface MensagemComBotoes {
  texto: string;
  botoes: BotaoInterativo[];
  footer?: string;
}

// ============================================
// USUÁRIO
// ============================================

export interface Usuario {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

// ============================================
// CONTA BANCÁRIA
// ============================================

export interface ContaBancaria {
  id: string;
  name: string;
  bank?: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  current_balance: number;
  icon?: string;
  is_active: boolean;
}

// ============================================
// MENSAGEM WHATSAPP
// ============================================

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  phone_number: string;
  message_type: string;
  direction: 'inbound' | 'outbound';
  content: string;
  intent?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  received_at: string;
  processed_at?: string;
  response_text?: string;
}
