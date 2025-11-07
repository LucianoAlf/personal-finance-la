# 🤖 N8N Workflows - Lembretes via WhatsApp

## 📋 Visão Geral

2 workflows N8N para automação completa de lembretes via WhatsApp:

1. **Send Bill Reminders** - Executa a cada 10 minutos, envia lembretes pendentes
2. **Retry Failed Reminders** - Executa a cada 30 minutos, retenta falhas com exponential backoff

---

## 🚀 Setup Rápido

### 1. Pré-requisitos

✅ N8N instalado (Cloud ou Self-hosted)  
✅ Supabase Database configurado  
✅ UAZAPI API Key + Instance ID  
✅ Credenciais configuradas no N8N

### 2. Importar Workflows

**Via N8N UI:**
1. Abra N8N → Workflows
2. Clique em "Import from File"
3. Importe os 2 arquivos JSON:
   - `workflow_send_bill_reminders.json`
   - `workflow_retry_failed_reminders.json`
4. Ative os workflows

**Via N8N CLI:**
```bash
n8n import:workflow --input=workflow_send_bill_reminders.json
n8n import:workflow --input=workflow_retry_failed_reminders.json
```

### 3. Configurar Credenciais

#### PostgreSQL (Supabase)
```
Host: db.xxx.supabase.co
Database: postgres
Port: 5432
User: postgres
Password: <sua_service_role_key>
SSL: Enable
```

**Obter conexão:**
```bash
# Supabase Dashboard → Project Settings → Database → Connection String
# Formato: postgresql://postgres:[password]@db.[project_ref].supabase.co:5432/postgres
```

#### Variáveis de Ambiente (N8N)

**Via .env:**
```env
# UAZAPI
UAZAPI_BASE_URL=https://api.uazapi.com
UAZAPI_INSTANCE_ID=sua_instancia_id
UAZAPI_API_KEY=sua_api_key

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

**Via N8N UI:**
1. Settings → Environments
2. Adicionar as variáveis acima

---

## 📊 Workflow 1: Send Bill Reminders

### Fluxo de Execução

```
[Schedule: */10 * * * *] → A cada 10 minutos
    ↓
[Query Pending Reminders] → Busca do Supabase
    ↓
[Has Reminders?] → Verifica se retornou dados
    ↓ (true)
[Format Message] → Monta mensagem WhatsApp
    ↓
[Switch Channel] → Roteia por canal
    ↓ (WhatsApp)
[Send WhatsApp UAZAPI] → HTTP POST
    ↓
[Update Success/Failed] → Atualiza status no DB
```

### Query SQL do Workflow

```sql
SELECT 
  br.id as reminder_id,
  br.bill_id,
  br.user_id,
  br.days_before,
  br.channel,
  u.phone as user_phone,
  u.email as user_email,
  u.full_name as user_name,
  u.push_token,
  pb.description,
  pb.amount,
  pb.due_date,
  pb.provider_name
FROM bill_reminders br
INNER JOIN users u ON br.user_id = u.id
INNER JOIN payable_bills pb ON br.bill_id = pb.id
WHERE br.reminder_date = CURRENT_DATE
  AND br.reminder_time <= CURRENT_TIME + INTERVAL '10 minutes'
  AND br.status = 'pending'
  AND pb.status NOT IN ('paid', 'cancelled')
ORDER BY br.reminder_time
LIMIT 50;
```

**Explicação:**
- Busca lembretes para HOJE
- Horário <= agora + 10min (tolerância)
- Status pending (não enviado ainda)
- Conta não paga/cancelada
- Máximo 50 por execução

### Template WhatsApp

```
━━━━━━━━━━━━━━━━━━━
🔔 *Lembrete Ana Clara*

Olá {nome}! 👋

{contexto_tempo} você tem uma conta a pagar:

📄 *{descrição}*
💰 Valor: R$ {valor}
📅 Vencimento: {data}
🏢 Fornecedor: {fornecedor}

{urgência}

━━━━━━━━━━━━━━━━━━━
💡 Responda "pago" para marcar como paga
━━━━━━━━━━━━━━━━━━━
```

**Variáveis dinâmicas:**
- `{contexto_tempo}`: "Amanhã (DD/MM)" ou "HOJE"
- `{urgência}`: "⏰ Não esqueça!" ou "⚠️ Vence hoje!"

### UAZAPI HTTP Request

**Endpoint:**
```
POST https://api.uazapi.com/v1/instance/{instance_id}/messages/send
```

**Headers:**
```json
{
  "apiKey": "<UAZAPI_API_KEY>",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "phone": "5511999999999",
  "message": "🔔 Lembrete Ana Clara...",
  "isGroup": false
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "messageId": "3EB0xxx",
  "queuedAt": "2025-11-07T12:00:00Z"
}
```

### Atualização de Status

**Sucesso:**
```sql
UPDATE bill_reminders
SET status = 'sent', 
    sent_at = now(),
    metadata = metadata || jsonb_build_object(
      'message_id', '<messageId>',
      'sent_via', 'n8n_workflow'
    )
WHERE id = '<reminder_id>';
```

**Falha:**
```sql
UPDATE bill_reminders
SET status = 'failed',
    retry_count = retry_count + 1,
    error_message = '<error>',
    metadata = metadata || jsonb_build_object(
      'last_error', '<error>',
      'failed_at', '<timestamp>'
    )
WHERE id = '<reminder_id>';
```

---

## ⚡ Workflow 2: Retry Failed Reminders

### Fluxo de Execução

```
[Schedule: */30 * * * *] → A cada 30 minutos
    ↓
[Query Failed Reminders] → Busca falhas com retry < 3
    ↓
[Has Failed?] → Verifica se tem falhas
    ↓ (true)
[Check Backoff Time] → Exponential backoff
    ↓
[Should Retry Now?] → Compara tempo decorrido
    ↓ (true)
[Format Retry Message] → Monta mensagem
    ↓
[Retry Send WhatsApp] → Tenta enviar novamente
    ↓
[Update Retry Success/Failed] → Atualiza status
```

### Exponential Backoff

| Tentativa | Aguardar | Total Acumulado |
|-----------|----------|-----------------|
| 1ª falha  | 10 min   | 10 min          |
| 2ª falha  | 30 min   | 40 min          |
| 3ª falha  | 60 min   | 100 min         |
| Após 3x   | DESISTE  | -               |

**Lógica (JavaScript Code Node):**
```javascript
const retryCount = $input.item.json.retry_count;
const minutesSinceLastRetry = Math.floor(
  (new Date() - new Date($input.item.json.updated_at)) / 60000
);

const backoffMinutes = retryCount === 0 ? 10 : retryCount === 1 ? 30 : 60;
const shouldRetry = minutesSinceLastRetry >= backoffMinutes;

return {
  json: {
    ...$input.item.json,
    should_retry: shouldRetry,
    backoff_minutes: backoffMinutes,
    minutes_since_retry: minutesSinceLastRetry
  }
};
```

### Query SQL do Retry

```sql
SELECT 
  br.id as reminder_id,
  br.bill_id,
  br.retry_count,
  br.error_message,
  -- ... outros campos
FROM bill_reminders br
INNER JOIN users u ON br.user_id = u.id
INNER JOIN payable_bills pb ON br.bill_id = pb.id
WHERE br.status = 'failed'
  AND br.retry_count < 3
  AND br.reminder_date = CURRENT_DATE
  AND pb.status NOT IN ('paid', 'cancelled')
ORDER BY br.retry_count, br.updated_at
LIMIT 20;
```

---

## 🧪 Como Testar

### 1. Testar Workflow Manualmente

**No N8N:**
1. Abra o workflow "Send Bill Reminders"
2. Clique em "Execute Workflow"
3. Veja os logs em tempo real
4. Verifique se mensagem foi enviada

### 2. Criar Lembrete de Teste

```sql
-- Inserir conta de teste
INSERT INTO payable_bills (user_id, description, amount, due_date, bill_type, status)
VALUES (
  '<seu_user_id>',
  'Teste Lembrete WhatsApp',
  100.00,
  CURRENT_DATE + 1,  -- Vence amanhã
  'other',
  'pending'
)
RETURNING id;

-- Agendar lembrete para daqui 5 minutos
SELECT schedule_bill_reminders(
  '<bill_id_retornado>',
  '<seu_user_id>',
  ARRAY[0],  -- No dia
  ARRAY['<hora_atual_+_5_min>']::time[],
  ARRAY['whatsapp']
);

-- Verificar criação
SELECT * FROM bill_reminders 
WHERE bill_id = '<bill_id>' 
ORDER BY created_at DESC LIMIT 1;
```

### 3. Simular Falha e Retry

```sql
-- Forçar falha manualmente
UPDATE bill_reminders
SET status = 'failed',
    retry_count = 1,
    error_message = 'Teste manual de retry',
    updated_at = now() - INTERVAL '15 minutes'  -- Simular que já passou tempo
WHERE id = '<reminder_id>';

-- Aguardar workflow Retry executar (30min)
-- Ou executar manualmente no N8N
```

### 4. Verificar Logs

**No N8N:**
- Executions → Ver histórico de execuções
- Clicar na execução → Ver detalhes de cada nó

**No Supabase:**
```sql
-- Lembretes enviados hoje
SELECT * FROM bill_reminders
WHERE sent_at::date = CURRENT_DATE
ORDER BY sent_at DESC;

-- Taxa de sucesso
SELECT 
  channel,
  COUNT(*) FILTER (WHERE status = 'sent') as enviados,
  COUNT(*) FILTER (WHERE status = 'failed') as falhas,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent')::decimal / NULLIF(COUNT(*), 0) * 100,
    2
  ) as taxa_sucesso_pct
FROM bill_reminders
WHERE created_at >= CURRENT_DATE - 7
GROUP BY channel;
```

---

## ⚙️ Configurações Avançadas

### Ajustar Frequência

**Send Reminders (padrão: 10min):**
```
Cron: */10 * * * *
```

Opções:
- `*/5 * * * *` → A cada 5 minutos (mais responsivo)
- `*/15 * * * *` → A cada 15 minutos (menos load)
- `0 * * * *` → A cada hora cheia (:00)

**Retry (padrão: 30min):**
```
Cron: */30 * * * *
```

### Limitar Execuções

**Evitar sobrecarga:**
- Workflow Send: `LIMIT 50` (máx 50 lembretes/execução)
- Workflow Retry: `LIMIT 20` (máx 20 retries/execução)

**Se tiver muitos usuários:**
- Aumentar frequência (ex: */5)
- Ou aumentar LIMIT (ex: 100)

### Monitoring e Alertas

**Criar workflow de alerta:**
```sql
-- Query para detectar muitas falhas
SELECT COUNT(*) as failed_today
FROM bill_reminders
WHERE status = 'failed'
  AND created_at::date = CURRENT_DATE;

-- Se failed_today > 10:
--   Enviar alerta para admin
```

---

## 🐛 Troubleshooting

### Problema: Lembretes não sendo enviados

**Checklist:**
1. ✅ Workflow está ativo?
2. ✅ Credenciais Supabase corretas?
3. ✅ UAZAPI_API_KEY válida?
4. ✅ Query retorna dados?
5. ✅ Usuário tem `phone` cadastrado?
6. ✅ Conta não está paga/cancelada?

**Debug:**
```sql
-- Ver execuções do N8N
-- No N8N UI → Executions → Filtrar erros

-- Ver lembretes pendentes
SELECT * FROM bill_reminders
WHERE status = 'pending'
  AND reminder_date = CURRENT_DATE;
```

### Problema: UAZAPI retorna erro 401

**Causa:** API Key inválida ou expirada

**Solução:**
1. Verificar UAZAPI_API_KEY no .env
2. Gerar nova key no painel UAZAPI
3. Atualizar credencial no N8N

### Problema: Query retorna 0 resultados

**Causa:** Horário ou data errados

**Debug:**
```sql
-- Verificar timezone
SELECT 
  CURRENT_DATE as data_servidor,
  CURRENT_TIME as hora_servidor,
  now() as timestamp_completo;

-- Verificar lembretes futuros
SELECT * FROM bill_reminders
WHERE reminder_date >= CURRENT_DATE
  AND status = 'pending'
ORDER BY reminder_date, reminder_time;
```

### Problema: Retry infinito (não para após 3x)

**Causa:** Query de retry não filtra `retry_count < 3`

**Solução:** Verificar WHERE clause no Query Failed Reminders

---

## 📈 Métricas Recomendadas

**Dashboard no N8N ou Grafana:**
- Total de lembretes enviados/dia
- Taxa de sucesso por canal
- Tempo médio de processamento
- Quantidade de retries por dia
- Top 5 erros mais frequentes

**Query agregada:**
```sql
SELECT 
  DATE(created_at) as data,
  channel,
  status,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds_to_send
FROM bill_reminders
WHERE created_at >= CURRENT_DATE - 30
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;
```

---

**Pronto para Produção!** 🚀  
**Suporte:** Verifique logs N8N e Supabase para debugging
