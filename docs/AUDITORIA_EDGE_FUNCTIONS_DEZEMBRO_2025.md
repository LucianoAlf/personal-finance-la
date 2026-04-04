# 🚀 AUDITORIA COMPLETA DAS EDGE FUNCTIONS - PERSONAL FINANCE LA

**Data da Auditoria:** 06 de Dezembro de 2025  
**Projeto:** Personal Finance LA  
**Supabase Project ID:** `sbnpmhmvcspwcyjhftlw`  
**Total de Edge Functions:** 43

---

## 📊 RESUMO EXECUTIVO

### Estatísticas Gerais

| Métrica | Quantidade |
|---------|------------|
| **Total de Functions** | 43 |
| **Funcionando (200)** | ~15 |
| **Com Erros (401)** | ~28 |
| **Categorias** | 7 |
| **APIs Externas** | 6 |
| **Código Compartilhado** | 2 arquivos |

### 🔴 PROBLEMA CRÍTICO IDENTIFICADO

**Cron Jobs retornando 401 Unauthorized constantemente:**
- `sync-investment-prices` → 401 (a cada 5 min)
- `send-bill-reminders` → 401 (a cada 10 min)
- `check-investment-alerts` → 401 (a cada hora)

**Causa:** Os cron jobs estão configurados com `verify_jwt: true` mas não enviam token JWT válido.

**Impacto:** 
- Preços de investimentos NÃO estão sendo atualizados
- Lembretes de contas NÃO estão sendo enviados
- Alertas de investimentos NÃO estão funcionando

---

## 📋 INVENTÁRIO POR CATEGORIA

### 1. 📱 WHATSAPP & COMUNICAÇÃO (10 functions)

| Function | Versão | JWT | Status | Descrição |
|----------|--------|-----|--------|-----------|
| `process-whatsapp-message` | v63 | ✅ | ✅ OK | Processa mensagens recebidas |
| `send-whatsapp-message` | v10 | ✅ | ✅ OK | Envia mensagens via UAZAPI |
| `execute-quick-command` | v4 | ✅ | ✅ OK | Executa comandos rápidos |
| `transcribe-audio` | v5 | ✅ | ✅ OK | Transcreve áudio (Whisper) |
| `extract-receipt-data` | v5 | ✅ | ✅ OK | OCR de notas fiscais (Vision) |
| `categorize-transaction` | v19 | ❌ | ✅ OK | Categoriza transações via LLM |
| `webhook-uazapi` | v6 | ✅ | ✅ OK | Webhook UAZAPI |
| `webhook-whatsapp-public` | v5 | ✅ | ✅ OK | Webhook público |
| `generate-qr-code` | v12 | ✅ | ✅ OK | Gera QR Code conexão |
| `llm-intent-parser` | v2 | ✅ | ✅ OK | Parser de intenção LLM |

### 2. 📈 INVESTIMENTOS (9 functions)

| Function | Versão | JWT | Status | Descrição |
|----------|--------|-----|--------|-----------|
| `sync-investment-prices` | v6 | ✅ | 🔴 401 | Sincroniza preços |
| `check-investment-alerts` | v6 | ✅ | 🔴 401 | Verifica alertas |
| `generate-opportunities` | v8 | ✅ | ⚠️ N/T | Gera oportunidades |
| `investment-radar` | v8 | ✅ | ⚠️ N/T | Radar de investimentos |
| `send-opportunity-notification` | v10 | ✅ | ⚠️ N/T | Notifica oportunidades |
| `fetch-benchmarks` | v7 | ✅ | ⚠️ N/T | Busca benchmarks |
| `create-portfolio-snapshot` | v7 | ✅ | ⚠️ N/T | Cria snapshot |
| `send-portfolio-snapshot-notification` | v8 | ✅ | ⚠️ N/T | Notifica snapshot |
| `get-quote` | v10 | ✅ | ⚠️ N/T | Busca cotação |

### 3. 🤖 ANA CLARA & IA (5 functions)

| Function | Versão | JWT | Status | Descrição |
|----------|--------|-----|--------|-----------|
| `ana-dashboard-insights` | v15 | ✅ | ✅ OK | Insights do dashboard |
| `ana-investment-insights` | v9 | ✅ | ⚠️ N/T | Insights de investimentos |
| `validate-api-key` | v16 | ✅ | ✅ OK | Valida API key |
| `update-ai-config` | v7 | ✅ | ⚠️ N/T | Atualiza config IA |
| `analytics-query` | v5 | ❌ | ✅ OK | Consultas analíticas |

### 4. 📅 CONTAS A PAGAR (4 functions)

| Function | Versão | JWT | Status | Descrição |
|----------|--------|-----|--------|-----------|
| `cron-generate-bills` | v20 | ✅ | ⚠️ N/T | Gera contas recorrentes |
| `send-reminders` | v20 | ✅ | ⚠️ N/T | Envia lembretes |
| `send-bill-reminders` | v33 | ❌ | 🔴 401 | Envia lembretes de contas |
| `invoice-automation` | v20 | ❌ | ⚠️ N/T | Automação de faturas |

### 5. 🔔 NOTIFICAÇÕES (9 functions)

| Function | Versão | JWT | Status | Descrição |
|----------|--------|-----|--------|-----------|
| `send-proactive-notifications` | v10 | ✅ | ⚠️ N/T | Notificações proativas |
| `send-overdue-bill-alerts` | v4 | ✅ | ⚠️ N/T | Alertas contas vencidas |
| `send-low-balance-alerts` | v4 | ✅ | ⚠️ N/T | Alertas saldo baixo |
| `send-large-transaction-alerts` | v3 | ✅ | ⚠️ N/T | Alertas transações grandes |
| `send-investment-summary` | v5 | ✅ | ⚠️ N/T | Resumo investimentos |
| `send-daily-summary` | v5 | ✅ | ⚠️ N/T | Resumo diário |
| `send-weekly-summary` | v5 | ✅ | ⚠️ N/T | Resumo semanal |
| `send-monthly-summary` | v5 | ✅ | ⚠️ N/T | Resumo mensal |
| `send-ana-tips` | v3 | ✅ | ⚠️ N/T | Dicas da Ana Clara |

### 6. ⚙️ CONFIGURAÇÕES & WEBHOOKS (5 functions)

| Function | Versão | JWT | Status | Descrição |
|----------|--------|-----|--------|-----------|
| `get-user-settings` | v4 | ✅ | ⚠️ N/T | Busca configurações |
| `test-webhook-connection` | v4 | ✅ | ⚠️ N/T | Testa webhook |
| `trigger-webhook` | v4 | ✅ | ⚠️ N/T | Dispara webhook |
| `update-webhook` | v4 | ✅ | ⚠️ N/T | Atualiza webhook |
| `test-email` | v14 | ❌ | ⚠️ N/T | Testa email |

**Legenda:** ✅ OK | 🔴 Erro | ⚠️ N/T (Não Testado) | JWT = verify_jwt

---

## 🔗 DEPENDÊNCIAS EXTERNAS

### APIs Utilizadas

| API | Functions | Propósito |
|-----|-----------|-----------|
| **UAZAPI** | 10+ | WhatsApp (envio/recebimento) |
| **OpenAI** | 8+ | GPT-4, Whisper, Vision |
| **BrAPI** | 2 | Cotações B3/FIIs |
| **CoinGecko** | 1 | Cotações Crypto |
| **Tesouro Direto** | 1 | Cotações Renda Fixa |
| **Google Gemini** | 3 | IA alternativa |
| **Anthropic Claude** | 3 | IA alternativa |
| **OpenRouter** | 3 | IA gratuita |

### Variáveis de Ambiente Necessárias

| Secret | Obrigatório | Usado Por |
|--------|-------------|-----------|
| `SUPABASE_URL` | ✅ | Todas |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Todas |
| `SUPABASE_ANON_KEY` | ⚠️ | validate-api-key |
| `OPENAI_API_KEY` | ✅ | IA, Whisper, Vision |
| `UAZAPI_BASE_URL` | ✅ | WhatsApp |
| `UAZAPI_INSTANCE_TOKEN` | ✅ | WhatsApp |
| `BRAPI_API_KEY` | ⚠️ | Investimentos |
| `CRON_SECRET` | ✅ | Cron Jobs |
| `GEMINI_API_KEY` | ⚠️ | IA alternativa |

---

## 📊 ANÁLISE DETALHADA DAS PRINCIPAIS FUNCTIONS

### 1. `process-whatsapp-message` (v63) ⭐ PRINCIPAL

**Categoria:** WhatsApp  
**Trigger:** Webhook UAZAPI  
**Linhas:** ~1.500  

#### Descrição
Função principal que processa todas as mensagens recebidas via WhatsApp. É a "porta de entrada" do sistema.

#### Fluxo de Processamento
```
Mensagem UAZAPI
  ↓
Normalizar messageType (Conversation → text)
  ↓
Buscar usuário por telefone
  ↓
Salvar mensagem no banco
  ↓
Detectar tipo de consulta
  ├── isAnalyticsQuery? → analytics-query
  ├── Comando rápido? → Processar inline
  └── Transação? → categorize-transaction
  ↓
Enviar resposta via send-whatsapp-message
```

#### Dependências
- **Tabelas:** `users`, `whatsapp_messages`, `accounts`, `transactions`, `payable_bills`, `financial_goals`, `investments`, `credit_cards`, `credit_card_transactions`
- **Functions chamadas:** `send-whatsapp-message`, `analytics-query`, `categorize-transaction`
- **APIs:** UAZAPI (indiretamente)

#### Features Implementadas
- ✅ Normalização de messageType (UAZAPI quirks)
- ✅ Detecção de conta por keywords (Nubank, Itaú, etc.)
- ✅ Sistema de pergunta "Em qual conta?"
- ✅ Integração com analytics-query (dados reais)
- ✅ 8 comandos rápidos inline (saldo, resumo, contas, etc.)
- ✅ Detecção de transações via NLP

#### Problemas Identificados
- ⚠️ Código muito longo (~1.500 linhas) - difícil manutenção
- ⚠️ Muita lógica inline que poderia ser modularizada
- ⚠️ Versão v63 indica muitas iterações/correções

---

### 2. `send-whatsapp-message` (v10)

**Categoria:** WhatsApp  
**Trigger:** HTTP (chamada interna)  

#### Descrição
Envia mensagens via UAZAPI. Função simples e direta.

#### Código Crítico
```typescript
// ⚠️ PROBLEMA: Token hardcoded no código!
const UAZAPI_BASE_URL = 'https://lamusic.uazapi.com';
const UAZAPI_TOKEN = '0a5d59d3-f368-419b-b9e8-701375814522';
```

#### Problemas Identificados
- 🔴 **CRÍTICO:** Token UAZAPI hardcoded no código fonte
- ⚠️ Deveria usar `Deno.env.get('UAZAPI_TOKEN')`

---

### 3. `sync-investment-prices` (v6) 🔴 PROBLEMA

**Categoria:** Investimentos  
**Trigger:** Cron Job (a cada 5 min)  

#### Descrição
Sincroniza preços de investimentos de múltiplas fontes.

#### Fontes de Dados
1. **BrAPI** - Ações e FIIs da B3
2. **CoinGecko** - Criptomoedas
3. **Tesouro Direto** - Títulos públicos

#### Problema Atual
```
POST | 401 | sync-investment-prices
```
**Causa:** `verify_jwt: true` mas cron job não envia JWT.

#### Solução Necessária
```typescript
// Opção 1: Desabilitar JWT para cron
// No deploy: --no-verify-jwt

// Opção 2: Validar CRON_SECRET ao invés de JWT
const cronSecret = req.headers.get('x-cron-secret');
if (cronSecret !== Deno.env.get('CRON_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

### 4. `ana-dashboard-insights` (v15)

**Categoria:** Ana Clara / IA  
**Trigger:** HTTP (frontend)  

#### Descrição
Gera insights personalizados para o dashboard usando GPT-4.

#### Features
- ✅ Cache de 8 horas (economia de API)
- ✅ Health Score (0-100)
- ✅ Multi-provider (OpenAI, Gemini, Claude, OpenRouter)
- ✅ Dados consolidados (bills, portfolio, transactions, goals, credit cards)
- ✅ Priorização inteligente (CRITICAL > WARNING > INFO)

#### Dados Coletados
```typescript
const context = {
  bills: { overdue, upcoming7Days, paidThisMonth, onTimeRate },
  portfolio: { totalValue, totalInvested, returnPercentage, allocation },
  transactions: { last30Days: { income, expenses, balance } },
  goals: { active, recentlyAchieved },
  creditCards: { totalLimit, totalUsed, utilizationRate }
};
```

#### Custo Estimado
- ~$0.02-0.03 por análise (GPT-4o-mini)
- Cache 8h reduz para ~$0.50/usuário/mês

---

### 5. `analytics-query` (v5)

**Categoria:** Ana Clara / IA  
**Trigger:** HTTP (via process-whatsapp-message)  

#### Descrição
Responde consultas analíticas com dados REAIS do banco, prevenindo alucinação da LLM.

#### Tipos de Consultas Suportadas
1. `account_balance` - "Qual meu saldo no Nubank?"
2. `sum_by_category` - "Quanto gastei em alimentação?"
3. `sum_by_merchant` - "Quanto gastei no iFood?"
4. `sum_by_account_type` - "Quanto gastei de cartão?"
5. `sum_by_account_and_merchant` - "Quanto gastei no iFood no Nubank?"

#### Otimizações
- ✅ Cache de intents (5 min)
- ✅ Fallback regex antes de LLM (70% dos casos)
- ✅ Timeout de 10s para LLM
- ✅ Parser de períodos em linguagem natural

---

### 6. `send-bill-reminders` (v33) 🔴 PROBLEMA

**Categoria:** Contas a Pagar  
**Trigger:** Cron Job (a cada 10 min)  

#### Descrição
Envia lembretes de contas a pagar via WhatsApp.

#### Problema Atual
```
POST | 401 | send-bill-reminders
```

#### Análise do Código
```typescript
// Validação atual (correta mas não está funcionando)
const hasJwtAuth = !!authHeader && /^Bearer\s+.+/.test(authHeader);
if (expectedSecret && !hasJwtAuth && (!cronSecret || cronSecret !== expectedSecret)) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Problema:** O cron job não está enviando nem JWT nem `x-cron-secret`.

---

## 🔄 FLUXOS DE INTEGRAÇÃO

### Fluxo 1: WhatsApp → Transação

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO WHATSAPP → TRANSAÇÃO               │
└─────────────────────────────────────────────────────────────┘

Usuário envia: "Gastei 50 no Uber"
         │
         ▼
┌─────────────────┐
│  UAZAPI Webhook │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ process-whatsapp-message    │
│ (normaliza, salva, detecta) │
└────────┬────────────────────┘
         │
         ├── Texto simples ──────────────────────┐
         │                                        │
         ▼                                        ▼
┌─────────────────┐                    ┌──────────────────┐
│ Detecta conta   │                    │ categorize-      │
│ (Nubank? Itaú?) │                    │ transaction      │
└────────┬────────┘                    │ (LLM extrai)     │
         │                             └────────┬─────────┘
         │ Não encontrou                        │
         ▼                                      │
┌─────────────────┐                             │
│ Pergunta:       │                             │
│ "Em qual conta?"│                             │
└────────┬────────┘                             │
         │                                      │
         ▼                                      ▼
┌─────────────────────────────────────────────────┐
│              INSERT transactions                 │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           send-whatsapp-message                  │
│    "✅ Lançamento: R$ 50,00 - Transporte"       │
└─────────────────────────────────────────────────┘
```

### Fluxo 2: Consulta Analítica

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUXO CONSULTA ANALÍTICA                    │
└─────────────────────────────────────────────────────────────┘

Usuário envia: "Quanto gastei no iFood esse mês?"
         │
         ▼
┌─────────────────────────────┐
│ process-whatsapp-message    │
│ isAnalyticsQuery() = true   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│      analytics-query        │
│ 1. Detecta intent (regex)   │
│ 2. Fallback: LLM            │
│ 3. Parseia período          │
│ 4. Query no banco           │
│ 5. Formata resposta         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│           send-whatsapp-message                  │
│  "📊 Gastos no iFood (dezembro): R$ 450,00"     │
│  "📋 12 pedidos | Média: R$ 37,50"              │
└─────────────────────────────────────────────────┘
```

### Fluxo 3: Sincronização de Preços (QUEBRADO)

```
┌─────────────────────────────────────────────────────────────┐
│            FLUXO SYNC PREÇOS (ATUALMENTE QUEBRADO)          │
└─────────────────────────────────────────────────────────────┘

Cron Job (a cada 5 min)
         │
         ▼
┌─────────────────────────────┐
│   sync-investment-prices    │
│   verify_jwt: true          │◄──── 🔴 PROBLEMA: Sem JWT
└────────┬────────────────────┘
         │
         ▼
    401 Unauthorized
         │
         ▼
    ❌ PREÇOS NÃO ATUALIZADOS
```

### Fluxo 4: Ana Clara Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUXO ANA CLARA DASHBOARD                   │
└─────────────────────────────────────────────────────────────┘

Frontend carrega Dashboard
         │
         ▼
┌─────────────────────────────┐
│   ana-dashboard-insights    │
│   1. Verifica cache (8h)    │
│   2. Se válido, retorna     │
└────────┬────────────────────┘
         │ Cache expirado
         ▼
┌─────────────────────────────┐
│   Fetch dados consolidados  │
│   - bills                   │
│   - portfolio               │
│   - transactions            │
│   - goals                   │
│   - credit_cards            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Chamar LLM (GPT-4o-mini)  │
│   - System prompt           │
│   - Contexto financeiro     │
│   - Gerar insights          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Salvar no cache           │
│   Retornar insights         │
└─────────────────────────────┘
```

---

## 🔍 ANÁLISE DE LOGS (Últimas 24h)

### Resumo de Status Codes

| Status | Quantidade | Functions |
|--------|------------|-----------|
| **200** | ~40% | ana-dashboard-insights |
| **401** | ~60% | sync-investment-prices, send-bill-reminders, check-investment-alerts |

### Functions com Mais Erros

1. **sync-investment-prices** - 401 (a cada 5 min = ~288/dia)
2. **send-bill-reminders** - 401 (a cada 10 min = ~144/dia)
3. **check-investment-alerts** - 401 (a cada hora = ~24/dia)

### Tempo de Execução Médio

| Function | Tempo Médio | Observação |
|----------|-------------|------------|
| `ana-dashboard-insights` | 1.1s - 11.9s | Varia com cache |
| `sync-investment-prices` | 150ms | Falha rápido (401) |
| `send-bill-reminders` | 200ms | Falha rápido (401) |

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS (Impacto Alto)

#### 1. Cron Jobs com 401 Unauthorized
**Impacto:** Funcionalidades core não funcionam
**Functions afetadas:**
- `sync-investment-prices` - Preços desatualizados
- `send-bill-reminders` - Lembretes não enviados
- `check-investment-alerts` - Alertas não funcionam

**Causa:** `verify_jwt: true` + cron não envia JWT

**Solução:**
```bash
# Opção 1: Redeploy sem JWT
supabase functions deploy sync-investment-prices --no-verify-jwt
supabase functions deploy send-bill-reminders --no-verify-jwt
supabase functions deploy check-investment-alerts --no-verify-jwt

# Opção 2: Configurar cron com CRON_SECRET
# E validar no código da function
```

#### 2. Token UAZAPI Hardcoded
**Impacto:** Segurança comprometida
**Function:** `send-whatsapp-message`

**Código problemático:**
```typescript
const UAZAPI_TOKEN = '0a5d59d3-f368-419b-b9e8-701375814522';
```

**Solução:**
```typescript
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_INSTANCE_TOKEN');
```

### 🟡 ATENÇÃO (Impacto Médio)

#### 3. Código Muito Longo
**Function:** `process-whatsapp-message` (~1.500 linhas, v63)
**Problema:** Difícil manutenção, muitas iterações

**Sugestão:** Refatorar em módulos:
- `whatsapp-message-handler.ts`
- `quick-commands.ts`
- `transaction-detector.ts`
- `account-detector.ts`

#### 4. Código Compartilhado Duplicado
**Arquivo:** `_shared/ai.ts`
**Problema:** Duplicado em várias functions

**Sugestão:** Centralizar em um único local e importar.

#### 5. Inconsistência de Nomes de Secrets
**Problema:** Múltiplos nomes para a mesma variável
```
UAZAPI_BASE_URL vs UAZAPI_SERVER_URL
UAZAPI_INSTANCE_TOKEN vs UAZAPI_API_KEY vs UAZAPI_TOKEN
```

### 🟢 OBSERVAÇÕES (Impacto Baixo)

#### 6. Functions Não Testadas
~20 functions não foram testadas nos logs recentes.
Podem estar funcionando ou simplesmente não são chamadas.

#### 7. Versionamento Alto
- `process-whatsapp-message` v63
- `send-bill-reminders` v33
- `categorize-transaction` v19

Indica muitas correções/iterações.

---

## 📋 CÓDIGO COMPARTILHADO

### `_shared/ai.ts`

Utilitários compartilhados para chamadas de IA:

```typescript
// Interfaces
interface NormalizedAIConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'openrouter';
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

// Functions
getDefaultAIConfig(supabase, userId)  // Busca config do usuário
callChat(config, messages)             // Chama LLM (multi-provider)
callVision(config, imageUrl, ...)      // Chama Vision API
```

### `_shared/period-parser.ts`

Parser de períodos em linguagem natural:

```typescript
parsePeriod("esse mês")      // { start: "2025-12-01", end: "2025-12-06" }
parsePeriod("semana passada") // { start: "2025-11-24", end: "2025-11-30" }
parsePeriod("outubro")        // { start: "2025-10-01", end: "2025-10-31" }
formatCurrency(1234.56)       // "R$ 1.234,56"
```

---

## 🎯 RECOMENDAÇÕES

### Prioridade ALTA (Fazer Agora)

#### 1. Corrigir Cron Jobs com 401
```bash
# Redeploy das functions problemáticas
supabase functions deploy sync-investment-prices --no-verify-jwt
supabase functions deploy send-bill-reminders --no-verify-jwt
supabase functions deploy check-investment-alerts --no-verify-jwt
```

#### 2. Remover Token Hardcoded
Editar `send-whatsapp-message/index.ts`:
```typescript
// ANTES (inseguro)
const UAZAPI_TOKEN = '0a5d59d3-f368-419b-b9e8-701375814522';

// DEPOIS (seguro)
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_INSTANCE_TOKEN');
```

#### 3. Padronizar Nomes de Secrets
Definir padrão único:
- `UAZAPI_BASE_URL` (não UAZAPI_SERVER_URL)
- `UAZAPI_TOKEN` (não UAZAPI_INSTANCE_TOKEN)

### Prioridade MÉDIA (Próxima Sprint)

#### 4. Refatorar process-whatsapp-message
Dividir em módulos menores para facilitar manutenção.

#### 5. Centralizar Código Compartilhado
Criar pacote único `_shared/` e importar em todas as functions.

#### 6. Adicionar Monitoramento
Implementar alertas para erros 401/500 frequentes.

### Prioridade BAIXA (Backlog)

#### 7. Documentar Cada Function
Criar README para cada function com:
- Descrição
- Parâmetros
- Retorno
- Exemplos

#### 8. Testes Automatizados
Criar testes para as functions principais.

---

## 📊 MÉTRICAS DE USO

### Functions Mais Chamadas (24h)
1. `ana-dashboard-insights` - ~50 chamadas (frontend)
2. `sync-investment-prices` - ~288 chamadas (cron, todas 401)
3. `send-bill-reminders` - ~144 chamadas (cron, todas 401)

### Functions Nunca Chamadas (possível código morto)
- `send-weekly-summary`
- `send-monthly-summary`
- `send-ana-tips`
- `test-webhook-connection`
- `trigger-webhook`
- `update-webhook`

---

## 🏁 CONCLUSÃO

### Status Geral: ⚠️ ATENÇÃO NECESSÁRIA

O sistema de Edge Functions está **parcialmente funcional**:

**✅ Funcionando:**
- WhatsApp bidirecional (envio/recebimento)
- Ana Clara Dashboard (insights)
- Categorização de transações
- Consultas analíticas

**🔴 Quebrado:**
- Sincronização de preços de investimentos
- Lembretes de contas a pagar
- Alertas de investimentos

**Ação Imediata Necessária:**
1. Redeploy das 3 functions com `--no-verify-jwt`
2. Remover token hardcoded
3. Padronizar variáveis de ambiente

**Tempo Estimado:** 30 minutos

---

*Auditoria realizada em 06/12/2025 via Supabase MCP*
