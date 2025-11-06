-- Migration: Adicionar categorias brasileiras
-- Data: 2025-01-06
-- Descrição: Adiciona novas categorias para o mercado brasileiro

-- Inserir nova categoria de RECEITA: Bonificações
INSERT INTO categories (id, name, type, icon, color, is_default, user_id)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Bonificações',
  'income',
  'Award',
  '#f59e0b',
  true,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Inserir nova categoria de DESPESA: Tecnologia
INSERT INTO categories (id, name, type, icon, color, is_default, user_id)
VALUES (
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  'Tecnologia',
  'expense',
  'Smartphone',
  '#3b82f6',
  true,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Inserir nova categoria de DESPESA: Esportes
INSERT INTO categories (id, name, type, icon, color, is_default, user_id)
VALUES (
  'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
  'Esportes',
  'expense',
  'Dumbbell',
  '#10b981',
  true,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Inserir nova categoria de DESPESA: Viagens
INSERT INTO categories (id, name, type, icon, color, is_default, user_id)
VALUES (
  'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
  'Viagens',
  'expense',
  'Plane',
  '#06b6d4',
  true,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Inserir nova categoria de DESPESA: Investimentos (diferente da de income)
INSERT INTO categories (id, name, type, icon, color, is_default, user_id)
VALUES (
  'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b',
  'Investimentos',
  'expense',
  'PiggyBank',
  '#10b981',
  true,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Adicionar comentário explicativo
COMMENT ON TABLE categories IS 'Tabela de categorias brasileiras para transações e compras no cartão de crédito';
