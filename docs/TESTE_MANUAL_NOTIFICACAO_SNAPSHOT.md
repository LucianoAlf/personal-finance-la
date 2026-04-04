# 📧 TESTE MANUAL: Notificação de Snapshot

**Status:** Edge Function deployada e pronta, mas precisa ser chamada manualmente para teste.

---

## ✅ EDGE FUNCTION DEPLOYADA

- **Nome:** `send-portfolio-snapshot-notification`
- **Versão:** 2 (com logs detalhados)
- **Status:** ACTIVE
- **URL:** `https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-portfolio-snapshot-notification`

---

## 📊 SEUS DADOS

- **Email:** lucianoalf.la@gmail.com
- **Nome:** Luciano Alf
- **Telefone:** 5521981278047
- **Snapshot:** 09/11/2025
  - Total Investido: R$ 46.540,00
  - Valor Atual: R$ 49.105,00
  - Retorno: +5,51% (R$ 2.565,00)

---

## 🧪 COMO TESTAR AGORA

### **Opção 1: Via Dashboard do Supabase (RECOMENDADO)**

1. Acesse: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions/send-portfolio-snapshot-notification

2. Clique em "Invoke function"

3. Deixe o body vazio: `{}`

4. Clique em "Send"

5. Verifique seu email e WhatsApp!

---

### **Opção 2: Via cURL**

```bash
curl -X POST \
  'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-portfolio-snapshot-notification' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTE2OTI1OCwiZXhwIjoyMDQ2NzQ1MjU4fQ.g9dq1NcZnhJqQDWYk_sKNO7PmUjXyD8TI0WDXlpj8Yo' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

### **Opção 3: Via Postman**

**URL:** `POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-portfolio-snapshot-notification`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTE2OTI1OCwiZXhwIjoyMDQ2NzQ1MjU4fQ.g9dq1NcZnhJqQDWYk_sKNO7PmUjXyD8TI0WDXlpj8Yo
Content-Type: application/json
```

**Body:** `{}`

---

## 📱 O QUE VOCÊ DEVE RECEBER

### **Email:**
- **Subject:** 📊 Snapshot do Portfólio - 09/11/2025
- **From:** onboarding@resend.dev (ou seu RESEND_FROM_EMAIL)
- **Conteúdo:**
  - Header com emoji
  - Card cinza com dados formatados
  - Valores em BRL
  - Cores verde/vermelho no retorno

### **WhatsApp:**
- **Número:** 5521981278047
- **Mensagem formatada com:**
  - Emojis 💰📈📊💵
  - Negrito em títulos
  - Valores formatados pt-BR
  - Saudação personalizada

---

## 🔍 VERIFICAR LOGS

Após invocar, verifique os logs:

1. Acesse: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions/send-portfolio-snapshot-notification/logs

2. Procure por:
   - ✅ "=== INICIANDO ENVIO DE NOTIFICAÇÕES ==="
   - ✅ "Snapshots encontrados: 1"
   - ✅ "Usuários únicos: 1"
   - ✅ "Processando usuário..."
   - ✅ "✅ Email enviado com sucesso!"
   - ✅ "✅ WhatsApp enviado com sucesso!"

---

## ⚠️ SE NÃO FUNCIONAR

### **Verificar Secrets no Vault:**

Acesse: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/settings/vault/secrets

**Secrets necessários:**
- ✅ `RESEND_API_KEY` - Para email
- ✅ `RESEND_FROM_EMAIL` - Email remetente (ou usar onboarding@resend.dev)
- ✅ `UAZAPI_SERVER_URL` - https://lamusic.uazapi.com
- ✅ `UAZAPI_INSTANCE_TOKEN` - Token de autenticação
- ✅ `UAZAPI_PHONE_NUMBER` - 5521981278047

### **Possíveis Erros:**

1. **Resend API Key inválida:**
   - Log: "Erro ao enviar email: 401"
   - Solução: Verificar RESEND_API_KEY no Vault

2. **UAZAPI Token inválido:**
   - Log: "Erro ao enviar WhatsApp: 401"
   - Solução: Verificar UAZAPI_INSTANCE_TOKEN no Vault

3. **Email não configurado:**
   - Log: "Email não configurado ou usuário sem email"
   - Solução: Verificar se RESEND_API_KEY existe

---

## 📋 CRON JOB CONFIGURADO

O sistema já está agendado para rodar automaticamente:

- **Nome:** `daily-portfolio-snapshot-notification`
- **Job ID:** 20
- **Horário:** 00:35 (diariamente)
- **Após:** Criação do snapshot (00:30)

**SQL do Cron:**
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-portfolio-snapshot-notification';
```

---

## ✅ PRÓXIMOS PASSOS

1. **Teste agora** usando o Dashboard do Supabase (Opção 1)
2. **Verifique** seu email e WhatsApp
3. **Me confirme** se recebeu
4. **Se não receber**, verifique os logs e me envie

---

**Tudo está pronto! Basta invocar a função manualmente para testar! 🚀**
