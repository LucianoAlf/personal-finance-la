
-- Adicionar coluna keywords se não existir
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Criar índice GIN para keywords
DROP INDEX IF EXISTS idx_categories_keywords;
CREATE INDEX idx_categories_keywords ON categories USING GIN(keywords);

-- Verificar se já existem categorias padrão
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories WHERE is_default = true LIMIT 1) THEN
    -- Inserir categorias padrão
    INSERT INTO categories (user_id, name, color, icon, keywords, is_default) VALUES
      (NULL, 'Alimentação', '#f59e0b', 'Utensils', ARRAY['ifood', 'uber eats', 'rappi', 'restaurante', 'lanchonete', 'padaria', 'bar', 'café', 'pizzaria', 'hamburgueria'], true),
      (NULL, 'Transporte', '#3b82f6', 'Car', ARRAY['uber', '99', 'taxi', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô'], true),
      (NULL, 'Saúde', '#10b981', 'Heart', ARRAY['farmácia', 'drogaria', 'hospital', 'clínica', 'médico', 'dentista', 'laboratório', 'exame'], true),
      (NULL, 'Lazer', '#ec4899', 'Smile', ARRAY['cinema', 'teatro', 'show', 'spotify', 'netflix', 'streaming', 'parque', 'diversão'], true),
      (NULL, 'Mercado', '#8b5cf6', 'ShoppingCart', ARRAY['mercado', 'supermercado', 'açougue', 'hortifruti', 'feira', 'empório'], true),
      (NULL, 'Moradia', '#6366f1', 'Home', ARRAY['aluguel', 'condomínio', 'água', 'luz', 'internet', 'gás', 'iptu', 'energia'], true),
      (NULL, 'Educação', '#14b8a6', 'GraduationCap', ARRAY['curso', 'faculdade', 'livro', 'escola', 'material escolar', 'mensalidade'], true),
      (NULL, 'Vestuário', '#f43f5e', 'Shirt', ARRAY['roupa', 'calçado', 'loja', 'shopping', 'sapato', 'tênis', 'camisa'], true),
      (NULL, 'Tecnologia', '#06b6d4', 'Laptop', ARRAY['eletrônico', 'celular', 'computador', 'notebook', 'software', 'app'], true),
      (NULL, 'Outros', '#94a3b8', 'MoreHorizontal', ARRAY[], true);
  END IF;
END $$;

-- Adicionar coluna category_id em credit_card_transactions
ALTER TABLE credit_card_transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Criar índice
DROP INDEX IF EXISTS idx_transactions_category_id;
CREATE INDEX idx_transactions_category_id ON credit_card_transactions(category_id);

-- Função para auto-categorizar transações
CREATE OR REPLACE FUNCTION auto_categorize_transaction()
RETURNS TRIGGER AS $$
DECLARE
  detected_category_id UUID;
  transaction_desc TEXT;
BEGIN
  -- Se já tem categoria, não sobrescrever
  IF NEW.category_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Normalizar descrição para busca
  transaction_desc := LOWER(TRIM(COALESCE(NEW.description, '')));
  
  -- Buscar categoria que match com keywords
  SELECT id INTO detected_category_id
  FROM categories
  WHERE (user_id = NEW.user_id OR is_default = true)
    AND keywords IS NOT NULL
    AND array_length(keywords, 1) > 0
    AND EXISTS (
      SELECT 1 FROM unnest(keywords) AS keyword
      WHERE transaction_desc LIKE '%' || LOWER(keyword) || '%'
    )
  ORDER BY is_default ASC, created_at DESC
  LIMIT 1;
  
  -- Se encontrou, atribuir categoria
  IF detected_category_id IS NOT NULL THEN
    NEW.category_id := detected_category_id;
  ELSE
    -- Se não encontrou, atribuir "Outros"
    SELECT id INTO detected_category_id
    FROM categories
    WHERE name = 'Outros' AND is_default = true
    LIMIT 1;
    
    IF detected_category_id IS NOT NULL THEN
      NEW.category_id := detected_category_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-categorização
DROP TRIGGER IF EXISTS trigger_auto_categorize ON credit_card_transactions;
CREATE TRIGGER trigger_auto_categorize
  BEFORE INSERT OR UPDATE OF description
  ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_categorize_transaction();

-- Categorizar transações existentes
UPDATE credit_card_transactions t
SET category_id = (
  SELECT c.id
  FROM categories c
  WHERE (c.user_id = t.user_id OR c.is_default = true)
    AND c.keywords IS NOT NULL
    AND array_length(c.keywords, 1) > 0
    AND EXISTS (
      SELECT 1 FROM unnest(c.keywords) AS keyword
      WHERE LOWER(t.description) LIKE '%' || LOWER(keyword) || '%'
    )
  ORDER BY c.is_default ASC
  LIMIT 1
)
WHERE category_id IS NULL;

-- Atribuir "Outros" para transações sem categoria
UPDATE credit_card_transactions t
SET category_id = (
  SELECT id FROM categories WHERE name = 'Outros' AND is_default = true LIMIT 1
)
WHERE category_id IS NULL;
;
