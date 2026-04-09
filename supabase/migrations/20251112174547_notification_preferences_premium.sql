-- Migration: Sistema Premium de Notificações
-- Data: 12/11/2024
-- Autor: Sistema Personal Finance LA
-- Descrição: Adiciona arrays, novos alertas, horários configuráveis

-- ============================================
-- ETAPA 1: ADICIONAR NOVOS CAMPOS (Arrays)
-- ============================================

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS do_not_disturb_days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS daily_summary_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS weekly_summary_days_of_week INTEGER[] DEFAULT '{0}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS monthly_summary_days_of_month INTEGER[] DEFAULT '{1}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS bill_reminders_days_before_array INTEGER[] DEFAULT '{3,1,0}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS bill_reminders_time TIME DEFAULT '09:00';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS budget_alert_thresholds INTEGER[] DEFAULT '{80,100}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS budget_alert_cooldown_hours INTEGER DEFAULT 24;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS goal_milestone_percentages INTEGER[] DEFAULT '{25,50,75,100}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS ana_tips_time TIME DEFAULT '10:00';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS ana_tips_day_of_week INTEGER DEFAULT 1;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS ana_tips_day_of_month INTEGER DEFAULT 1;

-- ============================================
-- ETAPA 2: NOVOS ALERTAS
-- ============================================

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS overdue_bill_alerts_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS overdue_bill_alert_days INTEGER[] DEFAULT '{1,3,7}';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS low_balance_alerts_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS low_balance_threshold NUMERIC DEFAULT 100.00;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS large_transaction_alerts_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS large_transaction_threshold NUMERIC DEFAULT 1000.00;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS investment_summary_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS investment_summary_frequency TEXT DEFAULT 'weekly';

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS investment_summary_day_of_week INTEGER DEFAULT 5;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS investment_summary_time TIME DEFAULT '18:00';

-- ============================================
-- ETAPA 3: COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN notification_preferences.do_not_disturb_days_of_week IS 'Dias da semana para DND (0=Dom, 6=Sáb)';
COMMENT ON COLUMN notification_preferences.daily_summary_days_of_week IS 'Dias da semana para resumo diário';
COMMENT ON COLUMN notification_preferences.weekly_summary_days_of_week IS 'Múltiplos dias para resumo semanal';
COMMENT ON COLUMN notification_preferences.monthly_summary_days_of_month IS 'Múltiplos dias do mês para resumo';
COMMENT ON COLUMN notification_preferences.bill_reminders_days_before_array IS 'Array: [7,3,1,0] = múltiplos lembretes';
COMMENT ON COLUMN notification_preferences.bill_reminders_time IS 'Horário fixo para todos os lembretes';
COMMENT ON COLUMN notification_preferences.budget_alert_thresholds IS 'Array: [50,80,90,100] = múltiplos avisos';
COMMENT ON COLUMN notification_preferences.budget_alert_cooldown_hours IS 'Horas de espera entre alertas';
COMMENT ON COLUMN notification_preferences.goal_milestone_percentages IS 'Array: [25,50,75,100] = marcos a avisar';
COMMENT ON COLUMN notification_preferences.overdue_bill_alert_days IS 'Array: [1,3,7] = avisar após N dias de atraso';
COMMENT ON COLUMN notification_preferences.low_balance_threshold IS 'Avisar se saldo < valor';
COMMENT ON COLUMN notification_preferences.large_transaction_threshold IS 'Avisar se transação > valor';

-- ============================================
-- ETAPA 4: MIGRAR DADOS ANTIGOS PARA ARRAYS
-- ============================================

UPDATE notification_preferences
SET weekly_summary_days_of_week = ARRAY[weekly_summary_day_of_week]
WHERE weekly_summary_day_of_week IS NOT NULL
  AND weekly_summary_days_of_week = '{0}';

UPDATE notification_preferences
SET monthly_summary_days_of_month = ARRAY[monthly_summary_day_of_month]
WHERE monthly_summary_day_of_month IS NOT NULL
  AND monthly_summary_days_of_month = '{1}';

UPDATE notification_preferences
SET bill_reminders_days_before_array = ARRAY[bill_reminders_days_before]
WHERE bill_reminders_days_before IS NOT NULL
  AND bill_reminders_days_before_array = '{3,1,0}';

UPDATE notification_preferences
SET budget_alert_thresholds = ARRAY[budget_alert_threshold_percentage]
WHERE budget_alert_threshold_percentage IS NOT NULL
  AND budget_alert_thresholds = '{80,100}';

-- ============================================
-- ETAPA 5: VALIDAÇÕES (Constraints)
-- ============================================

ALTER TABLE notification_preferences
ADD CONSTRAINT check_dnd_days_valid
CHECK (
  do_not_disturb_days_of_week <@ ARRAY[0,1,2,3,4,5,6]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_daily_days_valid
CHECK (
  daily_summary_days_of_week <@ ARRAY[0,1,2,3,4,5,6]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_weekly_days_valid
CHECK (
  weekly_summary_days_of_week <@ ARRAY[0,1,2,3,4,5,6]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_monthly_days_valid
CHECK (
  monthly_summary_days_of_month <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_bill_days_valid
CHECK (
  bill_reminders_days_before_array <@ ARRAY[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_budget_thresholds_valid
CHECK (
  budget_alert_thresholds <@ ARRAY[50,60,70,75,80,85,90,95,100]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_goal_percentages_valid
CHECK (
  goal_milestone_percentages <@ ARRAY[10,25,50,75,90,100]
);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_low_balance_positive
CHECK (low_balance_threshold >= 0);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_large_transaction_positive
CHECK (large_transaction_threshold >= 0);

ALTER TABLE notification_preferences
ADD CONSTRAINT check_cooldown_reasonable
CHECK (budget_alert_cooldown_hours BETWEEN 1 AND 168);

-- ============================================
-- ETAPA 6: ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notif_prefs_whatsapp_enabled
ON notification_preferences(user_id)
WHERE whatsapp_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_daily_summary
ON notification_preferences(user_id)
WHERE daily_summary_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_bill_reminders
ON notification_preferences(user_id)
WHERE bill_reminders_enabled = true;

-- ============================================
-- FINALIZAÇÃO
-- ============================================

UPDATE notification_preferences
SET updated_at = NOW()
WHERE updated_at IS NOT NULL;
-- Migration: Sistema Premium de Notificações
-- Data: 12/11/2024

-- ADICIONAR NOVOS CAMPOS
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS do_not_disturb_days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS daily_summary_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}',
ADD COLUMN IF NOT EXISTS weekly_summary_days_of_week INTEGER[] DEFAULT '{0}',
ADD COLUMN IF NOT EXISTS monthly_summary_days_of_month INTEGER[] DEFAULT '{1}',
ADD COLUMN IF NOT EXISTS bill_reminders_days_before_array INTEGER[] DEFAULT '{3,1,0}',
ADD COLUMN IF NOT EXISTS bill_reminders_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS budget_alert_thresholds INTEGER[] DEFAULT '{80,100}',
ADD COLUMN IF NOT EXISTS budget_alert_cooldown_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS goal_milestone_percentages INTEGER[] DEFAULT '{25,50,75,100}',
ADD COLUMN IF NOT EXISTS ana_tips_time TIME DEFAULT '10:00',
ADD COLUMN IF NOT EXISTS ana_tips_day_of_week INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ana_tips_day_of_month INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS overdue_bill_alerts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS overdue_bill_alert_days INTEGER[] DEFAULT '{1,3,7}',
ADD COLUMN IF NOT EXISTS low_balance_alerts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_balance_threshold NUMERIC DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS large_transaction_alerts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS large_transaction_threshold NUMERIC DEFAULT 1000.00,
ADD COLUMN IF NOT EXISTS investment_summary_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS investment_summary_frequency TEXT DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS investment_summary_day_of_week INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS investment_summary_time TIME DEFAULT '18:00';;
