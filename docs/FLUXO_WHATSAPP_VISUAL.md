# 🔄 FLUXO VISUAL - WHATSAPP + ANA CLARA

## 📱 EXEMPLO REAL: "Gastei R$ 50 no supermercado"

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 USUÁRIO                                                     │
│  📱 WhatsApp: "Gastei R$ 50 no supermercado"                   │
│  ⏱️  Tempo: 00:00                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Internet
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  🌐 UAZAPI (Servidor WhatsApp)                                  │
│  ✅ Mensagem recebida                                           │
│  ⏱️  Tempo: 00:00.5s                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Webhook POST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ EDGE FUNCTION: process-whatsapp-message                     │
│  ─────────────────────────────────────────                      │
│  1️⃣  Busca usuário por phone_number                            │
│       → SELECT * FROM users WHERE phone = '+5511...'           │
│  ✅ Encontrado: user_id = abc123                                │
│                                                                 │
│  2️⃣  Salva mensagem no DB                                       │
│       → INSERT INTO whatsapp_messages (...)                    │
│  ✅ message_id = msg456                                         │
│                                                                 │
│  3️⃣  Busca configuração de IA do usuário                        │
│       → SELECT * FROM ai_provider_configs                      │
│         WHERE user_id = abc123 AND is_default = true           │
│  ✅ Provedor: OpenAI | Modelo: GPT-4 Turbo                      │
│                                                                 │
│  4️⃣  Detecta intenção da mensagem                               │
│       Texto: "Gastei R$ 50 no supermercado"                    │
│       Análise: Contém valor (R$ 50) + verbo passado (gastei)  │
│  ✅ Intenção: TRANSACTION_ENTRY                                 │
│                                                                 │
│  ⏱️  Tempo: 00:01s                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Roteamento
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  🤖 EDGE FUNCTION: categorize-transaction                       │
│  ──────────────────────────────────────────────                 │
│  1️⃣  Prepara prompt para LLM                                    │
│       System: "Você é Ana Clara, extraia dados de transação"   │
│       User: "Gastei R$ 50 no supermercado"                     │
│                                                                 │
│  2️⃣  Chama OpenAI GPT-4 Turbo                                   │
│       → POST https://api.openai.com/v1/chat/completions        │
│  ⏳ Aguardando...                                               │
│                                                                 │
│  3️⃣  LLM retorna JSON estruturado                               │
│       {                                                         │
│         "amount": 50.00,                                        │
│         "category": "Alimentação",                             │
│         "subcategory": "Supermercado",                         │
│         "description": "Compras no supermercado",              │
│         "date": "2025-11-10",                                  │
│         "type": "expense",                                      │
│         "confidence": 0.95                                      │
│       }                                                         │
│  ✅ Dados extraídos com 95% confiança                           │
│                                                                 │
│  4️⃣  Cria transação no Supabase                                 │
│       → INSERT INTO transactions (                             │
│            user_id = abc123,                                    │
│            amount = 50.00,                                      │
│            category = 'Alimentação',                           │
│            description = 'Compras no supermercado',            │
│            date = '2025-11-10',                                │
│            type = 'expense'                                     │
│          )                                                      │
│  ✅ transaction_id = txn789                                     │
│                                                                 │
│  5️⃣  Formata mensagem de confirmação                            │
│       "✅ Lançamento registrado!\n\n"                          │
│       "💰 Valor: R$ 50,00\n"                                   │
│       "📁 Categoria: Alimentação\n"                            │
│       "📝 Descrição: Compras no supermercado\n"               │
│       "📅 Data: 10/11/2025"                                    │
│                                                                 │
│  ⏱️  Tempo: 00:03s (2s de LLM)                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Resposta pronta
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  📤 EDGE FUNCTION: send-whatsapp-message                        │
│  ──────────────────────────────────────────────                 │
│  1️⃣  Busca phone_number do usuário                              │
│       → SELECT phone_number FROM whatsapp_connections          │
│         WHERE user_id = abc123                                  │
│  ✅ Phone: +5511987654321                                       │
│                                                                 │
│  2️⃣  Envia mensagem via UAZAPI                                  │
│       → POST https://api.uazapi.com/v1/messages/send           │
│       Headers: {                                                │
│         "Authorization": "Bearer {UAZAPI_TOKEN}",              │
│         "Instance-ID": "{UAZAPI_INSTANCE_ID}"                  │
│       }                                                         │
│       Body: {                                                   │
│         "phone": "+5511987654321",                             │
│         "message": "✅ Lançamento registrado!..."              │
│       }                                                         │
│  ✅ UAZAPI: Message sent successfully                           │
│                                                                 │
│  3️⃣  Salva mensagem enviada no histórico                        │
│       → INSERT INTO whatsapp_messages (                        │
│            direction = 'outgoing',                             │
│            status = 'sent',                                     │
│            content = '✅ Lançamento registrado!...'            │
│          )                                                      │
│  ✅ Histórico atualizado                                        │
│                                                                 │
│  4️⃣  Atualiza estatísticas                                      │
│       → UPDATE whatsapp_stats                                   │
│         SET messages_sent = messages_sent + 1                   │
│  ✅ Stats atualizadas                                           │
│                                                                 │
│  ⏱️  Tempo: 00:04s                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Internet
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  🌐 UAZAPI (Servidor WhatsApp)                                  │
│  📤 Enviando mensagem para o usuário...                         │
│  ⏱️  Tempo: 00:04.5s                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ WhatsApp Protocol
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  👤 USUÁRIO                                                     │
│  📱 WhatsApp RECEBE:                                            │
│  ─────────────────────────────────────                          │
│  ✅ Lançamento registrado!                                      │
│                                                                 │
│  💰 Valor: R$ 50,00                                            │
│  📁 Categoria: Alimentação                                     │
│  📝 Descrição: Compras no supermercado                         │
│  📅 Data: 10/11/2025                                           │
│  ─────────────────────────────────────                          │
│  ⏱️  Tempo Total: ~5 segundos                                  │
└─────────────────────────────────────────────────────────────────┘

                           🎉 SUCESSO!

┌─────────────────────────────────────────────────────────────────┐
│  🔄 REALTIME UPDATE NO FRONTEND                                 │
│  ─────────────────────────────────────────                      │
│  Dashboard.tsx:                                                 │
│    → Supabase Subscription detecta nova transaction            │
│    → Saldo atualiza automaticamente                            │
│    → Gráfico de gastos atualiza                                │
│                                                                 │
│  Settings → Integrações → WhatsApp:                            │
│    → Nova mensagem aparece no histórico                        │
│    → Estatísticas incrementam (+2 mensagens)                   │
│    → Badge de status permanece verde                           │
│                                                                 │
│  ⏱️  Update instantâneo (< 100ms)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 OUTROS FLUXOS

### 📊 COMANDO "saldo"

```
Usuário → "saldo"
  ↓
process-whatsapp-message (detecta: QUICK_COMMAND)
  ↓
execute-quick-command
  ↓
SELECT SUM(balance) FROM accounts WHERE user_id = abc123
  ↓
Formata resposta:
  "💰 Saldo Total: R$ 5.432,10
   🏦 Banco Inter: R$ 2.100,00
   💳 Nubank: R$ 3.332,10"
  ↓
send-whatsapp-message
  ↓
Usuário recebe resposta
```

**Tempo:** ~1-2 segundos (sem LLM)

---

### 🎤 ÁUDIO "Paguei 150 de luz"

```
Usuário → 🎤 Áudio (3 segundos)
  ↓
process-whatsapp-message (detecta: AUDIO)
  ↓
transcribe-audio
  ↓
Whisper API: "paguei 150 de luz"
  ↓
categorize-transaction (LLM)
  ↓
Extrai: valor=150, categoria=Contas, subcategoria=Energia
  ↓
Cria transação
  ↓
send-whatsapp-message
  ↓
Usuário recebe confirmação
```

**Tempo:** ~4-6 segundos (Whisper + LLM)

---

### 📸 FOTO DE NOTA FISCAL

```
Usuário → 📸 Foto da nota
  ↓
process-whatsapp-message (detecta: IMAGE)
  ↓
extract-receipt-data
  ↓
GPT-4 Vision extrai:
  - Valor: R$ 87,50
  - Estabelecimento: "Supermercado Pão de Açúcar"
  - Data: 10/11/2025
  - Itens: Leite, Pão, Frutas...
  ↓
Categoriza: Alimentação → Supermercado
  ↓
Cria transação
  ↓
send-whatsapp-message com detalhes completos
  ↓
Usuário recebe confirmação
```

**Tempo:** ~5-8 segundos (Vision API + processamento)

---

## 💡 OTIMIZAÇÕES AUTOMÁTICAS

### **Cache de Comandos**
```
"saldo" → Já calculado há < 30s? → Retorna do cache
         → Economiza 1 query SQL
```

### **Fallback sem LLM**
```
"R$ 50 alimentação" → Regex detecta valor + categoria
                     → Não precisa de LLM
                     → Tempo: ~1s (vs 3s com LLM)
```

### **Retry Automático**
```
LLM timeout? → Tenta novamente (max 3x)
             → Se falhar: Usa fallback simples
```

### **Context Window**
```
Múltiplas mensagens em 30min?
  → Mantém contexto da conversa
  → Ana Clara lembra do que falou antes
```

---

## 📊 PERFORMANCE

| Ação | Tempo Médio | Custo/msg |
|------|-------------|-----------|
| Comando simples (saldo) | 1-2s | $0.00 |
| Lançamento texto (LLM) | 3-5s | $0.01 |
| Lançamento áudio | 4-6s | $0.016 |
| Nota fiscal (foto) | 5-8s | $0.02 |

**99% das respostas < 5 segundos**

---

## 🔐 SEGURANÇA EM CADA ETAPA

```
1️⃣  UAZAPI → Webhook autenticado
2️⃣  Edge Functions → JWT verificado
3️⃣  Database → RLS policies ativas
4️⃣  LLM → API Key server-side
5️⃣  Response → Somente para o usuário correto
```

**Zero exposição de secrets no frontend**

---

## 🎉 RESULTADO

**Usuário envia:** "Gastei R$ 50 no supermercado"
**Usuário recebe:** Confirmação em ~5s
**Database:** Transação criada
**Frontend:** Dashboard atualizado em tempo real

**Tudo sem N8N, totalmente serverless e escalável!** 🚀
