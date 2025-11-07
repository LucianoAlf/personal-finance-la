# 🔍 AUDITORIA COMPLETA: Página Planejamento

**Data:** 07/01/2025  
**Status Atual:** MVP com dados mockados  
**Objetivo:** Avaliar viabilidade e propor arquitetura moderna integrada

---

## 📊 1. ANÁLISE DO ESTADO ATUAL

### ✅ O que existe hoje

```typescript
// Planning.tsx - 94 linhas
- Header com botões "Copiar Mês Anterior" e "Salvar Planejamento"
- 4 cards de resumo (receitas, despesas, saldo, economia%)
- Lista de categorias com barras de progresso
- TODOS OS DADOS SÃO MOCKADOS (hardcoded)
- Nenhuma integração com banco de dados
- Nenhum hook de gerenciamento de estado
- Nenhuma funcionalidade real implementada
```

### ❌ Problemas Identificados

1. **Dados Mockados**: Arrays hardcoded sem conexão com dados reais
2. **Zero Integração**: Não usa categorias, transações ou contas existentes
3. **Botões Não Funcionais**: "Copiar Mês" e "Salvar" não fazem nada
4. **Inconsistência**: Dashboard usa dados reais, Planejamento usa mock
5. **Arquitetura Obsoleta**: Não segue padrão das outras páginas
6. **Sem Validação**: Não verifica se categoria existe ou tem transações
7. **Sem Persistência**: Usuário não pode criar/editar orçamentos

---

## 🌎 2. BENCHMARKING: MELHORES PRÁTICAS DO MERCADO

### Apps Líderes Analisados
- **Mint** (Intuit)
- **YNAB** (You Need A Budget)
- **Mobills** (Brasil)
- **GuiaBolso/Organizze** (Brasil)
- **PocketGuard**

### 🏆 Features Essenciais Identificadas

#### **Nível 1: MUST HAVE** (Impacto Alto, Esforço Médio)
1. ✅ **Orçamento por Categoria**
   - Definir limite mensal por categoria
   - Visualização de % utilizado (planejado vs. real)
   - Alertas quando ultrapassar 80% e 100%
   
2. ✅ **Integração com Transações Reais**
   - Calcular gasto real automaticamente
   - Atualização em tempo real
   - Comparação planejado vs. realizado

3. ✅ **Visão Mensal Seletiva**
   - Escolher mês/ano para planejar
   - Criar orçamento para meses futuros
   - Copiar orçamento do mês anterior

4. ✅ **Saldo Previsto**
   - Receitas planejadas - Despesas planejadas
   - Indicador visual de saúde financeira
   - Sugestão de economia baseada em metas

#### **Nível 2: SHOULD HAVE** (Impacto Médio, Esforço Médio)
5. ✅ **Orçamento Zero-Based** (método YNAB)
   - Alocar cada real da receita
   - Mostrar "dinheiro não alocado"
   - Incentivo para planejar 100% da receita

6. ✅ **Projeções Inteligentes**
   - Sugerir valores com base em média dos últimos 3 meses
   - Detectar padrões sazonais
   - Alertas de variação anormal

7. ✅ **Metas Integradas**
   - Vincular metas de economia ao orçamento
   - Reservar valor da meta no planejamento
   - Sync bidirecional com página Metas

#### **Nível 3: NICE TO HAVE** (Impacto Médio, Esforço Alto)
8. ⚡ **Templates de Orçamento**
   - Criar templates personalizados
   - Templates pré-definidos (conservador, moderado, agressivo)
   - Compartilhar templates (modo casal - futuro)

9. ⚡ **Análise de Desvios**
   - Comparar planejado vs. realizado mês a mês
   - Gráfico de evolução de desvios
   - Score de aderência ao orçamento

10. ⚡ **Gamificação**
    - Conquistas por cumprir orçamento
    - Streak de meses dentro do orçamento
    - XP por planejamento consistente

---

## 🎯 3. DIAGNÓSTICO: MANTER OU RECONSTRUIR?

### 🔴 VEREDICTO: **RECONSTRUIR DO ZERO**

#### Razões Técnicas
- ❌ Código atual é 100% mockado (sem valor reutilizável)
- ❌ Não segue arquitetura das outras páginas (hooks + Supabase)
- ❌ Botões e features prometidos não existem
- ❌ Estrutura de dados incompatível com banco atual

#### Razões de Produto
- ❌ Não entrega valor real ao usuário
- ❌ Cria expectativa falsa (botões que não funcionam)
- ❌ Inconsistente com experiência das outras páginas
- ❌ Não aproveita dados existentes (categorias, transações, metas)

#### O que NÃO aproveitar
- ~~Dados mockados~~ (inútil)
- ~~Botões não funcionais~~ (remover)
- ~~Estrutura atual~~ (incompatível)

#### O que MANTER (conceito visual)
- ✅ Layout de 4 cards de resumo (adaptar para dados reais)
- ✅ Barras de progresso por categoria (melhorar)
- ✅ Cores de alerta (vermelho >90%, amarelo >80%)

---

## 🏗️ 4. ARQUITETURA PROPOSTA

### **4.1 Banco de Dados**

```sql
-- Nova tabela: budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Período
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  
  -- Receitas e Despesas Planejadas
  planned_income DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'active',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: 1 budget por mês/ano por usuário
  UNIQUE(user_id, month, year)
);

-- Nova tabela: budget_categories
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Valores Planejados
  planned_amount DECIMAL(10,2) NOT NULL CHECK (planned_amount >= 0),
  
  -- Valores Reais (calculado via view/função)
  -- actual_amount será calculado em tempo real via query
  
  -- Notas
  notes TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(budget_id, category_id)
);

-- Índices
CREATE INDEX idx_budgets_user_date ON budgets(user_id, year DESC, month DESC);
CREATE INDEX idx_budget_categories_budget ON budget_categories(budget_id);

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own budgets"
  ON budgets FOR ALL USING (auth.uid() = user_id);
  
CREATE POLICY "Users can CRUD their own budget_categories"
  ON budget_categories FOR ALL 
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE user_id = auth.uid()
    )
  );

-- Função RPC: get_budget_with_actuals
CREATE OR REPLACE FUNCTION get_budget_with_actuals(
  p_budget_id UUID
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  planned_amount NUMERIC,
  actual_amount NUMERIC,
  percentage NUMERIC,
  status TEXT -- 'ok', 'warning', 'exceeded'
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    bc.planned_amount,
    COALESCE(
      (
        SELECT SUM(t.amount)
        FROM transactions t
        WHERE t.category_id = bc.category_id
          AND t.type = 'expense'
          AND t.is_paid = true
          AND EXTRACT(MONTH FROM t.transaction_date) = (SELECT month FROM budgets WHERE id = p_budget_id)
          AND EXTRACT(YEAR FROM t.transaction_date) = (SELECT year FROM budgets WHERE id = p_budget_id)
          AND t.user_id = (SELECT user_id FROM budgets WHERE id = p_budget_id)
      ), 0
    ) AS actual_amount,
    CASE 
      WHEN bc.planned_amount = 0 THEN 0
      ELSE ROUND((COALESCE(actual_amount, 0) / bc.planned_amount) * 100, 2)
    END AS percentage,
    CASE
      WHEN percentage >= 100 THEN 'exceeded'
      WHEN percentage >= 80 THEN 'warning'
      ELSE 'ok'
    END AS status
  FROM budget_categories bc
  JOIN categories c ON c.id = bc.category_id
  WHERE bc.budget_id = p_budget_id
  ORDER BY actual_amount DESC;
END;
$$;
```

### **4.2 Hook: useBudget**

```typescript
// src/hooks/useBudget.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Budget, BudgetCategory, BudgetWithActuals } from '@/types/database.types';

export function useBudget(month?: number, year?: number) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetWithActuals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Mês/ano padrão = atual
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();

  // Buscar ou criar orçamento do mês
  const fetchOrCreateBudget = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Buscar orçamento existente
      let { data: existingBudget, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      // Se não existe, criar rascunho vazio
      if (!existingBudget) {
        const { data: newBudget, error: createError } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            month: currentMonth,
            year: currentYear,
            planned_income: 0,
            status: 'draft',
          })
          .select()
          .single();

        if (createError) throw createError;
        existingBudget = newBudget;
      }

      setBudget(existingBudget);

      // Buscar categorias com valores reais via RPC
      const { data: categoriesData, error: rpcError } = await supabase
        .rpc('get_budget_with_actuals', { p_budget_id: existingBudget.id });

      if (rpcError) throw rpcError;
      setCategories(categoriesData || []);
    } catch (err) {
      setError(err as Error);
      console.error('Erro ao buscar orçamento:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  // Atualizar receita planejada
  const updatePlannedIncome = useCallback(async (amount: number) => {
    if (!budget) return;
    const { error } = await supabase
      .from('budgets')
      .update({ planned_income: amount })
      .eq('id', budget.id);
    if (!error) await fetchOrCreateBudget();
  }, [budget, fetchOrCreateBudget]);

  // Adicionar/atualizar categoria no orçamento
  const upsertBudgetCategory = useCallback(async (
    categoryId: string,
    plannedAmount: number
  ) => {
    if (!budget) return;
    const { error } = await supabase
      .from('budget_categories')
      .upsert({
        budget_id: budget.id,
        category_id: categoryId,
        planned_amount: plannedAmount,
      });
    if (!error) await fetchOrCreateBudget();
  }, [budget, fetchOrCreateBudget]);

  // Copiar orçamento do mês anterior
  const copyFromPreviousMonth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !budget) return;

      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Buscar orçamento anterior
      const { data: prevBudget } = await supabase
        .from('budgets')
        .select('*, budget_categories(*)')
        .eq('user_id', user.id)
        .eq('month', prevMonth)
        .eq('year', prevYear)
        .single();

      if (!prevBudget) {
        alert('Não há orçamento no mês anterior para copiar.');
        return;
      }

      // Copiar receita planejada
      await updatePlannedIncome(prevBudget.planned_income);

      // Copiar categorias
      for (const cat of prevBudget.budget_categories) {
        await upsertBudgetCategory(cat.category_id, cat.planned_amount);
      }

      await fetchOrCreateBudget();
    } catch (err) {
      console.error('Erro ao copiar orçamento:', err);
    }
  }, [budget, currentMonth, currentYear, updatePlannedIncome, upsertBudgetCategory, fetchOrCreateBudget]);

  useEffect(() => {
    fetchOrCreateBudget();
  }, [fetchOrCreateBudget]);

  // Calcular totais
  const totalPlanned = categories.reduce((sum, c) => sum + Number(c.planned_amount), 0);
  const totalActual = categories.reduce((sum, c) => sum + Number(c.actual_amount), 0);
  const balanceExpected = (budget?.planned_income || 0) - totalPlanned;
  const balanceActual = (budget?.planned_income || 0) - totalActual;

  return {
    budget,
    categories,
    loading,
    error,
    // Totais
    totalPlanned,
    totalActual,
    balanceExpected,
    balanceActual,
    // Ações
    updatePlannedIncome,
    upsertBudgetCategory,
    copyFromPreviousMonth,
    refreshBudget: fetchOrCreateBudget,
  };
}
```

### **4.3 Componentes**

```
src/components/planning/
├── BudgetSummaryCards.tsx      → 4 cards de resumo
├── BudgetCategoryItem.tsx      → Item de categoria com barra de progresso
├── BudgetCategoryList.tsx      → Lista de todas as categorias
├── EditBudgetDialog.tsx        → Dialog para editar valor planejado
├── BudgetInsights.tsx          → Insights e sugestões
└── MonthYearSelector.tsx       → Seletor de mês/ano (reutilizar MonthSelector)
```

### **4.4 Página Planning.tsx (Refatorada)**

```typescript
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { BudgetSummaryCards } from '@/components/planning/BudgetSummaryCards';
import { BudgetCategoryList } from '@/components/planning/BudgetCategoryList';
import { BudgetInsights } from '@/components/planning/BudgetInsights';
import { useBudget } from '@/hooks/useBudget';
import { Copy, Calendar, TrendingUp } from 'lucide-react';

export function Planning() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const {
    budget,
    categories,
    loading,
    totalPlanned,
    totalActual,
    balanceExpected,
    balanceActual,
    copyFromPreviousMonth,
    upsertBudgetCategory,
    updatePlannedIncome,
  } = useBudget(month, year);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Planejamento Mensal"
        subtitle="Organize seu orçamento e controle suas despesas"
        icon={<Calendar size={24} />}
        actions={
          <>
            <MonthSelector value={selectedDate} onChange={setSelectedDate} />
            <Button size="sm" variant="outline" onClick={copyFromPreviousMonth}>
              <Copy size={16} className="mr-1" />
              Copiar Mês Anterior
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Cards de Resumo */}
        <BudgetSummaryCards
          plannedIncome={budget?.planned_income || 0}
          totalPlanned={totalPlanned}
          totalActual={totalActual}
          balanceExpected={balanceExpected}
          balanceActual={balanceActual}
          onUpdateIncome={updatePlannedIncome}
        />

        {/* Insights */}
        <BudgetInsights
          categories={categories}
          balanceExpected={balanceExpected}
        />

        {/* Lista de Categorias */}
        <BudgetCategoryList
          categories={categories}
          onUpdateCategory={upsertBudgetCategory}
        />
      </div>
    </div>
  );
}
```

---

## 📈 5. ROADMAP DE IMPLEMENTAÇÃO

### **Fase 1: Fundação (3-4h)** ✅ PRIORIDADE MÁXIMA
- [ ] Criar tabelas `budgets` e `budget_categories`
- [ ] Criar função RPC `get_budget_with_actuals`
- [ ] Implementar hook `useBudget`
- [ ] Criar tipos TypeScript

### **Fase 2: UI Core (3-4h)**
- [ ] `BudgetSummaryCards` → 4 cards com dados reais
- [ ] `BudgetCategoryList` → lista de categorias com progresso
- [ ] `EditBudgetDialog` → editar valores planejados
- [ ] Integrar `MonthSelector` para navegar entre meses

### **Fase 3: Features Avançadas (2-3h)**
- [ ] Copiar orçamento do mês anterior
- [ ] Sugestões inteligentes (média 3 meses)
- [ ] Alertas visuais (80%, 100%)
- [ ] `BudgetInsights` → dicas proativas

### **Fase 4: Integração com Metas (1-2h)**
- [ ] Vincular metas de economia ao orçamento
- [ ] Reservar valor da meta automaticamente
- [ ] Sync bidirecional

### **Fase 5: Gamificação (1h)**
- [ ] Badge "Planejador Mestre" (criar orçamento)
- [ ] Badge "Controle Total" (cumprir orçamento 3 meses)
- [ ] XP por criar/atualizar orçamento

---

## 🎯 6. IMPACTO ESPERADO

### **Para o Usuário**
- ✅ Planejamento real (não mockado)
- ✅ Visibilidade de gastos planejados vs. reais
- ✅ Alertas proativos quando ultrapassar limites
- ✅ Economia automática (se sobrar, direcionar para meta)
- ✅ Histórico de orçamentos (comparar mês a mês)

### **Para o Sistema**
- ✅ Consistência com arquitetura (hooks + Supabase)
- ✅ Sinergia com Metas e Categorias
- ✅ Dados persistidos e auditáveis
- ✅ Base para features futuras (templates, modo casal, etc.)

### **Comparação: Antes vs. Depois**

| Aspecto | ❌ Antes | ✅ Depois |
|---------|---------|----------|
| Dados | Mockados | Reais (Supabase) |
| Integração | Zero | Total (Categorias, Transações, Metas) |
| Funcionalidade | Nenhuma | Completa |
| Experiência | Frustração | Valor real |
| Manutenção | Dívida técnica | Arquitetura sólida |

---

## 💡 7. RECOMENDAÇÕES FINAIS

### ✅ **DEVE FAZER**
1. **Reconstruir do zero** (aproveitar apenas conceito visual)
2. **Implementar Fase 1 + 2 primeiro** (base sólida)
3. **Integrar com categorias e transações reais**
4. **Seguir padrão das outras páginas** (Dashboard, Metas)
5. **Adicionar gamificação** (engajamento)

### ⚠️ **EVITAR**
1. ~~Tentar "salvar" código mockado~~ (perda de tempo)
2. ~~Implementar tudo de uma vez~~ (fazer incremental)
3. ~~Criar features sem validar uso~~ (começar pelo essencial)

### 🚀 **PRÓXIMOS PASSOS**
1. Aprovar esta auditoria
2. Revisar arquitetura de banco de dados
3. Implementar Fase 1 (fundação)
4. Validar com seed data
5. Implementar Fase 2 (UI core)
6. Iterar com feedback

---

## 📊 8. MÉTRICAS DE SUCESSO

- **Técnicas**
  - [ ] 100% dos dados vêm do Supabase (zero mock)
  - [ ] Tempo de resposta < 500ms
  - [ ] Realtime updates funcionando
  - [ ] RLS aplicado corretamente

- **Produto**
  - [ ] Usuário consegue criar orçamento em < 2min
  - [ ] Alertas aparecem quando ultrapassar 80%
  - [ ] Copiar mês anterior funciona perfeitamente
  - [ ] Integração com Metas visível e clara

---

**Conclusão:** A página atual não entrega valor e deve ser **RECONSTRUÍDA DO ZERO** seguindo a arquitetura proposta, priorizando integração com dados reais e sinergia com o resto do sistema.
