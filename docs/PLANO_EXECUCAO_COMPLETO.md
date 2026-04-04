# 🚀 PLANO DE EXECUÇÃO COMPLETO - SISTEMA 100%

**Data:** 12/11/2024 21:15  
**Status Atual:** 40% Completo (4/10 tarefas)  
**Tempo Restante Estimado:** 2-3 horas

---

## ✅ JÁ IMPLEMENTADO (40%)

### **1. send-proactive-notifications** ✅
- ✅ Arrays de orçamento (`budget_alert_thresholds`)
- ✅ Cooldown (`budget_alert_cooldown_hours`)
- ✅ Log de notificações
- ✅ DND com dias da semana

### **2. send-daily-summary** ✅
- ✅ Criada do zero
- ✅ Verifica `daily_summary_days_of_week`
- ✅ Verifica `daily_summary_time`
- ✅ DND integrado
- ✅ Resumo de transações

---

## 🔨 FALTA IMPLEMENTAR (60%)

### **TAREFA 3: send-weekly-summary (30min)**

**Arquivo:** `supabase/functions/send-weekly-summary/index.ts`

**Copiar de:** `send-daily-summary`  
**Adaptar:**
- Buscar transações da semana (últimos 7 dias)
- Verificar `weekly_summary_days_of_week` array
- Verificar `weekly_summary_time`
- Comparar com semana anterior

**Mensagem:**
```
📊 *RESUMO SEMANAL*

Olá [Nome]! 👋

Resumo dos últimos 7 dias:

💵 *Receitas:* R$ X
💸 *Despesas:* R$ Y
💰 *Saldo:* R$ Z

📊 *Comparação:*
Semana passada: R$ W
Variação: +5.2% 📈

✅ _Você está economizando mais!_
```

---

### **TAREFA 4: send-monthly-summary (30min)**

**Arquivo:** `supabase/functions/send-monthly-summary/index.ts`

**Copiar de:** `send-daily-summary`  
**Adaptar:**
- Buscar transações do mês (firstDay - lastDay)
- Verificar `monthly_summary_days_of_month` array
- Verificar `monthly_summary_time`
- Comparar com mês anterior
- Incluir top 5 categorias

**Mensagem:**
```
📊 *RESUMO MENSAL - [MÊS]*

Olá [Nome]! 👋

Fechamento do mês:

💵 *Receitas:* R$ X
💸 *Despesas:* R$ Y
💰 *Saldo:* R$ Z

📈 *Top 5 Categorias:*
1. Alimentação: R$ A
2. Transporte: R$ B
3. Moradia: R$ C
4. Saúde: R$ D
5. Lazer: R$ E

📊 vs Mês passado: -3.5% 🎯
```

---

### **TAREFA 5: send-ana-tips (45min)**

**Arquivo:** `supabase/functions/send-ana-tips/index.ts`

**Copiar de:** `send-daily-summary`  
**Adaptar:**
- Verificar `ana_tips_frequency` (daily/weekly/monthly)
- Verificar `ana_tips_day_of_week` (se weekly)
- Verificar `ana_tips_day_of_month` (se monthly)
- Verificar `ana_tips_time`
- Chamar LLM (OpenAI/Gemini) para gerar dica personalizada

**Lógica:**
```typescript
const frequency = user.ana_tips_frequency || 'daily';

if (frequency === 'daily') {
  // Enviar todo dia no horário configurado
} else if (frequency === 'weekly') {
  // Enviar só no dia da semana configurado
  if (currentDay !== user.ana_tips_day_of_week) continue;
} else if (frequency === 'monthly') {
  // Enviar só no dia do mês configurado
  const dayOfMonth = now.getDate();
  if (dayOfMonth !== user.ana_tips_day_of_month) continue;
}
```

**Mensagem (gerada por IA):**
```
💡 *DICA DA ANA CLARA*

Olá [Nome]! 👋

Percebi que você gastou R$ 450 em alimentação essa semana. Que tal preparar refeições em casa alguns dias? Você pode economizar até R$ 200 por mês!

💚 _Ana Clara - Sua assistente financeira_
```

**Integração LLM:**
```typescript
async function generateTip(userContext: any) {
  const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é Ana Clara, assistente financeira amigável. Gere dicas curtas e práticas baseadas nos dados do usuário.'
        },
        {
          role: 'user',
          content: `Contexto: ${JSON.stringify(userContext)}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

### **TAREFA 6: Adicionar DND nas outras 3 Edge Functions (15min cada)**

**Arquivos a modificar:**
1. `send-overdue-bill-alerts/index.ts`
2. `send-low-balance-alerts/index.ts`
3. `send-investment-summary/index.ts`

**Código a adicionar (no início do loop):**
```typescript
// Verificar DND
const { data: preferences } = await supabase
  .from('notification_preferences')
  .select('do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
  .eq('user_id', user.user_id)
  .single();

if (preferences?.do_not_disturb_enabled) {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentDay = now.getDay();
  
  const dndStart = preferences.do_not_disturb_start_time || '22:00';
  const dndEnd = preferences.do_not_disturb_end_time || '08:00';
  const dndDays = preferences.do_not_disturb_days_of_week || [];

  const isDNDDay = dndDays.length === 0 || dndDays.includes(currentDay);
  
  let isInDNDTime = false;
  if (dndStart < dndEnd) {
    isInDNDTime = currentTime >= dndStart || currentTime < dndEnd;
  } else {
    isInDNDTime = currentTime >= dndStart && currentTime < dndEnd;
  }

  if (isDNDDay && isInDNDTime) {
    console.log(`[FUNÇÃO] ⏸️ Usuário ${user.user_id} em DND`);
    continue;
  }
}
```

---

### **TAREFA 7: Criar Trigger para Large Transactions (15min)**

**Arquivo:** `supabase/migrations/20241112_trigger_large_transactions.sql`

```sql
-- Trigger para alertar transações grandes
CREATE OR REPLACE FUNCTION notify_large_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold numeric;
  v_enabled boolean;
  v_url text;
  v_response text;
BEGIN
  -- Buscar preferências do usuário
  SELECT 
    large_transaction_threshold,
    large_transaction_alerts_enabled
  INTO v_threshold, v_enabled
  FROM notification_preferences
  WHERE user_id = NEW.user_id;

  -- Verificar se alerta está habilitado e valor excede threshold
  IF v_enabled AND ABS(NEW.amount) >= v_threshold THEN
    -- URL da Edge Function
    v_url := current_setting('app.settings.supabase_url', true) || 
             '/functions/v1/send-large-transaction-alerts';
    
    -- Chamar Edge Function via http (requer extensão http)
    -- Alternativa: inserir em fila de notificações
    INSERT INTO notifications_queue (
      user_id,
      type,
      payload,
      status
    ) VALUES (
      NEW.user_id,
      'large_transaction',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'amount', NEW.amount,
        'description', NEW.description,
        'category', NEW.category,
        'date', NEW.date
      ),
      'pending'
    );
    
    RAISE NOTICE 'Large transaction alert queued for user %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_large_transaction_alert ON transactions;
CREATE TRIGGER trigger_large_transaction_alert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_large_transaction();

-- Criar tabela de fila de notificações (se não existir)
CREATE TABLE IF NOT EXISTS notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_queue_status 
ON notifications_queue(status, created_at) 
WHERE status = 'pending';
```

**Alternativa Simples (sem fila):**
- Modificar `send-large-transaction-alerts` para buscar transações recentes
- Rodar via Cron a cada 5 minutos

---

### **TAREFA 8: Configurar 4 novos Cron Jobs (via pg_cron)**

**Via SQL Editor no Supabase:**

```sql
-- 1. Resumo Diário (20:00)
SELECT cron.schedule(
  'daily-summary',
  '0 20 * * *',
  $$
  SELECT 
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-daily-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  $$
);

-- 2. Resumo Semanal (18:00 diário, verifica dia internamente)
SELECT cron.schedule(
  'weekly-summary',
  '0 18 * * *',
  $$
  SELECT 
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-weekly-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  $$
);

-- 3. Resumo Mensal (10:00 diário, verifica dia internamente)
SELECT cron.schedule(
  'monthly-summary',
  '0 10 * * *',
  $$
  SELECT 
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-monthly-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  $$
);

-- 4. Dicas da Ana (10:00 diário, verifica frequência internamente)
SELECT cron.schedule(
  'ana-tips',
  '0 10 * * *',
  $$
  SELECT 
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-ana-tips',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  $$
);
```

---

### **TAREFA 9: Deploy de 4 Edge Functions**

```bash
# Via terminal
cd d:/2025/CURSO VIBE CODING/personal-finance-la

supabase functions deploy send-weekly-summary
supabase functions deploy send-monthly-summary
supabase functions deploy send-ana-tips

# Atualizar send-proactive-notifications
supabase functions deploy send-proactive-notifications
supabase functions deploy send-daily-summary
```

---

### **TAREFA 10: Testes de Validação**

**Checklist:**
1. ✅ Salvar preferências no frontend
2. ✅ Verificar se arrays são salvos no banco
3. ✅ Invocar Edge Functions manualmente:
   ```bash
   curl -X POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-daily-summary \
     -H "Authorization: Bearer ANON_KEY"
   ```
4. ✅ Verificar logs no Supabase Dashboard
5. ✅ Confirmar recebimento via WhatsApp

---

## 📊 RESUMO EXECUTIVO

| Tarefa | Tempo | Complexidade | Status |
|--------|-------|--------------|--------|
| 1. Atualizar send-proactive-notifications | 30min | Média | ✅ Completo |
| 2. Criar send-daily-summary | 30min | Média | ✅ Completo |
| 3. Criar send-weekly-summary | 30min | Baixa | ⏳ Pendente |
| 4. Criar send-monthly-summary | 30min | Baixa | ⏳ Pendente |
| 5. Criar send-ana-tips | 45min | Alta | ⏳ Pendente |
| 6. Adicionar DND (3x) | 45min | Baixa | ⏳ Pendente |
| 7. Criar trigger large tx | 15min | Baixa | ⏳ Pendente |
| 8. Configurar Cron Jobs | 15min | Baixa | ⏳ Pendente |
| 9. Deploy Edge Functions | 10min | Baixa | ⏳ Pendente |
| 10. Testes de validação | 30min | Média | ⏳ Pendente |
| **TOTAL** | **4h** | - | **20% Completo** |

---

## 🎯 PRÓXIMOS PASSOS

1. **Criar as 3 Edge Functions faltantes** (usando send-daily-summary como template)
2. **Adicionar DND nas 3 Edge Functions antigas**
3. **Criar trigger de transações grandes**
4. **Configurar 4 Cron Jobs via pg_cron**
5. **Deploy de tudo**
6. **Testar end-to-end**

---

## 🚀 COMANDO RÁPIDO PARA CONTINUAR

```bash
# Copiar template para as 3 funções
cp supabase/functions/send-daily-summary/index.ts supabase/functions/send-weekly-summary/index.ts
cp supabase/functions/send-daily-summary/index.ts supabase/functions/send-monthly-summary/index.ts
cp supabase/functions/send-daily-summary/index.ts supabase/functions/send-ana-tips/index.ts

# Editar cada uma adaptando a lógica
# ... (seguir instruções acima)

# Deploy
supabase functions deploy send-weekly-summary
supabase functions deploy send-monthly-summary
supabase functions deploy send-ana-tips
supabase functions deploy send-proactive-notifications
supabase functions deploy send-daily-summary

# Configurar Cron Jobs via SQL Editor
# ... (executar SQL acima)
```

---

**Status Final:** Sistema 40% completo. Faltam 2-3h de trabalho para 100%.
