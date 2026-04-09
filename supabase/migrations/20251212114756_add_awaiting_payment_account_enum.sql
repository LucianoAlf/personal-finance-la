-- Adicionar valor faltante ao enum conversation_type
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_payment_account';;
