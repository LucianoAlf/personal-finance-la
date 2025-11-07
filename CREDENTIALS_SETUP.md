# 🔐 GUIA DE CONFIGURAÇÃO - CREDENCIAIS

## ⚡ CONFIGURAÇÃO RÁPIDA

### 1️⃣ Arquivo Local (.env.local)

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# Copie o .env.example
cp .env.example .env.local
```

**Conteúdo do .env.local:**
```env
VITE_SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
VITE_SUPABASE_ANON_KEY=<sua_anon_key_aqui>

# As demais variáveis são configuradas no Supabase Dashboard
```

### 2️⃣ Supabase Edge Functions Secrets

**Acesse:** [Supabase Dashboard](https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/settings/functions) > Project Settings > Edge Functions > Secrets

**Adicione os seguintes secrets:**

| Secret Name | Value |
|-------------|-------|
| `CRON_SECRET` | `a55e45f9-f65c-4290-b89b-4a832c71c455` |
| `RESEND_API_KEY` | `re_2LWckZTk_2G9b8Fk8xai5JPapXZ8qvtHQ` |
| `OPENAI_API_KEY` | `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` |
| `UAZAPI_SERVER_URL` | `https://lamusic.uazapi.com` |
| `UAZAPI_INSTANCE_TOKEN` | `a934aae2-e480-4874-9acc-8124773fe523` |
| `UAZAPI_PHONE_NUMBER` | `5521981278047` |

---

## 📋 DETALHES DAS CREDENCIAIS

### 🔒 CRON_SECRET
- **Uso:** Autenticar chamadas dos cron jobs para Edge Functions
- **Funções:** `cron-generate-bills`, `send-reminders`
- **Formato:** UUID v4

### 📧 Resend (Email)
- **Uso:** Envio de emails de lembretes
- **Função:** `send-reminders`
- **Documentação:** https://resend.com/docs
- **From:** `lembretes@financela.app`

### 🤖 OpenAI (GPT-4)
- **Uso:** Insights financeiros com Ana Clara (Fase 3 - Dia 13)
- **Função:** `generate-bill-insights`
- **Modelo:** GPT-4
- **Documentação:** https://platform.openai.com/docs

### 💬 UAZAPI (WhatsApp)
- **Uso:** Envio de lembretes via WhatsApp (Fase 3 - Dia 14)
- **Função:** `send-reminders`, `whatsapp-webhook`
- **Número conectado:** +55 21 98127-8047
- **Documentação:** https://uazapi.com/docs

---

## ✅ VERIFICAÇÃO

### Testar Edge Functions:

```bash
# Testar geração de contas recorrentes
curl -X POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/cron-generate-bills \
  -H "Authorization: Bearer a55e45f9-f65c-4290-b89b-4a832c71c455" \
  -H "Content-Type: application/json"

# Testar envio de lembretes
curl -X POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer a55e45f9-f65c-4290-b89b-4a832c71c455" \
  -H "Content-Type: application/json"
```

### Verificar Secrets no Supabase:

1. Acesse o Dashboard
2. Project Settings > Edge Functions
3. Verifique se todos os 6 secrets estão listados
4. Secrets nunca mostram o valor (segurança)

---

## 🚨 SEGURANÇA

- ✅ `.env.local` está no `.gitignore` (NUNCA comitar)
- ✅ Secrets do Supabase são criptografados
- ✅ CRON_SECRET valida chamadas não-autorizadas
- ✅ API Keys rotacionáveis (regenerar se comprometer)

---

## 🔄 TROUBLESHOOTING

### Erro: "Unauthorized" no Edge Function
**Solução:** Verificar se CRON_SECRET está correto no Supabase Secrets

### Erro: "RESEND_API_KEY not found"
**Solução:** Adicionar secret no Dashboard e redeployar função

### Erro: "Invalid OpenAI API Key"
**Solução:** Verificar quota da API em https://platform.openai.com/usage

### Erro: WhatsApp não envia
**Solução:** 
1. Verificar se instância UAZAPI está ativa
2. Testar conexão: https://lamusic.uazapi.com/health
3. Verificar créditos da conta

---

## 📞 SUPORTE

- **Resend:** support@resend.com
- **OpenAI:** https://help.openai.com
- **UAZAPI:** suporte via dashboard
- **Supabase:** https://supabase.com/dashboard/support

---

**Status:** ✅ Credenciais configuradas e prontas para uso nas Fases 2 e 3!
