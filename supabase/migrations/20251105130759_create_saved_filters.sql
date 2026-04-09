-- Criar tabela de filtros salvos
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem gerenciar seus próprios filtros
CREATE POLICY "Users can manage own filters" ON saved_filters 
  FOR ALL USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE TRIGGER update_saved_filters_updated_at 
  BEFORE UPDATE ON saved_filters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();;
