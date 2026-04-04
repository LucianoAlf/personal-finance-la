# ⚡ QUICK START: Lembretes via CRON (30 min)

## 🎯 OBJETIVO
Ativar sistema de lembretes automáticos via WhatsApp em **7 passos rápidos**.

---

## 📋 PASSO 1: SQL - get_pending_reminders (2 min)

1. Abrir: https://supabase.com/dashboard/project/dzbxtdqwfuvcwlnlsdrd/sql
2. Copiar conteúdo de: `supabase/migrations/20251107_get_pending_reminders_function.sql`
3. Colar e executar (RUN)
4. ✅ Ver: `Success. No rows returned`

---

## 📋 PASSO 2: Deploy Edge Function (5 min)

Terminal na raiz do projeto:

```bash
# Login + Link
supabase login
supabase link --project-ref dzbxtdqwfuvcwlnlsdrd

# Deploy
supabase functions deploy send-bill-reminders
```

✅ Ver: `Deployed Function send-bill-reminders`

---

## 📋 PASSO 3: Configurar Secrets (3 min)

```bash
# Gerar UUID aqui: https://www.uuidgenerator.net/
supabase secrets set CRON_SECRET=<cole_o_uuid_gerado>

# UAZAPI (use suas credenciais)
supabase secrets set UAZAPI_BASE_URL=https://api.uazapi.com
supabase secrets set UAZAPI_INSTANCE_ID=<seu_instance_id>
supabase secrets set UAZAPI_API_KEY=<sua_api_key>
```

✅ Ver: `Secrets updated successfully`

---

## 📋 PASSO 4: Ativar pg_cron (1 min)

1. Dashboard → Database → Extensions
2. Buscar: `pg_cron`
3. Clicar: **Enable**

✅ Ver: Status = `Enabled`

---

## 📋 PASSO 5: Criar CRON Job (2 min)

SQL Editor → New query:

```sql
ALTER DATABASE postgres SET cron.search_path = 'public, extensions';

SELECT cron.schedule(
  'send-bill-reminders-job',
  '*/10 * * * *',
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

✅ Ver: `1 row returned | schedule: 1`

---

## 📋 PASSO 6: Criar Lembrete Teste (5 min)

**A) Pegar seu User ID:**
```sql
SELECT id FROM users WHERE email = 'seu_email@example.com';
```

**B) Editar arquivo:**
- Abrir: `supabase/migrations/20251107_create_test_reminder.sql`
- LINHA 10: Substituir `<seu_user_id>` pelo ID copiado
- Salvar

**C) Executar:**
- SQL Editor → New query
- Copiar TODO o conteúdo do arquivo (já editado)
- Executar (RUN)

✅ Ver NOTICES:
```
⏰ Horário do teste: 15:32:00
✅ Conta teste criada: abc123...
✅ 1 lembrete(s) agendado(s) para 15:32:00
```

---

## 📋 PASSO 7: VALIDAR (2 min + aguardar)

**A) Aguardar 2 minutos**

**B) Verificar WhatsApp:**
📱 Mensagem recebida com:
```
🔔 Lembrete Ana Clara
Olá [Seu Nome]! 👋
🟡 Amanhã você tem uma conta a pagar:
📄 🧪 TESTE - Lembrete WhatsApp
💰 Valor: R$ 99,90
...
```

**C) Verificar Database:**
```sql
SELECT status, sent_at FROM bill_reminders 
WHERE id IN (
  SELECT br.id FROM bill_reminders br
  JOIN payable_bills pb ON pb.id = br.bill_id
  WHERE pb.description LIKE '%TESTE%'
)
ORDER BY created_at DESC LIMIT 1;
```

✅ Ver: `status = 'sent'` e `sent_at` preenchido

---

## 🎉 SUCESSO!

Se todos os ✅ apareceram:
- ✅ Sistema funcionando
- ✅ Lembretes sendo enviados automaticamente
- ✅ CRON executando a cada 10 minutos

**Próximo:** Criar lembretes reais pelo frontend! 🚀

---

## 🐛 Deu Erro?

**Mensagem não chegou:**
```sql
SELECT error_message FROM bill_reminders 
WHERE status = 'failed' 
ORDER BY created_at DESC LIMIT 1;
```

**CRON não executou:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-bill-reminders-job')
ORDER BY start_time DESC LIMIT 3;
```

**Ver logs Edge Function:**
```bash
supabase functions logs send-bill-reminders
```

---

## 📚 Documentação Completa

- 📘 `docs/EXECUTAR_LEMBRETES_CRON.md` - Guia detalhado
- 📋 `docs/RESUMO_IMPLEMENTACAO_CRON.md` - Visão geral
- 🧪 `docs/TESTES_LEMBRETES_WHATSAPP.md` - Testes E2E

---

**Tempo total:** ~30 minutos  
**Dificuldade:** ⭐⭐☆☆☆ (Fácil)
