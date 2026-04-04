# 📈 ARQUITETURA: METAS DE INVESTIMENTO

**Data:** 11/11/2025  
**Status:** Planejamento Completo  
**Objetivo:** Sistema de metas de investimento com juros compostos e projeções

---

## 🎯 CONCEITO: METAS DE INVESTIMENTO

### **O Que São?**
Metas de longo prazo focadas em **crescer patrimônio** através de investimentos com rentabilidade.

### **Diferença das Metas de Economia:**
| Aspecto | Meta de Economia | Meta de Investimento |
|---------|------------------|---------------------|
| **Prazo** | Curto/Médio (meses) | Longo (anos/décadas) |
| **Liquidez** | Alta (poupança) | Baixa (aplicado) |
| **Cálculo** | Linear (soma simples) | Juros compostos |
| **Foco** | Juntar dinheiro | Crescer patrimônio |
| **Aporte** | Quando sobra | Fixo mensal |
| **Rentabilidade** | Não considera | Essencial (%) |

### **Exemplos:**
- 🏖️ Aposentadoria: R$ 1M em 20 anos (8% a.a.)
- 🏠 Independência Financeira: R$ 500K em 15 anos
- 🎓 Faculdade dos Filhos: R$ 200K em 10 anos
- 💰 Reserva de Oportunidades: R$ 100K em 5 anos

---

## 🗄️ DATABASE: NOVA TABELA

### **Tabela: `investment_goals`**

```sql
CREATE TABLE investment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Básico
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'retirement',        -- Aposentadoria
    'financial_freedom', -- Independência Financeira
    'education',         -- Educação
    'real_estate',       -- Imóvel
    'general'            -- Geral
  )),
  
  -- Valores e Prazos
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC DEFAULT 0 CHECK (current_amount >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  
  -- Rentabilidade e Aportes
  expected_return_rate NUMERIC NOT NULL CHECK (expected_return_rate >= 0 AND expected_return_rate <= 100),
  monthly_contribution NUMERIC DEFAULT 0 CHECK (monthly_contribution >= 0),
  contribution_day INTEGER CHECK (contribution_day >= 1 AND contribution_day <= 28),
  
  -- Vinculação com Investimentos
  linked_investments UUID[] DEFAULT '{}', -- IDs de investments
  auto_invest BOOLEAN DEFAULT false,
  
  -- Status e Prioridade
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Notificações
  notify_milestones BOOLEAN DEFAULT true,
  notify_contribution BOOLEAN DEFAULT false,
  notify_rebalancing BOOLEAN DEFAULT false,
  
  -- UI
  icon TEXT,
  color TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_investment_goals_user ON investment_goals(user_id);
CREATE INDEX idx_investment_goals_status ON investment_goals(status) WHERE status = 'active';
CREATE INDEX idx_investment_goals_target_date ON investment_goals(target_date);

-- RLS
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_goals_select_own ON investment_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY investment_goals_insert_own ON investment_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY investment_goals_update_own ON investment_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY investment_goals_delete_own ON investment_goals FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER investment_goals_updated_at
  BEFORE UPDATE ON investment_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 📊 CÁLCULOS: JUROS COMPOSTOS

### **Fórmula Principal:**
```
VF = VP × (1 + i)^n + PMT × [((1 + i)^n - 1) / i]

Onde:
VF  = Valor Futuro (target_amount)
VP  = Valor Presente (current_amount)
i   = Taxa mensal (expected_return_rate / 12 / 100)
n   = Número de meses
PMT = Aporte mensal (monthly_contribution)
```

### **Function: `calculate_investment_projection()`**

```sql
CREATE OR REPLACE FUNCTION calculate_investment_projection(
  p_current_amount NUMERIC,
  p_monthly_contribution NUMERIC,
  p_annual_rate NUMERIC,
  p_months INTEGER
)
RETURNS TABLE (
  month INTEGER,
  contribution NUMERIC,
  interest NUMERIC,
  balance NUMERIC
) AS $$
DECLARE
  v_monthly_rate NUMERIC;
  v_balance NUMERIC;
  v_month INTEGER;
  v_interest NUMERIC;
BEGIN
  v_monthly_rate := p_annual_rate / 12 / 100;
  v_balance := p_current_amount;
  
  FOR v_month IN 1..p_months LOOP
    v_interest := v_balance * v_monthly_rate;
    v_balance := v_balance + v_interest + p_monthly_contribution;
    
    RETURN QUERY SELECT 
      v_month,
      p_monthly_contribution,
      v_interest,
      v_balance;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 🎨 UI/UX: COMPONENTES

### **1. InvestmentGoalCard**
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
        <TrendingUp className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3>Aposentadoria</h3>
        <p className="text-sm text-muted-foreground">
          Independência Financeira
        </p>
      </div>
    </div>
  </CardHeader>
  
  <CardContent>
    {/* Progress Bar */}
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span>R$ 120.000</span>
        <span className="text-muted-foreground">R$ 1.000.000</span>
      </div>
      <Progress value={12} className="h-2" />
      <p className="text-xs text-muted-foreground mt-1">12% alcançado</p>
    </div>
    
    {/* Métricas */}
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-muted-foreground">Rentabilidade</p>
        <p className="font-semibold text-green-600">+8% a.a.</p>
      </div>
      <div>
        <p className="text-muted-foreground">Aporte Mensal</p>
        <p className="font-semibold">R$ 2.000</p>
      </div>
      <div>
        <p className="text-muted-foreground">Prazo Restante</p>
        <p className="font-semibold">18 anos</p>
      </div>
      <div>
        <p className="text-muted-foreground">Projeção</p>
        <p className="font-semibold">Dez/2042</p>
      </div>
    </div>
    
    {/* Status */}
    <div className="mt-4 flex items-center gap-2">
      <Badge variant="success">
        <CheckCircle className="h-3 w-3 mr-1" />
        No Caminho Certo
      </Badge>
    </div>
  </CardContent>
  
  <CardFooter>
    <Button variant="ghost" size="sm">Ver Projeção</Button>
    <Button variant="ghost" size="sm">Editar</Button>
  </CardFooter>
</Card>
```

### **2. InvestmentGoalDialog (Criar/Editar)**
**Abas:**
1. **Básico:** Nome, categoria, ícone
2. **Valores:** Valor alvo, valor atual, prazo
3. **Rentabilidade:** Taxa esperada, aporte mensal, dia
4. **Investimentos:** Vincular investimentos existentes
5. **Notificações:** Marcos, aportes, rebalanceamento

### **3. InvestmentProjectionChart**
Gráfico de linha mostrando:
- Linha azul: Projeção com aportes
- Linha verde: Apenas rendimento
- Linha pontilhada: Meta
- Área preenchida: Contribuições acumuladas

---

## 🔗 INTEGRAÇÃO COM INVESTIMENTOS

### **Vinculação Automática:**
```typescript
// Quando criar aporte em investimento vinculado
const handleInvestmentContribution = async (
  investmentId: string,
  amount: number
) => {
  // 1. Registrar transação no investment
  await createInvestmentTransaction({
    investment_id: investmentId,
    type: 'buy',
    amount,
  });
  
  // 2. Atualizar metas vinculadas
  const linkedGoals = await getGoalsByInvestment(investmentId);
  
  for (const goal of linkedGoals) {
    await updateGoalCurrentAmount(goal.id, amount);
  }
};
```

### **Auto-Invest:**
Se `auto_invest = true`:
- Todo dia X do mês (contribution_day)
- Cria transação automática nos investimentos vinculados
- Atualiza current_amount da meta
- Envia notificação de confirmação

---

## 📱 DROPDOWN "NOVA META" ATUALIZADO

```tsx
<DropdownMenuContent align="end" className="w-72">
  <DropdownMenuItem onClick={() => openGoalDialog('savings')}>
    <PiggyBank className="h-4 w-4 mr-2 text-blue-500" />
    <div>
      <div className="font-medium">Meta de Economia</div>
      <div className="text-xs text-muted-foreground">
        Economizar para um objetivo
      </div>
    </div>
  </DropdownMenuItem>
  
  <DropdownMenuItem onClick={() => openGoalDialog('spending')}>
    <Shield className="h-4 w-4 mr-2 text-orange-500" />
    <div>
      <div className="font-medium">Meta de Gasto</div>
      <div className="text-xs text-muted-foreground">
        Limitar gastos por categoria
      </div>
    </div>
  </DropdownMenuItem>
  
  <DropdownMenuItem onClick={() => openGoalDialog('investment')}>
    <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
    <div>
      <div className="font-medium">Meta de Investimento</div>
      <div className="text-xs text-muted-foreground">
        Crescer patrimônio com rentabilidade
      </div>
    </div>
  </DropdownMenuItem>
</DropdownMenuContent>
```

---

## 📋 ROADMAP DE IMPLEMENTAÇÃO

### **FASE 1: Database (1h)**
- ✅ Criar tabela `investment_goals`
- ✅ Criar function `calculate_investment_projection()`
- ✅ Configurar RLS e triggers

### **FASE 2: Types & Hooks (1h)**
- ✅ Criar interfaces TypeScript
- ✅ Hook `useInvestmentGoals()` (CRUD + realtime)
- ✅ Hook `useInvestmentProjection()` (cálculos)

### **FASE 3: Componentes (2h)**
- ✅ `InvestmentGoalCard`
- ✅ `InvestmentGoalDialog` (5 abas)
- ✅ `InvestmentProjectionChart` (Chart.js)
- ✅ `InvestmentGoalsList`

### **FASE 4: Integração (1h)**
- ✅ Adicionar tab "Investimentos" em Goals.tsx
- ✅ Atualizar dropdown "Nova Meta"
- ✅ Vincular com investments existentes
- ✅ Auto-invest logic

### **FASE 5: Features Avançadas (1h)**
- ✅ Rebalanceamento sugerido
- ✅ Simulador de cenários
- ✅ Comparação com CDI/IPCA
- ✅ Notificações inteligentes

**Tempo Total:** ~6 horas

---

## 🎯 FEATURES KILLER

### **1. Projeção Interativa**
Slider para simular:
- "E se eu aumentar o aporte para R$ 3.000?"
- "E se a rentabilidade for 10%?"
- "E se eu antecipar 2 anos?"

### **2. Comparação com Benchmarks**
- CDI: 13,65% a.a.
- IPCA: 4,5% a.a.
- Poupança: 6,17% a.a.
- Sua meta: 8% a.a. ✅ Acima da inflação

### **3. Rebalanceamento Inteligente**
Ana Clara sugere:
> "Sua meta de Aposentadoria está 15% abaixo do esperado. Sugestão: Aumentar aporte mensal de R$ 2.000 para R$ 2.300 OU buscar investimentos com rentabilidade 1% maior."

### **4. Auto-Invest**
- Integração com investments
- Aportes automáticos mensais
- Diversificação automática (se múltiplos investimentos vinculados)

---

## ✅ CHECKLIST DE ENTREGA

- [ ] Tabela `investment_goals` criada
- [ ] Function `calculate_investment_projection()` criada
- [ ] Types TypeScript definidos
- [ ] Hook `useInvestmentGoals()` implementado
- [ ] Hook `useInvestmentProjection()` implementado
- [ ] Componente `InvestmentGoalCard` criado
- [ ] Componente `InvestmentGoalDialog` criado (5 abas)
- [ ] Componente `InvestmentProjectionChart` criado
- [ ] Tab "Investimentos" adicionada em Goals.tsx
- [ ] Dropdown "Nova Meta" atualizado
- [ ] Integração com investments testada
- [ ] Auto-invest funcionando
- [ ] Documentação completa
- [ ] Testes manuais realizados

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar arquitetura** ✅ (você decide)
2. **Executar FASE 1** (Database)
3. **Executar FASE 2** (Types & Hooks)
4. **Executar FASE 3** (Componentes)
5. **Executar FASE 4** (Integração)
6. **Executar FASE 5** (Features Avançadas)

**Pronto para começar?** 🎯
