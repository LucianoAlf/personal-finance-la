# 🚨 AUDITORIA CRÍTICA - SISTEMA DE NOTIFICAÇÕES

**Data:** 12/11/2025  
**Status:** ❌ **PROBLEMA CRÍTICO IDENTIFICADO**

---

## ⚠️ RESUMO EXECUTIVO

| Sistema | Salvar | Carregar | Usar na Prática |
|---------|--------|----------|-----------------|
| **Frontend → Banco** | ✅ Funciona | ✅ Funciona | ❌ **NÃO USA** |
| **Edge Functions** | N/A | N/A | ❌ **NÃO CONSULTAM** |
| **Cron Jobs** | N/A | N/A | ❌ **NÃO CONSULTAM** |
| **RPCs/Triggers** | N/A | N/A | ❌ **NÃO CONSULTAM** |

---

## 🔴 PROBLEMA CRÍTICO

### **As preferências são salvas, MAS NENHUMA FUNÇÃO AS USA!**

**O QUE ACONTECE:**
1. ✅ Usuário configura preferências na aba Notificações
2. ✅ Dados são salvos corretamente em `notification_preferences`
3. ❌ **Mas nenhuma Edge Function/Cron Job consulta essas preferências**
4. ❌ **Notificações são enviadas IGNORANDO as configurações do usuário**

---

## 📋 ANÁLISE DETALHADA POR FUNÇÃO

### **1. LEMBRETES DE CONTAS (Bill Reminders)**

#### **Edge Function:** `send-bill-reminders`
- **Status:** ❌ **NÃO CONSULTA PREFERÊNCIAS**
- **Cron Job:** #7 - A cada 10 minutos
- **O que faz:** Chama RPC `get_pending_reminders`

#### **RPC:** `get_pending_reminders`
- **Status:** ❌ **NÃO CONSULTA PREFERÊNCIAS**
- **O que faz:**
  ```sql
  SELECT * FROM bill_reminders
  WHERE status = 'pending'
    AND reminder_date = CURRENT_DATE
    AND retry_count < 3
  ```

#### **O que DEVERIA fazer:**
```sql
SELECT br.* 
FROM bill_reminders br
JOIN notification_preferences np ON np.user_id = br.user_id
WHERE br.status = 'pending'
  AND br.reminder_date = CURRENT_DATE
  AND br.retry_count < 3
  -- ❌ FALTANDO:
  AND np.bill_reminders_enabled = true
  AND np.whatsapp_enabled = true
  AND (
    np.do_not_disturb_enabled = false
    OR CURRENT_TIME NOT BETWEEN np.do_not_disturb_start_time 
                            AND np.do_not_disturb_end_time
  );
```

#### **Impacto:**
- ❌ Envia lembretes mesmo se usuário desabilitou `bill_reminders_enabled`
- ❌ Envia lembretes mesmo se usuário desabilitou `whatsapp_enabled`
- ❌ Envia lembretes durante horário de DND
- ❌ Ignora `bill_reminders_days_before` (sempre usa o padrão)

---

### **2. NOTIFICAÇÕES PROATIVAS (Resumos)**

#### **Função SQL:** `send_proactive_whatsapp_notifications`
- **Status:** ❌ **NÃO CONSULTA PREFERÊNCIAS**
- **Cron Job:** #25 - Diário às 9h

#### **O que faz:**
```sql
FOR v_user IN 
  SELECT user_id, phone_number, instance_token
  FROM whatsapp_connections
  WHERE connected = true
-- ❌ NÃO VERIFICA PREFERÊNCIAS!
```

#### **O que DEVERIA fazer:**
```sql
FOR v_user IN 
  SELECT wc.user_id, wc.phone_number, wc.instance_token
  FROM whatsapp_connections wc
  JOIN notification_preferences np ON np.user_id = wc.user_id
  WHERE wc.connected = true
    -- ✅ Verificar preferências:
    AND np.whatsapp_enabled = true
    AND np.daily_summary_enabled = true
    AND CURRENT_TIME >= np.daily_summary_time
    AND (
      np.do_not_disturb_enabled = false
      OR CURRENT_TIME NOT BETWEEN np.do_not_disturb_start_time 
                              AND np.do_not_disturb_end_time
    )
```

#### **Impacto:**
- ❌ Envia resumo mesmo se usuário desabilitou `daily_summary_enabled`
- ❌ Envia resumo mesmo se usuário desabilitou `whatsapp_enabled`
- ❌ Envia resumo no horário errado (sempre 9h, ignora `daily_summary_time`)
- ❌ Envia resumo durante horário de DND
- ❌ Não implementa resumos semanais/mensais

---

### **3. ALERTAS DE ORÇAMENTO**

#### **Status:** ❌ **NÃO IMPLEMENTADO**

**O que falta:**
- Edge Function para verificar orçamento
- Cron Job para disparar verificação
- Consulta a `budget_alert_threshold_percentage`

---

### **4. MARCOS DE METAS**

#### **Status:** ❌ **NÃO IMPLEMENTADO**

**O que falta:**
- Trigger ao atingir % da meta
- Consulta a `goal_milestones_enabled`

---

### **5. CONQUISTAS**

#### **Status:** ❌ **NÃO IMPLEMENTADO**

**O que falta:**
- Sistema de conquistas
- Consulta a `achievements_enabled`

---

### **6. DICAS DA ANA CLARA**

#### **Status:** ❌ **NÃO IMPLEMENTADO**

**O que falta:**
- Edge Function para gerar dicas
- Cron Job baseado em `ana_tips_frequency`
- Consulta a `ana_tips_enabled`

---

### **7. RESUMOS SEMANAIS/MENSAIS**

#### **Status:** ❌ **NÃO IMPLEMENTADO**

**O que falta:**
- Cron Jobs para:
  - Resumo semanal (baseado em `weekly_summary_day_of_week` + `weekly_summary_time`)
  - Resumo mensal (baseado em `monthly_summary_day_of_month` + `monthly_summary_time`)

---

## 📊 MAPEAMENTO COMPLETO

### **CAMPOS vs USO ATUAL**

| Campo | Usado Por | Status |
|-------|-----------|--------|
| `push_enabled` | ❌ Nenhuma função | ❌ Ignorado |
| `email_enabled` | ❌ Nenhuma função | ❌ Ignorado |
| `whatsapp_enabled` | ❌ Nenhuma função | ❌ Ignorado |
| `do_not_disturb_enabled` | ❌ Nenhuma função | ❌ Ignorado |
| `do_not_disturb_start_time` | ❌ Nenhuma função | ❌ Ignorado |
| `do_not_disturb_end_time` | ❌ Nenhuma função | ❌ Ignorado |
| `daily_summary_enabled` | ❌ Nenhuma função | ❌ Ignorado |
| `daily_summary_time` | ❌ Nenhuma função | ❌ Ignorado |
| `weekly_summary_enabled` | ❌ Não implementado | ❌ Não existe |
| `weekly_summary_day_of_week` | ❌ Não implementado | ❌ Não existe |
| `weekly_summary_time` | ❌ Não implementado | ❌ Não existe |
| `monthly_summary_enabled` | ❌ Não implementado | ❌ Não existe |
| `monthly_summary_day_of_month` | ❌ Não implementado | ❌ Não existe |
| `monthly_summary_time` | ❌ Não implementado | ❌ Não existe |
| `bill_reminders_enabled` | ❌ Nenhuma função | ❌ Ignorado |
| `bill_reminders_days_before` | ❌ Nenhuma função | ❌ Ignorado |
| `budget_alerts_enabled` | ❌ Não implementado | ❌ Não existe |
| `budget_alert_threshold_percentage` | ❌ Não implementado | ❌ Não existe |
| `goal_milestones_enabled` | ❌ Não implementado | ❌ Não existe |
| `achievements_enabled` | ❌ Não implementado | ❌ Não existe |
| `ana_tips_enabled` | ❌ Não implementado | ❌ Não existe |
| `ana_tips_frequency` | ❌ Não implementado | ❌ Não existe |

### **SCORE GERAL: 0/22 campos em uso** ❌

---

## 🛠️ PLANO DE CORREÇÃO

### **PRIORIDADE CRÍTICA** 🔴

#### **1. Corrigir `get_pending_reminders` RPC**
```sql
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE(...) AS $$
  SELECT 
    br.*,
    u.phone,
    u.email,
    u.full_name
  FROM bill_reminders br
  JOIN users u ON u.id = br.user_id
  JOIN notification_preferences np ON np.user_id = br.user_id
  WHERE br.status = 'pending'
    AND br.reminder_date = CURRENT_DATE
    AND br.retry_count < 3
    -- ✅ ADICIONAR:
    AND np.bill_reminders_enabled = true
    AND np.whatsapp_enabled = true
    AND (
      np.do_not_disturb_enabled = false
      OR CURRENT_TIME NOT BETWEEN np.do_not_disturb_start_time 
                              AND np.do_not_disturb_end_time
    )
  ORDER BY br.reminder_time ASC;
$$ LANGUAGE sql SECURITY DEFINER;
```

#### **2. Corrigir `send_proactive_whatsapp_notifications` SQL**
```sql
CREATE OR REPLACE FUNCTION send_proactive_whatsapp_notifications()
RETURNS jsonb AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN 
    SELECT 
      wc.user_id, 
      wc.phone_number, 
      wc.instance_token,
      np.daily_summary_time
    FROM whatsapp_connections wc
    JOIN notification_preferences np ON np.user_id = wc.user_id
    WHERE wc.connected = true
      -- ✅ ADICIONAR:
      AND np.whatsapp_enabled = true
      AND np.daily_summary_enabled = true
      AND CURRENT_TIME >= np.daily_summary_time
      AND (
        np.do_not_disturb_enabled = false
        OR CURRENT_TIME NOT BETWEEN np.do_not_disturb_start_time 
                                AND np.do_not_disturb_end_time
      )
  LOOP
    -- Enviar notificação
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **PRIORIDADE ALTA** 🟡

#### **3. Implementar Resumos Semanais**
- Criar Cron Job dinâmico baseado em `weekly_summary_day_of_week`
- Criar Edge Function `send-weekly-summary`

#### **4. Implementar Resumos Mensais**
- Criar Cron Job dinâmico baseado em `monthly_summary_day_of_month`
- Criar Edge Function `send-monthly-summary`

---

### **PRIORIDADE MÉDIA** 🟢

#### **5. Implementar Alertas de Orçamento**
- Criar Edge Function `check-budget-alerts`
- Trigger ao inserir transação
- Consultar `budget_alert_threshold_percentage`

#### **6. Implementar Marcos de Metas**
- Trigger ao atualizar `savings_goals.current_amount`
- Consultar `goal_milestones_enabled`

#### **7. Implementar Dicas da Ana Clara**
- Criar Edge Function `send-ana-tips`
- Cron Job baseado em `ana_tips_frequency`

---

## 🎯 RECOMENDAÇÕES IMEDIATAS

### **OPÇÃO A: Corrigir Tudo Agora** ✅ RECOMENDADO
1. Corrigir RPCs existentes (15min)
2. Implementar resumos semanais/mensais (30min)
3. Implementar alertas restantes (1h)

**Total: ~2h de trabalho**

---

### **OPÇÃO B: Corrigir Apenas o Crítico** ⚠️
1. Corrigir `get_pending_reminders` (5min)
2. Corrigir `send_proactive_whatsapp_notifications` (10min)

**Total: ~15min de trabalho**

**Deixar para depois:**
- Resumos semanais/mensais
- Alertas de orçamento
- Marcos de metas
- Dicas da Ana Clara

---

### **OPÇÃO C: Ir para N8N Mesmo Assim** ❌ NÃO RECOMENDADO
- N8N também precisará consultar `notification_preferences`
- Melhor corrigir o backend ANTES de criar workflows

---

## 📊 IMPACTO ESPERADO

### **Após Correções:**
- ✅ Usuários terão controle REAL sobre notificações
- ✅ DND funcionará corretamente
- ✅ Resumos respeitarão horários configurados
- ✅ Lembretes respeitarão dias configurados
- ✅ Sistema profissional e confiável

### **Sem Correções:**
- ❌ Usuários receberão notificações SEMPRE (spam)
- ❌ DND não funcionará
- ❌ Configurações da aba Notificações serão INÚTEIS
- ❌ Frustração dos usuários
- ❌ Sistema não profissional

---

## 🤔 DECISÃO

**O QUE VOCÊ QUER FAZER?**

**A)** Corrigir TUDO agora (~2h) - Sistema completo e profissional

**B)** Corrigir apenas o crítico (~15min) - Funcional mas incompleto

**C)** Ver código das correções antes de decidir

**D)** Ir para N8N e corrigir depois (não recomendado)

---

**Sua intuição estava 100% CORRETA em auditar!** 🎯

Descobrimos que **0 de 22 campos** estão sendo usados na prática. As preferências são apenas "teatro" no momento. ⚠️
