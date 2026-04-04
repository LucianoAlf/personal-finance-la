# 📱 Sistema de Lembretes Flexível - Bill Reminders

## 📋 Visão Geral

Sistema completo de lembretes para contas a pagar com suporte a:
- ✅ **Múltiplos lembretes** por conta (configurável)
- ✅ **Horários customizados** para cada lembrete
- ✅ **Multi-canal** (WhatsApp, Email, Push, SMS)
- ✅ **Retry automático** (até 3 tentativas)
- ✅ **Status tracking** em tempo real

---

## 🗃️ Estrutura do Banco

### Tabela: `bill_reminders`

```sql
CREATE TABLE bill_reminders (
  id uuid PRIMARY KEY,
  bill_id uuid REFERENCES payable_bills(id),
  user_id uuid REFERENCES users(id),
  
  -- Agendamento
  reminder_date date,          -- Data do lembrete
  reminder_time time,          -- Horário (ex: 09:00, 14:30)
  days_before integer,         -- Quantos dias antes do vencimento (0-30)
  
  -- Canal
  channel text,                -- 'whatsapp' | 'email' | 'push' | 'sms'
  
  -- Status
  status text,                 -- 'pending' | 'sent' | 'failed' | 'cancelled'
  sent_at timestamp,
  
  -- Retry
  retry_count integer,         -- 0 a 3
  error_message text,
  
  -- Metadata
  metadata jsonb,
  
  -- Auditoria
  created_at timestamp,
  updated_at timestamp,
  
  CONSTRAINT unique_bill_reminder UNIQUE (bill_id, reminder_date, reminder_time, channel)
);
```

### Índices de Performance

```sql
-- Buscar lembretes pendentes (N8N workflow)
idx_bill_reminders_pending: (reminder_date, reminder_time, status) WHERE status = 'pending'

-- Buscar falhas para retry
idx_bill_reminders_retry: (status, retry_count, reminder_date) WHERE status = 'failed'

-- Filtros gerais
idx_bill_reminders_user: (user_id)
idx_bill_reminders_bill: (bill_id)
idx_bill_reminders_channel: (channel)
```

---

## 🔧 Function SQL: `schedule_bill_reminders`

### Assinatura

```sql
schedule_bill_reminders(
  p_bill_id uuid,
  p_user_id uuid,
  p_days_before integer[],  -- Array de dias
  p_times time[],           -- Array de horários (mesmo tamanho que days_before)
  p_channels text[]         -- Array de canais
) RETURNS integer
```

### Comportamento

1. **Validações:**
   - Arrays não podem ser vazios
   - `p_days_before` e `p_times` devem ter mesmo tamanho
   - Conta deve existir

2. **Limpeza:**
   - Deleta lembretes `pending` anteriores da mesma conta
   - Permite re-agendar sem duplicação

3. **Criação:**
   - Para cada dia + horário + canal = 1 lembrete
   - **Exemplo:** 3 dias x 2 canais = 6 lembretes
   - Só cria para datas/horários futuros

4. **Retorno:**
   - Quantidade de lembretes criados

### Exemplos de Uso

#### Exemplo 1: Setup Simples (1 dia antes, 9h, WhatsApp)
```sql
SELECT schedule_bill_reminders(
  '123e4567-e89b-12d3-a456-426614174000',  -- bill_id
  'user-uuid-here',
  ARRAY[1],                                  -- 1 dia antes
  ARRAY['09:00']::time[],                   -- às 9h
  ARRAY['whatsapp']                         -- via WhatsApp
);
-- Retorna: 1
```

#### Exemplo 2: Setup Completo (múltiplos lembretes)
```sql
SELECT schedule_bill_reminders(
  'bill-uuid',
  'user-uuid',
  ARRAY[7, 3, 1, 0],                        -- 7d, 3d, 1d, no dia
  ARRAY['09:00', '09:00', '14:00', '08:00']::time[],
  ARRAY['whatsapp', 'email']                -- 2 canais
);
-- Retorna: 8 (4 dias x 2 canais)
```

#### Exemplo 3: Cancelar todos os lembretes
```sql
DELETE FROM bill_reminders
WHERE bill_id = 'bill-uuid' AND status = 'pending';
```

---

## 🧪 Como Testar

### 1. Aplicar Migration

```bash
# Via Supabase CLI
supabase db push

# Ou executar manualmente no SQL Editor
# Copiar conteúdo de: 20251107_bill_reminders_system.sql
```

### 2. Executar Testes

```bash
# Executar seed de teste
# Arquivo: 20251107_bill_reminders_test_data.sql
```

**Resultado esperado:**
```
NOTICE: Teste 1 - Aluguel: 8 lembretes criados (esperado: 8)
NOTICE: Teste 2 - Netflix: 1 lembrete criado (esperado: 1)
NOTICE: Teste 3 - Conta vencida: 0 lembretes criados (esperado: 0)

NOTICE: Total de lembretes criados: 9
NOTICE: Lembretes pendentes: 9
NOTICE: Canais WhatsApp: 6
NOTICE: Canais Email: 3
```

### 3. Visualizar Lembretes Criados

```sql
SELECT 
  pb.description as conta,
  pb.due_date as vencimento,
  br.days_before as dias_antes,
  br.reminder_date as data_lembrete,
  to_char(br.reminder_time, 'HH24:MI') as horario,
  br.channel as canal,
  br.status
FROM bill_reminders br
JOIN payable_bills pb ON pb.id = br.bill_id
ORDER BY br.reminder_date, br.reminder_time;
```

### 4. Testar Retry Logic

```sql
-- Simular falha
UPDATE bill_reminders
SET status = 'failed', retry_count = 1
WHERE id = '<reminder_id>';

-- Verificar índice de retry
EXPLAIN ANALYZE
SELECT * FROM bill_reminders
WHERE status = 'failed'
  AND retry_count < 3
  AND reminder_date >= CURRENT_DATE;
```

---

## 🔄 Integração com N8N

### Workflow: Send Bill Reminders (Schedule 09:00)

**Query para buscar lembretes pendentes:**
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
  AND br.reminder_time <= CURRENT_TIME + INTERVAL '5 minutes'
  AND br.status = 'pending'
  AND pb.status NOT IN ('paid', 'cancelled')
ORDER BY br.reminder_time
LIMIT 100;
```

**Atualizar status após envio:**
```sql
-- Sucesso
UPDATE bill_reminders
SET status = 'sent', sent_at = now()
WHERE id = '<reminder_id>';

-- Falha
UPDATE bill_reminders
SET status = 'failed', 
    retry_count = retry_count + 1,
    error_message = '<error>'
WHERE id = '<reminder_id>';
```

---

## 📊 Métricas e Monitoramento

### Queries Úteis

**Taxa de sucesso geral:**
```sql
SELECT 
  channel,
  COUNT(*) FILTER (WHERE status = 'sent') as enviados,
  COUNT(*) FILTER (WHERE status = 'failed') as falhas,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent')::decimal / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as taxa_sucesso_pct
FROM bill_reminders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY channel;
```

**Lembretes agendados futuros:**
```sql
SELECT 
  reminder_date,
  channel,
  COUNT(*) as total
FROM bill_reminders
WHERE status = 'pending'
  AND reminder_date >= CURRENT_DATE
GROUP BY reminder_date, channel
ORDER BY reminder_date;
```

**Top erros:**
```sql
SELECT 
  error_message,
  channel,
  COUNT(*) as occurrences
FROM bill_reminders
WHERE status = 'failed'
  AND error_message IS NOT NULL
GROUP BY error_message, channel
ORDER BY occurrences DESC
LIMIT 10;
```

---

## 🔐 Segurança (RLS)

Policies ativas:
- ✅ `Users can view own bill_reminders` (SELECT)
- ✅ `Users can insert own bill_reminders` (INSERT)
- ✅ `Users can update own bill_reminders` (UPDATE)
- ✅ `Users can delete own bill_reminders` (DELETE)

**Importante:** 
- N8N usa `SECURITY DEFINER` function para bypass RLS
- Service Role Key não é afetado por RLS
- Frontend usa autenticação normal (RLS ativo)

---

## 🚀 Próximos Passos

1. ✅ Migration aplicada
2. ✅ Function testada
3. ⏳ N8N workflow configurado
4. ⏳ Frontend UI implementada
5. ⏳ UAZAPI integration

---

## 📞 Troubleshooting

### Problema: Function retorna 0 lembretes

**Causas possíveis:**
1. Conta já venceu (`due_date < CURRENT_DATE`)
2. Horários no passado
3. Constraint UNIQUE impedindo duplicação

**Solução:**
```sql
-- Verificar conta
SELECT due_date, status FROM payable_bills WHERE id = '<bill_id>';

-- Verificar lembretes existentes
SELECT * FROM bill_reminders WHERE bill_id = '<bill_id>';
```

### Problema: Lembretes não aparecem no N8N

**Verificar:**
1. `reminder_date = CURRENT_DATE`
2. `reminder_time <= CURRENT_TIME`
3. `status = 'pending'`
4. Conta não está paga/cancelada

---

**Autor:** Equipe de Desenvolvimento  
**Data:** 07/11/2025  
**Versão:** 1.0
