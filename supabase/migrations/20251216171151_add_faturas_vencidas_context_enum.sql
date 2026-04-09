-- Adicionar 'faturas_vencidas_context' ao enum conversation_type
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'faturas_vencidas_context';

-- Remover a constraint UNIQUE de user_id + phone para permitir múltiplos contextos
ALTER TABLE conversation_context DROP CONSTRAINT IF EXISTS uniq_conversation_context_user_phone;

-- Criar nova constraint UNIQUE por user_id + phone + context_type
-- Isso permite múltiplos contextos de tipos diferentes para o mesmo usuário
ALTER TABLE conversation_context ADD CONSTRAINT uniq_conversation_context_user_phone_type 
  UNIQUE (user_id, phone, context_type);;
