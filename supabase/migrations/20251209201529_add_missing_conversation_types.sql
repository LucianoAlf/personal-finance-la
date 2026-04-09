
-- Adicionar valores faltantes ao enum conversation_type
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_bill_type';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_bill_description';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_installment_info';
;
