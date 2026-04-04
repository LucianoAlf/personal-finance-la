# 🚀 Guia de Execução: Sistema de Lembretes via CRON

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter:
- ✅ Supabase Project configurado
- ✅ Tabela `bill_reminders` criada (migration já aplicada)
- ✅ Function `schedule_bill_reminders()` criada
- ✅ Frontend com modal de lembretes funcionando
- ✅ Credenciais UAZAPI (Instance ID + API Key)

---

## 📋 FASE 1: Aplicar Migration (5 min)

### Passo 1: Abrir Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/dzbxtdqwfuvcwlnlsdrd
2. Menu lateral → **SQL Editor**
3. Clicar em **New query**

### Passo 2: Executar Migration `get_pending_reminders`

1. Abrir arquivo: `supabase/migrations/20251107_get_pending_reminders_function.sql`
2. Copiar todo o conteúdo
3. Colar no SQL Editor
4. Clicar em **RUN** (Ctrl+Enter)

**Resultado esperado:**
```
Success. No rows returned
```

---

## 📋 FASE 2: Deploy Edge Function (10 min)

### Passo 1: Configurar Secrets no Supabase

1. Supabase Dashboard → **Settings** → **Vault**
2. Adicionar os seguintes secrets:

```
CRON_SECRET = <gerar um UUID em https://www.uuidgenerator.net/>
UAZAPI_BASE_URL = https://api.uazapi.com
UAZAPI_INSTANCE_ID = <seu_instance_id>
UAZAPI_API_KEY = <sua_api_key>
```

### Passo 2: Deploy via CLI

Abra o terminal na raiz do projeto e execute:

```bash
# 1. Login no Supabase
supabase login

# 2. Link com seu projeto
supabase link --project-ref dzbxtdqwfuvcwlnlsdrd

# 3. Deploy da Edge Function
supabase functions deploy send-bill-reminders

# 4. Configurar secrets
supabase secrets set CRON_SECRET=<seu_uuid>
supabase secrets set UAZAPI_BASE_URL=https://api.uazapi.com
supabase secrets set UAZAPI_INSTANCE_ID=<seu_instance_id>
supabase secrets set UAZAPI_API_KEY=<sua_api_key>
```

**Resultado esperado:**
```
✓ Deployed Function send-bill-reminders
✓ Secrets configured
```

### Passo 3: Testar Edge Function Manualmente (OPCIONAL)

```bash
curl -X POST https://dzbxtdqwfuvcwlnlsdrd.supabase.co/functions/v1/send-bill-reminders \
  -H "Authorization: Bearer <seu_anon_key>" \
  -H "x-cron-secret: <seu_cron_secret>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "sent": 0,
  "message": "Nenhum lembrete pendente"
}
```

---

## 📋 FASE 3: Configurar CRON Job (10 min)

### Passo 1: Ativar pg_cron Extension

1. Supabase Dashboard → **Database** → **Extensions**
2. Buscar por `pg_cron`
3. Clicar em **Enable**

### Passo 2: Criar CRON Job

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Copiar e colar o seguinte SQL:

```sql
-- 1. Configurar search_path para pg_cron
ALTER DATABASE postgres SET cron.search_path = 'public, extensions';

-- 2. Criar CRON Job (executa a cada 10 minutos)
SELECT cron.schedule(
  'send-bill-reminders-job',
  '*/10 * * * *',  -- A cada 10 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://dzbxtdqwfuvcwlnlsdrd.supabase.co/functions/v1/send-bill-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
        'x-cron-secret', current_setting('app.settings.cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

3. Clicar em **RUN**

**Resultado esperado:**
```
1 row returned
schedule | 1
```

### Passo 3: Verificar CRON Job Criado

```sql
SELECT * FROM cron.job WHERE jobname = 'send-bill-reminders-job';
```

**Resultado esperado:**
- 1 linha com `jobname = 'send-bill-reminders-job'`
- `schedule = '*/10 * * * *'`
- `active = true`

---

## 📋 FASE 4: Criar Lembrete de Teste (5 min)

### Passo 1: Obter seu User ID

```sql
SELECT id, email, full_name FROM users WHERE email = 'seu_email@example.com';
```

**Copie o `id` retornado.**

### Passo 2: Editar Script de Teste

1. Abrir arquivo: `supabase/migrations/20251107_create_test_reminder.sql`
2. **LINHA 10:** Substituir `<seu_user_id>` pelo ID copiado
3. Salvar arquivo

### Passo 3: Executar Script de Teste

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Copiar todo o conteúdo de `20251107_create_test_reminder.sql` (já editado)
3. Colar no SQL Editor
4. Clicar em **RUN**

**Resultado esperado:**
```
NOTICE: ⏰ Horário do teste: 15:32:00
NOTICE: ✅ Conta teste criada: abc123...
NOTICE: ✅ 1 lembrete(s) agendado(s) para 15:32:00
NOTICE: 
NOTICE: 🎯 PRÓXIMOS PASSOS:
NOTICE: 1. Deploy da Edge Function: ✅ JÁ FEITO
NOTICE: 2. Configurar CRON Job: ✅ JÁ FEITO
NOTICE: 3. Aguardar 2 minutos
NOTICE: 4. CRON executa e envia mensagem WhatsApp
NOTICE: 
NOTICE: 📱 Verificar WhatsApp para mensagem de teste!
```

### Passo 4: Verificar Lembrete Criado

A query no final do script vai retornar:

```
id          | reminder_date | reminder_time | status  | channel  | description
------------|---------------|---------------|---------|----------|--------------------
abc123...   | 2025-11-07    | 15:32:00      | pending | whatsapp | 🧪 TESTE - Lembrete WhatsApp
```

---

## 📋 FASE 5: Validar Envio (5 min)

### Passo 1: Aguardar 2 Minutos

⏰ Aguarde 2 minutos após executar o script de teste.

### Passo 2: Verificar WhatsApp

📱 Abra seu WhatsApp e verifique se recebeu a mensagem:

```
━━━━━━━━━━━━━━━━━━━
🔔 Lembrete Ana Clara

Olá [Seu Nome]! 👋

🟡 Amanhã você tem uma conta a pagar:

📄 🧪 TESTE - Lembrete WhatsApp
💰 Valor: R$ 99,90
📅 Vencimento: 08/11/2025

⏰ Não esqueça!
━━━━━━━━━━━━━━━━━━━
💡 Responda "pago" para marcar como paga
━━━━━━━━━━━━━━━━━━━
```

### Passo 3: Verificar Status no Database

```sql
SELECT 
  br.id,
  br.status,
  br.sent_at,
  br.error_message,
  pb.description
FROM bill_reminders br
JOIN payable_bills pb ON pb.id = br.bill_id
WHERE pb.description LIKE '%TESTE%'
ORDER BY br.created_at DESC
LIMIT 1;
```

**Resultado esperado (após envio):**
```
status = 'sent'
sent_at = '2025-11-07 15:32:15.123...'
error_message = null
```

### Passo 4: Verificar Logs da Edge Function (OPCIONAL)

1. Supabase Dashboard → **Edge Functions** → `send-bill-reminders`
2. Tab **Logs**
3. Verificar logs:

```
✅ Processamento concluído: 1 enviados, 0 falhas
```

---

## 🎯 Checklist de Sucesso

- [ ] ✅ Migration `get_pending_reminders` aplicada
- [ ] ✅ Edge Function `send-bill-reminders` deployed
- [ ] ✅ Secrets configurados no Vault
- [ ] ✅ CRON Job criado e ativo
- [ ] ✅ Lembrete de teste criado
- [ ] ✅ Mensagem WhatsApp RECEBIDA
- [ ] ✅ Status no database = `sent`
- [ ] ✅ Logs da Edge Function OK

---

## 🐛 Troubleshooting

### Problema: Mensagem não chegou

**Verificar:**
1. CRON Job está ativo?
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-bill-reminders-job';
   ```

2. Horário do lembrete está correto?
   ```sql
   SELECT reminder_time, CURRENT_TIME FROM bill_reminders WHERE status = 'pending' LIMIT 1;
   ```

3. Credenciais UAZAPI corretas?
   ```bash
   supabase secrets list
   ```

4. Telefone está no formato correto?
   ```sql
   SELECT phone FROM users WHERE id = '<seu_user_id>';
   -- Deve estar: 5511999999999 (55 + DDD + número)
   ```

### Problema: Status = 'failed'

**Ver erro:**
```sql
SELECT error_message FROM bill_reminders WHERE status = 'failed' ORDER BY created_at DESC LIMIT 1;
```

**Soluções comuns:**
- `Unauthorized`: Verificar UAZAPI_API_KEY
- `Invalid phone`: Corrigir formato do telefone
- `Instance not connected`: Conectar instância no UAZAPI Dashboard

---

## 🎉 Próximos Passos

Após validar o teste:

1. ✅ **Sistema funcionando!**
2. 🔄 Criar lembretes reais pelo frontend
3. 📊 Monitorar envios nos próximos dias
4. 📈 Analisar taxa de sucesso/falha
5. 🚀 Implementar `retry-failed-reminders` (FASE 3 - opcional)

---

## 📞 Suporte

Caso algo não funcione:
1. Verificar logs da Edge Function
2. Executar queries de troubleshooting acima
3. Consultar `TESTES_LEMBRETES_WHATSAPP.md`

**Sistema pronto para produção!** 🚀
