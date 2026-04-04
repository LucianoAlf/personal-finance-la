# 🔧 ESPECIFICAÇÃO TÉCNICA: Planejamento Mensal

## 📋 ÍNDICE
1. [Esquema de Banco de Dados](#1-esquema-de-banco-de-dados)
2. [API / RPC Functions](#2-api--rpc-functions)
3. [Tipos TypeScript](#3-tipos-typescript)
4. [Hook useBudget](#4-hook-usebudget)
5. [Componentes](#5-componentes)
6. [Integrações](#6-integrações)
7. [Testes](#7-testes)

---

## 1. ESQUEMA DE BANCO DE DADOS

### **1.1 Tabela: budgets**

```sql
-- Migration: 20250107_create_budgets.sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Período (mês/ano)
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  
  -- Receita Planejada
  planned_income DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (planned_income >= 0),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- Notas
  notes TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_budget_per_month UNIQUE(user_id, month, year)
);

-- Índices
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_date ON budgets(year DESC, month DESC);
CREATE INDEX idx_budgets_user_date ON budgets(user_id, year DESC, month DESC);
CREATE INDEX idx_budgets_status ON budgets(status) WHERE status = 'active';

-- Trigger para updated_at
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE budgets IS 'Orçamentos mensais dos usuários';
COMMENT ON COLUMN budgets.month IS 'Mês do orçamento (1-12)';
COMMENT ON COLUMN budgets.year IS 'Ano do orçamento';
COMMENT ON COLUMN budgets.planned_income IS 'Receita mensal planejada';
COMMENT ON COLUMN budgets.status IS 'Status: draft (rascunho), active (ativo), archived (arquivado)';
```

### **1.2 Tabela: budget_categories**

```sql
-- Migration: 20250107_create_budget_categories.sql
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Valor Planejado
  planned_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),
  
  -- Notas
  notes TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_category_per_budget UNIQUE(budget_id, category_id)
);

-- Índices
CREATE INDEX idx_budget_categories_budget ON budget_categories(budget_id);
CREATE INDEX idx_budget_categories_category ON budget_categories(category_id);

-- Trigger para updated_at
CREATE TRIGGER update_budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget categories from their budgets"
  ON budget_categories FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budget categories for their budgets"
  ON budget_categories FOR INSERT
  WITH CHECK (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budget categories from their budgets"
  ON budget_categories FOR UPDATE
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budget categories from their budgets"
  ON budget_categories FOR DELETE
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE budget_categories IS 'Valores planejados por categoria dentro de um orçamento';
COMMENT ON COLUMN budget_categories.planned_amount IS 'Valor planejado para esta categoria no mês';
```

---

## 2. API / RPC FUNCTIONS

### **2.1 Function: get_budget_with_actuals**

```sql
-- Migration: 20250107_create_budget_functions.sql
CREATE OR REPLACE FUNCTION get_budget_with_actuals(
  p_budget_id UUID
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  category_color TEXT,
  planned_amount NUMERIC,
  actual_amount NUMERIC,
  percentage NUMERIC,
  status TEXT,
  notes TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  -- Verificar se o orçamento existe e pertence ao usuário
  SELECT user_id, month, year INTO v_user_id, v_month, v_year
  FROM budgets
  WHERE id = p_budget_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget not found or unauthorized';
  END IF;
  
  -- Retornar categorias com valores planejados e reais
  RETURN QUERY
  SELECT 
    bc.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    bc.planned_amount,
    
    -- Calcular gasto real da categoria no mês
    COALESCE(
      (
        SELECT SUM(t.amount)
        FROM transactions t
        WHERE t.category_id = bc.category_id
          AND t.type = 'expense'
          AND t.is_paid = true
          AND EXTRACT(MONTH FROM t.transaction_date) = v_month
          AND EXTRACT(YEAR FROM t.transaction_date) = v_year
          AND t.user_id = v_user_id
      ), 0
    )::NUMERIC AS actual_amount,
    
    -- Calcular percentual utilizado
    CASE 
      WHEN bc.planned_amount = 0 THEN 0
      ELSE ROUND((actual_amount / bc.planned_amount) * 100, 2)
    END AS percentage,
    
    -- Status (ok, warning, exceeded)
    CASE
      WHEN percentage >= 100 THEN 'exceeded'
      WHEN percentage >= 80 THEN 'warning'
      ELSE 'ok'
    END AS status,
    
    bc.notes
    
  FROM budget_categories bc
  JOIN categories c ON c.id = bc.category_id
  WHERE bc.budget_id = p_budget_id
  ORDER BY actual_amount DESC NULLS LAST;
END;
$$;

-- Comentário
COMMENT ON FUNCTION get_budget_with_actuals IS 
  'Retorna categorias de um orçamento com valores planejados e gastos reais do mês';
```

### **2.2 Function: copy_budget_from_previous_month**

```sql
CREATE OR REPLACE FUNCTION copy_budget_from_previous_month(
  p_target_month INTEGER,
  p_target_year INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prev_month INTEGER;
  v_prev_year INTEGER;
  v_prev_budget_id UUID;
  v_new_budget_id UUID;
  v_category RECORD;
BEGIN
  -- Validações
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Calcular mês anterior
  IF p_target_month = 1 THEN
    v_prev_month := 12;
    v_prev_year := p_target_year - 1;
  ELSE
    v_prev_month := p_target_month - 1;
    v_prev_year := p_target_year;
  END IF;
  
  -- Buscar orçamento do mês anterior
  SELECT id INTO v_prev_budget_id
  FROM budgets
  WHERE user_id = v_user_id
    AND month = v_prev_month
    AND year = v_prev_year;
  
  IF v_prev_budget_id IS NULL THEN
    RAISE EXCEPTION 'No budget found for previous month (% %)', v_prev_month, v_prev_year;
  END IF;
  
  -- Criar ou buscar orçamento do mês atual
  INSERT INTO budgets (user_id, month, year, planned_income, status)
  SELECT 
    v_user_id,
    p_target_month,
    p_target_year,
    planned_income,
    'active'
  FROM budgets
  WHERE id = v_prev_budget_id
  ON CONFLICT (user_id, month, year) 
  DO UPDATE SET
    planned_income = EXCLUDED.planned_income,
    updated_at = NOW()
  RETURNING id INTO v_new_budget_id;
  
  -- Copiar categorias
  FOR v_category IN 
    SELECT category_id, planned_amount, notes
    FROM budget_categories
    WHERE budget_id = v_prev_budget_id
  LOOP
    INSERT INTO budget_categories (budget_id, category_id, planned_amount, notes)
    VALUES (v_new_budget_id, v_category.category_id, v_category.planned_amount, v_category.notes)
    ON CONFLICT (budget_id, category_id)
    DO UPDATE SET
      planned_amount = EXCLUDED.planned_amount,
      notes = EXCLUDED.notes,
      updated_at = NOW();
  END LOOP;
  
  RETURN v_new_budget_id;
END;
$$;

COMMENT ON FUNCTION copy_budget_from_previous_month IS 
  'Copia orçamento do mês anterior para o mês especificado';
```

### **2.3 Function: get_budget_summary**

```sql
CREATE OR REPLACE FUNCTION get_budget_summary(
  p_budget_id UUID
)
RETURNS TABLE (
  planned_income NUMERIC,
  total_planned NUMERIC,
  total_actual NUMERIC,
  balance_expected NUMERIC,
  balance_actual NUMERIC,
  savings_rate NUMERIC,
  categories_count INTEGER,
  categories_exceeded INTEGER,
  categories_warning INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.planned_income::NUMERIC,
    COALESCE(SUM(bc.planned_amount), 0)::NUMERIC AS total_planned,
    COALESCE(
      (
        SELECT SUM(actual_amount)
        FROM get_budget_with_actuals(p_budget_id)
      ), 0
    )::NUMERIC AS total_actual,
    (b.planned_income - total_planned)::NUMERIC AS balance_expected,
    (b.planned_income - total_actual)::NUMERIC AS balance_actual,
    CASE 
      WHEN b.planned_income > 0 
      THEN ROUND((balance_actual / b.planned_income) * 100, 2)
      ELSE 0
    END::NUMERIC AS savings_rate,
    COUNT(bc.id)::INTEGER AS categories_count,
    COUNT(CASE WHEN actual_amount >= bc.planned_amount THEN 1 END)::INTEGER AS categories_exceeded,
    COUNT(CASE WHEN actual_amount >= bc.planned_amount * 0.8 AND actual_amount < bc.planned_amount THEN 1 END)::INTEGER AS categories_warning
  FROM budgets b
  LEFT JOIN budget_categories bc ON bc.budget_id = b.id
  LEFT JOIN LATERAL (
    SELECT SUM(t.amount) AS actual_amount
    FROM transactions t
    WHERE t.category_id = bc.category_id
      AND t.type = 'expense'
      AND t.is_paid = true
      AND EXTRACT(MONTH FROM t.transaction_date) = b.month
      AND EXTRACT(YEAR FROM t.transaction_date) = b.year
      AND t.user_id = b.user_id
  ) actual ON TRUE
  WHERE b.id = p_budget_id
    AND b.user_id = auth.uid()
  GROUP BY b.id, b.planned_income;
END;
$$;

COMMENT ON FUNCTION get_budget_summary IS 
  'Retorna resumo consolidado de um orçamento com totais e taxas';
```

---

## 3. TIPOS TYPESCRIPT

```typescript
// src/types/database.types.ts

export interface Budget {
  id: string;
  user_id: string;
  month: number; // 1-12
  year: number;
  planned_income: number;
  status: 'draft' | 'active' | 'archived';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  category_id: string;
  planned_amount: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetWithActuals {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  planned_amount: number;
  actual_amount: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
  notes?: string;
}

export interface BudgetSummary {
  planned_income: number;
  total_planned: number;
  total_actual: number;
  balance_expected: number;
  balance_actual: number;
  savings_rate: number;
  categories_count: number;
  categories_exceeded: number;
  categories_warning: number;
}

// Schemas de validação com Zod
import { z } from 'zod';

export const budgetSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  planned_income: z.number().min(0),
  status: z.enum(['draft', 'active', 'archived']).default('active'),
  notes: z.string().optional(),
});

export const budgetCategorySchema = z.object({
  budget_id: z.string().uuid(),
  category_id: z.string().uuid(),
  planned_amount: z.number().min(0),
  notes: z.string().optional(),
});
```

---

## 4. HOOK: useBudget

```typescript
// src/hooks/useBudget.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  Budget, 
  BudgetCategory, 
  BudgetWithActuals, 
  BudgetSummary 
} from '@/types/database.types';

interface UseBudgetProps {
  month?: number;
  year?: number;
  autoCreate?: boolean; // Criar automaticamente se não existir
}

interface UseBudgetReturn {
  // Estado
  budget: Budget | null;
  categories: BudgetWithActuals[];
  summary: BudgetSummary | null;
  loading: boolean;
  error: Error | null;
  
  // Ações
  updatePlannedIncome: (amount: number) => Promise<void>;
  upsertCategory: (categoryId: string, plannedAmount: number, notes?: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  copyFromPreviousMonth: () => Promise<void>;
  refreshBudget: () => Promise<void>;
  
  // Helpers
  getCategoryById: (categoryId: string) => BudgetWithActuals | undefined;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ComponentType;
}

export function useBudget({
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  autoCreate = true,
}: UseBudgetProps = {}): UseBudgetReturn {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetWithActuals[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Buscar ou criar orçamento
  const fetchOrCreateBudget = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Buscar orçamento existente
      let { data: existingBudget, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Criar se não existir e autoCreate = true
      if (!existingBudget && autoCreate) {
        const { data: newBudget, error: createError } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            month,
            year,
            planned_income: 0,
            status: 'draft',
          })
          .select()
          .single();

        if (createError) throw createError;
        existingBudget = newBudget;
      }

      setBudget(existingBudget);

      if (existingBudget) {
        // Buscar categorias com valores reais
        const { data: categoriesData, error: rpcError } = await supabase
          .rpc('get_budget_with_actuals', { p_budget_id: existingBudget.id });

        if (rpcError) throw rpcError;
        setCategories(categoriesData || []);

        // Buscar resumo
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_budget_summary', { p_budget_id: existingBudget.id })
          .single();

        if (summaryError) throw summaryError;
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Erro ao buscar orçamento:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year, autoCreate]);

  // Atualizar receita planejada
  const updatePlannedIncome = useCallback(async (amount: number) => {
    if (!budget) return;
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ planned_income: amount, updated_at: new Date().toISOString() })
        .eq('id', budget.id);

      if (error) throw error;
      await fetchOrCreateBudget();
    } catch (err) {
      console.error('Erro ao atualizar receita:', err);
      throw err;
    }
  }, [budget, fetchOrCreateBudget]);

  // Upsert categoria
  const upsertCategory = useCallback(async (
    categoryId: string,
    plannedAmount: number,
    notes?: string
  ) => {
    if (!budget) return;
    try {
      const { error } = await supabase
        .from('budget_categories')
        .upsert({
          budget_id: budget.id,
          category_id: categoryId,
          planned_amount: plannedAmount,
          notes,
        }, { onConflict: 'budget_id,category_id' });

      if (error) throw error;
      await fetchOrCreateBudget();
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      throw err;
    }
  }, [budget, fetchOrCreateBudget]);

  // Deletar categoria
  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!budget) return;
    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('budget_id', budget.id)
        .eq('category_id', categoryId);

      if (error) throw error;
      await fetchOrCreateBudget();
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      throw err;
    }
  }, [budget, fetchOrCreateBudget]);

  // Copiar do mês anterior
  const copyFromPreviousMonth = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('copy_budget_from_previous_month', {
          p_target_month: month,
          p_target_year: year,
        });

      if (error) throw error;
      await fetchOrCreateBudget();
      return data;
    } catch (err) {
      console.error('Erro ao copiar orçamento:', err);
      throw err;
    }
  }, [month, year, fetchOrCreateBudget]);

  // Buscar categoria por ID
  const getCategoryById = useCallback((categoryId: string) => {
    return categories.find(c => c.category_id === categoryId);
  }, [categories]);

  // Helpers de UI
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'exceeded': return 'red';
      case 'warning': return 'orange';
      default: return 'green';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    // Retornar componente Lucide apropriado
    switch (status) {
      case 'exceeded': return AlertTriangle;
      case 'warning': return AlertCircle;
      default: return CheckCircle2;
    }
  }, []);

  // Efeitos
  useEffect(() => {
    fetchOrCreateBudget();
  }, [fetchOrCreateBudget]);

  // Realtime subscription
  useEffect(() => {
    if (!budget) return;

    const channel = supabase
      .channel(`budget:${budget.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `id=eq.${budget.id}`,
        },
        () => fetchOrCreateBudget()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_categories',
          filter: `budget_id=eq.${budget.id}`,
        },
        () => fetchOrCreateBudget()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [budget, fetchOrCreateBudget]);

  return {
    budget,
    categories,
    summary,
    loading,
    error,
    updatePlannedIncome,
    upsertCategory,
    deleteCategory,
    copyFromPreviousMonth,
    refreshBudget: fetchOrCreateBudget,
    getCategoryById,
    getStatusColor,
    getStatusIcon,
  };
}
```

---

## 5. COMPONENTES

### **5.1 BudgetSummaryCards.tsx**

```typescript
interface BudgetSummaryCardsProps {
  summary: BudgetSummary | null;
  onUpdateIncome: (amount: number) => Promise<void>;
}

export function BudgetSummaryCards({ summary, onUpdateIncome }: BudgetSummaryCardsProps) {
  // Implementação dos 4 cards de resumo
  // - Receita Planejada (editável via dialog)
  // - Despesas Planejadas (calculado)
  // - Saldo Previsto (calculado)
  // - Taxa de Economia (calculado)
}
```

### **5.2 BudgetCategoryList.tsx**

```typescript
interface BudgetCategoryListProps {
  categories: BudgetWithActuals[];
  onUpdateCategory: (categoryId: string, amount: number) => Promise<void>;
}

export function BudgetCategoryList({ categories, onUpdateCategory }: BudgetCategoryListProps) {
  // Implementação da lista de categorias
  // - Renderizar BudgetCategoryItem para cada categoria
  // - Botão "Adicionar Categoria" (escolher de lista de categorias existentes)
}
```

### **5.3 BudgetCategoryItem.tsx**

```typescript
interface BudgetCategoryItemProps {
  category: BudgetWithActuals;
  onEdit: () => void;
}

export function BudgetCategoryItem({ category, onEdit }: BudgetCategoryItemProps) {
  // Implementação do item de categoria
  // - Ícone + Nome
  // - Barra de progresso com cores baseadas em status
  // - Valores: R$ actual / R$ planned
  // - Percentual
  // - Botão Editar
}
```

---

## 6. INTEGRAÇÕES

### **6.1 Integração com Metas**

```typescript
// Quando criar meta de economia, perguntar se quer alocar no orçamento
// Se sim, criar/atualizar categoria "Economia" com valor da meta
```

### **6.2 Integração com Gamificação**

```typescript
// Eventos que geram XP:
// - Criar primeiro orçamento: +50 XP
// - Atualizar orçamento: +10 XP
// - Cumprir orçamento (todas categorias < 100%): +100 XP
// - Streak de 3 meses cumprindo orçamento: Badge "Planejador Mestre"
```

---

## 7. TESTES

### **7.1 Testes de Integração (Banco)**

```sql
-- Seed de teste
BEGIN;
  -- Criar usuário de teste
  -- Criar budget
  -- Criar budget_categories
  -- Validar RPC get_budget_with_actuals
  -- Validar cópia de mês anterior
ROLLBACK;
```

### **7.2 Testes Unitários (Hook)**

```typescript
describe('useBudget', () => {
  it('should create budget if not exists', async () => {});
  it('should fetch categories with actuals', async () => {});
  it('should update planned income', async () => {});
  it('should copy from previous month', async () => {});
});
```

---

**Especificação completa para implementação aprovada.**
