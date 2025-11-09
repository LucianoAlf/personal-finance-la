# 🚀 SPRINT 0: QUICK WIN - PLANO DETALHADO

**Objetivo:** Página 100% funcional com dados reais do Supabase  
**Prazo:** 1-2 dias (8-16h)  
**Prioridade:** 🔥 MÁXIMA

---

## 📊 SITUAÇÃO ATUAL (AUDITORIA)

### ✅ **O QUE JÁ EXISTE NO BANCO:**
```sql
-- Tabela: investments (linhas 288-304 do schema)
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('stock', 'fund', 'treasury', 'crypto', 'real_estate', 'other')),
  name VARCHAR NOT NULL,
  ticker VARCHAR,
  quantity DECIMAL(18,8),
  purchase_price DECIMAL(10,2),
  current_price DECIMAL(10,2),
  total_invested DECIMAL(10,2),
  current_value DECIMAL(10,2),
  purchase_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices (linhas 307-310)
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_type ON investments(type);
CREATE INDEX idx_investments_ticker ON investments(ticker);
CREATE INDEX idx_investments_is_active ON investments(is_active);
```

### ✅ **O QUE JÁ EXISTE NO FRONTEND:**

**1. Types (database.types.ts - linhas 422-432):**
```typescript
export interface Investment {
  id: string;
  user_id: string;
  type: 'stock' | 'fixed_income' | 'fund' | 'crypto';
  symbol: string;
  quantity: number;
  average_price: number;
  current_price?: number;
  institution?: string;
  created_at: Date;
}
```

**2. Mock Data (mockData.ts - linhas 252-286):**
```typescript
export const mockInvestments: Investment[] = [
  {
    id: '1',
    user_id: '1',
    type: 'stock',
    symbol: 'PETR4',
    quantity: 100,
    average_price: 35.20,
    current_price: 38.50,
    institution: 'XP Investimentos',
    created_at: new Date(),
  },
  // ... mais 2 investimentos
];
```

**3. Página (Investments.tsx - 158 linhas):**
- ✅ Header padronizado
- ✅ 4 cards de resumo (Total, Atual, Valorização, Rentabilidade)
- ✅ Tabela de portfólio
- ✅ Layout responsivo
- ❌ **USA MOCK DATA!** (linha 4)

### ⚠️ **INCOMPATIBILIDADES ENTRE BANCO E TYPES:**

| Campo | Banco SQL | Types TS | Status |
|-------|-----------|----------|--------|
| `type` | 'stock', 'fund', 'treasury', 'crypto', 'real_estate', 'other' | 'stock', 'fixed_income', 'fund', 'crypto' | ⚠️ DIVERGENTE |
| `name` | VARCHAR NOT NULL | ❌ NÃO EXISTE | 🔴 FALTA |
| `ticker` | VARCHAR | ❌ CHAMADO `symbol` | ⚠️ DIVERGENTE |
| `symbol` | ❌ NÃO EXISTE | string | 🔴 FALTA NO BANCO |
| `quantity` | DECIMAL(18,8) | number | ✅ OK |
| `purchase_price` | DECIMAL(10,2) | ❌ CHAMADO `average_price` | ⚠️ DIVERGENTE |
| `average_price` | ❌ NÃO EXISTE | number | 🔴 FALTA NO BANCO |
| `current_price` | DECIMAL(10,2) | number? | ✅ OK |
| `total_invested` | DECIMAL(10,2) | ❌ NÃO EXISTE | 🔴 FALTA NO TYPE |
| `current_value` | DECIMAL(10,2) | ❌ NÃO EXISTE | 🔴 FALTA NO TYPE |
| `purchase_date` | DATE | ❌ NÃO EXISTE | 🔴 FALTA NO TYPE |
| `notes` | TEXT | ❌ NÃO EXISTE | 🔴 FALTA NO TYPE |
| `is_active` | BOOLEAN | ❌ NÃO EXISTE | 🔴 FALTA NO TYPE |
| `institution` | ❌ NÃO EXISTE | string? | 🔴 FALTA NO BANCO |

---

## 🎯 PLANO DE AÇÃO SPRINT 0

### **ETAPA 1: SINCRONIZAR TYPES COM BANCO (30min)**

**Objetivo:** Interface TypeScript 100% compatível com tabela SQL

**Arquivo:** `src/types/database.types.ts`

**Ação:**
```typescript
// SUBSTITUIR a interface Investment (linhas 422-432) por:
export interface Investment {
  // Campos principais
  id: string;
  user_id: string;
  type: 'stock' | 'fund' | 'treasury' | 'crypto' | 'real_estate' | 'other';
  name: string; // NOVO
  ticker: string | null;
  
  // Quantidades e preços
  quantity: number;
  purchase_price: number;
  current_price: number | null;
  total_invested: number | null; // NOVO
  current_value: number | null; // NOVO
  
  // Metadados
  purchase_date: Date | null; // NOVO
  notes: string | null; // NOVO
  is_active: boolean; // NOVO
  
  // Timestamps
  created_at: Date;
  updated_at: Date; // NOVO
}

// ADICIONAR: Tipos auxiliares para CRUD
export interface CreateInvestmentInput {
  type: Investment['type'];
  name: string;
  ticker?: string;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  purchase_date?: Date;
  notes?: string;
}

export interface UpdateInvestmentInput {
  name?: string;
  ticker?: string;
  quantity?: number;
  purchase_price?: number;
  current_price?: number;
  purchase_date?: Date;
  notes?: string;
  is_active?: boolean;
}
```

**Validação:**
```bash
# Rodar type-check
pnpm tsc --noEmit
```

---

### **ETAPA 2: CRIAR HOOK useInvestments (2-3h)**

**Objetivo:** Hook completo para CRUD de investimentos

**Arquivo:** `src/hooks/useInvestments.ts` (NOVO)

**Referência:** `usePayableBills.ts` (já implementado e testado)

**Estrutura:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Investment, CreateInvestmentInput, UpdateInvestmentInput } from '@/types/database.types';

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH: Buscar investimentos
  // ============================================
  const fetchInvestments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInvestments(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar investimentos:', err);
      setError(err.message);
      toast.error('Erro ao carregar investimentos');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ============================================
  // CREATE: Adicionar investimento
  // ============================================
  const addInvestment = async (input: CreateInvestmentInput): Promise<Investment | null> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      // Calcular total_invested
      const total_invested = input.quantity * input.purchase_price;
      const current_value = input.current_price 
        ? input.quantity * input.current_price 
        : total_invested;

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          type: input.type,
          name: input.name,
          ticker: input.ticker || null,
          quantity: input.quantity,
          purchase_price: input.purchase_price,
          current_price: input.current_price || null,
          total_invested,
          current_value,
          purchase_date: input.purchase_date || null,
          notes: input.notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchInvestments(); // Recarregar lista
      toast.success(`${input.name} adicionado ao portfólio!`);
      return data;
    } catch (err: any) {
      console.error('Erro ao adicionar investimento:', err);
      toast.error('Erro ao adicionar investimento');
      return null;
    }
  };

  // ============================================
  // UPDATE: Editar investimento
  // ============================================
  const updateInvestment = async (
    id: string, 
    input: UpdateInvestmentInput
  ): Promise<boolean> => {
    try {
      // Se alterou quantity ou purchase_price, recalcular total_invested
      let updates: any = { ...input };
      
      if (input.quantity !== undefined || input.purchase_price !== undefined) {
        const current = investments.find(i => i.id === id);
        if (current) {
          const newQty = input.quantity ?? current.quantity;
          const newPrice = input.purchase_price ?? current.purchase_price;
          updates.total_invested = newQty * newPrice;
          
          if (input.current_price !== undefined) {
            updates.current_value = newQty * input.current_price;
          }
        }
      }

      const { error } = await supabase
        .from('investments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchInvestments();
      toast.success('Investimento atualizado!');
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar investimento:', err);
      toast.error('Erro ao atualizar investimento');
      return false;
    }
  };

  // ============================================
  // DELETE: Remover investimento (soft delete)
  // ============================================
  const deleteInvestment = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('investments')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchInvestments();
      toast.success('Investimento removido!');
      return true;
    } catch (err: any) {
      console.error('Erro ao deletar investimento:', err);
      toast.error('Erro ao deletar investimento');
      return false;
    }
  };

  // ============================================
  // UPDATE PRICE: Atualizar cotação
  // ============================================
  const updatePrice = async (id: string, newPrice: number): Promise<boolean> => {
    try {
      const investment = investments.find(i => i.id === id);
      if (!investment) throw new Error('Investimento não encontrado');

      const current_value = investment.quantity * newPrice;

      const { error } = await supabase
        .from('investments')
        .update({ 
          current_price: newPrice,
          current_value,
        })
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchInvestments();
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar preço:', err);
      toast.error('Erro ao atualizar cotação');
      return false;
    }
  };

  // ============================================
  // EFFECT: Carregar ao montar
  // ============================================
  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  // ============================================
  // REALTIME: Subscription (opcional)
  // ============================================
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('investments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchInvestments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchInvestments]);

  return {
    investments,
    loading,
    error,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    updatePrice,
    refresh: fetchInvestments,
  };
}
```

**Validação:**
```typescript
// Teste rápido no console do navegador:
const { investments, loading } = useInvestments();
console.log('Investimentos:', investments);
console.log('Loading:', loading);
```

---

### **ETAPA 3: INTEGRAR HOOK NA PÁGINA (1-2h)**

**Objetivo:** Substituir mockData por dados reais

**Arquivo:** `src/pages/Investments.tsx`

**Mudanças:**

**ANTES (linha 4):**
```typescript
import { mockInvestments } from '@/utils/mockData';
```

**DEPOIS:**
```typescript
import { useInvestments } from '@/hooks/useInvestments';
```

**ANTES (linhas 8-18):**
```typescript
export function Investments() {
  const totalInvested = mockInvestments.reduce(
    (sum, inv) => sum + inv.average_price * inv.quantity,
    0
  );
  const totalCurrent = mockInvestments.reduce(
    (sum, inv) => sum + (inv.current_price || inv.average_price) * inv.quantity,
    0
  );
  const totalGain = totalCurrent - totalInvested;
  const percentGain = (totalGain / totalInvested) * 100;
```

**DEPOIS:**
```typescript
export function Investments() {
  const { investments, loading, addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando investimentos...</p>
        </div>
      </div>
    );
  }

  // Calcular totais
  const totalInvested = investments.reduce(
    (sum, inv) => sum + (inv.total_invested || 0),
    0
  );
  const totalCurrent = investments.reduce(
    (sum, inv) => sum + (inv.current_value || inv.total_invested || 0),
    0
  );
  const totalGain = totalCurrent - totalInvested;
  const percentGain = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
```

**ANTES (linha 117 - map):**
```typescript
{mockInvestments.map((investment) => {
  const totalInv = investment.average_price * investment.quantity;
  const totalCur = (investment.current_price || investment.average_price) * investment.quantity;
```

**DEPOIS:**
```typescript
{investments.map((investment) => {
  const totalInv = investment.total_invested || 0;
  const totalCur = investment.current_value || investment.total_invested || 0;
```

**ADICIONAR: Empty State (se investments.length === 0):**
```typescript
// Após o loading, antes dos cards
if (investments.length === 0) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Investimentos"
        subtitle="Acompanhe sua carteira de investimentos"
        icon={<TrendingUp size={24} />}
        actions={
          <Button size="sm">
            <Plus size={16} className="mr-1" />
            Novo Investimento
          </Button>
        }
      />
      <div className="p-6">
        <Card className="p-12 text-center">
          <div className="mb-4">
            <TrendingUp size={48} className="mx-auto text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhum investimento cadastrado</h3>
          <p className="text-gray-600 mb-6">
            Comece a construir seu portfólio adicionando seu primeiro investimento
          </p>
          <Button>
            <Plus size={16} className="mr-2" />
            Adicionar Primeiro Investimento
          </Button>
        </Card>
      </div>
    </div>
  );
}
```

---

### **ETAPA 4: TESTAR CRUD BÁSICO (1h)**

**Objetivo:** Garantir que todas operações funcionam

#### **Teste 1: CREATE (via Console do Dev Tools)**
```typescript
// Abrir console (F12) na página /investimentos
const hook = useInvestments();

// Adicionar investimento de teste
await hook.addInvestment({
  type: 'stock',
  name: 'Petrobras PN',
  ticker: 'PETR4',
  quantity: 100,
  purchase_price: 35.20,
  current_price: 38.50,
  purchase_date: new Date('2024-01-15'),
  notes: 'Primeira compra'
});

// ✅ Deve aparecer toast "Petrobras PN adicionado ao portfólio!"
// ✅ Deve aparecer na tabela automaticamente
```

#### **Teste 2: READ**
```typescript
// Verificar se aparece na lista
console.log(hook.investments);
// ✅ Deve conter o investimento criado
```

#### **Teste 3: UPDATE**
```typescript
// Pegar ID do primeiro investimento
const id = hook.investments[0].id;

// Atualizar preço
await hook.updatePrice(id, 40.00);
// ✅ Deve aparecer toast "Investimento atualizado!"
// ✅ Valor deve atualizar na tabela
```

#### **Teste 4: DELETE**
```typescript
// Deletar investimento
await hook.deleteInvestment(id);
// ✅ Deve aparecer toast "Investimento removido!"
// ✅ Deve sumir da tabela
```

---

### **ETAPA 5: VALIDAR RLS (30min)**

**Objetivo:** Garantir segurança dos dados

#### **Verificar Policies Existentes:**
```sql
-- Rodar no Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'investments';
```

**Resultado Esperado:**
```
✅ Policy "Enable read access for users" - SELECT
✅ Policy "Enable insert for users" - INSERT
✅ Policy "Enable update for users" - UPDATE
✅ Policy "Enable delete for users" - DELETE
```

#### **Teste de Segurança:**
```typescript
// 1. Tentar acessar investimentos de outro usuário (deve falhar)
const { data } = await supabase
  .from('investments')
  .select('*')
  .eq('user_id', 'outro-user-id'); // ❌ Deve retornar []

// 2. Tentar inserir com user_id diferente (deve falhar)
const { error } = await supabase
  .from('investments')
  .insert({
    user_id: 'outro-user-id', // ❌ Deve dar erro
    type: 'stock',
    name: 'Teste',
    quantity: 1,
    purchase_price: 10,
  });
// ✅ error.message deve conter "new row violates row-level security policy"
```

---

### **ETAPA 6: GARANTIR SEM ERROS (30min)**

**Objetivo:** Zero erros no console

#### **Checklist:**
- ✅ `pnpm dev` roda sem erros
- ✅ Página `/investimentos` carrega sem erros
- ✅ Console do navegador sem erros (F12)
- ✅ Network tab mostra requisições bem sucedidas (200)
- ✅ TypeScript sem erros: `pnpm tsc --noEmit`
- ✅ ESLint sem erros: `pnpm lint`

#### **Testes de Navegação:**
1. Acessar http://localhost:5173/investimentos
2. Verificar loading state (spinner)
3. Verificar lista vazia ou com dados
4. Verificar cards de resumo (totais)
5. Verificar tabela renderiza corretamente
6. Verificar responsividade (mobile/desktop)

---

## ✅ CRITÉRIOS DE SUCESSO - SPRINT 0 COMPLETO

### **Funcional:**
- ✅ Hook `useInvestments` criado e funcionando
- ✅ Página usa dados reais (não mockData)
- ✅ CREATE funciona (adicionar investimento)
- ✅ READ funciona (listar investimentos)
- ✅ UPDATE funciona (editar investimento)
- ✅ DELETE funciona (soft delete)
- ✅ RLS validado (segurança OK)

### **Técnico:**
- ✅ Types sincronizados com banco
- ✅ Zero erros no console
- ✅ TypeScript sem erros
- ✅ ESLint sem warnings
- ✅ Loading states implementados
- ✅ Empty state implementado
- ✅ Toasts de feedback funcionando

### **UX:**
- ✅ Página carrega rápido (< 2s)
- ✅ Feedback visual em todas ações
- ✅ Responsivo (mobile + desktop)
- ✅ Sem flickering ou jumps

---

## 🔥 RESULTADO FINAL

**Código de Validação:**
```typescript
// Se isso funcionar, SPRINT 0 está COMPLETO! 🎉

const { 
  investments,      // ✅ Array de investimentos reais do Supabase
  loading,          // ✅ Boolean do estado de carregamento
  addInvestment,    // ✅ Função para criar
  updateInvestment, // ✅ Função para editar
  deleteInvestment, // ✅ Função para deletar
  updatePrice,      // ✅ Função para atualizar cotação
  refresh           // ✅ Função para recarregar
} = useInvestments();

// investments vem do Supabase, NÃO de mockData ✅
// Usuário pode adicionar/editar/deletar investimentos reais ✅
```

---

## 📝 ENTREGÁVEIS

1. ✅ `src/types/database.types.ts` (atualizado)
2. ✅ `src/hooks/useInvestments.ts` (novo - ~300 linhas)
3. ✅ `src/pages/Investments.tsx` (atualizado)
4. ✅ Documentação deste Sprint

---

## 🚀 PRÓXIMO PASSO

Após Sprint 0 completo:
→ **SPRINT 1: Fundação** (5 dias)
  - Expandir database (4 tabelas novas)
  - Migrations
  - Functions SQL avançadas

**Posso começar a implementação agora?** 🎯
