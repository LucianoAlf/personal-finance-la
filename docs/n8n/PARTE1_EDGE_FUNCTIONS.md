# 📦 PARTE 1: EDGE FUNCTIONS - DOCUMENTAÇÃO TÉCNICA COMPLETA

**Data:** 13/11/2025  
**Project:** Personal Finance LA  
**Status:** ✅ TODAS AS 6 EDGE FUNCTIONS DEPLOYADAS E ATIVAS

---

## 🎯 VISÃO GERAL

**6 Edge Functions WhatsApp:**
1. ⭐ `process-whatsapp-message` - Processa mensagens (CRÍTICA)
2. `execute-quick-command` - Executa comandos rápidos
3. `send-whatsapp-message` - Envia mensagens via UAZAPI
4. `categorize-transaction` - Categoriza e cria transação via LLM
5. `transcribe-audio` - Transcreve áudio via Whisper API
6. `extract-receipt-data` - Extrai dados de nota fiscal via Vision API

**Integração:**
- UAZAPI (WhatsApp Business API)
- OpenAI (Whisper + Vision)
- Supabase Database
- AI Provider Configs (multi-provider)

---

## 1. process-whatsapp-message ⭐

### **URL:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message
```

### **Método:** POST  
### **Auth:** Bearer (Service Role Key)

### **Descrição:**
Edge Function PRINCIPAL que recebe webhooks do UAZAPI, processa mensagens de forma assíncrona e orquestra todas as outras Edge Functions.

### **Request Format (UAZAPI Webhook):**
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

**Tipos de mensagem suportados:**
- `text` - Mensagem de texto
- `audio` - Áudio (WhatsApp usa .ogg)
- `image` - Imagem/Foto

### **Response:**
```json
{
  "success": true,
  "message_id": "uuid-da-mensagem",
  "status": "processing"
}
```

### **Fluxo Detalhado:**

```
┌─────────────────────────────────────────────────────────────┐
│                    WEBHOOK UAZAPI                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
            ┌────────────────┐
            │ Parse Webhook  │
            │ Extract: phone │
            │         message│
            └───────┬────────┘
                    │
                    ↓
        ┌──────────────────────┐
        │ Buscar Usuário       │
        │ whatsapp_connection_ │
        │ status.phone_number  │
        └──────────┬───────────┘
                   │
                   ↓ (Usuário encontrado)
        ┌──────────────────────┐
        │ Salvar Mensagem      │
        │ whatsapp_messages    │
        │ status: 'pending'    │
        └──────────┬───────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │ Processar Assíncrono │ ← NÃO BLOQUEIA WEBHOOK
        └──────────┬───────────┘
                   │
                   ↓
   ┌───────────────┴────────────────┐
   │ Detectar Tipo de Mensagem      │
   └───────┬────────────────┬───────┘
           │                │
    ┌──────▼─────┐    ┌────▼──────┐    ┌─────────┐
    │ ÁUDIO?     │    │ IMAGEM?   │    │ TEXTO?  │
    └──────┬─────┘    └────┬──────┘    └────┬────┘
           │YES            │YES             │YES
           ↓               ↓                ↓
    ┌──────────┐    ┌─────────────┐  ┌──────────────┐
    │transcribe│    │extract-     │  │detectIntent  │
    │-audio    │    │receipt-data │  │(LLM)         │
    └────┬─────┘    └─────┬───────┘  └──────┬───────┘
         │                │                   │
         └────────┬───────┴───────────────────┘
                  │
                  ↓
        ┌─────────────────────┐
        │ Routing por Intent  │
        └────────┬────────────┘
                 │
     ┌───────────┼────────────┐
     │           │            │
     ↓           ↓            ↓
┌────────┐  ┌─────────┐  ┌─────────┐
│quick_  │  │trans-   │  │conver-  │
│command │  │action   │  │sation   │
└───┬────┘  └────┬────┘  └────┬────┘
    │            │            │
    ↓            ↓            ↓
┌────────┐  ┌─────────┐  ┌─────────┐
│execute │  │catego-  │  │chatWith │
│Quick   │  │rize     │  │Ana      │
│Command │  │Trans    │  │(inline) │
└───┬────┘  └────┬────┘  └────┬────┘
    │            │            │
    └────────────┴────────────┘
                 │
                 ↓
        ┌─────────────────┐
        │ sendWhatsApp    │
        │ Message         │
        └────────┬────────┘
                 │
                 ↓
        ┌─────────────────┐
        │ Update Message  │
        │ status:         │
        │ 'completed'     │
        └─────────────────┘
```

### **Detecção de Intenção (LLM):**

```javascript
// Código real da função
async function detectIntent(supabase, userId, content) {
  // 1. Busca config IA do usuário
  const { data: aiConfig } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('is_validated', true)
    .single();

  // 2. Fallback: comandos rápidos (regex)
  if (!aiConfig) {
    const commands = ['saldo', 'resumo', 'contas', 'meta', 
                      'investimentos', 'cartões', 'ajuda', 'relatório'];
    const firstWord = content.toLowerCase().split(' ')[0];
    if (commands.includes(firstWord)) {
      return { intent: 'quick_command', extracted_data: null };
    }
    return { intent: 'conversation', extracted_data: null };
  }

  // 3. Chama LLM configurado
  const system = `Você é Ana Clara. Classifique a mensagem em:
- quick_command: comando rápido (saldo, resumo, contas, etc)
- transaction: lançamento financeiro (gastei X, recebi Y)
- conversation: conversa geral

Se for transaction, extraia JSON:
{ "amount": number, "type": "income|expense", "category": string, "description": string }

Responda APENAS JSON:
{"intent": "...", "extracted_data": {...}}`;

  const text = await callChat(cfg, [
    { role: 'system', content: system },
    { role: 'user', content }
  ]);

  return JSON.parse(text);
}
```

### **Providers IA Suportados:**
- `openai` - GPT-4, GPT-4o, GPT-4o-mini
- `gemini` - Gemini 1.5 Pro, Gemini 1.5 Flash
- `claude` - Claude 3 Opus, Sonnet, Haiku
- `openrouter` - Múltiplos modelos gratuitos

### **Secrets Necessários:**
```env
SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
UAZAPI_TOKEN=sua_api_key
UAZAPI_INSTANCE_ID=instance_id
```

### **Timeouts:**
- Webhook response: Imediato (~100-200ms)
- Processamento assíncrono: Sem timeout (não bloqueia)

### **Error Handling:**
```javascript
try {
  // Processamento
} catch (error) {
  console.error('❌ Erro:', error);
  await supabase.from('whatsapp_messages').update({
    processing_status: 'failed',
    error_message: error.message,
    retry_count: supabase.raw('retry_count + 1')
  }).eq('id', messageId);
}
```

---

## 2. execute-quick-command

### **URL:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/execute-quick-command
```

### **Request:**
```json
{
  "user_id": "uuid",
  "command": "saldo"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "💰 *Seu Saldo Total*\n\nR$ 2.500,00\n\n_Atualizado agora_",
  "data": {
    "total_balance": 2500.00
  }
}
```

### **8 Comandos Implementados:**

#### **1. saldo**
```sql
SELECT SUM(current_balance) FROM accounts WHERE user_id = $1;
```
**Response Format:**
```
💰 *Seu Saldo Total*

R$ 2.500,00

_Atualizado agora_
```

#### **2. resumo [período]**
Parâmetros: `dia`, `semana`, `mês` (default)
```sql
SELECT amount, type FROM transactions 
WHERE user_id = $1 
  AND transaction_date >= $2 
  AND transaction_date <= $3;
```
**Response Format:**
```
📊 *Resumo do Mês*

💵 Receitas: R$ 5.500,00
💸 Despesas: R$ 1.250,00
✅ Saldo: R$ 4.250,00
```

#### **3. contas**
```sql
SELECT description, amount, due_date 
FROM payable_bills 
WHERE user_id = $1 
  AND status IN ('pending', 'overdue')
  AND due_date >= CURRENT_DATE 
  AND due_date <= CURRENT_DATE + 7
ORDER BY due_date ASC;
```
**Response Format:**
```
📋 *Contas a Pagar (3)*

🔴 Energia
   R$ 230,00 - Hoje

🟡 Internet
   R$ 99,00 - Amanhã

🟢 Academia
   R$ 150 - 3 dias

💰 Total: R$ 479,00
```

#### **4. meta [nome]**
```sql
-- Se nome fornecido
SELECT * FROM goals 
WHERE user_id = $1 
  AND name ILIKE '%$2%' 
  AND status = 'active';

-- Se sem nome (lista todas)
SELECT * FROM goals 
WHERE user_id = $1 
  AND status = 'active' 
LIMIT 5;
```
**Response Format:**
```
🎯 *Meta: Viagem*

████████░░ 80%

💰 Economizado: R$ 4.000,00
🎯 Meta: R$ 5.000,00
📊 Faltam: R$ 1.000,00
```

#### **5. investimentos**
```sql
-- Chama RPC
SELECT * FROM get_portfolio_summary($1);
```
**Response Format:**
```
💼 *Seu Portfólio*

💰 Valor Atual: R$ 45.000,00
📊 Investido: R$ 40.000,00
📈 Retorno: R$ 5.000,00 (+12.50%)
```

#### **6. cartões**
```sql
SELECT description, amount, due_date 
FROM payable_bills 
WHERE user_id = $1 
  AND bill_type = 'credit_card'
  AND status IN ('pending', 'overdue');
```
**Response Format:**
```
💳 *Faturas de Cartão (2)*

🟡 Nubank
   R$ 1.500,00 - Vence 15/11

🔴 Inter
   R$ 800,00 - Vencida (12/11)

💰 Total: R$ 2.300,00
```

#### **7. ajuda**
**Response Format:**
```
📚 *Comandos Disponíveis*

💰 *saldo* - Ver saldo total
📊 *resumo [período]* - Resumo financeiro
   Ex: resumo dia, resumo semana
   
📋 *contas* - Contas a vencer (7 dias)
🎯 *meta [nome]* - Status de metas
📈 *investimentos* - Resumo do portfólio
💳 *cartões* - Faturas de cartão
📄 *relatório [mês]* - Relatório completo

_Você também pode enviar lançamentos por texto, áudio ou foto!_
```

#### **8. relatório [mês]**
```
TODO: Gera PDF completo do mês
Atualmente retorna mensagem de "gerando..."
```

### **Formatação Helpers:**
```javascript
// BRL Currency
const formatCurrency = (value) => 
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

// Date pt-BR
const formatDate = (date) => 
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);

// Progress Bar
const getProgressBar = (percentage) => {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
};
```

---

## 3. send-whatsapp-message

### **URL:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-whatsapp-message
```

### **Request:**
```json
{
  "user_id": "uuid",
  "message_type": "text",
  "content": "Olá! Sua conta foi registrada.",
  "media_url": null
}
```

### **Tipos Suportados:**

**1. text** - Mensagem de texto
```json
{
  "message_type": "text",
  "content": "Mensagem aqui"
}
```

**2. image** - Imagem com caption
```json
{
  "message_type": "image",
  "media_url": "https://...",
  "caption": "Legenda opcional"
}
```

**3. audio** - Arquivo de áudio
```json
{
  "message_type": "audio",
  "media_url": "https://..."
}
```

**4. document** - PDF, DOCX, etc
```json
{
  "message_type": "document",
  "media_url": "https://...",
  "filename": "documento.pdf"
}
```

**5. location** - Localização GPS
```json
{
  "message_type": "location",
  "latitude": -22.906847,
  "longitude": -43.172896
}
```

### **UAZAPI Integration:**

**Base URL:**
```
https://api.uazapi.com/v1
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer ${UAZAPI_TOKEN}"
}
```

**Endpoints:**
```
POST /instances/${INSTANCE_ID}/messages/text
POST /instances/${INSTANCE_ID}/messages/image
POST /instances/${INSTANCE_ID}/messages/audio
POST /instances/${INSTANCE_ID}/messages/document
POST /instances/${INSTANCE_ID}/messages/location
```

**Payload Exemplo (texto):**
```json
{
  "to": "5521999999999@s.whatsapp.net",
  "text": "Mensagem aqui"
}
```

**Response UAZAPI:**
```json
{
  "success": true,
  "message_id": "3EB0C0F2B1F4A8D9E2C1",
  "queuedAt": "2025-11-07T12:00:00Z"
}
```

### **Após Envio:**

1. **Salva no histórico:**
```sql
INSERT INTO whatsapp_messages (
  user_id, phone_number, message_type, direction,
  content, processing_status, response_sent_at,
  metadata
) VALUES (
  $1, $2, $3, 'outbound',
  $4, 'completed', NOW(),
  jsonb_build_object('uazapi_message_id', $5)
);
```

2. **Atualiza estatísticas:**
```sql
UPDATE whatsapp_connection_status 
SET total_messages_sent = total_messages_sent + 1,
    last_message_at = NOW()
WHERE user_id = $1;
```

---

## 4. categorize-transaction

### **URL:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/categorize-transaction
```

### **Request:**
```json
{
  "user_id": "uuid",
  "data": {
    "raw_text": "Gastei 50 reais no mercado",
    "merchant_name": "Supermercado XYZ",
    "amount": 127.50,
    "items": [
      { "name": "Arroz", "quantity": 1, "unit_price": 30.00 }
    ]
  }
}
```

### **Response:**
```json
{
  "success": true,
  "message": "💸 *Lançamento Registrado!*\n\n🍔 Alimentação\nCompra em Supermercado XYZ\nR$ 127,50\n\n_Registrado com sucesso!_",
  "transaction_id": "uuid",
  "data": {
    "amount": 127.50,
    "type": "expense",
    "category": "food",
    "description": "Compra em Supermercado XYZ",
    "confidence": 0.95
  }
}
```

### **Prompt LLM:**
```
Você é um assistente financeiro especializado em extrair dados de transações.
Extraia os seguintes campos:
- amount (número, apenas valor numérico sem R$ ou vírgulas)
- type (income ou expense)
- category (uma de: food, transport, health, education, entertainment, 
           shopping, bills, salary, investment, other)
- description (texto curto e descritivo)
- date (YYYY-MM-DD, se não mencionado use a data de hoje)

Retorne APENAS um JSON válido com esses campos, sem texto adicional.

Mensagem do usuário: "Gastei 50 reais no mercado"
```

### **Validação:**
```javascript
function validateTransactionData(data) {
  const errors = [];
  if (!data.amount || data.amount <= 0) 
    errors.push('valor inválido');
  if (!data.type || !['income', 'expense'].includes(data.type)) 
    errors.push('tipo inválido');
  if (!data.category) 
    errors.push('categoria ausente');
  if (!data.description) 
    errors.push('descrição ausente');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### **Criação da Transação:**
```sql
INSERT INTO transactions (
  user_id,
  amount,
  type,
  category,
  description,
  transaction_date,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6,
  jsonb_build_object(
    'source', 'whatsapp',
    'merchant_name', $7,
    'items', $8,
    'confidence', $9,
    'llm_provider', $10
  )
)
RETURNING *;
```

---

## 5. transcribe-audio

### **URL:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/transcribe-audio
```

### **Request:**
```json
{
  "audio_url": "https://uazapi.com/media/abc123.ogg",
  "language": "pt",
  "user_id": "uuid"
}
```

### **Response:**
```json
{
  "success": true,
  "text": "Gastei cinquenta reais no mercado hoje de manhã",
  "language": "pt",
  "duration": 3.5
}
```

### **OpenAI Whisper API:**

**Endpoint:**
```
POST https://api.openai.com/v1/audio/transcriptions
```

**FormData:**
```javascript
const formData = new FormData();
formData.append('file', audioBlob, 'audio.ogg');
formData.append('model', 'whisper-1');
formData.append('language', 'pt');
formData.append('response_format', 'json');
```

**Custo:** ~$0.006 por minuto

---

## 6. extract-receipt-data

### **URL:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/extract-receipt-data
```

### **Request:**
```json
{
  "image_url": "https://uazapi.com/media/receipt.jpg",
  "user_id": "uuid"
}
```

### **Response:**
```json
{
  "success": true,
  "data": {
    "merchant_name": "Supermercado XYZ",
    "amount": 127.50,
    "date": "2025-11-13",
    "items": [...],
    "category": "food",
    "type": "expense"
  },
  "confidence": 0.92
}
```

### **GPT-4 Vision API:**

**Model:** gpt-4o-mini  
**Cost:** ~$0.0004-0.0008 por imagem

**Prompt:**
```
Você é um assistente especializado em extrair dados de notas fiscais brasileiras.
Analise a imagem e extraia:
- merchant_name, merchant_cnpj, amount, date, items, payment_method, receipt_number

Retorne APENAS JSON válido.
```

---

## 📝 RESUMO PARA N8N

**Para criar workflows N8N, você vai:**

1. **Receber webhook UAZAPI** → Chamar `process-whatsapp-message`
2. **Comandos rápidos** → Já processados automaticamente
3. **Áudio** → `transcribe-audio` → `process-whatsapp-message`
4. **Imagem** → `extract-receipt-data` → `categorize-transaction`
5. **Texto** → LLM detecta intenção → roteia automaticamente

**As Edge Functions já fazem TODO o trabalho!** N8N será apenas **orquestração visual**.

---

**Próximo Documento:** `PARTE2_DATABASE_SCHEMA.md`
