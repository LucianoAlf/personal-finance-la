-- Criar tabela de tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_tag_name UNIQUE(user_id, name)
);

-- Criar tabela de relacionamento many-to-many
CREATE TABLE IF NOT EXISTS transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_transaction_tag UNIQUE(transaction_id, tag_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag ON transaction_tags(tag_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tags
CREATE POLICY "Users can view own tags" ON tags 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags" ON tags 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON tags 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON tags 
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para transaction_tags
CREATE POLICY "Users can view own transaction_tags" ON transaction_tags 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE id = transaction_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own transaction_tags" ON transaction_tags 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE id = transaction_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction_tags" ON transaction_tags 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE id = transaction_id AND user_id = auth.uid()
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em tags
CREATE TRIGGER update_tags_updated_at 
  BEFORE UPDATE ON tags 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();;
