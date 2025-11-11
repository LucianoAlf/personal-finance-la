# 🚀 CONFIGURAÇÃO WHATSAPP + ANA CLARA - PRODUÇÃO

**Guia Completo para Deixar Tudo Funcionando SEM N8N**

---

## 📋 PRÉ-REQUISITOS

Você já tem:
- ✅ Conta UAZAPI ativa
- ✅ Token UAZAPI
- ✅ Instance ID UAZAPI
- ✅ API Key OpenAI
- ✅ Edge Functions deployadas (6/6)

---

## 🔧 PASSO 1: CONFIGURAR SECRETS NO SUPABASE

### **1.1 Acessar Supabase Dashboard**
```
https://app.supabase.com/project/sbnpmhmvcspwcyjhftlw/settings/vault
```

### **1.2 Adicionar Secrets (Edge Functions)**

Vá em: **Project Settings → Edge Functions → Environment Variables**

Adicione as seguintes variáveis:

```bash
# UAZAPI Credentials
UAZAPI_TOKEN=seu_token_aqui
UAZAPI_INSTANCE_ID=seu_instance_id_aqui
UAZAPI_BASE_URL=https://api.uazapi.com

# OpenAI
OPENAI_API_KEY=sk-proj-...seu_key_aqui

# Supabase (já existem, mas confirme)
SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

**Como adicionar:**
1. Clique em "Add Secret"
2. Name: `UAZAPI_TOKEN`
3. Value: Cole seu token
4. Clique "Add"
5. Repita para cada variável

---

## 🔗 PASSO 2: CONFIGURAR WEBHOOK NA UAZAPI

### **2.1 URL do Webhook**

A URL da sua Edge Function é:
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message
```

### **2.2 Configurar no Painel UAZAPI**

1. **Acesse:** Painel UAZAPI → Configurações → Webhooks
2. **Webhook URL:** Cole a URL acima
3. **Método:** POST
4. **Eventos:** Marque todos:
   - ✅ Message Received (incoming_message)
   - ✅ Message Sent (outgoing_message)
   - ✅ Message Status (message_status)
5. **Headers:** (deixe vazio ou padrão)
6. **Salvar**

### **2.3 Testar Webhook**

No painel UAZAPI, clique em "Testar Webhook" para verificar se está alcançando a Edge Function.

**Resposta esperada:** HTTP 200 OK

---

## 📱 PASSO 3: CONECTAR WHATSAPP (PRIMEIRO USO)

### **3.1 No Frontend**

1. Acesse: **Settings → Integrações → WhatsApp**
2. Clique: **"Conectar WhatsApp"**
3. **QR Code aparecerá** (gerado pela UAZAPI)
4. **Escaneie** com WhatsApp (Configurações → Aparelhos conectados)
5. Aguarde confirmação (status fica verde)

### **3.2 Verificar Conexão**

Após conectar, você verá:
- ✅ Badge verde "Conectado"
- ✅ Número conectado
- ✅ Data de conexão
- ✅ Tabs de Estatísticas/Histórico/Comandos

---

## 🎯 PASSO 4: TESTAR O FLUXO COMPLETO

### **4.1 Enviar Mensagem de Teste**

No WhatsApp, envie para o número conectado:
```
saldo
```

**Fluxo esperado:**
1. ⚡ Mensagem chega na UAZAPI
2. 🔗 UAZAPI chama webhook → `process-whatsapp-message`
3. 🤖 Edge Function identifica comando "saldo"
4. 📊 Chama `execute-quick-command`
5. 💬 Formata resposta com Ana Clara
6. 📤 Chama `send-whatsapp-message`
7. ✅ Você recebe resposta no WhatsApp

**Tempo total:** 2-5 segundos

### **4.2 Testar Outros Comandos**

```
resumo
contas
investimentos
ajuda
```

### **4.3 Testar Lançamento por Texto**

```
Gastei R$ 45 no almoço de hoje
```

**Fluxo esperado:**
1. 🤖 LLM extrai: valor=45, categoria=alimentação, data=hoje
2. 📝 Cria transação no Supabase
3. ✅ Responde: "✅ Lançamento registrado! R$ 45,00 em Alimentação"

### **4.4 Testar Áudio**

Grave áudio dizendo:
```
"Paguei 150 reais de luz hoje"
```

**Fluxo:**
1. 🎤 `transcribe-audio` → Whisper API
2. 📝 Transcrição: "paguei 150 reais de luz hoje"
3. 🤖 `categorize-transaction` → LLM extrai dados
4. ✅ Cria transação

### **4.5 Testar Foto de Nota Fiscal**

Envie foto de nota fiscal:

**Fluxo:**
1. 📸 `extract-receipt-data` → GPT-4 Vision
2. 🧾 Extrai: valor, data, estabelecimento, itens
3. 🤖 Categoriza automaticamente
4. ✅ Cria transação

---

## 🔄 FLUXO TÉCNICO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO NO WHATSAPP                      │
│              "Gastei R$ 50 no supermercado"                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     UAZAPI RECEBE                           │
│              (webhook configurado)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ HTTP POST
┌─────────────────────────────────────────────────────────────┐
│         EDGE FUNCTION: process-whatsapp-message             │
│                                                             │
│  1. Identifica usuário (phone_number)                       │
│  2. Salva mensagem no DB (whatsapp_messages)               │
│  3. Detecta intenção (LLM ou regex)                        │
│  4. Roteia para função específica                          │
└────────────────────┬────────────────────────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
   [Comando]   [Lançamento]   [Conversa]
       │             │             │
       ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ execute- │  │categorize│  │   LLM    │
│  quick-  │  │-transac- │  │ response │
│ command  │  │  tion    │  │          │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │
     └─────────────┼──────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│         EDGE FUNCTION: send-whatsapp-message                │
│                                                             │
│  1. Formata mensagem com Ana Clara                         │
│  2. Envia para UAZAPI                                      │
│  3. Salva no histórico                                     │
│  4. Atualiza estatísticas                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ HTTP POST (UAZAPI)
┌─────────────────────────────────────────────────────────────┐
│                  UAZAPI ENVIA MENSAGEM                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              USUÁRIO RECEBE NO WHATSAPP                     │
│       "✅ Lançamento registrado! R$ 50,00 em              │
│        Supermercado - Alimentação"                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 PERSONALIZAR ANA CLARA (OPCIONAL)

### **Configurar Provedor de IA**

1. Acesse: **Settings → IA (Ana Clara)**
2. Selecione provedor (OpenAI, Gemini, Claude, OpenRouter)
3. Insira API Key
4. Escolha modelo
5. **Ajuste temperatura** (0.0-2.0):
   - 0.3 = Respostas mais objetivas
   - 0.7 = Equilíbrio (padrão)
   - 1.2 = Mais criativa
6. **Tom:** Amigável (recomendado)
7. **Estilo:** Média
8. **System Prompt personalizado:**

```
Você é Ana Clara, assistente financeira da Personal Finance LA.
Seja sempre amigável, use emojis ocasionalmente e dê dicas práticas.
Mantenha respostas curtas e objetivas no WhatsApp (máx 200 caracteres).
```

9. Clique "Salvar"

---

## 📊 MONITORAR EM TEMPO REAL

### **No Settings → Integrações → WhatsApp**

**Tab Estatísticas:**
- Total de mensagens (auto-refresh 5min)
- Taxa de sucesso
- Comando mais usado
- Última mensagem

**Tab Histórico:**
- Todas as mensagens trocadas
- Filtros por direção/status/intenção
- Busca por conteúdo
- Realtime updates

**Tab Comandos:**
- Lista dos 8 comandos disponíveis
- Descrição de cada um

---

## 🐛 TROUBLESHOOTING

### **Problema 1: Mensagens não chegam**

**Verificar:**
1. Webhook configurado na UAZAPI? ✅
2. URL correta? (https://...supabase.co/functions/v1/process-whatsapp-message)
3. WhatsApp conectado? (badge verde)
4. Secrets configurados no Supabase? (UAZAPI_TOKEN, UAZAPI_INSTANCE_ID)

**Logs:**
```bash
# Supabase Dashboard → Edge Functions → Logs
# Filtrar por: process-whatsapp-message
```

### **Problema 2: Ana Clara não responde**

**Verificar:**
1. OPENAI_API_KEY configurado?
2. Configuração de IA criada? (Settings → IA)
3. Provedor padrão marcado?
4. API Key validada?

**Logs:**
```bash
# Ver logs da Edge Function categorize-transaction
# Erro comum: "API key invalid"
```

### **Problema 3: Áudio não transcreve**

**Verificar:**
1. OPENAI_API_KEY válida?
2. Formato de áudio suportado? (MP3, M4A, WAV, OGG)
3. Tamanho < 25MB?

**Logs:**
```bash
# Ver logs da Edge Function transcribe-audio
```

### **Problema 4: Foto não processa**

**Verificar:**
1. OPENAI_API_KEY com acesso GPT-4 Vision?
2. Formato de imagem: JPG, PNG, WEBP?
3. Tamanho < 20MB?

**Logs:**
```bash
# Ver logs da Edge Function extract-receipt-data
```

---

## 🔐 SEGURANÇA

### **Recomendações:**

1. **Nunca exponha** as API Keys no frontend
2. **Use sempre** as Edge Functions (server-side)
3. **RLS ativas** em todas as tabelas WhatsApp
4. **Service Role Key** apenas no backend
5. **Rotate secrets** periodicamente

### **Variáveis que devem estar APENAS no Supabase:**

- ✅ UAZAPI_TOKEN
- ✅ UAZAPI_INSTANCE_ID  
- ✅ OPENAI_API_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY

### **Variáveis públicas (frontend .env):**

- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

---

## 💰 CUSTOS ESTIMADOS

### **Por 1000 mensagens:**

**UAZAPI:**
- Envio: Grátis (incluído no plano)
- Recebimento: Grátis

**OpenAI:**
- GPT-4 Turbo (categorização): ~$0.01 por mensagem
- Whisper (áudio): ~$0.006 por minuto
- GPT-4 Vision (nota fiscal): ~$0.02 por imagem

**Total estimado:** $10-15 / 1000 mensagens

### **Otimizações:**

1. **Cache de comandos comuns** (saldo, resumo)
2. **Usar Gemini Pro** (gratuito) para categorizações simples
3. **Fallback sem LLM** quando dados são claros

---

## ✅ CHECKLIST FINAL

Antes de ir para produção:

- [ ] UAZAPI_TOKEN configurado no Supabase
- [ ] UAZAPI_INSTANCE_ID configurado no Supabase
- [ ] OPENAI_API_KEY configurado no Supabase
- [ ] Webhook configurado na UAZAPI
- [ ] WhatsApp conectado (QR Code)
- [ ] Provedor de IA configurado (Settings → IA)
- [ ] Testou comando "saldo"
- [ ] Testou lançamento por texto
- [ ] Testou áudio (opcional)
- [ ] Testou foto (opcional)
- [ ] Histórico aparecendo no Settings
- [ ] Estatísticas atualizando

---

## 🚀 PRÓXIMOS PASSOS

Tudo configurado? Agora você pode:

1. ✅ **Usar no dia a dia** - Envie lançamentos via WhatsApp
2. ✅ **Monitorar estatísticas** - Settings → Integrações
3. ✅ **Personalizar Ana Clara** - Settings → IA
4. ✅ **Configurar notificações** - Settings → Notificações
5. ✅ **Criar webhooks customizados** - Settings → Webhooks
6. ✅ **Partir para FASE 3** - Educação Financeira

---

**🎉 PARABÉNS! SEU WHATSAPP ESTÁ 100% FUNCIONAL!**

Qualquer dúvida, consulte os logs das Edge Functions no Supabase Dashboard.
