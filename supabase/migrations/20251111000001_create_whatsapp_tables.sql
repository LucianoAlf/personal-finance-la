-- Migration: Create WhatsApp Integration Tables
-- Responsabilidade: Gerenciar mensagens, comandos e histórico WhatsApp

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

-- Tipo de mensagem WhatsApp
CREATE TYPE whatsapp_message_type AS ENUM (
  'text',
  'audio',
  'image',
  'document',
  'video',
  'location',
  'contact'
);

-- Direção da mensagem
CREATE TYPE message_direction AS ENUM (
  'inbound',  -- Recebida do usuário
  'outbound'  -- Enviada pelo sistema
);

-- Status de processamento
CREATE TYPE processing_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- Tipo de intenção detectada
CREATE TYPE intent_type AS ENUM (
  'transaction',      -- Lançamento de transação
  'quick_command',    -- Comando rápido (saldo, resumo, etc)
  'conversation',     -- Conversa livre com Ana
  'help',            -- Pedido de ajuda
  'unknown'          -- Não identificado
);

-- =====================================================
-- 2. TABELA: whatsapp_messages
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação WhatsApp
  whatsapp_message_id TEXT UNIQUE, -- ID da mensagem no WhatsApp
  phone_number VARCHAR(20) NOT NULL, -- Número do usuário
  
  -- Conteúdo
  message_type whatsapp_message_type NOT NULL DEFAULT 'text',
  direction message_direction NOT NULL,
  content TEXT, -- Texto da mensagem ou transcrição
  media_url TEXT, -- URL do arquivo de mídia
  media_mime_type VARCHAR(100),
  
  -- Processamento
  intent intent_type,
  processing_status processing_status DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  
  -- Dados extraídos (para lançamentos)
  extracted_data JSONB, -- {amount, category, description, date}
  
  -- Resposta
  response_text TEXT,
  response_sent_at TIMESTAMPTZ,
  
  -- Metadados
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB, -- Dados adicionais (contexto, etc)
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_phone_number CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$')
);

-- =====================================================
-- 3. TABELA: whatsapp_quick_commands
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_quick_commands (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Comando
  command VARCHAR(50) UNIQUE NOT NULL, -- "saldo", "resumo", etc
  aliases TEXT[], -- Variações aceitas ["saldo", "meu saldo", "quanto tenho"]
  
  -- Configuração
  description TEXT NOT NULL,
  example TEXT, -- Exemplo de uso
  category VARCHAR(50), -- "finance", "bills", "investments"
  
  -- Resposta
  response_template TEXT, -- Template da resposta
  requires_params BOOLEAN DEFAULT false,
  
  -- Estatísticas
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 4. TABELA: whatsapp_conversation_context
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_context (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contexto da conversa
  conversation_id UUID DEFAULT gen_random_uuid(), -- Agrupa mensagens relacionadas
  last_message_id UUID REFERENCES public.whatsapp_messages(id),
  
  -- Estado
  current_intent intent_type,
  awaiting_confirmation BOOLEAN DEFAULT false,
  confirmation_data JSONB, -- Dados aguardando confirmação
  
  -- Histórico
  message_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Expiração
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(user_id, conversation_id)
);

-- =====================================================
-- 5. TABELA: whatsapp_connection_status
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_connection_status (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status de Conexão
  is_connected BOOLEAN DEFAULT false,
  phone_number VARCHAR(20),
  qr_code TEXT, -- QR Code para conexão (temporário)
  qr_code_expires_at TIMESTAMPTZ,
  
  -- Estatísticas
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Sessão UAZAPI
  session_id TEXT,
  instance_id TEXT,
  
  -- Timestamps
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(user_id)
);

-- =====================================================
-- 6. ÍNDICES
-- =====================================================

-- whatsapp_messages
CREATE INDEX idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_status ON public.whatsapp_messages(processing_status);
CREATE INDEX idx_whatsapp_messages_intent ON public.whatsapp_messages(intent);
CREATE INDEX idx_whatsapp_messages_received_at ON public.whatsapp_messages(received_at DESC);
CREATE INDEX idx_whatsapp_messages_pending ON public.whatsapp_messages(user_id, processing_status) 
  WHERE processing_status = 'pending';

-- whatsapp_quick_commands
CREATE INDEX idx_whatsapp_commands_active ON public.whatsapp_quick_commands(is_active) 
  WHERE is_active = true;
CREATE INDEX idx_whatsapp_commands_category ON public.whatsapp_quick_commands(category);

-- whatsapp_conversation_context
CREATE INDEX idx_whatsapp_context_user_id ON public.whatsapp_conversation_context(user_id);
CREATE INDEX idx_whatsapp_context_conversation_id ON public.whatsapp_conversation_context(conversation_id);
CREATE INDEX idx_whatsapp_context_expires_at ON public.whatsapp_conversation_context(expires_at);

-- whatsapp_connection_status
CREATE INDEX idx_whatsapp_connection_user_id ON public.whatsapp_connection_status(user_id);

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.whatsapp_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.whatsapp_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON public.whatsapp_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- whatsapp_quick_commands (público para leitura)
ALTER TABLE public.whatsapp_quick_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active commands"
  ON public.whatsapp_quick_commands
  FOR SELECT
  USING (is_active = true);

-- whatsapp_conversation_context
ALTER TABLE public.whatsapp_conversation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context"
  ON public.whatsapp_conversation_context
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context"
  ON public.whatsapp_conversation_context
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context"
  ON public.whatsapp_conversation_context
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- whatsapp_connection_status
ALTER TABLE public.whatsapp_connection_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection status"
  ON public.whatsapp_connection_status
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connection status"
  ON public.whatsapp_connection_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connection status"
  ON public.whatsapp_connection_status
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger para updated_at em whatsapp_messages
CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em whatsapp_quick_commands
CREATE TRIGGER update_whatsapp_commands_updated_at
  BEFORE UPDATE ON public.whatsapp_quick_commands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em whatsapp_conversation_context
CREATE TRIGGER update_whatsapp_context_updated_at
  BEFORE UPDATE ON public.whatsapp_conversation_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em whatsapp_connection_status
CREATE TRIGGER update_whatsapp_connection_updated_at
  BEFORE UPDATE ON public.whatsapp_connection_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. SEED DATA - Comandos Rápidos
-- =====================================================

INSERT INTO public.whatsapp_quick_commands (command, aliases, description, example, category, response_template) VALUES
  ('saldo', ARRAY['saldo', 'meu saldo', 'quanto tenho', 'dinheiro'], 
   'Retorna o saldo total de todas as contas', 
   'saldo', 
   'finance',
   'Seu saldo total é de R$ {total_balance}'),
   
  ('resumo', ARRAY['resumo', 'resumo dia', 'resumo semana', 'resumo mês'], 
   'Retorna resumo financeiro do período', 
   'resumo mês', 
   'finance',
   'Resumo de {period}: Receitas R$ {income}, Despesas R$ {expenses}, Saldo R$ {balance}'),
   
  ('contas', ARRAY['contas', 'contas a pagar', 'vencimentos', 'boletos'], 
   'Lista contas a vencer nos próximos 7 dias', 
   'contas', 
   'bills',
   'Você tem {count} contas a vencer nos próximos 7 dias'),
   
  ('meta', ARRAY['meta', 'metas', 'objetivo'], 
   'Status de metas financeiras', 
   'meta viagem', 
   'goals',
   'Meta "{goal_name}": {progress}% concluído. Faltam R$ {remaining}'),
   
  ('investimentos', ARRAY['investimentos', 'portfólio', 'carteira'], 
   'Resumo do portfólio de investimentos', 
   'investimentos', 
   'investments',
   'Seu portfólio: R$ {total_value} ({return_percentage}% de retorno)'),
   
  ('cartões', ARRAY['cartões', 'cartão', 'faturas', 'fatura'], 
   'Status de faturas de cartão de crédito', 
   'cartões', 
   'bills',
   'Faturas: {count} abertas, total R$ {total_amount}'),
   
  ('ajuda', ARRAY['ajuda', 'help', 'comandos', 'menu'], 
   'Lista todos os comandos disponíveis', 
   'ajuda', 
   'help',
   'Comandos disponíveis: saldo, resumo, contas, meta, investimentos, cartões, relatório'),
   
  ('relatório', ARRAY['relatório', 'relatorio', 'report'], 
   'Envia relatório completo do mês', 
   'relatório novembro', 
   'finance',
   'Gerando relatório de {month}...');

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE public.whatsapp_messages IS 'Histórico completo de mensagens WhatsApp (enviadas e recebidas)';
COMMENT ON TABLE public.whatsapp_quick_commands IS 'Comandos rápidos disponíveis via WhatsApp';
COMMENT ON TABLE public.whatsapp_conversation_context IS 'Contexto de conversas ativas para manter estado';
COMMENT ON TABLE public.whatsapp_connection_status IS 'Status de conexão WhatsApp por usuário';

COMMENT ON COLUMN public.whatsapp_messages.extracted_data IS 'Dados extraídos por LLM para lançamentos: {amount, category, description, date}';
COMMENT ON COLUMN public.whatsapp_conversation_context.expires_at IS 'Contexto expira após 30 minutos de inatividade';
COMMENT ON COLUMN public.whatsapp_connection_status.qr_code IS 'QR Code temporário para conexão (expira em 2 minutos)';
