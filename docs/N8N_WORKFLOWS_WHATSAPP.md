# 📱 N8N WORKFLOWS - WHATSAPP BIDIRECIONAL

## 🎯 VISÃO GERAL

Este documento detalha os 5 workflows N8N necessários para implementar a integração WhatsApp bidirecional completa do Personal Finance LA.

**Objetivo:** Permitir que usuários interajam com o sistema via WhatsApp usando:
- ✅ Texto livre
- ✅ Comandos rápidos
- ✅ Mensagens de áudio (transcrição automática)
- ✅ Fotos de notas fiscais (OCR automático)
- ✅ Confirmações interativas

---

## 🔄 WORKFLOW 1: RECEBER MENSAGENS DO USUÁRIO

**Trigger:** Webhook UAZAPI (mensagem recebida)
**Objetivo:** Processar todas as mensagens recebidas e rotear conforme tipo

### Nodes:

```
1. [Webhook] UAZAPI Message Received
   ↓
2. [Function] Parse Webhook Data
   ↓
3. [Supabase] Find User by Phone Number
   ↓
4. [Switch] Route by Message Type
   ├─ text → [HTTP Request] process-whatsapp-message
   ├─ audio → [HTTP Request] transcribe-audio → process-whatsapp-message
   ├─ image → [HTTP Request] extract-receipt-data → process-whatsapp-message
   └─ other → [Function] Log Unsupported Type
```

### Configuração:

**Node 1: Webhook**
- URL: `https://n8n.seudominio.com/webhook/whatsapp-receive`
- Method: POST
- Authentication: None (validar via UAZAPI secret)

**Node 2: Function - Parse Webhook Data**
```javascript
const payload = $input.item.json;

return {
  json: {
    event: payload.event,
    from: payload.data.from.replace('@s.whatsapp.net', ''),
    message_type: payload.data.message.type,
    content: payload.data.message.text || null,
    media_url: payload.data.message.media?.url || null,
    media_mimetype: payload.data.message.media?.mimetype || null,
    timestamp: new Date().toISOString()
  }
};
```

**Node 3: Supabase - Find User**
- Table: `whatsapp_connection_status`
- Operation: Get
- Filters: `phone_number = {{$json.from}}` AND `is_connected = true`

**Node 4: Switch - Route by Type**
- text → Continue
- audio → Transcribe first
- image → Extract data first
- other → Log and ignore

---

## 🎙️ WORKFLOW 2: PROCESSAR ÁUDIO (WHISPER API)

**Trigger:** Chamado pelo Workflow 1
**Objetivo:** Transcrever áudio para texto usando OpenAI Whisper

### Nodes:

```
1. [HTTP Request] Download Audio from UAZAPI
   ↓
2. [Function] Convert to MP3 (if needed)
   ↓
3. [HTTP Request] OpenAI Whisper API
   ↓
4. [Function] Extract Transcription
   ↓
5. [HTTP Request] process-whatsapp-message (com texto transcrito)
```

### Configuração:

**Node 3: OpenAI Whisper API**
- URL: `https://api.openai.com/v1/audio/transcriptions`
- Method: POST
- Headers:
  - `Authorization: Bearer {{$env.OPENAI_API_KEY}}`
  - `Content-Type: multipart/form-data`
- Body:
  ```json
  {
    "file": "{{$binary.audio}}",
    "model": "whisper-1",
    "language": "pt",
    "response_format": "json"
  }
  ```

**Node 4: Extract Transcription**
```javascript
const transcription = $input.item.json.text;

return {
  json: {
    success: true,
    text: transcription,
    language: 'pt-BR',
    duration: $input.item.json.duration
  }
};
```

---

## 📸 WORKFLOW 3: PROCESSAR IMAGEM/NOTA FISCAL (OCR)

**Trigger:** Chamado pelo Workflow 1
**Objetivo:** Extrair dados de nota fiscal usando GPT-4 Vision

### Nodes:

```
1. [HTTP Request] Download Image from UAZAPI
   ↓
2. [Function] Encode Image to Base64
   ↓
3. [HTTP Request] GPT-4 Vision API
   ↓
4. [Function] Parse Extracted Data
   ↓
5. [Supabase] Save Extracted Data
   ↓
6. [HTTP Request] categorize-transaction (criar lançamento)
```

### Configuração:

**Node 3: GPT-4 Vision API**
- URL: `https://api.openai.com/v1/chat/completions`
- Method: POST
- Headers:
  - `Authorization: Bearer {{$env.OPENAI_API_KEY}}`
  - `Content-Type: application/json`
- Body:
  ```json
  {
    "model": "gpt-4-vision-preview",
    "messages": [
      {
        "role": "system",
        "content": "Você é um assistente especializado em extrair dados de notas fiscais brasileiras. Retorne APENAS um JSON válido com os campos: merchant_name, amount, date (YYYY-MM-DD), items (array com name, quantity, unit_price, total_price)."
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Extraia os dados desta nota fiscal:"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,{{$json.image_base64}}"
            }
          }
        ]
      }
    ],
    "max_tokens": 1000,
    "temperature": 0.2
  }
  ```

**Node 4: Parse Extracted Data**
```javascript
const response = $input.item.json.choices[0].message.content;
const data = JSON.parse(response);

return {
  json: {
    success: true,
    data: {
      merchant_name: data.merchant_name,
      amount: parseFloat(data.amount),
      date: data.date,
      items: data.items,
      category: 'food', // Inferir categoria
      description: `Compra em ${data.merchant_name}`,
      type: 'expense',
      confidence: 0.9
    }
  }
};
```

---

## 💬 WORKFLOW 4: PROCESSAR LANÇAMENTO DE TRANSAÇÃO

**Trigger:** Chamado após detecção de intenção "transaction"
**Objetivo:** Extrair dados e criar transação no Supabase

### Nodes:

```
1. [HTTP Request] Get User AI Config
   ↓
2. [HTTP Request] LLM Extract Transaction Data
   ↓
3. [Function] Validate Extracted Data
   ↓
4. [Switch] Confidence Check
   ├─ High (>0.8) → [Supabase] Create Transaction → Send Confirmation
   └─ Low (<0.8) → [HTTP Request] Send Confirmation Request
       ↓
       [Webhook] Wait for User Confirmation
       ↓
       [Supabase] Create Transaction → Send Confirmation
```

### Configuração:

**Node 2: LLM Extract Transaction Data**
- Usar configuração de IA do usuário (provider + model)
- Prompt:
  ```
  Você é um assistente financeiro. Extraia os seguintes dados desta mensagem:
  - amount (número, apenas valor numérico)
  - category (uma de: food, transport, health, education, entertainment, shopping, bills, other)
  - description (texto curto descritivo)
  - date (YYYY-MM-DD, se não mencionado use hoje)
  - type (income ou expense)
  
  Mensagem: "{{$json.content}}"
  
  Retorne APENAS um JSON válido com esses campos.
  ```

**Node 3: Validate Extracted Data**
```javascript
const data = JSON.parse($input.item.json.response);

// Validações
const isValid = 
  data.amount && data.amount > 0 &&
  data.category &&
  data.description &&
  data.date &&
  data.type;

const confidence = isValid ? 0.9 : 0.5;

return {
  json: {
    ...data,
    confidence,
    is_valid: isValid
  }
};
```

---

## ⚡ WORKFLOW 5: PROCESSAR COMANDOS RÁPIDOS

**Trigger:** Chamado após detecção de intenção "quick_command"
**Objetivo:** Executar comando e retornar resposta formatada

### Nodes:

```
1. [Function] Parse Command
   ↓
2. [Switch] Route by Command
   ├─ saldo → [Supabase] Get Accounts → Format Response
   ├─ resumo → [Supabase] Get Transactions → Calculate Summary
   ├─ contas → [Supabase] Get Bills → Format List
   ├─ meta → [Supabase] Get Goals → Calculate Progress
   ├─ investimentos → [Supabase] Get Portfolio → Format Summary
   ├─ cartões → [Supabase] Get Credit Cards → Format List
   ├─ ajuda → [Function] Return Help Text
   └─ relatório → [HTTP Request] Generate PDF Report
   ↓
3. [HTTP Request] Send WhatsApp Message
   ↓
4. [Supabase] Update Command Statistics
```

### Configuração:

**Node 1: Parse Command**
```javascript
const message = $json.content.toLowerCase().trim();
const parts = message.split(' ');
const command = parts[0];
const params = parts.slice(1);

return {
  json: {
    command,
    params,
    raw_message: message
  }
};
```

**Node 3: Send WhatsApp Message**
- URL: `https://api.uazapi.com/v1/instances/{{$env.UAZAPI_INSTANCE_ID}}/messages/text`
- Method: POST
- Headers:
  - `Authorization: Bearer {{$env.UAZAPI_TOKEN}}`
  - `Content-Type: application/json`
- Body:
  ```json
  {
    "to": "{{$json.phone_number}}@s.whatsapp.net",
    "text": "{{$json.response_text}}"
  }
  ```

---

## 🔐 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

Configure no N8N:

```env
# Supabase
SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# UAZAPI
UAZAPI_TOKEN=seu_token_aqui
UAZAPI_INSTANCE_ID=seu_instance_id

# OpenAI
OPENAI_API_KEY=sk-...

# Outros
WEBHOOK_SECRET=seu_secret_para_validacao
```

---

## 📊 MONITORAMENTO E LOGS

Cada workflow deve:
1. ✅ Logar início e fim da execução
2. ✅ Salvar erros no Supabase (`whatsapp_messages.error_message`)
3. ✅ Atualizar estatísticas (`whatsapp_connection_status`)
4. ✅ Incrementar contadores de uso (`whatsapp_quick_commands.usage_count`)

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

1. **Workflow 1** (Receber Mensagens) - BASE
2. **Workflow 5** (Comandos Rápidos) - MAIS SIMPLES
3. **Workflow 4** (Lançamentos) - CORE FEATURE
4. **Workflow 2** (Áudio) - DIFERENCIAL
5. **Workflow 3** (Imagem/OCR) - KILLER FEATURE

---

## ✅ CHECKLIST DE DEPLOY

- [ ] Criar conta N8N (self-hosted ou cloud)
- [ ] Configurar variáveis de ambiente
- [ ] Importar workflows
- [ ] Testar cada workflow individualmente
- [ ] Configurar webhook no UAZAPI
- [ ] Testar fluxo completo end-to-end
- [ ] Monitorar logs por 24h
- [ ] Ajustar prompts conforme necessário

---

## 📚 RECURSOS ADICIONAIS

- [N8N Documentation](https://docs.n8n.io/)
- [UAZAPI API Docs](https://uazapi.com/docs)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [GPT-4 Vision API](https://platform.openai.com/docs/guides/vision)

---

**Tempo estimado de implementação:** 6-8 horas
**Custo mensal estimado (100 usuários ativos):**
- N8N Cloud: $20/mês
- UAZAPI: $30/mês
- OpenAI API: ~$50/mês (depende do uso)
- **Total:** ~$100/mês
