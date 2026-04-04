# 📱 PLANO DE IMPLEMENTAÇÃO - WHATSAPP + N8N

**Data:** 13/11/2025  
**Feature:** Sistema bidirecional WhatsApp com comandos interativos via N8N  
**Prioridade:** ⭐⭐⭐ KILLER FEATURE  
**Tempo Estimado:** 2-3 dias (~16-24h)

---

## 🎯 OBJETIVO

Implementar comunicação bidirecional completa via WhatsApp, permitindo:
- ✅ **Usuário → Sistema:** Comandos interativos (saldo, lançamentos, consultas)
- ✅ **Sistema → Usuário:** Notificações proativas (alertas, resumos, lembretes)

---

## 📊 STATUS ATUAL

### ✅ JÁ IMPLEMENTADO (40%)

#### **1. Sistema de Notificações (100%)**
- 8 Edge Functions deployadas e ativas
- 4 Cron Jobs configurados
- DND completo em todas as funções
- Envio proativo via UAZAPI funcionando

#### **2. Database Schema (100%)**
- 4 tabelas criadas (whatsapp_messages, quick_commands, conversation_context, connection_status)
- Migration aplicada: 20251111000001_create_whatsapp_tables.sql
- 8 comandos seed inseridos

#### **3. Types TypeScript (100%)**
- src/types/whatsapp.types.ts (400 linhas)
- 20+ interfaces completas
- Labels PT-BR

#### **4. Edge Functions Parcial (33%)**
- ✅ process-whatsapp-message (350 linhas)
- ✅ execute-quick-command (450 linhas)
- ⏳ categorize-transaction (pendente)
- ⏳ send-whatsapp-message (pendente)
- ⏳ transcribe-audio (pendente)
- ⏳ extract-receipt-data (pendente)

#### **5. Documentação (100%)**
- N8N_WORKFLOWS_WHATSAPP.md (500 linhas)
- n8n_workflows_architecture.md (1845 linhas)

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### 📋 FASE 1: COMPLETAR EDGE FUNCTIONS (6-8h)

#### **1.1. categorize-transaction** (2h)
**Responsabilidade:** Extrair dados de mensagem e criar transação

**Arquivo:** `supabase/functions/categorize-transaction/index.ts`

**Fluxo:**
```
1. Recebe mensagem de texto
2. Busca config de IA do usuário (ai_providers)
3. Extrai dados via LLM (amount, category, description, date, type)
4. Valida dados extraídos
5. Busca categorias e contas do usuário
6. Mapeia categoria e conta por similaridade
7. Cria transação no banco
8. Retorna confirmação formatada
```

**Dependências:**
- Tabela `ai_providers` (usar provedor padrão do usuário)
- Tabela `transactions`
- Tabela `categories`
- Tabela `accounts`

#### **1.2. send-whatsapp-message** (1h)
**Responsabilidade:** Enviar mensagem via UAZAPI

**Arquivo:** `supabase/functions/send-whatsapp-message/index.ts`

**Fluxo:**
```
1. Recebe parâmetros (phone, message, type)
2. Valida usuário e conexão WhatsApp ativa
3. Envia via UAZAPI
4. Salva mensagem no histórico (whatsapp_messages)
5. Atualiza estatísticas (whatsapp_connection_status)
6. Retorna status de envio
```

**Suporte:**
- Texto
- Imagem
- Áudio
- Documento

#### **1.3. transcribe-audio** (2h)
**Responsabilidade:** Transcrever áudio usando Whisper API

**Arquivo:** `supabase/functions/transcribe-audio/index.ts`

**Fluxo:**
```
1. Recebe URL do áudio (UAZAPI)
2. Download do áudio
3. Conversão para MP3 (se necessário)
4. Chamada OpenAI Whisper API
5. Extrai texto transcrito
6. Salva no contexto de conversa
7. Retorna texto
```

**API:** OpenAI Whisper (modelo: whisper-1, language: pt)

#### **1.4. extract-receipt-data** (3h)
**Responsabilidade:** Extrair dados de nota fiscal via OCR

**Arquivo:** `supabase/functions/extract-receipt-data/index.ts`

**Fluxo:**
```
1. Recebe URL da imagem (UAZAPI)
2. Download da imagem
3. Encode para Base64
4. Chamada GPT-4 Vision API
5. Parse dados extraídos (merchant, amount, items, date)
6. Salva imagem no Supabase Storage (bucket: receipts)
7. Retorna dados estruturados
```

**API:** OpenAI GPT-4 Vision (model: gpt-4-vision-preview)

---

### 📋 FASE 2: IMPLEMENTAR WORKFLOWS N8N (6-8h)

#### **2.1. Setup N8N** (1h)
- [ ] Instalar N8N (Docker ou Cloud)
- [ ] Configurar variáveis de ambiente
- [ ] Criar credenciais (Supabase, UAZAPI, OpenAI)

#### **2.2. Workflow 1: Receber Mensagens** (1h)
**Nodes:**
1. Webhook UAZAPI (POST /webhook/whatsapp-receive)
2. Function: Parse Webhook Data
3. Supabase: Find User by Phone
4. Switch: Route by Message Type
   - text → process-whatsapp-message
   - audio → transcribe-audio → process-whatsapp-message
   - image → extract-receipt-data → process-whatsapp-message

#### **2.3. Workflow 2: Processar Áudio** (1h)
**Nodes:**
1. HTTP Request: Download Audio
2. Function: Convert to MP3
3. HTTP Request: OpenAI Whisper API
4. Function: Extract Transcription
5. HTTP Request: process-whatsapp-message

#### **2.4. Workflow 3: Processar Imagem/OCR** (1.5h)
**Nodes:**
1. HTTP Request: Download Image
2. Function: Encode Base64
3. HTTP Request: GPT-4 Vision API
4. Function: Parse Extracted Data
5. Supabase: Save Extracted Data
6. HTTP Request: categorize-transaction

#### **2.5. Workflow 4: Processar Lançamento** (1.5h)
**Nodes:**
1. HTTP Request: Get User AI Config
2. HTTP Request: LLM Extract Transaction Data
3. Function: Validate Extracted Data
4. Switch: Confidence Check
   - High (>0.8) → Supabase: Create Transaction → Send Confirmation
   - Low (<0.8) → HTTP Request: Send Confirmation Request → Wait for Confirmation

#### **2.6. Workflow 5: Comandos Rápidos** (1h)
**Nodes:**
1. Function: Parse Command
2. Switch: Route by Command
   - saldo → Supabase: Get Accounts → Format Response
   - resumo → Supabase: Get Transactions → Calculate Summary
   - contas → Supabase: Get Bills → Format List
   - meta → Supabase: Get Goals → Calculate Progress
   - investimentos → Supabase: Get Portfolio → Format Summary
   - cartões → Supabase: Get Credit Cards → Format List
   - ajuda → Function: Return Help Text
3. HTTP Request: Send WhatsApp Message
4. Supabase: Update Command Statistics

---

### 📋 FASE 3: HOOKS REACT (2-3h)

#### **3.1. useWhatsAppConnection** (1.5h)
**Arquivo:** `src/hooks/useWhatsAppConnection.ts`

**Responsabilidades:**
- Buscar status de conexão
- Gerar QR Code
- Conectar/Desconectar
- Realtime subscription

**Métodos:**
```typescript
{
  connectionStatus, // WhatsAppConnectionStatus
  isConnected, // boolean
  qrCode, // string | null
  loading, // boolean
  generateQRCode, // () => Promise<string>
  disconnect, // () => Promise<void>
  refresh, // () => Promise<void>
}
```

#### **3.2. useWhatsAppMessages** (1.5h)
**Arquivo:** `src/hooks/useWhatsAppMessages.ts`

**Responsabilidades:**
- Buscar histórico de mensagens
- Filtrar por tipo/direção
- Paginação
- Realtime subscription

**Métodos:**
```typescript
{
  messages, // WhatsAppMessage[]
  stats, // WhatsAppStats
  loading, // boolean
  hasMore, // boolean
  fetchMore, // () => Promise<void>
  refresh, // () => Promise<void>
  filters, // MessageFilters
  setFilters, // (filters: MessageFilters) => void
}
```

---

### 📋 FASE 4: COMPONENTES UI (4-6h)

#### **4.1. QRCodeModal** (1.5h)
**Arquivo:** `src/components/whatsapp/QRCodeModal.tsx`

**Features:**
- Dialog modal
- QR Code com timer (2 minutos)
- Instruções passo a passo
- Auto-refresh de status
- Feedback visual (conectando, conectado)

#### **4.2. WhatsAppConnectionStatus** (1h)
**Arquivo:** `src/components/whatsapp/WhatsAppConnectionStatus.tsx`

**Features:**
- Badge no header Settings
- Status: conectado/desconectado
- Número conectado
- Botão reconectar/desconectar

#### **4.3. MessageHistory** (2h)
**Arquivo:** `src/components/whatsapp/MessageHistory.tsx`

**Features:**
- Lista últimas 50 mensagens
- Scroll infinito
- Filtros (tipo, direção, status)
- Busca por texto
- Badges de status
- Preview de mídia

#### **4.4. WhatsAppStats** (1.5h)
**Arquivo:** `src/components/whatsapp/WhatsAppStats.tsx`

**Features:**
- Card de estatísticas
- Mensagens enviadas/recebidas (7 dias)
- Comandos mais usados (top 5)
- Taxa de sucesso
- Gráfico de linha (evolução)

---

### 📋 FASE 5: INTEGRAÇÃO SETTINGS (2-3h)

#### **5.1. Modificar IntegrationsSettings.tsx** (2h)
**Arquivo:** `src/pages/Settings/tabs/IntegrationsSettings.tsx`

**Adicionar seção WhatsApp:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>WhatsApp</CardTitle>
    <WhatsAppConnectionStatus />
  </CardHeader>
  <CardContent>
    <Tabs>
      <Tab name="Estatísticas">
        <WhatsAppStats />
      </Tab>
      <Tab name="Histórico">
        <MessageHistory />
      </Tab>
      <Tab name="Comandos">
        <QuickCommandsList />
      </Tab>
    </Tabs>
  </CardContent>
</Card>
```

#### **5.2. Integrar com UAZAPI** (1h)
- Configurar webhook no UAZAPI apontando para N8N
- Testar envio de mensagem manual
- Verificar recebimento de webhook

---

## 🧪 FASE 6: TESTES E VALIDAÇÃO (2-3h)

### **Testes Unitários:**
- [ ] Edge Functions (process, categorize, transcribe, extract)
- [ ] Hooks React (connection, messages)

### **Testes de Integração:**
- [ ] Enviar mensagem texto → Criar transação
- [ ] Enviar áudio → Transcrever → Criar transação
- [ ] Enviar foto → OCR → Criar transação
- [ ] Comandos rápidos (saldo, resumo, contas, meta)
- [ ] Notificações proativas (lembretes, alertas, resumos)

### **Testes End-to-End:**
1. Conectar WhatsApp via QR Code
2. Enviar "gastei 50 no mercado"
3. Verificar transação criada
4. Enviar "saldo"
5. Verificar resposta formatada
6. Aguardar lembrete agendado
7. Confirmar recebimento

---

## 📦 DEPENDÊNCIAS EXTERNAS

### **1. UAZAPI (WhatsApp Business API)**
- **Setup:**
  1. Criar conta: https://uazapi.com
  2. Criar instância
  3. Obter API Token
  4. Configurar webhook → N8N URL
- **Custo:** $30/mês (ilimitado)

### **2. N8N (Workflow Automation)**
- **Setup (Self-hosted):**
  ```bash
  docker run -it --rm \
    --name n8n \
    -p 5678:5678 \
    -v ~/.n8n:/home/node/.n8n \
    n8nio/n8n
  ```
- **Alternativa:** N8N Cloud ($20/mês)

### **3. OpenAI API**
- **APIs necessárias:**
  - Whisper (transcrição)
  - GPT-4 Vision (OCR)
  - GPT-4 (categorização)
- **Custo estimado:** ~$50/mês (100 usuários)

---

## 🔐 VARIÁVEIS DE AMBIENTE

### **Supabase Edge Functions:**
```env
UAZAPI_TOKEN=seu_token_aqui
UAZAPI_INSTANCE_ID=seu_instance_id
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### **N8N:**
```env
N8N_HOST=n8n.seudominio.com
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.seudominio.com

UAZAPI_TOKEN=seu_token_aqui
UAZAPI_INSTANCE_ID=seu_instance_id
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Backend (Edge Functions):**
- [ ] categorize-transaction
- [ ] send-whatsapp-message
- [ ] transcribe-audio
- [ ] extract-receipt-data
- [ ] Deploy de todas as 4 Edge Functions

### **N8N (Workflows):**
- [ ] Setup N8N (Docker ou Cloud)
- [ ] Configurar credenciais
- [ ] Workflow 1: Receber Mensagens
- [ ] Workflow 2: Processar Áudio
- [ ] Workflow 3: Processar Imagem/OCR
- [ ] Workflow 4: Processar Lançamento
- [ ] Workflow 5: Comandos Rápidos

### **Frontend:**
- [ ] Hook useWhatsAppConnection
- [ ] Hook useWhatsAppMessages
- [ ] Component QRCodeModal
- [ ] Component WhatsAppConnectionStatus
- [ ] Component MessageHistory
- [ ] Component WhatsAppStats
- [ ] Integrar na aba Settings > Integrações

### **Integrações:**
- [ ] Criar conta UAZAPI
- [ ] Configurar webhook UAZAPI → N8N
- [ ] Testar envio/recebimento de mensagens

### **Testes:**
- [ ] Testes unitários (Edge Functions + Hooks)
- [ ] Testes de integração (fluxos completos)
- [ ] Testes end-to-end (usuário real)

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### **DIA 1 (8h):**
1. ✅ Completar 4 Edge Functions restantes (6h)
2. ✅ Deploy Edge Functions (30min)
3. ✅ Setup N8N (Docker) (30min)
4. ✅ Configurar credenciais N8N (1h)

### **DIA 2 (8h):**
1. ✅ Workflow 1: Receber Mensagens (1h)
2. ✅ Workflow 2: Processar Áudio (1h)
3. ✅ Workflow 3: Processar Imagem/OCR (1.5h)
4. ✅ Workflow 4: Processar Lançamento (1.5h)
5. ✅ Workflow 5: Comandos Rápidos (1h)
6. ✅ Testar workflows individualmente (2h)

### **DIA 3 (8h):**
1. ✅ Hooks React (useWhatsAppConnection + useWhatsAppMessages) (3h)
2. ✅ Componentes UI (QRCode, Status, History, Stats) (4h)
3. ✅ Integração Settings (1h)

---

## 💡 DECISÕES TÉCNICAS

### **Por que N8N para comandos interativos?**
1. ✅ Sem problemas de autenticação (webhook público)
2. ✅ Interface visual (fácil debug e modificação)
3. ✅ Integrações prontas (WhatsApp, Supabase, OpenAI)
4. ✅ Flexibilidade total (adicionar lógica sem código)
5. ✅ Escalabilidade (processar múltiplas mensagens simultâneas)

### **Por que Supabase Edge Functions para notificações?**
1. ✅ Já está configurado
2. ✅ Cron Jobs nativos
3. ✅ Acesso direto ao banco de dados
4. ✅ Controle total das preferências do usuário
5. ✅ DND e cooldown implementados

---

## 📊 MÉTRICAS DE SUCESSO

1. ✅ 8 comandos funcionando corretamente
2. ✅ Taxa de sucesso > 90% em lançamentos automáticos
3. ✅ Transcrição de áudio com > 95% de precisão
4. ✅ OCR de notas fiscais com > 80% de precisão
5. ✅ Notificações proativas enviadas conforme preferências
6. ✅ DND respeitado 100% das vezes
7. ✅ Tempo de resposta < 5 segundos

---

## 🚨 RISCOS E MITIGAÇÕES

### **Risco 1:** OpenAI API Failures
**Mitigação:** Retry automático (até 3x) + fallback para extração manual

### **Risco 2:** UAZAPI Downtime
**Mitigação:** Fila de mensagens + retry com exponential backoff

### **Risco 3:** N8N Sobrecarga
**Mitigação:** Rate limiting por usuário + processamento assíncrono

### **Risco 4:** Custos OpenAI
**Mitigação:** Cache de respostas + limites por usuário + modelos mais baratos (GPT-4o-mini)

---

## 💰 CUSTO TOTAL ESTIMADO (100 usuários ativos)

| Serviço | Custo/Mês | Observação |
|---------|-----------|------------|
| UAZAPI | $30 | Ilimitado |
| N8N Cloud | $20 | Ou $0 (self-hosted) |
| OpenAI API | $50 | Whisper + Vision + GPT-4 |
| Supabase | $0 | Plano atual |
| **TOTAL** | **$100/mês** | **~$1/usuário** |

---

## ✅ RESULTADO ESPERADO

Sistema WhatsApp **100% bidirecional** com:
- ✅ **8 comandos rápidos** (acesso instantâneo a dados)
- ✅ **Lançamentos automáticos** (texto, áudio, foto)
- ✅ **IA contextual** (Ana Clara personalizada)
- ✅ **Notificações proativas** (lembretes, alertas, resumos)
- ✅ **Confirmações interativas** (validação antes de criar)
- ✅ **Histórico completo** (todas as mensagens rastreadas)
- ✅ **Estatísticas de uso** (tracking completo)

---

**Status:** PRONTO PARA IMPLEMENTAÇÃO  
**Próximo:** Começar pela FASE 1 (Edge Functions)
