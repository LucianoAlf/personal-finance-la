-- =============================================
-- MIGRAÇÃO: Padronização de Categorias v2
-- Data: 16/12/2025
-- Total: 25 despesas + 12 receitas = 37 categorias
-- =============================================

-- 1. Criar tabela temporária com as novas categorias
CREATE TEMP TABLE new_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  keywords TEXT[]
);

-- 2. Inserir categorias de DESPESA (25)
INSERT INTO new_categories (id, name, icon, color, type, sort_order, keywords) VALUES
('food', 'Alimentação', 'Utensils', '#F97316', 'expense', 1, ARRAY['comida', 'almoço', 'jantar', 'café']),
('transport', 'Transporte', 'Car', '#3B82F6', 'expense', 2, ARRAY['uber', '99', 'ônibus', 'metrô', 'táxi']),
('housing', 'Moradia', 'Home', '#8B5CF6', 'expense', 3, ARRAY['aluguel', 'condomínio', 'iptu', 'casa']),
('health', 'Saúde', 'HeartPulse', '#EF4444', 'expense', 4, ARRAY['médico', 'hospital', 'plano de saúde', 'consulta']),
('education', 'Educação', 'GraduationCap', '#06B6D4', 'expense', 5, ARRAY['escola', 'faculdade', 'curso', 'livro']),
('entertainment', 'Lazer', 'Film', '#EC4899', 'expense', 6, ARRAY['cinema', 'teatro', 'show', 'festa', 'bar']),
('shopping', 'Compras', 'ShoppingBag', '#F59E0B', 'expense', 7, ARRAY['loja', 'shopping', 'compra']),
('subscriptions', 'Assinaturas', 'Repeat', '#6366F1', 'expense', 8, ARRAY['netflix', 'spotify', 'amazon', 'disney', 'hbo', 'streaming']),
('restaurant', 'Restaurante', 'UtensilsCrossed', '#FB923C', 'expense', 9, ARRAY['restaurante', 'lanchonete', 'pizzaria', 'churrascaria']),
('market', 'Mercado', 'ShoppingCart', '#22C55E', 'expense', 10, ARRAY['mercado', 'supermercado', 'feira', 'hortifruti']),
('fuel', 'Combustível', 'Fuel', '#FBBF24', 'expense', 11, ARRAY['gasolina', 'etanol', 'diesel', 'posto', 'combustível']),
('delivery', 'Delivery', 'Bike', '#FB7185', 'expense', 12, ARRAY['ifood', 'rappi', 'uber eats', 'delivery', 'entrega']),
('bills', 'Contas', 'FileText', '#64748B', 'expense', 13, ARRAY['luz', 'água', 'gás', 'energia', 'conta']),
('services', 'Serviços', 'Wrench', '#78716C', 'expense', 14, ARRAY['serviço', 'manutenção', 'reparo', 'conserto']),
('other_expense', 'Outros', 'Package', '#9CA3AF', 'expense', 15, ARRAY[]::TEXT[]),
('clothing', 'Vestuário', 'Shirt', '#A855F7', 'expense', 16, ARRAY['roupa', 'sapato', 'tênis', 'calçado', 'moda']),
('beauty', 'Beleza', 'Sparkles', '#F472B6', 'expense', 17, ARRAY['salão', 'cabelo', 'manicure', 'estética', 'cosmético']),
('pet', 'Pet', 'PawPrint', '#A3E635', 'expense', 18, ARRAY['pet', 'cachorro', 'gato', 'veterinário', 'ração']),
('kids', 'Filhos', 'Baby', '#FDA4AF', 'expense', 19, ARRAY['filho', 'criança', 'escola', 'brinquedo']),
('gifts', 'Presentes', 'Gift', '#C084FC', 'expense', 20, ARRAY['presente', 'aniversário', 'natal']),
('taxes', 'Impostos', 'Receipt', '#78716C', 'expense', 21, ARRAY['ipva', 'iptu', 'ir', 'imposto', 'taxa', 'multa']),
('insurance', 'Seguros', 'Shield', '#0EA5E9', 'expense', 22, ARRAY['seguro', 'seguro auto', 'seguro vida']),
('travel', 'Viagem', 'Plane', '#14B8A6', 'expense', 23, ARRAY['viagem', 'passagem', 'hotel', 'hospedagem', 'turismo']),
('pharmacy', 'Farmácia', 'Pill', '#F87171', 'expense', 24, ARRAY['farmácia', 'remédio', 'medicamento', 'drogaria']),
('parking', 'Estacionamento', 'ParkingCircle', '#60A5FA', 'expense', 25, ARRAY['estacionamento', 'parking', 'vaga']);

-- 3. Inserir categorias de RECEITA (12)
INSERT INTO new_categories (id, name, icon, color, type, sort_order, keywords) VALUES
('salary', 'Salário', 'Briefcase', '#22C55E', 'income', 1, ARRAY['salário', 'pagamento', 'holerite']),
('freelance', 'Freelance', 'Laptop', '#3B82F6', 'income', 2, ARRAY['freelance', 'projeto', 'trabalho extra']),
('investments', 'Investimentos', 'TrendingUp', '#8B5CF6', 'income', 3, ARRAY['dividendo', 'rendimento', 'juros', 'lucro']),
('bonus', 'Bônus', 'Gift', '#10B981', 'income', 4, ARRAY['bônus', 'prêmio', 'comissão']),
('rental', 'Aluguel', 'Home', '#F59E0B', 'income', 5, ARRAY['aluguel recebido', 'renda de aluguel']),
('other_income', 'Outras Receitas', 'Wallet', '#9CA3AF', 'income', 6, ARRAY[]::TEXT[]),
('pension', 'Pensão', 'Users', '#EC4899', 'income', 7, ARRAY['pensão', 'pensão alimentícia']),
('retirement', 'Aposentadoria', 'User', '#64748B', 'income', 8, ARRAY['aposentadoria', 'inss']),
('13th_salary', '13º Salário', 'Calendar', '#EF4444', 'income', 9, ARRAY['13º', 'décimo terceiro']),
('vacation', 'Férias', 'Sun', '#06B6D4', 'income', 10, ARRAY['férias', 'abono de férias']),
('tax_refund', 'Restituição IR', 'Receipt', '#A855F7', 'income', 11, ARRAY['restituição', 'imposto de renda']),
('gift_income', 'Presente', 'Gift', '#F472B6', 'income', 12, ARRAY['presente recebido', 'doação']);

-- 4. Criar mapeamento de categorias antigas para novas
CREATE TEMP TABLE category_mapping (
  old_name TEXT,
  new_id TEXT
);

INSERT INTO category_mapping (old_name, new_id) VALUES
-- Despesas - mapeamento direto
('Alimentação', 'food'),
('Transporte', 'transport'),
('Moradia', 'housing'),
('Saúde', 'health'),
('Educação', 'education'),
('Lazer', 'entertainment'),
('Assinaturas', 'subscriptions'),
('Vestuário', 'clothing'),
('Beleza', 'beauty'),
('Viagens', 'travel'),
('Seguros', 'insurance'),
('Impostos e Taxas', 'taxes'),
('Outros', 'other_expense'),
-- Despesas - mapeamento com mudança
('Esportes', 'entertainment'),
('Tecnologia', 'shopping'),
('Eletrodomésticos', 'shopping'),
('Transferências', 'other_expense'),
('Telecomunicações', 'bills'),
('Serviços (Água, Luz, Gás)', 'bills'),
('Pets', 'pet'),
('Empréstimos', 'bills'),
('Investimentos', 'other_expense'),
-- Receitas - mapeamento direto
('Salário', 'salary'),
('Freelance', 'freelance'),
('Bonificações', 'bonus'),
('Presentes', 'gift_income');

-- 5. Deletar todas as categorias antigas
DELETE FROM categories;

-- 6. Inserir as novas categorias padronizadas
INSERT INTO categories (id, user_id, name, icon, color, type, is_default, keywords)
SELECT 
  gen_random_uuid(),
  NULL,
  nc.name,
  nc.icon,
  nc.color,
  nc.type,
  true,
  nc.keywords
FROM new_categories nc
ORDER BY nc.type, nc.sort_order;

-- 7. Atualizar transações para usar as novas categorias
-- Primeiro, criar um mapeamento de nome antigo para novo UUID
WITH new_cat_ids AS (
  SELECT c.id as new_uuid, nc.id as new_id
  FROM categories c
  JOIN new_categories nc ON c.name = nc.name AND c.type = nc.type
)
UPDATE transactions t
SET category_id = nci.new_uuid
FROM category_mapping cm
JOIN new_cat_ids nci ON cm.new_id = nci.new_id
JOIN categories old_c ON old_c.name = cm.old_name
WHERE t.category_id = old_c.id;

-- 8. Limpar tabelas temporárias
DROP TABLE new_categories;
DROP TABLE category_mapping;;
