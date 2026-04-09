-- Criar tabela para armazenar tokens de push notification
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Comentários
COMMENT ON TABLE push_tokens IS 'Armazena tokens de push notification (Web Push API) dos usuários';
COMMENT ON COLUMN push_tokens.endpoint IS 'Endpoint único do push subscription';
COMMENT ON COLUMN push_tokens.p256dh IS 'Chave pública P-256 (ECDH) para criptografia';
COMMENT ON COLUMN push_tokens.auth IS 'Chave de autenticação para criptografia';

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver apenas seus próprios tokens
CREATE POLICY "Usuários podem ver seus próprios tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário pode inserir/atualizar apenas seus próprios tokens
CREATE POLICY "Usuários podem inserir seus próprios tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode deletar apenas seus próprios tokens
CREATE POLICY "Usuários podem deletar seus próprios tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);;
