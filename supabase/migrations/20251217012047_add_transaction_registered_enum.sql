-- Adicionar novo valor ao enum conversation_type
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'transaction_registered';;
