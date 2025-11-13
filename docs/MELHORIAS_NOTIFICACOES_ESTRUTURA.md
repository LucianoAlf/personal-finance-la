# 🎯 MELHORIAS ESTRUTURAIS - SISTEMA DE NOTIFICAÇÕES

**Data:** 12/11/2025  
**Objetivo:** Revisar e melhorar ESTRUTURA antes de implementar

---

## 🔍 ANÁLISE POR SEÇÃO

### **1. CANAIS DE NOTIFICAÇÃO** ✅

#### **Status Atual:**
```typescript
- push_enabled: boolean
- email_enabled: boolean
- whatsapp_enabled: boolean
```

#### **Limitações:**
- ✅ OK - Simples e funcional

#### **Melhorias Propostas:**
- ✅ **Manter como está**
- Adicionar campo `sms_enabled` para futuro (opcional)

---

### **2. MODO NÃO PERTURBE** ⚠️

#### **Status Atual:**
```typescript
- do_not_disturb_enabled: boolean
- do_not_disturb_start_time: time
- do_not_disturb_end_time: time
```

#### **Limitações:**
❌ **Só permite UM período DND por dia**
- E se o usuário quiser DND em horários diferentes?
- Ex: 12h-14h (almoço) + 22h-08h (noite)

#### **Melhorias Propostas:**

**OPÇÃO A: Múltiplos Períodos DND** (Complexo)
```sql
-- Nova tabela
CREATE TABLE notification_dnd_periods (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- [0,1,2,3,4,5,6]
  enabled BOOLEAN DEFAULT true
);
```

**OPÇÃO B: Manter Simples** ✅ RECOMENDADO
- Manter um único período DND
- Adicionar campo `dnd_days_of_week INTEGER[]`
- Permite DND apenas em dias específicos
- Ex: Só silenciar nos finais de semana

```sql
ALTER TABLE notification_preferences
ADD COLUMN do_not_disturb_days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}';
```

**DECISÃO:** Opção B (simples e funcional)

---

### **3. RESUMOS AUTOMÁTICOS** ✅⚠️

#### **3.1 Resumo Diário**

**Status Atual:**
```typescript
- daily_summary_enabled: boolean
- daily_summary_time: time
```

**Limitações:**
- ✅ OK - Simples e funcional

**Melhorias:**
- Adicionar `daily_summary_days_of_week INTEGER[]`
- Ex: Resumo só em dias úteis

---

#### **3.2 Resumo Semanal**

**Status Atual:**
```typescript
- weekly_summary_enabled: boolean
- weekly_summary_day_of_week: integer (0-6)
- weekly_summary_time: time
```

**Limitações:**
- ⚠️ Só permite UM dia por semana
- E se quiser resumo 2x por semana?

**Melhorias:**
```sql
ALTER TABLE notification_preferences
ADD COLUMN weekly_summary_days_of_week INTEGER[] DEFAULT '{0}';
-- Remove: weekly_summary_day_of_week
```

---

#### **3.3 Resumo Mensal**

**Status Atual:**
```typescript
- monthly_summary_enabled: boolean
- monthly_summary_day_of_month: integer (1-28)
- monthly_summary_time: time
```

**Limitações:**
- ⚠️ Só permite UM dia por mês
- E se quiser: dia 1 (início) + dia 15 (meio)?

**Melhorias:**
```sql
ALTER TABLE notification_preferences
ADD COLUMN monthly_summary_days_of_month INTEGER[] DEFAULT '{1}';
-- Remove: monthly_summary_day_of_month
```

---

### **4. LEMBRETES DE CONTAS** ❌ **CRÍTICO**

#### **Status Atual:**
```typescript
- bill_reminders_enabled: boolean
- bill_reminders_days_before: integer
```

#### **Limitações:**
❌ **SÓ PERMITE UM LEMBRETE!**
- Usuário quer: 7 dias antes, 3 dias antes, 1 dia antes, no dia
- Sistema atual: IMPOSSÍVEL!

#### **Melhorias Propostas:**

**OPÇÃO A: Array Simples** ✅ RECOMENDADO
```sql
ALTER TABLE notification_preferences
ADD COLUMN bill_reminders_days_before INTEGER[] DEFAULT '{3,1,0}';
-- Remove: bill_reminders_days_before (singular)

-- Exemplo de valores:
-- [7, 3, 1, 0] = 7 dias antes, 3 dias, 1 dia, no dia
-- [1, 0] = 1 dia antes + no dia
-- [0] = Apenas no dia
```

**OPÇÃO B: Tabela Separada com Horários** (Muito Complexo)
```sql
CREATE TABLE bill_reminder_schedules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  days_before INTEGER,
  time TIME,
  channel TEXT,
  enabled BOOLEAN
);
```

**DECISÃO:** Opção A (array simples, flexível)

**Adicional:**
```sql
-- Horário fixo para TODOS os lembretes
ALTER TABLE notification_preferences
ADD COLUMN bill_reminders_time TIME DEFAULT '09:00';
```

---

### **5. ALERTA DE ORÇAMENTO** ⚠️

#### **Status Atual:**
```typescript
- budget_alerts_enabled: boolean
- budget_alert_threshold_percentage: integer (50-100)
```

#### **Limitações:**
- ⚠️ Só permite UM threshold (ex: 80%)
- E se quiser alertas em: 50%, 80%, 90%, 100%?

#### **Melhorias Propostas:**

**OPÇÃO A: Múltiplos Thresholds** ✅ RECOMENDADO
```sql
ALTER TABLE notification_preferences
ADD COLUMN budget_alert_thresholds INTEGER[] DEFAULT '{80,100}';
-- Remove: budget_alert_threshold_percentage (singular)

-- Exemplo:
-- [50, 80, 100] = Avisar aos 50%, 80% e 100%
-- [90] = Avisar apenas aos 90%
```

**OPÇÃO B: Granular por Categoria** (Muito Complexo)
```sql
CREATE TABLE budget_alert_rules (
  id UUID PRIMARY KEY,
  user_id UUID,
  category_id UUID,
  threshold INTEGER,
  enabled BOOLEAN
);
```

**DECISÃO:** Opção A (array simples)

**Adicional:**
```sql
-- Cooldown para não enviar muitos alertas
ALTER TABLE notification_preferences
ADD COLUMN budget_alert_cooldown_hours INTEGER DEFAULT 24;
-- Ex: Após avisar sobre 80%, esperar 24h antes de avisar novamente
```

---

### **6. MARCOS DE METAS** ⚠️

#### **Status Atual:**
```typescript
- goal_milestones_enabled: boolean
```

#### **Limitações:**
- ⚠️ On/Off simples demais
- Quais marcos notificar? 25%? 50%? 75%? 100%?

#### **Melhorias Propostas:**
```sql
ALTER TABLE notification_preferences
ADD COLUMN goal_milestone_percentages INTEGER[] DEFAULT '{25,50,75,100}';

-- Exemplo:
-- [25, 50, 75, 100] = Avisar em cada marco
-- [50, 100] = Avisar apenas no meio e fim
-- [100] = Avisar apenas quando concluir
```

---

### **7. DICAS DA ANA CLARA** ⚠️

#### **Status Atual:**
```typescript
- ana_tips_enabled: boolean
- ana_tips_frequency: 'daily' | 'weekly' | 'monthly'
```

#### **Limitações:**
- ⚠️ Falta horário
- ⚠️ Frequência muito rígida

#### **Melhorias Propostas:**
```sql
ALTER TABLE notification_preferences
ADD COLUMN ana_tips_time TIME DEFAULT '10:00';
ADD COLUMN ana_tips_day_of_week INTEGER DEFAULT 1; -- Para frequency=weekly
ADD COLUMN ana_tips_day_of_month INTEGER DEFAULT 1; -- Para frequency=monthly
```

---

### **8. NOVOS ALERTAS SUGERIDOS** 💡

#### **8.1 Alerta de Conta Vencida** (Novo)
```sql
ALTER TABLE notification_preferences
ADD COLUMN overdue_bill_alerts_enabled BOOLEAN DEFAULT true;
ADD COLUMN overdue_bill_alert_days INTEGER[] DEFAULT '{1,3,7}';
-- Avisar 1, 3 e 7 dias APÓS vencimento
```

#### **8.2 Alerta de Saldo Baixo** (Novo)
```sql
ALTER TABLE notification_preferences
ADD COLUMN low_balance_alerts_enabled BOOLEAN DEFAULT false;
ADD COLUMN low_balance_threshold NUMERIC DEFAULT 100.00;
-- Avisar se saldo < R$ 100
```

#### **8.3 Alerta de Grande Transação** (Novo)
```sql
ALTER TABLE notification_preferences
ADD COLUMN large_transaction_alerts_enabled BOOLEAN DEFAULT false;
ADD COLUMN large_transaction_threshold NUMERIC DEFAULT 1000.00;
-- Avisar se transação > R$ 1000
```

#### **8.4 Resumo de Investimentos** (Novo)
```sql
ALTER TABLE notification_preferences
ADD COLUMN investment_summary_enabled BOOLEAN DEFAULT false;
ADD COLUMN investment_summary_frequency TEXT DEFAULT 'weekly';
ADD COLUMN investment_summary_day_of_week INTEGER DEFAULT 5; -- Sexta
ADD COLUMN investment_summary_time TIME DEFAULT '18:00';
```

---

## 📊 ESTRUTURA PROPOSTA FINAL

### **Nova Tabela `notification_preferences`:**

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  
  -- ========== CANAIS ==========
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  
  -- ========== DND ==========
  do_not_disturb_enabled BOOLEAN DEFAULT false,
  do_not_disturb_start_time TIME DEFAULT '22:00',
  do_not_disturb_end_time TIME DEFAULT '08:00',
  do_not_disturb_days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- ✅ NOVO
  
  -- ========== RESUMOS ==========
  -- Diário
  daily_summary_enabled BOOLEAN DEFAULT true,
  daily_summary_time TIME DEFAULT '20:00',
  daily_summary_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- ✅ NOVO: Só dias úteis
  
  -- Semanal
  weekly_summary_enabled BOOLEAN DEFAULT true,
  weekly_summary_days_of_week INTEGER[] DEFAULT '{0}', -- ✅ MODIFICADO: Array
  weekly_summary_time TIME DEFAULT '09:00',
  
  -- Mensal
  monthly_summary_enabled BOOLEAN DEFAULT true,
  monthly_summary_days_of_month INTEGER[] DEFAULT '{1}', -- ✅ MODIFICADO: Array
  monthly_summary_time TIME DEFAULT '09:00',
  
  -- ========== LEMBRETES DE CONTAS ==========
  bill_reminders_enabled BOOLEAN DEFAULT true,
  bill_reminders_days_before INTEGER[] DEFAULT '{3,1,0}', -- ✅ MODIFICADO: Array
  bill_reminders_time TIME DEFAULT '09:00', -- ✅ NOVO
  
  -- ========== ALERTAS DE ORÇAMENTO ==========
  budget_alerts_enabled BOOLEAN DEFAULT true,
  budget_alert_thresholds INTEGER[] DEFAULT '{80,100}', -- ✅ MODIFICADO: Array
  budget_alert_cooldown_hours INTEGER DEFAULT 24, -- ✅ NOVO
  
  -- ========== METAS ==========
  goal_milestones_enabled BOOLEAN DEFAULT true,
  goal_milestone_percentages INTEGER[] DEFAULT '{25,50,75,100}', -- ✅ NOVO
  
  -- ========== CONQUISTAS ==========
  achievements_enabled BOOLEAN DEFAULT true,
  
  -- ========== DICAS DA ANA ==========
  ana_tips_enabled BOOLEAN DEFAULT true,
  ana_tips_frequency TEXT DEFAULT 'weekly',
  ana_tips_time TIME DEFAULT '10:00', -- ✅ NOVO
  ana_tips_day_of_week INTEGER DEFAULT 1, -- ✅ NOVO
  ana_tips_day_of_month INTEGER DEFAULT 1, -- ✅ NOVO
  
  -- ========== NOVOS ALERTAS ==========
  overdue_bill_alerts_enabled BOOLEAN DEFAULT true, -- ✅ NOVO
  overdue_bill_alert_days INTEGER[] DEFAULT '{1,3,7}', -- ✅ NOVO
  
  low_balance_alerts_enabled BOOLEAN DEFAULT false, -- ✅ NOVO
  low_balance_threshold NUMERIC DEFAULT 100.00, -- ✅ NOVO
  
  large_transaction_alerts_enabled BOOLEAN DEFAULT false, -- ✅ NOVO
  large_transaction_threshold NUMERIC DEFAULT 1000.00, -- ✅ NOVO
  
  investment_summary_enabled BOOLEAN DEFAULT false, -- ✅ NOVO
  investment_summary_frequency TEXT DEFAULT 'weekly', -- ✅ NOVO
  investment_summary_day_of_week INTEGER DEFAULT 5, -- ✅ NOVO
  investment_summary_time TIME DEFAULT '18:00', -- ✅ NOVO
  
  -- ========== METADATA ==========
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📱 MELHORIAS NA UI

### **Lembretes de Contas - Antes:**
```tsx
<Input
  type="number"
  min={1}
  max={30}
  value={billReminderDays} // ❌ Apenas UM valor
/>
```

### **Lembretes de Contas - Depois:**
```tsx
<div className="space-y-2">
  <Label>Quando enviar lembretes?</Label>
  <div className="flex flex-wrap gap-2">
    {[7, 5, 3, 1, 0].map((days) => (
      <Checkbox
        key={days}
        checked={billReminderDays.includes(days)}
        onCheckedChange={(checked) => {
          if (checked) {
            setBillReminderDays([...billReminderDays, days].sort((a,b) => b-a));
          } else {
            setBillReminderDays(billReminderDays.filter(d => d !== days));
          }
        }}
        label={days === 0 ? 'No dia' : `${days} dias antes`}
      />
    ))}
  </div>
  
  <Label>Horário dos lembretes</Label>
  <Input type="time" value={billRemindersTime} />
</div>
```

---

## 🎯 COMPARAÇÃO

| Recurso | Antes | Depois |
|---------|-------|--------|
| **DND** | 1 período | 1 período + dias da semana |
| **Resumo Diário** | Todos os dias | Escolher dias da semana |
| **Resumo Semanal** | 1 dia/semana | Múltiplos dias |
| **Resumo Mensal** | 1 dia/mês | Múltiplos dias |
| **Lembretes** | 1 lembrete | Múltiplos lembretes + horário |
| **Alerta Orçamento** | 1 threshold | Múltiplos thresholds |
| **Marcos Metas** | On/Off | Escolher % (25, 50, 75, 100) |
| **Dicas Ana** | Frequência | Frequência + dia + horário |
| **Alertas Novos** | 0 | +4 tipos |

---

## ✅ PRÓXIMOS PASSOS

### **OPÇÃO A: Implementar TUDO Agora** ✅ RECOMENDADO
1. Criar migration para alterar tabela
2. Atualizar types TypeScript
3. Atualizar UI (checkboxes, inputs de horário)
4. Implementar Edge Functions
5. Testar tudo

**Tempo estimado:** 3-4 horas

---

### **OPÇÃO B: Implementar Gradualmente**
1. Fase 1: Lembretes múltiplos (crítico)
2. Fase 2: Alertas de orçamento múltiplos
3. Fase 3: Resumos com dias configuráveis
4. Fase 4: Novos alertas

**Tempo estimado:** Distribuído em dias

---

### **OPÇÃO C: MVP Simples**
Implementar apenas:
- Lembretes múltiplos
- Alerta de orçamento múltiplos
- Horário dos lembretes

Deixar para depois:
- Novos alertas
- Arrays de dias da semana

**Tempo estimado:** 1-2 horas

---

## 🤔 DECISÃO

**O QUE VOCÊ ACHA?**

**A)** Implementar estrutura COMPLETA agora (3-4h) - Sistema robusto e profissional

**B)** MVP com melhorias críticas (1-2h) - Rápido mas incompleto

**C)** Revisar proposta antes de implementar - Ajustar algo?

---

**Sua visão de UX está corretíssima!** Um único valor para lembretes é muito limitante. Com arrays, o usuário pode personalizar EXATAMENTE como quer receber as notificações. 🎯
