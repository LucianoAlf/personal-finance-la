# 🚀 DEPLOY PUSH NOTIFICATIONS - INSTRUÇÕES

## ✅ STATUS ATUAL

**Frontend:** 100% Funcionando
- Service Worker registrado
- Subscription criada
- Token salvo no Supabase
- UI completa

**Backend:** Código pronto, falta deploy
- Edge Function atualizada localmente
- VAPID keys configuradas
- Falta apenas fazer deploy

---

## 📝 COMO FAZER O DEPLOY

### **Opção 1: Via CLI (Recomendado)**

```bash
# 1. Fazer login no Supabase
npx supabase login

# 2. Fazer deploy
npx supabase functions deploy send-bill-reminders --project-ref sbnpmhmvcspwcyjhftlw
```

### **Opção 2: Via VS Code Extension**

1. Instalar extensão: **Supabase**
2. Fazer login
3. Clicar com botão direito na pasta `supabase/functions/send-bill-reminders`
4. Selecionar "Deploy Function"

### **Opção 3: Copiar e Colar Manualmente**

Infelizmente o Dashboard do Supabase não permite editar Edge Functions diretamente pela web. Você precisa usar uma das opções acima.

---

## 🧪 COMO TESTAR DEPOIS DO DEPLOY

### **1. Criar Lembrete de Teste (SQL Editor):**

```sql
INSERT INTO bill_reminders (
  bill_id,
  user_id,
  reminder_date,
  reminder_time,
  days_before,
  channel,
  reminder_type,
  status
)
SELECT 
  id AS bill_id,
  user_id,
  current_date_brasilia() AS reminder_date,
  current_time_brasilia() AS reminder_time,
  0 AS days_before,
  'push' AS channel,
  'push' AS reminder_type,
  'pending' AS status
FROM payable_bills
WHERE user_id = (SELECT id FROM users WHERE email = 'lucianoalf.la@gmail.com')
  AND status = 'pending'
LIMIT 1;
```

### **2. Disparar Edge Function Manualmente:**

**Via PowerShell:**
```powershell
$headers = @{
    "x-cron-secret" = "SEU_CRON_SECRET"
    "Content-Type" = "application/json"
}

Invoke-WebRequest -Uri "https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-bill-reminders" -Method POST -Headers $headers
```

**Ou via Postman:**
- URL: `https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-bill-reminders`
- Method: POST
- Headers:
  - `x-cron-secret`: SEU_CRON_SECRET
  - `Content-Type`: application/json

### **3. Verificar Logs:**

```
https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions/send-bill-reminders?tab=logs
```

### **4. Receber Notificação:**

- Abra o app no celular: `http://SEU_IP:5177`
- Faça login
- Ative as notificações em Configurações
- Aguarde a notificação chegar! 📱

---

## 🔧 TROUBLESHOOTING

### **Erro: 401 Unauthorized**
- Verificar se CRON_SECRET está configurado corretamente
- Verificar se VAPID_PRIVATE_KEY e VAPID_SUBJECT estão nos Secrets

### **Erro: Token não encontrado**
- Verificar se o token foi salvo na tabela `push_tokens`
- SQL: `SELECT * FROM push_tokens WHERE user_id = 'SEU_USER_ID';`

### **Notificação não chega:**
- Verificar logs da Edge Function
- Verificar se o Service Worker está ativo no browser
- Verificar se a permissão de notificações está concedida

---

## 📚 ARQUIVOS IMPORTANTES

- **Edge Function:** `supabase/functions/send-bill-reminders/index.ts`
- **Service Worker:** `public/sw.js`
- **Service de Push:** `src/services/pushNotifications.ts`
- **Componente UI:** `src/components/settings/PushNotificationSettings.tsx`
- **VAPID Keys:** `.env.local` (public) e Supabase Secrets (private)

---

## 🎉 RESUMO DO DIA

**Implementado:**
1. ✅ Timezone Brasília (UTC-3)
2. ✅ Apelido "Alf" 
3. ✅ Push Notifications (frontend 100%)
4. ✅ Service Worker
5. ✅ VAPID keys geradas
6. ✅ Tabela push_tokens
7. ✅ Edge Function atualizada (local)

**Pendente:**
- 🔄 Deploy da Edge Function
- 🔄 Teste completo no celular

---

**Boa sorte com o deploy, Alf! Qualquer coisa me chama!** 🚀
