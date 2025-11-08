# 🚀 Edge Function: send-bill-reminders

## 📋 Descrição

Edge Function para enviar lembretes automáticos de contas a pagar via WhatsApp.

**Funcionalidade:**
- Busca lembretes pendentes (data=hoje, hora<=atual)
- Envia mensagens via UAZAPI WhatsApp Business
- Atualiza status no database (`sent` ou `failed`)
- Retry automático (até 3 tentativas)

---

## 🔧 Variáveis de Ambiente (Secrets)

Configure no Supabase Dashboard → Settings → Vault:

```bash
CRON_SECRET=<uuid_secreto>
UAZAPI_BASE_URL=https://api.uazapi.com
UAZAPI_INSTANCE_ID=<seu_instance_id>
UAZAPI_API_KEY=<sua_api_key>
```

---

## 🚀 Deploy

### Via CLI:

```bash
# 1. Login
supabase login

# 2. Link projeto
supabase link --project-ref dzbxtdqwfuvcwlnlsdrd

# 3. Deploy function
supabase functions deploy send-bill-reminders

# 4. Configurar secrets
supabase secrets set CRON_SECRET=<seu_uuid>
supabase secrets set UAZAPI_BASE_URL=https://api.uazapi.com
supabase secrets set UAZAPI_INSTANCE_ID=<seu_instance_id>
supabase secrets set UAZAPI_API_KEY=<sua_api_key>
```

---

## 🧪 Teste Manual

```bash
curl -X POST https://dzbxtdqwfuvcwlnlsdrd.supabase.co/functions/v1/send-bill-reminders \
  -H "Authorization: Bearer <anon_key>" \
  -H "x-cron-secret: <cron_secret>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "sent": 0,
  "failed": 0,
  "total": 0,
  "message": "Nenhum lembrete pendente"
}
```

---

## 📊 Logs

Ver logs em tempo real:

```bash
supabase functions logs send-bill-reminders
```

Ou no Dashboard: **Edge Functions** → `send-bill-reminders` → **Logs**

---

## 🔄 CRON Job

Esta function é chamada automaticamente pelo CRON Job:
- **Frequência:** A cada 10 minutos (`*/10 * * * *`)
- **Job Name:** `send-bill-reminders-job`

---

## 🐛 Troubleshooting

### Erro: "Unauthorized"
- Verificar `CRON_SECRET` no Vault
- Verificar header `x-cron-secret` na requisição

### Erro: "UAZAPI credentials not configured"
- Verificar secrets: `UAZAPI_INSTANCE_ID` e `UAZAPI_API_KEY`
- Executar: `supabase secrets list`

### Mensagens não chegam no WhatsApp
- Verificar instância UAZAPI conectada
- Verificar formato do telefone: `5511999999999`
- Ver `error_message` na tabela `bill_reminders`

---

## 📝 Dependencies

- Deno Standard Library (http/server.ts)
- @supabase/supabase-js@2.39.3
- UAZAPI REST API

---

## 🔐 Security

- Function protegida por `CRON_SECRET`
- RLS habilitado na tabela `bill_reminders`
- Secrets gerenciados pelo Supabase Vault
- HTTPS obrigatório

---

## 📈 Performance

- **Limite:** 100 lembretes por execução
- **Timeout:** 60 segundos (padrão Edge Functions)
- **Rate limit:** Depende do plano UAZAPI
- **Retry:** Até 3 tentativas com exponential backoff

---

## 🎯 Próximas Melhorias

- [ ] Suporte a Email (Resend API)
- [ ] Suporte a Push Notifications (Expo)
- [ ] Analytics de entrega (taxa sucesso/falha)
- [ ] Webhook para confirmação de leitura (UAZAPI)
- [ ] Template customizável por usuário
