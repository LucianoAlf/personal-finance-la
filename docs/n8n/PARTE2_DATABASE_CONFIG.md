# 🗄️ PARTE 2: DATABASE SCHEMA + CONFIGURAÇÕES

**Data:** 13/11/2025  
**Project:** Personal Finance LA  
**Region:** us-east-1

---

## 📊 DATABASE SCHEMA COMPLETO

### 1. whatsapp_messages

**Descrição:** Histórico completo de mensagens WhatsApp (enviadas + recebidas)

**Schema:**
```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  whatsapp_message_id TEXT,
  phone_number VARCHAR NOT NULL,
  
  -- Tipo e Direção
  message_type whatsapp_message_type NOT NULL DEFAULT 'text',
  direction message_direction NOT NULL,
  
  -- Conteúdo
  content TEXT,
  media_url TEXT,
  media_mime_type VARCHAR,
  
  -- Processamento
  intent message_intent,
  processing_status processing_status DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  extracted_data JSONB,
  
  -- Resposta
  response_text TEXT,
  response_sent_at TIMESTAMPTZ,
  
  -- Erro
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enums
CREATE TYPE whatsapp_message_type AS ENUM (
  'text', 'audio', 'image', 'video', 'document', 'location'
);

CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE message_intent AS ENUM (
  'quick_command', 'transaction', 'conversation', 'unknown'
);

CREATE TYPE processing_status AS ENUM (
  'pending', 'processing', 'completed', 'failed'
);

-- Índices
CREATE INDEX idx_whatsapp_messages_user ON whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(processing_status);
CREATE INDEX idx_whatsapp_messages_date ON whatsapp_messages(received_at DESC);
CREATE INDEX idx_whatsapp_messages_intent ON whatsapp_messages(intent);
```

**Exemplo de Dados:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-uuid",
  "whatsapp_message_id": "3EB0C0F2B1F4A8D9E2C1",
  "phone_number": "5521999999999",
  "message_type": "text",
  "direction": "inbound",
  "content": "Gastei 50 reais no mercado",
  "media_url": null,
  "intent": "transaction",
  "processing_status": "completed",
  "extracted_data": {
    "amount": 50.00,
    "type": "expense",
    "category": "food",
    "confidence": 0.95
  },
  "response_text": "💸 Lançamento registrado!",
  "response_sent_at": "2025-11-13T10:30:46Z",
  "metadata": {
    "llm_provider": "openai",
    "llm_model": "gpt-4o-mini"
  }
}
```

---

### 2. whatsapp_quick_commands

**Descrição:** Comandos rápidos disponíveis no WhatsApp

**Schema:**
```sql
CREATE TABLE whatsapp_quick_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command VARCHAR NOT NULL UNIQUE,
  aliases TEXT[],
  description TEXT NOT NULL,
  example TEXT,
  category VARCHAR,
  response_template TEXT,
  requires_params BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_quick_commands_command ON whatsapp_quick_commands(command);
CREATE INDEX idx_quick_commands_active ON whatsapp_quick_commands(is_active);
```

**Comandos Cadastrados (8):**

| command | aliases | category | requires_params |
|---------|---------|----------|-----------------|
| saldo | ['saldo', 'meu saldo', 'quanto tenho'] | finance | false |
| resumo | ['resumo', 'resumo dia', 'resumo semana'] | finance | false |
| contas | ['contas', 'contas a pagar', 'boletos'] | bills | false |
| meta | ['meta', 'metas', 'objetivo'] | goals | false |
| investimentos | ['investimentos', 'portfólio', 'carteira'] | investments | false |
| cartões | ['cartões', 'cartão', 'faturas'] | bills | false |
| ajuda | ['ajuda', 'help', 'comandos', 'menu'] | help | false |
| relatório | ['relatório', 'relatorio', 'report'] | finance | false |

**Query para buscar:**
```sql
SELECT * FROM whatsapp_quick_commands 
WHERE is_active = true 
ORDER BY usage_count DESC;
```

---

### 3. whatsapp_conversation_context

**Descrição:** Contexto de conversação (mantém estado por 30min)

**Schema:**
```sql
CREATE TABLE whatsapp_conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID DEFAULT gen_random_uuid(),
  last_message_id UUID,
  
  -- Estado
  current_intent message_intent,
  awaiting_confirmation BOOLEAN DEFAULT false,
  confirmation_data JSONB,
  
  -- Métricas
  message_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_conversation_user ON whatsapp_conversation_context(user_id);
CREATE INDEX idx_conversation_expires ON whatsapp_conversation_context(expires_at);

-- Auto-cleanup de contextos expirados (Trigger ou Cron)
```

**Uso:**
```javascript
// Edge Function usa para:
// - Manter estado em conversas multi-turn
// - Aguardar confirmação de transações
// - Limpar contextos após 30min de inatividade
```

---

### 4. whatsapp_connection_status

**Descrição:** Status da conexão WhatsApp do usuário

**Schema:**
```sql
CREATE TABLE whatsapp_connection_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  
  -- Conexão
  is_connected BOOLEAN DEFAULT false,
  phone_number VARCHAR,
  qr_code TEXT,
  qr_code_expires_at TIMESTAMPTZ,
  
  -- Sessão
  session_id TEXT,
  instance_id TEXT,
  
  -- Estatísticas
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Datas
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_connection_user ON whatsapp_connection_status(user_id);
CREATE INDEX idx_connection_phone ON whatsapp_connection_status(phone_number);
CREATE INDEX idx_connection_status ON whatsapp_connection_status(is_connected);
```

**Relacionamento com `users`:**
```sql
-- Campo na tabela users
ALTER TABLE users ADD COLUMN whatsapp_connected BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN phone VARCHAR UNIQUE;

-- Trigger para sincronizar
CREATE OR REPLACE FUNCTION sync_whatsapp_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET whatsapp_connected = NEW.is_connected 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_whatsapp_status
AFTER INSERT OR UPDATE ON whatsapp_connection_status
FOR EACH ROW EXECUTE FUNCTION sync_whatsapp_status();
```

---

### 5. whatsapp_connections (Legacy)

**Descrição:** Tabela legacy (mantida para compatibilidade)

**Schema:**
```sql
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  instance_id TEXT NOT NULL UNIQUE,
  instance_token TEXT NOT NULL,
  instance_name TEXT,
  status TEXT DEFAULT 'disconnected',
  connected BOOLEAN DEFAULT false,
  logged_in BOOLEAN DEFAULT false,
  jid TEXT,
  profile_name TEXT,
  profile_pic_url TEXT,
  is_business BOOLEAN DEFAULT false,
  last_disconnect TIMESTAMPTZ,
  last_disconnect_reason TEXT,
  qr_code TEXT,
  qr_code_expires_at TIMESTAMPTZ,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Nota:** Sistema usa `whatsapp_connection_status` atualmente. Esta tabela pode ser depreciada.

---

## 🔗 TABELAS RELACIONADAS (para referência N8N)

### users
```sql
-- Campos relevantes
id UUID PRIMARY KEY
email VARCHAR
full_name VARCHAR
phone VARCHAR UNIQUE
whatsapp_connected BOOLEAN DEFAULT false
nickname VARCHAR
```

### accounts
```sql
-- Para comando 'saldo'
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
name VARCHAR
type VARCHAR -- 'checking', 'savings', 'cash', etc
current_balance NUMERIC DEFAULT 0
is_active BOOLEAN DEFAULT true
```

### transactions
```sql
-- Para comando 'resumo' e categorização
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
account_id UUID
category_id UUID
type VARCHAR -- 'income', 'expense', 'transfer'
amount NUMERIC
description VARCHAR
transaction_date DATE
is_paid BOOLEAN DEFAULT true
metadata JSONB
```

### categories
```sql
-- Para mapeamento de categorias
id UUID PRIMARY KEY
user_id UUID (NULL = categoria padrão do sistema)
name VARCHAR
type VARCHAR -- 'income', 'expense'
icon VARCHAR -- Nome do ícone Lucide
is_default BOOLEAN DEFAULT false
keywords TEXT[] -- Para matching automático
```

### payable_bills
```sql
-- Para comando 'contas' e 'cartões'
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
description VARCHAR
amount NUMERIC
due_date DATE
status VARCHAR -- 'pending', 'overdue', 'paid', etc
bill_type VARCHAR -- 'credit_card', 'utility', etc
provider_name VARCHAR
```

### financial_goals (antigo savings_goals)
```sql
-- Para comando 'meta'
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
name VARCHAR
icon TEXT
target_amount NUMERIC
current_amount NUMERIC DEFAULT 0
status VARCHAR -- 'active', 'completed', 'paused'
goal_type VARCHAR -- 'savings', 'spending_limit'
```

### ai_provider_configs ⭐
```sql
-- CRÍTICA: Config de IA por usuário
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
provider ai_provider_type -- 'openai', 'gemini', 'claude', 'openrouter'
is_default BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
api_key_encrypted TEXT
api_key_last_4 VARCHAR
model_name VARCHAR -- 'gpt-4o-mini', 'gemini-1.5-flash', etc
temperature NUMERIC DEFAULT 0.70 -- 0.0-2.0
max_tokens INTEGER DEFAULT 1000 -- 100-4000
response_style response_style -- 'short', 'medium', 'long'
response_tone response_tone -- 'formal', 'friendly', 'casual'
system_prompt TEXT -- Personalização da Ana Clara
is_validated BOOLEAN DEFAULT false
last_validated_at TIMESTAMPTZ
validation_error TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Uso nas Edge Functions:**
```javascript
// Cada Edge Function que usa LLM busca esta config
const { data: aiConfig } = await supabase
  .from('ai_provider_configs')
  .select('*')
  .eq('user_id', userId)
  .eq('is_default', true)
  .eq('is_validated', true)
  .single();
```

---

## ⚙️ CONFIGURAÇÕES E SECRETS

### Secrets Supabase (Variáveis de Ambiente)

**Edge Functions têm acesso a:**
```env
# Supabase
SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# UAZAPI (WhatsApp)
UAZAPI_TOKEN=sua_api_key_aqui
UAZAPI_INSTANCE_ID=instance_id_aqui
UAZAPI_BASE_URL=https://api.uazapi.com/v1

# OpenAI (Fallback se usuário não configurou)
OPENAI_API_KEY=sk-proj-...

# Cron Jobs
CRON_SECRET=secret_para_validar_cron_jobs
```

**Como acessar no Deno:**
```javascript
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
```

---

### UAZAPI Configuration

**Base URL:**
```
https://api.uazapi.com/v1
```

**Authentication:**
```
Header: Authorization: Bearer ${UAZAPI_TOKEN}
```

**Endpoints Usados:**

**1. Enviar Mensagem Texto:**
```
POST /instances/${INSTANCE_ID}/messages/text
Body: { "to": "5521999999999@s.whatsapp.net", "text": "..." }
```

**2. Enviar Imagem:**
```
POST /instances/${INSTANCE_ID}/messages/image
Body: { "to": "...", "image": { "url": "..." }, "caption": "..." }
```

**3. Enviar Áudio:**
```
POST /instances/${INSTANCE_ID}/messages/audio
Body: { "to": "...", "audio": { "url": "..." } }
```

**4. Webhook Configuration:**
```
POST /instances/${INSTANCE_ID}/webhooks
Body: {
  "url": "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message",
  "events": ["message.received"],
  "enabled": true
}
```

**Webhook Format (que UAZAPI envia):**
```json
{
  "event": "message",
  "data": {
    "from": "5521999999999@s.whatsapp.net",
    "message": {
      "type": "text",
      "text": "Gastei 50 no mercado"
    },
    "messageTimestamp": 1699999999
  }
}
```

---

### Edge Functions URLs

**Produção:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/
```

**Lista Completa:**
1. `process-whatsapp-message`
2. `execute-quick-command`
3. `send-whatsapp-message`
4. `categorize-transaction`
5. `transcribe-audio`
6. `extract-receipt-data`

**Autenticação:**
```
Header: Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}
```

---

### AI Provider Configuration

**Providers Suportados:**

**1. OpenAI**
```javascript
{
  "provider": "openai",
  "model_name": "gpt-4o-mini", // ou gpt-4o, gpt-4-turbo
  "api_key_encrypted": "sk-proj-...",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**2. Google Gemini**
```javascript
{
  "provider": "gemini",
  "model_name": "gemini-1.5-flash", // ou gemini-1.5-pro
  "api_key_encrypted": "AIza...",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**3. Anthropic Claude**
```javascript
{
  "provider": "claude",
  "model_name": "claude-3-haiku-20240307",
  "api_key_encrypted": "sk-ant-...",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**4. OpenRouter**
```javascript
{
  "provider": "openrouter",
  "model_name": "mistralai/mistral-7b-instruct", // modelos grátis
  "api_key_encrypted": "sk-or-...",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Módulo Compartilhado `_shared/ai.ts`:**
```typescript
// Função principal
export async function callChat(config: AIConfig, messages: Message[]): Promise<string>

// Provedores implementados
async function callOpenAI(config, messages): Promise<string>
async function callGemini(config, messages): Promise<string>
async function callClaude(config, messages): Promise<string>
async function callOpenRouter(config, messages): Promise<string>

// Vision API
export async function callVision(
  config: AIConfig, 
  imageDataUrl: string, 
  systemPrompt: string, 
  userText: string
): Promise<string>
```

**Busca config padrão do usuário:**
```typescript
export async function getDefaultAIConfig(
  supabase: SupabaseClient, 
  userId: string
): Promise<AIConfig | null> {
  const { data } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('is_validated', true)
    .single();
  
  if (!data) return null;
  
  return {
    provider: data.provider,
    model: data.model_name,
    apiKey: data.api_key_encrypted,
    temperature: data.temperature || 0.7,
    maxTokens: data.max_tokens || 1000,
    systemPrompt: data.system_prompt
  };
}
```

---

## 📊 DADOS DE TESTE

### Usuário de Teste
```sql
-- Buscar usuário existente
SELECT id, email, phone, whatsapp_connected 
FROM users 
LIMIT 1;

-- Resultado esperado:
-- id: uuid
-- email: email@example.com
-- phone: 5521999999999
-- whatsapp_connected: true
```

### Comandos Quick Commands Cadastrados
```sql
SELECT command, aliases, category, usage_count, is_active
FROM whatsapp_quick_commands
ORDER BY command;

-- 8 comandos ativos:
-- ajuda, cartões, contas, investimentos, meta, relatório, resumo, saldo
```

### Mensagens Exemplo
```sql
-- Buscar últimas 10 mensagens
SELECT 
  id,
  message_type,
  direction,
  content,
  intent,
  processing_status,
  received_at
FROM whatsapp_messages
ORDER BY received_at DESC
LIMIT 10;
```

### Estatísticas
```sql
-- Por usuário
SELECT 
  user_id,
  phone_number,
  is_connected,
  total_messages_sent,
  total_messages_received,
  last_message_at
FROM whatsapp_connection_status
WHERE is_connected = true;
```

---

## 🔄 PADRÕES DE INTEGRAÇÃO

### 1. Erro Handling Pattern

**Estrutura de Erro:**
```javascript
{
  "success": false,
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": { /* adicional */ }
}
```

**Logging:**
```javascript
console.error('❌ Erro ao processar:', error);
console.log('✅ Sucesso:', result);
console.warn('⚠️ Aviso:', warning);
```

### 2. Response Pattern

**Sucesso:**
```javascript
{
  "success": true,
  "message": "Mensagem formatada para WhatsApp",
  "data": { /* dados estruturados */ }
}
```

### 3. Retry Logic

**Não implementado nas Edge Functions.**  
**Recomendação:** Implementar retry no N8N workflow.

```javascript
// Exemplo N8N
{
  "maxRetries": 3,
  "retryDelay": 1000,
  "retryStrategy": "exponential" // 1s, 2s, 4s
}
```

### 4. Rate Limiting

**UAZAPI:** ~10 mensagens/segundo (ajustar conforme plano)  
**OpenAI:** Depende do plano (tier-based)  
**Supabase:** Edge Functions sem limite explícito

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Backend (100% Completo)
- [x] 6 Edge Functions deployadas
- [x] 5 Tabelas WhatsApp criadas
- [x] 8 Comandos cadastrados
- [x] Secrets configurados
- [x] Triggers criados
- [x] Índices otimizados
- [x] RLS Policies ativas

### Integrações (100% Completo)
- [x] UAZAPI configurado
- [x] OpenAI Whisper configurado
- [x] GPT-4 Vision configurado
- [x] Multi-provider IA (4 providers)
- [x] Supabase Database

### Faltando (para N8N)
- [ ] 5 Workflows N8N
- [ ] Hooks React (frontend)
- [ ] Componentes UI
- [ ] Testes end-to-end

---

## 🎯 RESUMO PARA N8N

**N8N precisa apenas:**
1. **Receber webhook UAZAPI** (quando mensagem chega)
2. **Chamar** `process-whatsapp-message` (Edge Function já faz tudo)
3. **Opcional:** Orquestração visual de fluxos específicos

**As Edge Functions JÁ fazem:**
- ✅ Detecção de tipo de mensagem
- ✅ Transcrição de áudio
- ✅ OCR de imagens
- ✅ Detecção de intenção via LLM
- ✅ Execução de comandos
- ✅ Categorização de transações
- ✅ Envio de respostas
- ✅ Atualização de estatísticas

**N8N é apenas camada de ORQUESTRAÇÃO VISUAL!**

---

## 📚 PRÓXIMOS PASSOS

1. **Ler PARTE1_EDGE_FUNCTIONS.md** ✅
2. **Ler PARTE2_DATABASE_CONFIG.md** (este documento) ✅
3. **Criar workflows N8N** usando os JSONs que vou fornecer
4. **Testar integração** com webhook UAZAPI
5. **Implementar frontend** (hooks + componentes)

**Documentos Criados:**
- ✅ `PARTE1_EDGE_FUNCTIONS.md` - 6 Edge Functions detalhadas
- ✅ `PARTE2_DATABASE_CONFIG.md` - Database + Config
- ⏳ `v2-comandos-rapidos.json` - Workflow JSON (próximo)
- ⏳ `v3-v10-workflows.json` - Outros workflows

---

**Status:** SISTEMA 65% PRONTO - BACKEND 100% FUNCIONAL  
**Falta:** N8N Workflows (35%) + Frontend (React)
