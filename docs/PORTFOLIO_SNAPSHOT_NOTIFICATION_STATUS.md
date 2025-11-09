# 📊 STATUS: Portfolio Snapshot Notification

**Data:** 09 Nov 2025  
**Hora:** 14:20 BRT

---

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Edge Function Criada e Deployada**
- **Nome:** `send-portfolio-snapshot-notification`
- **ID:** `bb4a5751-033c-4964-aead-c22773841713`
- **Status:** ACTIVE
- **Versão:** 1

### 2. **Funcionalidades**

#### 📧 **Email via Resend**
- Template HTML profissional
- Dados formatados:
  - Total Investido
  - Valor Atual
  - Retorno (com cor verde/vermelho)
  - Dividendos YTD
  - Dividend Yield
- From: `RESEND_FROM_EMAIL` (configurável no Vault)
- Subject: "📊 Snapshot do Portfólio - [data]"

#### 📱 **WhatsApp via UAZAPI**
- Mensagem formatada com emojis
- Mesmos dados do email
- Formatação pt-BR
- Usa credenciais do Vault:
  - `UAZAPI_SERVER_URL`
  - `UAZAPI_INSTANCE_TOKEN`
  - `UAZAPI_PHONE_NUMBER`

### 3. **Cron Job Configurado**
- **Nome:** `daily-portfolio-snapshot-notification`
- **ID:** 20
- **Horário:** 00:35 (5 minutos após o snapshot ser criado)
- **Frequência:** Diária
- **Status:** ATIVO

---

## ⚠️ PROBLEMA IDENTIFICADO

### **Status Code: 401 Unauthorized**

**Causa:**
A Edge Function foi deployada com `verify_jwt: true`, o que significa que ela requer autenticação JWT válida.

**Tentativas realizadas:**
1. ✅ Request 426 - Teste inicial (401)
2. ✅ Request 428 - Teste com service_role_key (401)

**Por que está falhando:**
O Supabase está rejeitando as chamadas porque a função está configurada para verificar JWT, mas o cron job não está passando um token válido.

---

## 🔧 SOLUÇÃO NECESSÁRIA

### **Opção 1: Desabilitar verify_jwt (RECOMENDADO)**

Redesployar a função com `verify_jwt: false` e validar manualmente dentro da função.

### **Opção 2: Configurar Authorization correta no Cron**

Garantir que o cron job passe o `service_role_key` correto no header Authorization.

---

## 📋 CREDENCIAIS NECESSÁRIAS (Vault Secrets)

Todas as credenciais abaixo já estão configuradas no Supabase Vault:

✅ `RESEND_API_KEY` - Para envio de emails  
✅ `RESEND_FROM_EMAIL` - Email remetente  
✅ `UAZAPI_SERVER_URL` - URL do servidor UAZAPI  
✅ `UAZAPI_INSTANCE_TOKEN` - Token de autenticação  
✅ `UAZAPI_PHONE_NUMBER` - Número do WhatsApp  

---

## 🧪 TESTES REALIZADOS

### **1. Snapshot Creation (✅ SUCESSO)**
- Request ID: 419
- Status: 200 OK
- Snapshot criado para 1 usuário
- Data: 2025-11-09

### **2. Notification Sending (❌ FALHA)**
- Request ID: 426, 428
- Status: 401 Unauthorized
- Motivo: verify_jwt habilitado

---

## 📊 DADOS DO SNAPSHOT CRIADO

```sql
SELECT * FROM portfolio_snapshots 
WHERE snapshot_date = '2025-11-09'
ORDER BY created_at DESC;
```

**Resultado:**
- **Total Investido:** R$ 46.540,00
- **Valor Atual:** R$ 49.105,00
- **Retorno:** R$ 2.565,00 (+5,51%)
- **Usuários:** 1

---

## 🎯 PRÓXIMOS PASSOS

1. **Aguardar seu retorno** sobre se recebeu email/WhatsApp
2. Se não recebeu:
   - Redesployar função sem `verify_jwt`
   - Testar novamente
3. Verificar logs da UAZAPI e Resend para confirmar envio

---

## 📝 LOGS IMPORTANTES

### **Edge Function Logs:**
- Timestamp: 1762708712352 (14:18:32 BRT)
- Status: 401
- Execution time: 74ms

### **Cron Jobs Ativos:**
- Job 19: `daily-portfolio-snapshot` (00:30)
- Job 20: `daily-portfolio-snapshot-notification` (00:35)

---

## ✅ COMMIT REALIZADO

**Commit:** `d967f49`  
**Mensagem:** "feat: adicionar notificacao de snapshot via email e whatsapp"

**Arquivos:**
- `supabase/functions/send-portfolio-snapshot-notification/index.ts`
- `src/components/investments/TransactionTimeline.tsx`
- `docs/DEBUG_PORTFOLIO_SNAPSHOTS.md`

---

**Status:** ⏳ Aguardando confirmação do usuário sobre recebimento das notificações
