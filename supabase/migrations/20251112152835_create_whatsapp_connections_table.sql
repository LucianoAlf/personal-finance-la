-- =====================================================
-- CRIAR TABELA whatsapp_connections
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados da instância UAZAPI
  instance_id TEXT NOT NULL UNIQUE,
  instance_token TEXT NOT NULL,
  instance_name TEXT,
  
  -- Status da conexão
  status TEXT DEFAULT 'disconnected',
  connected BOOLEAN DEFAULT false,
  logged_in BOOLEAN DEFAULT false,
  jid TEXT,
  
  -- Informações do perfil
  profile_name TEXT,
  profile_pic_url TEXT,
  is_business BOOLEAN DEFAULT false,
  
  -- Desconexão
  last_disconnect TIMESTAMPTZ,
  last_disconnect_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_connection UNIQUE (user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id 
  ON whatsapp_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance_id 
  ON whatsapp_connections(instance_id);

-- RLS
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own connection" ON whatsapp_connections;
CREATE POLICY "Users can view own connection" 
  ON whatsapp_connections FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own connection" ON whatsapp_connections;
CREATE POLICY "Users can insert own connection" 
  ON whatsapp_connections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own connection" ON whatsapp_connections;
CREATE POLICY "Users can update own connection" 
  ON whatsapp_connections FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own connection" ON whatsapp_connections;
CREATE POLICY "Users can delete own connection" 
  ON whatsapp_connections FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_connections_timestamp 
  ON whatsapp_connections;

CREATE TRIGGER update_whatsapp_connections_timestamp
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_connections_updated_at();;
