# Arquitetura N8N - Personal Finance LA
# Workflows e Automações

**Versão:** 1.0  
**Data:** Novembro 2025  
**Projeto:** Personal Finance LA

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Workflow 1: Processar Mensagem de Texto](#workflow-1-processar-mensagem-de-texto)
4. [Workflow 2: Processar Mensagem de Áudio](#workflow-2-processar-mensagem-de-áudio)
5. [Workflow 3: Processar Mensagem com Imagem](#workflow-3-processar-mensagem-com-imagem)
6. [Workflow 4: Comandos Rápidos](#workflow-4-comandos-rápidos)
7. [Workflow 5: Lembretes de Contas a Vencer](#workflow-5-lembretes-de-contas-a-vencer)
8. [Workflow 6: Resumo Diário](#workflow-6-resumo-diário)
9. [Workflow 7: Resumo Semanal](#workflow-7-resumo-semanal)
10. [Workflow 8: Resumo Mensal](#workflow-8-resumo-mensal)
11. [Workflow 9: Alertas de Orçamento](#workflow-9-alertas-de-orçamento)
12. [Workflow 10: Progresso de Metas](#workflow-10-progresso-de-metas)
13. [Credenciais e Integrações](#credenciais-e-integrações)
14. [Boas Práticas e Testes](#boas-práticas-e-testes)

---

## 🏗️ Visão Geral da Arquitetura

### Diagrama de Arquitetura Geral

```
┌──────────────┐
│   WhatsApp   │
│   (UAZAPI)   │
└──────┬───────┘
       │
       │ Webhook
       │
       ↓
┌──────────────────────────────────────────┐
│           N8N Workflows                  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 1. Processar Texto                 │ │
│  │ 2. Processar Áudio                 │ │
│  │ 3. Processar Imagem                │ │
│  │ 4. Comandos Rápidos                │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 5. Lembretes                       │ │
│  │ 6. Resumo Diário                   │ │
│  │ 7. Resumo Semanal                  │ │
│  │ 8. Resumo Mensal                   │ │
│  │ 9. Alertas Orçamento               │ │
│  │ 10. Progresso de Metas             │ │
│  └────────────────────────────────────┘ │
└──────────┬───────────────────────────────┘
           │
           ├──────────┐
           │          │
           ↓          ↓
    ┌──────────┐  ┌──────────┐
    │ Supabase │  │ OpenAI   │
    │ Database │  │ GPT-4    │
    └──────────┘  └──────────┘
```

### Fluxo Geral de Processamento

```
1. Usuário envia mensagem no WhatsApp
   ↓
2. UAZAPI envia webhook para N8N
   ↓
3. N8N classifica tipo de mensagem
   ↓
4. N8N processa conforme tipo (texto/áudio/imagem)
   ↓
5. Ana Clara (GPT-4) extrai dados e categoriza
   ↓
6. N8N valida e insere no Supabase
   ↓
7. N8N envia confirmação via WhatsApp
   ↓
8. Dashboard atualiza em tempo real (Supabase Realtime)
```

---

## ⚙️ Configuração Inicial

### Requisitos

- **N8N:** Self-hosted ou N8N Cloud
- **Node.js:** v18+ (para N8N self-hosted)
- **PostgreSQL:** Para banco do N8N (metadata)
- **Credenciais necessárias:**
  - UAZAPI API Key
  - OpenAI API Key
  - Supabase URL e Service Role Key

### Instalação N8N (Self-hosted)

```bash
# Via npm
npm install -g n8n

# Via Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Acessar em http://localhost:5678
```

### Variáveis de Ambiente

Criar arquivo `.env` no N8N:

```env
# N8N
N8N_HOST=seu-dominio.com
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://seu-dominio.com

# UAZAPI
UAZAPI_API_KEY=sua_api_key_uazapi
UAZAPI_INSTANCE_ID=sua_instancia_id
UAZAPI_BASE_URL=https://api.uazapi.com

# OpenAI
OPENAI_API_KEY=sua_api_key_openai
OPENAI_MODEL=gpt-4

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key

# Google Cloud (para Speech-to-Text e Vision API)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

---

## 📝 Workflow 1: Processar Mensagem de Texto

### Objetivo

Receber mensagens de texto do WhatsApp, extrair dados financeiros usando IA e registrar a transação no banco.

### Fluxo do Workflow

```
[Webhook UAZAPI] 
    ↓
[IF: É mensagem de texto?]
    ↓ Sim
[Function: Parse dados do webhook]
    ↓
[Supabase: Buscar usuário por telefone]
    ↓
[IF: Usuário existe?]
    ↓ Sim
[OpenAI: Extrair dados da mensagem]
    ↓
[Function: Validar dados extraídos]
    ↓
[Supabase: Buscar categorias do usuário]
    ↓
[Supabase: Buscar contas do usuário]
    ↓
[Function: Mapear categoria e conta]
    ↓
[Supabase: Inserir transação]
    ↓
[Function: Formatar resposta]
    ↓
[HTTP: Enviar mensagem WhatsApp (UAZAPI)]
    ↓
[Supabase: Salvar conversa com Ana Clara]
```

### Nodes Detalhados

#### 1. Webhook Trigger

**Tipo:** `Webhook`  
**Nome:** `WhatsApp Webhook`  
**Configuração:**
- **HTTP Method:** POST
- **Path:** `/webhook/whatsapp`
- **Authentication:** Header Auth (Bearer Token)
- **Response Mode:** Respond Immediately

**Dados Esperados do UAZAPI:**
```json
{
  "event": "message.received",
  "instance_id": "seu-instance-id",
  "data": {
    "key": {
      "remoteJid": "5521999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "message-unique-id"
    },
    "message": {
      "conversation": "Gastei 45 reais no mercado"
    },
    "messageTimestamp": 1699891234,
    "pushName": "Maria Silva"
  }
}
```

#### 2. IF Node - Verificar Tipo de Mensagem

**Tipo:** `IF`  
**Nome:** `É mensagem de texto?`  
**Condições:**
- `{{ $json.data.message.conversation }}` EXISTS

#### 3. Function Node - Parse Dados

**Tipo:** `Function`  
**Nome:** `Parse Webhook Data`  
**Código:**
```javascript
// Extrair dados relevantes do webhook
const phoneNumber = $input.item.json.data.key.remoteJid.split('@')[0];
const messageText = $input.item.json.data.message.conversation;
const messageId = $input.item.json.data.key.id;
const userName = $input.item.json.data.pushName;
const timestamp = new Date($input.item.json.data.messageTimestamp * 1000);

return {
  json: {
    phone_number: phoneNumber,
    message_text: messageText,
    message_id: messageId,
    user_name: userName,
    timestamp: timestamp.toISOString()
  }
};
```

#### 4. Supabase Node - Buscar Usuário

**Tipo:** `Supabase`  
**Nome:** `Get User by Phone`  
**Configuração:**
- **Operation:** Get Rows
- **Table:** users
- **Filters:**
  - Column: `phone`
  - Operator: `eq`
  - Value: `{{ $json.phone_number }}`
- **Return All:** False (apenas 1 resultado)

#### 5. IF Node - Verificar se Usuário Existe

**Tipo:** `IF`  
**Nome:** `User Exists?`  
**Condições:**
- `{{ $json.id }}` IS NOT EMPTY

**Ramo "False":** Enviar mensagem de erro perguntando para se cadastrar

#### 6. OpenAI Node - Extrair Dados

**Tipo:** `OpenAI`  
**Nome:** `Extract Financial Data`  
**Configuração:**
- **Resource:** Message a Model
- **Model:** gpt-4
- **Operation:** Message
- **Prompt:**

```
Você é um assistente financeiro que extrai dados de mensagens de texto.

Mensagem do usuário: "{{ $('Parse Webhook Data').item.json.message_text }}"

Extraia os dados da transação financeira e retorne um JSON válido com esta estrutura exata:

{
  "type": "income" | "expense" | "transfer",
  "amount": número (sem símbolos, apenas o valor numérico),
  "category": "nome_da_categoria_identificada",
  "description": "descrição_curta_e_clara",
  "date": "YYYY-MM-DD" ou "today",
  "account": "nome_da_conta_mencionada ou null"
}

REGRAS IMPORTANTES:
1. type: Use "expense" para gastos, "income" para receitas, "transfer" para transferências
2. amount: SEMPRE retorne apenas o número, sem "R$", pontos ou vírgulas. Ex: 45.50
3. category: Identifique a categoria mais apropriada (Alimentação, Transporte, Moradia, etc)
4. description: Seja breve e direto (máximo 50 caracteres)
5. date: Use "today" se não mencionar data. Se mencionar "ontem", calcule a data. Se mencionar "segunda", calcule a data.
6. account: Apenas se o usuário mencionar explicitamente (ex: "da conta Itaú", "do cartão Nubank")

EXEMPLOS:
- "Gastei 45 reais no mercado" → {"type": "expense", "amount": 45.00, "category": "Alimentação", "description": "Compras no mercado", "date": "today", "account": null}
- "Recebi 3500 de salário" → {"type": "income", "amount": 3500.00, "category": "Salário", "description": "Salário do mês", "date": "today", "account": null}
- "Abasteci 120 ontem" → {"type": "expense", "amount": 120.00, "category": "Transporte", "description": "Combustível", "date": "[calcular ontem]", "account": null}

Retorne APENAS o JSON, sem explicações adicionais.
```

- **Temperature:** 0.3 (para respostas mais consistentes)
- **Output Parsing:** Attempt to Parse as JSON

#### 7. Function Node - Validar e Processar Dados

**Tipo:** `Function`  
**Nome:** `Validate and Process Data`  
**Código:**
```javascript
const extracted = $input.item.json;
const userData = $('Get User by Phone').item.json;

// Validar dados obrigatórios
if (!extracted.type || !extracted.amount) {
  throw new Error('Dados incompletos extraídos da mensagem');
}

// Processar data
let transactionDate = new Date();
if (extracted.date !== 'today') {
  // Tentar parsear a data
  const parsedDate = new Date(extracted.date);
  if (!isNaN(parsedDate.getTime())) {
    transactionDate = parsedDate;
  }
}

// Formatar amount para garantir 2 casas decimais
const amount = parseFloat(extracted.amount).toFixed(2);

return {
  json: {
    user_id: userData.id,
    type: extracted.type,
    amount: amount,
    description: extracted.description,
    transaction_date: transactionDate.toISOString().split('T')[0],
    category_name: extracted.category,
    account_name: extracted.account,
    source: 'whatsapp',
    whatsapp_message_id: $('Parse Webhook Data').item.json.message_id,
    is_paid: true
  }
};
```

#### 8. Supabase Node - Buscar Categorias

**Tipo:** `Supabase`  
**Nome:** `Get User Categories`  
**Configuração:**
- **Operation:** Get Rows
- **Table:** categories
- **Filters:**
  - Column: `user_id`
  - Operator: `eq`
  - Value: `{{ $json.user_id }}`
  - OR
  - Column: `is_default`
  - Operator: `eq`
  - Value: `true`

#### 9. Supabase Node - Buscar Contas

**Tipo:** `Supabase`  
**Nome:** `Get User Accounts`  
**Configuração:**
- **Operation:** Get Rows
- **Table:** accounts
- **Filters:**
  - Column: `user_id`
  - Operator: `eq`
  - Value: `{{ $('Validate and Process Data').item.json.user_id }}`
  - AND
  - Column: `is_active`
  - Operator: `eq`
  - Value: `true`

#### 10. Function Node - Mapear IDs

**Tipo:** `Function`  
**Nome:** `Map Category and Account IDs`  
**Código:**
```javascript
const transactionData = $('Validate and Process Data').item.json;
const categories = $('Get User Categories').all();
const accounts = $('Get User Accounts').all();

// Encontrar categoria por similaridade de nome
let categoryId = null;
if (transactionData.category_name) {
  const category = categories.find(cat => 
    cat.json.name.toLowerCase().includes(transactionData.category_name.toLowerCase()) ||
    transactionData.category_name.toLowerCase().includes(cat.json.name.toLowerCase())
  );
  if (category) {
    categoryId = category.json.id;
  }
}

// Encontrar conta
let accountId = null;
if (transactionData.account_name) {
  const account = accounts.find(acc => 
    acc.json.name.toLowerCase().includes(transactionData.account_name.toLowerCase())
  );
  if (account) {
    accountId = account.json.id;
  }
} else {
  // Usar conta padrão (Carteira) ou primeira conta
  const defaultAccount = accounts.find(acc => acc.json.name === 'Carteira') || accounts[0];
  if (defaultAccount) {
    accountId = defaultAccount.json.id;
  }
}

return {
  json: {
    ...transactionData,
    category_id: categoryId,
    account_id: accountId
  }
};
```

#### 11. Supabase Node - Inserir Transação

**Tipo:** `Supabase`  
**Nome:** `Insert Transaction`  
**Configuração:**
- **Operation:** Insert Row
- **Table:** transactions
- **Fields:**
  - `user_id`: `{{ $json.user_id }}`
  - `account_id`: `{{ $json.account_id }}`
  - `category_id`: `{{ $json.category_id }}`
  - `type`: `{{ $json.type }}`
  - `amount`: `{{ $json.amount }}`
  - `description`: `{{ $json.description }}`
  - `transaction_date`: `{{ $json.transaction_date }}`
  - `is_paid`: `{{ $json.is_paid }}`
  - `source`: `{{ $json.source }}`
  - `whatsapp_message_id`: `{{ $json.whatsapp_message_id }}`

#### 12. Supabase Node - Buscar Conta Atualizada

**Tipo:** `Supabase`  
**Nome:** `Get Updated Account`  
**Configuração:**
- **Operation:** Get Rows
- **Table:** accounts
- **Filters:**
  - Column: `id`
  - Operator: `eq`
  - Value: `{{ $('Map Category and Account IDs').item.json.account_id }}`

#### 13. Function Node - Formatar Resposta

**Tipo:** `Function`  
**Nome:** `Format WhatsApp Response`  
**Código:**
```javascript
const transaction = $('Insert Transaction').item.json;
const account = $('Get Updated Account').item.json;
const category = $('Get User Categories').all().find(
  cat => cat.json.id === transaction.category_id
);

// Emojis por tipo
const typeEmoji = {
  'expense': '💸',
  'income': '💰',
  'transfer': '↔️'
};

// Formatar data em português
const date = new Date(transaction.transaction_date);
const dateStr = date.toLocaleDateString('pt-BR', { 
  day: '2-digit', 
  month: '2-digit' 
});

// Formatar hora
const now = new Date();
const timeStr = now.toLocaleTimeString('pt-BR', { 
  hour: '2-digit', 
  minute: '2-digit' 
});

// Construir mensagem
const message = `✅ *Registrado!*

${category?.json.icon || '📊'} ${category?.json.name || 'Outros'}
${typeEmoji[transaction.type]} R$ ${parseFloat(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
📅 ${dateStr}, ${timeStr}

${account ? `💼 ${account.name}: R$ ${parseFloat(account.current_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}`;

return {
  json: {
    phone_number: $('Parse Webhook Data').item.json.phone_number,
    message: message
  }
};
```

#### 14. HTTP Request Node - Enviar WhatsApp

**Tipo:** `HTTP Request`  
**Nome:** `Send WhatsApp Message`  
**Configuração:**
- **Method:** POST
- **URL:** `https://api.uazapi.com/send/text`
- **Authentication:** Header Auth
- **Headers:**
  - `Authorization`: `Bearer {{ $env.UAZAPI_API_KEY }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "instance_id": "{{ $env.UAZAPI_INSTANCE_ID }}",
  "to": "{{ $json.phone_number }}@s.whatsapp.net",
  "message": "{{ $json.message }}"
}
```

#### 15. Supabase Node - Salvar Conversa

**Tipo:** `Supabase`  
**Nome:** `Save Conversation`  
**Configuração:**
- **Operation:** Insert Rows
- **Table:** ana_clara_conversations
- **Insert Multiple:** True
- **Fields:** Use expression para criar array:

```javascript
[
  {
    user_id: $('Get User by Phone').item.json.id,
    message_type: 'user',
    message_text: $('Parse Webhook Data').item.json.message_text,
    source: 'whatsapp',
    context: {}
  },
  {
    user_id: $('Get User by Phone').item.json.id,
    message_type: 'ana_clara',
    message_text: $('Format WhatsApp Response').item.json.message,
    source: 'whatsapp',
    context: {
      transaction_id: $('Insert Transaction').item.json.id
    }
  }
]
```

### Tratamento de Erros

**Error Trigger Node:**
- Capturar todos os erros
- Enviar mensagem de erro amigável para o usuário
- Logar erro no console ou serviço de monitoramento

```javascript
const errorMessage = `❌ Ops! Não consegui processar sua mensagem.

Por favor, tente novamente ou use o formato:
"Gastei [valor] em [descrição]"

Exemplo: "Gastei 45 reais no mercado"`;
```

---

## 🎤 Workflow 2: Processar Mensagem de Áudio

### Objetivo

Transcrever mensagens de áudio do WhatsApp usando Speech-to-Text e processar como texto.

### Fluxo do Workflow

```
[Webhook UAZAPI]
    ↓
[IF: É mensagem de áudio?]
    ↓ Sim
[Function: Parse dados do webhook]
    ↓
[HTTP: Download áudio do UAZAPI]
    ↓
[HTTP: Transcrever com OpenAI Whisper]
    ↓
[Set Node: Adicionar texto transcrito]
    ↓
[MERGE com Workflow 1]
    (continua processamento como texto)
```

### Nodes Específicos

#### 1. IF Node - Verificar Áudio

**Condições:**
- `{{ $json.data.message.audioMessage }}` EXISTS

#### 2. HTTP Request - Download Áudio

**Tipo:** `HTTP Request`  
**Nome:** `Download Audio File`  
**Configuração:**
- **Method:** GET
- **URL:** `{{ $json.data.message.audioMessage.url }}`
- **Response Format:** File
- **Download File:** True

#### 3. HTTP Request - Whisper API

**Tipo:** `HTTP Request`  
**Nome:** `Transcribe Audio (Whisper)`  
**Configuração:**
- **Method:** POST
- **URL:** `https://api.openai.com/v1/audio/transcriptions`
- **Authentication:** Header Auth
  - `Authorization`: `Bearer {{ $env.OPENAI_API_KEY }}`
- **Send Body:** True (Multipart Form Data)
- **Body Parameters:**
  - `file`: `{{ $binary.data }}`
  - `model`: `whisper-1`
  - `language`: `pt`

**Response esperado:**
```json
{
  "text": "Almoço no Bistro LA foram trinta e oito reais"
}
```

#### 4. Set Node - Preparar para Merge

**Tipo:** `Set`  
**Nome:** `Set Transcribed Text`  
**Fields:**
```javascript
{
  phone_number: $json.data.key.remoteJid.split('@')[0],
  message_text: $json.text,
  message_id: $json.data.key.id,
  user_name: $json.data.pushName,
  timestamp: new Date($json.data.messageTimestamp * 1000).toISOString()
}
```

#### 5. Merge com Workflow 1

Após o Set, o fluxo se junta com o Workflow 1 no node "Get User by Phone" e segue o mesmo processamento.

---

## 📸 Workflow 3: Processar Mensagem com Imagem

### Objetivo

Extrair dados de nota fiscal através de OCR e processar a transação.

### Fluxo do Workflow

```
[Webhook UAZAPI]
    ↓
[IF: É mensagem com imagem?]
    ↓ Sim
[Function: Parse dados do webhook]
    ↓
[HTTP: Download imagem do UAZAPI]
    ↓
[HTTP: OCR com Google Vision API]
    ↓
[OpenAI: Estruturar dados da nota]
    ↓
[Supabase: Salvar imagem no Storage]
    ↓
[MERGE com Workflow 1]
    (continua processamento)
```

### Nodes Específicos

#### 1. IF Node - Verificar Imagem

**Condições:**
- `{{ $json.data.message.imageMessage }}` EXISTS

#### 2. HTTP Request - Download Imagem

**Tipo:** `HTTP Request`  
**Nome:** `Download Image`  
**Configuração:**
- **Method:** GET
- **URL:** `{{ $json.data.message.imageMessage.url }}`
- **Response Format:** File
- **Download File:** True

#### 3. HTTP Request - Google Vision OCR

**Tipo:** `HTTP Request`  
**Nome:** `OCR Image (Google Vision)`  
**Configuração:**
- **Method:** POST
- **URL:** `https://vision.googleapis.com/v1/images:annotate`
- **Authentication:** OAuth2 ou API Key
- **Headers:**
  - `Authorization`: `Bearer {{ $env.GOOGLE_CLOUD_TOKEN }}`
  - `Content-Type`: `application/json`
- **Body (JSON):**
```json
{
  "requests": [
    {
      "image": {
        "content": "{{ $binary.data.toString('base64') }}"
      },
      "features": [
        {
          "type": "TEXT_DETECTION"
        }
      ]
    }
  ]
}
```

#### 4. Function Node - Parse OCR Result

**Tipo:** `Function`  
**Nome:** `Parse OCR Text`  
**Código:**
```javascript
const ocrResult = $input.item.json.responses[0];
const fullText = ocrResult.fullTextAnnotation?.text || '';

return {
  json: {
    ocr_text: fullText,
    original_data: $('Parse Webhook Data').item.json
  }
};
```

#### 5. OpenAI Node - Estruturar Dados da Nota

**Tipo:** `OpenAI`  
**Nome:** `Extract Invoice Data`  
**Configuração:**
- **Prompt:**
```
Você é um assistente que extrai dados de notas fiscais.

Texto OCR da nota fiscal:
"""
{{ $json.ocr_text }}
"""

Extraia os dados e retorne um JSON válido:

{
  "type": "expense",
  "amount": valor_total_da_nota,
  "description": "Compras em [nome_do_estabelecimento]",
  "date": "YYYY-MM-DD",
  "establishment": "nome_do_estabelecimento",
  "category": "categoria_apropriada",
  "items": [
    {
      "name": "item1",
      "quantity": 1,
      "price": 10.50
    }
  ]
}

REGRAS:
1. Encontre o valor TOTAL da nota
2. Identifique o nome do estabelecimento
3. Extraia a data da nota
4. Liste os itens comprados (opcional)
5. Sugira uma categoria apropriada

Retorne APENAS o JSON.
```

#### 6. HTTP Request - Upload para Supabase Storage

**Tipo:** `HTTP Request`  
**Nome:** `Upload Image to Storage`  
**Configuração:**
- **Method:** POST
- **URL:** `{{ $env.SUPABASE_URL }}/storage/v1/object/receipts/{{ $('Parse Webhook Data').item.json.message_id }}.jpg`
- **Headers:**
  - `Authorization`: `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `Content-Type`: `image/jpeg`
- **Body:** Binary Data from Download Image

**Response:**
```json
{
  "Key": "receipts/message-id.jpg"
}
```

#### 7. Set Node - Preparar Dados com Attachment

**Tipo:** `Set`  
**Nome:** `Set Transaction with Attachment`  
**Fields:**
```javascript
{
  ...($('Extract Invoice Data').item.json),
  attachment_url: `{{ $env.SUPABASE_URL }}/storage/v1/object/public/receipts/{{ $('Parse Webhook Data').item.json.message_id }}.jpg`,
  message_text: `Nota fiscal: ${$('Extract Invoice Data').item.json.description}`,
  phone_number: $('Parse Webhook Data').item.json.phone_number,
  message_id: $('Parse Webhook Data').item.json.message_id
}
```

---

## ⚡ Workflow 4: Comandos Rápidos

### Objetivo

Processar comandos rápidos do WhatsApp (Saldo, Resumo, Contas, Meta, Relatório, Ajuda).

### Fluxo do Workflow

```
[Webhook UAZAPI]
    ↓
[IF: É comando?]
    ↓ Sim
[Function: Identificar comando]
    ↓
[Switch: Qual comando?]
    ├─→ [Saldo] → Buscar saldos → Formatar → Enviar
    ├─→ [Resumo] → Buscar resumo → Formatar → Enviar
    ├─→ [Contas] → Buscar contas → Formatar → Enviar
    ├─→ [Meta] → Buscar metas → Formatar → Enviar
    ├─→ [Relatório] → Gerar relatório → Enviar
    └─→ [Ajuda] → Enviar menu
```

### Nodes Detalhados

#### 1. Function Node - Identificar Comando

**Tipo:** `Function`  
**Nome:** `Identify Command`  
**Código:**
```javascript
const message = $input.item.json.data.message.conversation?.toLowerCase() || '';

// Lista de comandos
const commands = {
  'saldo': ['saldo', 'saldos', 'quanto tenho'],
  'resumo': ['resumo', 'resumo do dia', 'resumo da semana', 'resumo do mes'],
  'contas': ['contas', 'conta', 'contas a vencer', 'vencimentos'],
  'meta': ['meta', 'metas', 'objetivo', 'objetivos'],
  'relatorio': ['relatorio', 'relatório', 'report'],
  'ajuda': ['ajuda', 'help', 'ajudar', 'comandos', 'menu']
};

// Identificar comando
let identifiedCommand = null;
for (const [command, keywords] of Object.entries(commands)) {
  if (keywords.some(keyword => message.includes(keyword))) {
    identifiedCommand = command;
    break;
  }
}

return {
  json: {
    command: identifiedCommand,
    original_message: message,
    phone_number: $input.item.json.data.key.remoteJid.split('@')[0]
  }
};
```

#### 2. Switch Node - Rotear Comando

**Tipo:** `Switch`  
**Nome:** `Route Command`  
**Routing:**
- Output 1: `{{ $json.command === 'saldo' }}`
- Output 2: `{{ $json.command === 'resumo' }}`
- Output 3: `{{ $json.command === 'contas' }}`
- Output 4: `{{ $json.command === 'meta' }}`
- Output 5: `{{ $json.command === 'relatorio' }}`
- Output 6: `{{ $json.command === 'ajuda' }}`

### Comando: SALDO

#### Supabase Query

```sql
SELECT 
  a.name,
  a.icon,
  a.current_balance,
  a.type
FROM accounts a
INNER JOIN users u ON a.user_id = u.id
WHERE u.phone = $1 AND a.is_active = true
ORDER BY a.type, a.name
```

#### Function - Formatar Saldo

```javascript
const accounts = $input.all();

if (accounts.length === 0) {
  return {
    json: {
      message: '💰 *Seus Saldos*\n\nVocê ainda não tem contas cadastradas.\nAcesse o app para adicionar suas contas!'
    }
  };
}

let message = '💰 *Seus Saldos*\n\n';

// Agrupar por tipo
const byType = {
  'checking': [],
  'savings': [],
  'cash': [],
  'investment': []
};

accounts.forEach(acc => {
  if (byType[acc.json.type]) {
    byType[acc.json.type].push(acc.json);
  }
});

// Calcular total
let total = 0;

// Contas correntes e poupanças
if (byType.checking.length > 0 || byType.savings.length > 0) {
  message += '🏦 *Contas Bancárias*\n';
  [...byType.checking, ...byType.savings].forEach(acc => {
    const balance = parseFloat(acc.current_balance);
    total += balance;
    message += `${acc.icon} ${acc.name}: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  });
  message += '\n';
}

// Carteira
if (byType.cash.length > 0) {
  message += '💵 *Carteira*\n';
  byType.cash.forEach(acc => {
    const balance = parseFloat(acc.current_balance);
    total += balance;
    message += `${acc.icon} ${acc.name}: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  });
  message += '\n';
}

// Investimentos
if (byType.investment.length > 0) {
  message += '📈 *Investimentos*\n';
  byType.investment.forEach(acc => {
    const balance = parseFloat(acc.current_balance);
    total += balance;
    message += `${acc.icon} ${acc.name}: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  });
  message += '\n';
}

message += `━━━━━━━━━━━━━━━\n💎 *Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;

return {
  json: { message }
};
```

### Comando: RESUMO

#### Supabase Function Call

```sql
SELECT * FROM get_monthly_summary(
  (SELECT id FROM users WHERE phone = $1),
  CURRENT_DATE
)
```

#### Function - Formatar Resumo

```javascript
const summary = $input.item.json;
const now = new Date();
const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const message = `📊 *Resumo de ${monthName}*

💰 Receitas: R$ ${parseFloat(summary.total_income).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
💸 Despesas: R$ ${parseFloat(summary.total_expenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

━━━━━━━━━━━━━━━
${summary.balance >= 0 ? '✅' : '❌'} Saldo: R$ ${parseFloat(summary.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

💪 Economia: ${parseFloat(summary.savings_percentage).toFixed(1)}%
${summary.savings_percentage >= 20 ? '🎉 Parabéns! Você está economizando muito bem!' : summary.savings_percentage >= 10 ? '👏 Bom trabalho! Continue assim!' : '💡 Dica: Tente economizar pelo menos 10% da sua renda.'}`;

return {
  json: { message }
};
```

### Comando: CONTAS A VENCER

#### Supabase Query

```sql
SELECT 
  t.description,
  t.amount,
  t.transaction_date,
  c.name as category_name,
  c.icon as category_icon
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
INNER JOIN users u ON t.user_id = u.id
WHERE u.phone = $1 
  AND t.is_paid = false
  AND t.transaction_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY t.transaction_date ASC
```

### Comando: METAS

#### Supabase Query com View

```sql
SELECT * FROM goals_progress
WHERE user_id = (SELECT id FROM users WHERE phone = $1)
  AND status = 'active'
ORDER BY progress_percentage DESC
```

### Comando: AJUDA

**Mensagem Estática:**
```
📱 *Comandos Disponíveis*

💰 *Saldo* - Ver saldo de todas as contas
📊 *Resumo* - Resumo do mês atual
📅 *Contas* - Contas a vencer nos próximos dias
🎯 *Meta [nome]* - Status de uma meta específica
📈 *Relatório* - Gerar relatório completo
❓ *Ajuda* - Ver este menu

*Como registrar transações:*
• Texto: "Gastei 45 no mercado"
• Áudio: Envie um áudio descrevendo
• Foto: Envie foto da nota fiscal

Qualquer dúvida, estou aqui! 😊
```

---

## 📅 Workflow 5: Lembretes de Contas a Vencer

### Objetivo

Enviar lembretes automáticos 1 dia antes e no dia do vencimento de contas.

### Fluxo do Workflow

```
[Schedule: Diariamente 08:00]
    ↓
[Supabase: Buscar contas que vencem hoje]
    ↓
[Supabase: Buscar contas que vencem amanhã]
    ↓
[Function: Agrupar por usuário]
    ↓
[Loop: Para cada usuário]
        ↓
        [Function: Formatar mensagem]
        ↓
        [HTTP: Enviar WhatsApp]
```

### Nodes Detalhados

#### 1. Schedule Trigger

**Tipo:** `Schedule Trigger`  
**Nome:** `Daily 8 AM`  
**Configuração:**
- **Trigger Interval:** Cron
- **Cron Expression:** `0 8 * * *` (08:00 todos os dias)
- **Timezone:** America/Sao_Paulo

#### 2. Supabase - Contas Hoje

```sql
SELECT 
  u.id as user_id,
  u.phone,
  u.full_name,
  t.id as transaction_id,
  t.description,
  t.amount,
  t.transaction_date,
  c.name as category_name,
  c.icon as category_icon
FROM transactions t
INNER JOIN users u ON t.user_id = u.id
LEFT JOIN categories c ON t.category_id = c.id
INNER JOIN whatsapp_settings ws ON u.id = ws.user_id
WHERE t.is_paid = false
  AND t.transaction_date = CURRENT_DATE
  AND ws.reminders_enabled = true
  AND u.whatsapp_connected = true
ORDER BY u.id, t.amount DESC
```

#### 3. Supabase - Contas Amanhã

```sql
-- Mesma query, mas com:
AND t.transaction_date = CURRENT_DATE + INTERVAL '1 day'
```

#### 4. Function - Agrupar por Usuário

**Código:**
```javascript
const today = $('Bills Due Today').all();
const tomorrow = $('Bills Due Tomorrow').all();

// Agrupar por user_id
const userReminders = {};

// Processar contas de hoje
today.forEach(bill => {
  const userId = bill.json.user_id;
  if (!userReminders[userId]) {
    userReminders[userId] = {
      user_id: userId,
      phone: bill.json.phone,
      full_name: bill.json.full_name,
      today: [],
      tomorrow: []
    };
  }
  userReminders[userId].today.push(bill.json);
});

// Processar contas de amanhã
tomorrow.forEach(bill => {
  const userId = bill.json.user_id;
  if (!userReminders[userId]) {
    userReminders[userId] = {
      user_id: userId,
      phone: bill.json.phone,
      full_name: bill.json.full_name,
      today: [],
      tomorrow: []
    };
  }
  userReminders[userId].tomorrow.push(bill.json);
});

// Converter para array
return Object.values(userReminders).map(reminder => ({ json: reminder }));
```

#### 5. Loop Node

**Tipo:** `Loop Over Items`  
**Nome:** `For Each User`

#### 6. Function - Formatar Mensagem

**Código:**
```javascript
const user = $input.item.json;
let message = `☀️ Bom dia, ${user.full_name}!\n\n`;

// Contas que vencem HOJE
if (user.today.length > 0) {
  message += '⚠️ *Contas que vencem HOJE:*\n\n';
  user.today.forEach(bill => {
    message += `${bill.category_icon} ${bill.description}\n`;
    message += `💰 R$ ${parseFloat(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
  });
  
  const totalToday = user.today.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  message += `📊 Total hoje: R$ ${totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
  message += '━━━━━━━━━━━━━━━\n\n';
}

// Contas que vencem AMANHÃ
if (user.tomorrow.length > 0) {
  message += '📅 *Contas que vencem amanhã:*\n\n';
  user.tomorrow.forEach(bill => {
    message += `${bill.category_icon} ${bill.description}\n`;
    message += `💰 R$ ${parseFloat(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
  });
  
  const totalTomorrow = user.tomorrow.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  message += `📊 Total amanhã: R$ ${totalTomorrow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
}

// Se não houver contas, não enviar mensagem
if (user.today.length === 0 && user.tomorrow.length === 0) {
  return { json: null }; // Skip este usuário
}

message += '\n💡 Responda "ok [número]" para marcar como paga!';

return {
  json: {
    phone: user.phone,
    message: message
  }
};
```

#### 7. IF - Verificar se deve enviar

**Condição:**
- `{{ $json !== null }}`

#### 8. HTTP - Enviar WhatsApp

*Mesmo node de envio de mensagem dos outros workflows*

---

## 🌙 Workflow 6: Resumo Diário

### Objetivo

Enviar resumo do dia às 20h para usuários que têm esta preferência ativada.

### Fluxo do Workflow

```
[Schedule: Diariamente 20:00]
    ↓
[Supabase: Buscar usuários com resumo diário ativo]
    ↓
[Loop: Para cada usuário]
        ↓
        [Supabase: Buscar transações do dia]
        ↓
        [Supabase: Buscar saldos]
        ↓
        [OpenAI: Ana Clara gera insight]
        ↓
        [Function: Formatar mensagem]
        ↓
        [HTTP: Enviar WhatsApp]
```

### Query Principal

```sql
SELECT 
  u.id,
  u.phone,
  u.full_name,
  ws.daily_summary_time
FROM users u
INNER JOIN whatsapp_settings ws ON u.id = ws.user_id
WHERE ws.daily_summary_enabled = true
  AND u.whatsapp_connected = true
  AND EXTRACT(HOUR FROM ws.daily_summary_time) = EXTRACT(HOUR FROM CURRENT_TIME)
```

### OpenAI - Insight Personalizado

**Prompt:**
```
Você é Ana Clara, coach financeira pessoal.

Dados do usuário hoje:
- Gastos: R$ {{ $json.total_expenses }}
- Principal categoria: {{ $json.top_category }}
- Número de transações: {{ $json.transaction_count }}
- Saldo atual: R$ {{ $json.current_balance }}

Gere um insight breve e encorajador (máximo 2 frases) sobre o dia financeiro do usuário.

Seja positiva, mas realista. Use emoji de forma moderada.
```

---

## 📊 Workflow 7: Resumo Semanal

### Objetivo

Enviar resumo da semana toda segunda-feira às 09:00.

### Schedule

- **Cron:** `0 9 * * 1` (Segunda-feira 09:00)

### Queries

```sql
-- Transações da semana passada
SELECT 
  type,
  SUM(amount) as total,
  COUNT(*) as count
FROM transactions
WHERE user_id = $1
  AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'
  AND transaction_date < CURRENT_DATE
  AND is_paid = true
GROUP BY type
```

```sql
-- Top categorias
SELECT 
  c.name,
  c.icon,
  SUM(t.amount) as total,
  ROUND((SUM(t.amount) / (
    SELECT SUM(amount) FROM transactions 
    WHERE user_id = $1 
      AND type = 'expense' 
      AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'
  ) * 100)::numeric, 0) as percentage
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'
  AND t.is_paid = true
GROUP BY c.name, c.icon
ORDER BY total DESC
LIMIT 3
```

---

## 📅 Workflow 8: Resumo Mensal

### Objetivo

Enviar resumo completo do mês no dia 1 de cada mês.

### Schedule

- **Cron:** `0 10 1 * *` (Dia 1, 10:00)

### Function Call

```sql
SELECT * FROM get_monthly_summary(
  $1, -- user_id
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
)
```

### Gerar PDF do Relatório (Opcional)

**HTTP Request para serviço de PDF:**
```
POST https://api.pdfshift.io/v3/convert/pdf
```

**Body:**
```json
{
  "source": "<html>...relatório formatado...</html>",
  "filename": "relatorio-{{month}}-{{year}}.pdf"
}
```

---

## ⚠️ Workflow 9: Alertas de Orçamento

### Objetivo

Alertar quando usuário atingir 80% do orçamento de alguma categoria.

### Trigger

- **Schedule:** A cada 6 horas
- **Ou:** Trigger após cada transação (via webhook do Supabase)

### Query

```sql
WITH budget_usage AS (
  SELECT 
    b.user_id,
    b.category_id,
    c.name as category_name,
    c.icon as category_icon,
    b.planned_amount,
    COALESCE(SUM(t.amount), 0) as spent_amount,
    ROUND((COALESCE(SUM(t.amount), 0) / b.planned_amount * 100)::numeric, 0) as usage_percentage
  FROM budgets b
  LEFT JOIN transactions t ON b.category_id = t.category_id 
    AND b.user_id = t.user_id
    AND DATE_TRUNC('month', t.transaction_date) = b.month
    AND t.type = 'expense'
    AND t.is_paid = true
  LEFT JOIN categories c ON b.category_id = c.id
  WHERE b.month = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY b.user_id, b.category_id, c.name, c.icon, b.planned_amount
)
SELECT 
  u.phone,
  u.full_name,
  bu.*,
  EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)) as days_remaining
FROM budget_usage bu
INNER JOIN users u ON bu.user_id = u.id
WHERE bu.usage_percentage >= 80
  AND bu.usage_percentage < 100
```

### Mensagem

```javascript
const message = `⚠️ *Alerta de Orçamento*

Categoria: ${data.category_icon} ${data.category_name}
💸 Gasto: R$ ${data.spent_amount.toLocaleString('pt-BR')}
🎯 Planejado: R$ ${data.planned_amount.toLocaleString('pt-BR')}
📊 Uso: ${data.usage_percentage}%

${data.usage_percentage >= 95 ? 
  '🚨 Você está muito próximo do limite!' :
  `⏰ Faltam ${data.days_remaining} dias para o fim do mês.\nVamos ter cuidado com os gastos nesta categoria!`
}

💡 Dica: Revise seus gastos recentes e veja se há algo que pode ser ajustado.`;
```

---

## 🎯 Workflow 10: Progresso de Metas

### Objetivo

Notificar quando usuário atingir marcos nas metas (25%, 50%, 75%, 100%).

### Trigger

- **Database Trigger:** Após inserir contribution em goal_contributions
- **Ou:** Schedule a cada hora verificando novos marcos

### Query

```sql
WITH goal_milestones AS (
  SELECT 
    g.id,
    g.user_id,
    g.name,
    g.icon,
    g.target_amount,
    g.current_amount,
    ROUND((g.current_amount / g.target_amount * 100)::numeric, 0) as progress_percentage,
    CASE 
      WHEN g.current_amount >= g.target_amount THEN 100
      WHEN g.current_amount >= g.target_amount * 0.75 THEN 75
      WHEN g.current_amount >= g.target_amount * 0.50 THEN 50
      WHEN g.current_amount >= g.target_amount * 0.25 THEN 25
      ELSE 0
    END as milestone_reached
  FROM goals g
  WHERE g.status = 'active'
)
SELECT 
  u.phone,
  u.full_name,
  gm.*
FROM goal_milestones gm
INNER JOIN users u ON gm.user_id = u.id
WHERE gm.milestone_reached > 0
  -- E não foi notificado ainda (verificar tabela de notificações)
```

### Mensagem por Marco

```javascript
const messages = {
  25: `🎯 *Primeiro Marco Atingido!*\n\n${data.icon} Meta: ${data.name}\n\n████░░░░░░░░ 25%\n\nVocê já conquistou 1/4 do caminho! Continue assim! 💪`,
  
  50: `🎉 *Metade do Caminho!*\n\n${data.icon} Meta: ${data.name}\n\n██████░░░░░░ 50%\n\nParabéns! Você está na metade! A reta final já começou! 🚀`,
  
  75: `🌟 *Você está Quase Lá!*\n\n${data.icon} Meta: ${data.name}\n\n█████████░░░ 75%\n\nFaltam apenas 25%! Seu objetivo está muito próximo! 💎`,
  
  100: `🏆 *META ALCANÇADA!*\n\n${data.icon} ${data.name}\n\n████████████ 100%\n\nPARABÉNS! 🎊🎉\n\nVocê conseguiu! R$ ${data.target_amount.toLocaleString('pt-BR')} conquistados!\n\nÉ hora de comemorar! 🥳`
};

return {
  json: {
    phone: data.phone,
    message: messages[data.milestone_reached]
  }
};
```

---

## 🔐 Credenciais e Integrações

### Configurar Credenciais no N8N

#### 1. UAZAPI

**Tipo:** Header Auth
**Configuração:**
- Name: `UAZAPI`
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_API_KEY`

**Testes:**
```bash
curl -X POST https://api.uazapi.com/instance/status \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### 2. OpenAI

**Tipo:** OpenAI Account
**Configuração:**
- API Key: `sk-...`

**Testes:**
```javascript
// Node de teste
const response = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${credentials.apiKey}`,
    'Content-Type': 'application/json'
  },
  body: {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Test' }]
  }
});
```

#### 3. Supabase

**Tipo:** Supabase Account
**Configuração:**
- Host: `https://seu-projeto.supabase.co`
- Service Role Key: `eyJ...`

**Testes:**
```sql
SELECT 1 as test
```

#### 4. Google Cloud (Vision & Speech)

**Tipo:** Google Cloud Service Account
**Configuração:**
- Credentials JSON: Upload do arquivo de credenciais

---

## ✅ Boas Práticas e Testes

### Nomenclatura de Workflows

```
[Categoria] Nome Descritivo
```

Exemplos:
- `[WhatsApp] Processar Mensagem Texto`
- `[WhatsApp] Processar Áudio`
- `[Notificações] Resumo Diário`
- `[Notificações] Lembretes Vencimento`

### Versionamento

- Usar tags do N8N para versionar
- Exportar workflows como JSON regularmente
- Manter histórico no Git

### Error Handling

**Em cada workflow, adicionar:**

1. **Error Trigger Node**
```javascript
const error = $json.error || {};
const workflow = $workflow;

console.error(`[${workflow.name}] Error:`, error);

// Enviar para serviço de monitoramento
// Ex: Sentry, Datadog, etc.
```

2. **Retry Logic**
- Para HTTP requests: 3 tentativas com backoff exponencial
- Para database queries: 2 tentativas

3. **Fallback Messages**
```javascript
const fallbackMessage = `❌ Desculpe, ocorreu um erro temporário.

Nossa equipe já foi notificada e estamos trabalhando na solução.

Por favor, tente novamente em alguns minutos ou entre em contato pelo suporte.`;
```

### Logs e Monitoramento

**Logs importantes:**
- Início e fim de cada workflow
- Tempo de execução
- Erros e exceções
- Chamadas à APIs externas

**Exemplo de log estruturado:**
```javascript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  workflow: $workflow.name,
  execution_id: $execution.id,
  user_id: $json.user_id,
  action: 'transaction_created',
  duration_ms: Date.now() - startTime,
  success: true
}));
```

### Testes

#### Testes Unitários (Manual)

**Checklist por Workflow:**

1. ✅ Webhook recebe dados corretamente
2. ✅ Usuário é encontrado no banco
3. ✅ IA extrai dados corretamente
4. ✅ Transação é inserida no banco
5. ✅ Mensagem é enviada no WhatsApp
6. ✅ Conversa é salva no histórico

#### Testes de Integração

**Cenários:**

1. **Happy Path:**
   - Enviar mensagem "Gastei 50 no mercado"
   - Verificar transação no banco
   - Confirmar recebimento de resposta

2. **Edge Cases:**
   - Mensagem sem valor
   - Mensagem ambígua
   - Usuário não cadastrado
   - Erro na API externa

3. **Load Testing:**
   - 100 mensagens simultâneas
   - Verificar rate limits
   - Monitorar performance

#### Ambiente de Testes

**Criar variáveis de ambiente separadas:**
```env
# Produção
SUPABASE_URL_PROD=...
OPENAI_API_KEY_PROD=...

# Desenvolvimento
SUPABASE_URL_DEV=...
OPENAI_API_KEY_DEV=...
```

**Usar Switch node para alternar:**
```javascript
const env = $env.ENVIRONMENT || 'dev';
const supabaseUrl = env === 'prod' ? 
  $env.SUPABASE_URL_PROD : 
  $env.SUPABASE_URL_DEV;
```

### Performance

**Otimizações:**

1. **Caching:**
   - Cache de categorias e contas do usuário
   - TTL: 5 minutos

2. **Batch Processing:**
   - Processar múltiplos usuários em paralelo
   - Usar `Split In Batches` node

3. **Database:**
   - Índices nas colunas mais consultadas
   - Queries otimizadas
   - Connection pooling

4. **Rate Limiting:**
   - OpenAI: Máximo 60 RPM
   - UAZAPI: Verificar limites da API
   - Implementar queue se necessário

### Documentação

**Para cada workflow, documentar:**

```markdown
## Workflow: [Nome]

### Objetivo
[Descrição breve]

### Trigger
[Como é iniciado]

### Inputs Esperados
[Estrutura de dados]

### Outputs Gerados
[O que produz]

### Dependências
- API X
- Tabela Y
- Credencial Z

### Variáveis de Ambiente
- ENV_VAR_1
- ENV_VAR_2

### Notas
[Informações adicionais]
```

---

## 📚 Recursos Adicionais

### Links Úteis

- **N8N Docs:** https://docs.n8n.io
- **UAZAPI Docs:** https://docs.uazapi.com
- **OpenAI API:** https://platform.openai.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Google Cloud Vision:** https://cloud.google.com/vision/docs

### Comunidade

- N8N Community: https://community.n8n.io
- Discord do Personal Finance LA: [link]

### Suporte

**Issues comuns e soluções:**

1. **Webhook não recebe dados**
   - Verificar URL do webhook
   - Confirmar configuração no UAZAPI
   - Testar com curl/Postman

2. **IA extrai dados incorretos**
   - Ajustar prompt
   - Aumentar temperature
   - Adicionar mais exemplos

3. **Timeout em queries**
   - Otimizar queries SQL
   - Adicionar índices
   - Aumentar timeout do node

---

## 🎯 Conclusão

Esta arquitetura N8N foi projetada para ser:

- **Escalável:** Suporta crescimento de usuários
- **Manutenível:** Código limpo e bem documentado
- **Resiliente:** Error handling robusto
- **Testável:** Fácil de testar e validar

**Próximos Passos:**

1. Importar workflows no N8N
2. Configurar credenciais
3. Testar cada workflow individualmente
4. Fazer testes de integração
5. Deploy em produção

---

**Versão:** 1.0  
**Data:** Novembro 2025  
**Autor:** Claude + LA Music Team  
**Status:** Pronto para implementação
