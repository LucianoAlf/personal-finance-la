-- Adicionar novo tipo ao ENUM conversation_type
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_register_account_type';
