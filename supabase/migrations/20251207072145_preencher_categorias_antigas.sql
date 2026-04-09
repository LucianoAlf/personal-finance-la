-- Preencher categorias antigas baseado na descrição
UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.category_id IS NULL
  AND t.type = c.type
  AND c.is_default = true
  AND (
    -- Alimentação
    (c.name = 'Alimentação' AND t.description ILIKE ANY(ARRAY['%mercado%', '%almoço%', '%café%', '%lanche%', '%jantar%', '%restaurante%', '%comida%', '%supermercado%']))
    -- Transporte
    OR (c.name = 'Transporte' AND t.description ILIKE ANY(ARRAY['%uber%', '%99%', '%taxi%', '%gasolina%', '%combustível%', '%transporte%']))
    -- Saúde
    OR (c.name = 'Saúde' AND t.description ILIKE ANY(ARRAY['%farmácia%', '%médico%', '%hospital%', '%saúde%']))
    -- Educação
    OR (c.name = 'Educação' AND t.description ILIKE ANY(ARRAY['%curso%', '%escola%', '%faculdade%', '%educação%']))
    -- Lazer
    OR (c.name = 'Lazer' AND t.description ILIKE ANY(ARRAY['%cinema%', '%netflix%', '%spotify%', '%show%', '%lazer%']))
    -- Moradia
    OR (c.name = 'Moradia' AND t.description ILIKE ANY(ARRAY['%aluguel%', '%condomínio%', '%luz%', '%água%', '%moradia%']))
    -- Investimentos
    OR (c.name = 'Investimentos' AND t.description ILIKE ANY(ARRAY['%investimento%', '%ação%', '%fundo%']))
    -- Bonificações (income)
    OR (c.name = 'Bonificações' AND t.description ILIKE ANY(ARRAY['%bônus%', '%bonificação%', '%mentoria%']))
  );

-- Preencher resto com "Outros"
UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.category_id IS NULL
  AND t.type = c.type
  AND c.name = 'Outros'
  AND c.is_default = true;;
