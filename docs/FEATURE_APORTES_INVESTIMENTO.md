# 💰 FEATURE: Aportes em Metas de Investimento

**Data:** 11/11/2025  
**Status:** Planejamento  
**Prioridade:** Alta (UX essencial)

---

## 🎯 CONCEITO

Adicionar funcionalidade de **registrar aportes** nas metas de investimento, similar ao sistema de contribuições das metas de economia.

### **Por Que Faz Sentido?**
✅ **Consistência:** Metas de economia já têm contribuições  
✅ **Tracking Real:** Usuário registra aportes conforme faz  
✅ **Histórico:** Ver evolução dos aportes ao longo do tempo  
✅ **Motivação:** Gamificação e progresso visual  
✅ **Realidade:** Nem sempre o aporte é fixo mensal

---

## 🎨 UX PROPOSTA

### **1. Botão no Card**
```
┌─────────────────────────────────────┐
│ 🏖️ Aposentadoria Tranquila          │
│ Progress: 5% (R$ 50K / R$ 1M)       │
│                                     │
│ [Editar] [Aportar] [Deletar]       │
└─────────────────────────────────────┘
```

**Posição:** Entre "Editar" e "Deletar"  
**Ícone:** `TrendingUp` ou `Plus`  
**Cor:** Verde (ação positiva)

---

### **2. Dialog de Aporte**

```tsx
┌─────────────────────────────────────┐
│ 💰 Registrar Aporte                 │
│ Meta: Aposentadoria Tranquila       │
├─────────────────────────────────────┤
│                                     │
│ Valor do Aporte (R$) *              │
│ [R$ 3.500,00]                       │
│                                     │
│ Data do Aporte                      │
│ [11/11/2025] 📅                     │
│                                     │
│ Observação (opcional)               │
│ [Aporte mensal de novembro]         │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 📊 Novo Progresso            │    │
│ │ Atual: R$ 50.000             │    │
│ │ Aporte: +R$ 3.500            │    │
│ │ Novo Total: R$ 53.500 (5,4%) │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Cancelar] [Registrar Aporte]      │
└─────────────────────────────────────┘
```

**Features:**
- Preview do novo total
- Validação: valor > 0
- Data default: hoje
- Observação opcional
- Animação de sucesso ao salvar

---

### **3. Histórico de Aportes (Opcional)**

Adicionar uma seção no Dialog de Edição:

```tsx
Aba 5: Histórico de Aportes
├─ Lista dos últimos 10 aportes
├─ Data, Valor, Observação
├─ Total aportado no mês/ano
└─ Gráfico de evolução (Chart.js)
```

---

## 🗄️ DATABASE

### **Tabela: `investment_goal_contributions`**

```sql
CREATE TABLE investment_goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES investment_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Aporte
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_investment_contributions_goal ON investment_goal_contributions(goal_id);
CREATE INDEX idx_investment_contributions_user ON investment_goal_contributions(user_id);
CREATE INDEX idx_investment_contributions_date ON investment_goal_contributions(date DESC);

-- RLS
ALTER TABLE investment_goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contributions_select_own ON investment_goal_contributions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY contributions_insert_own ON investment_goal_contributions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY contributions_delete_own ON investment_goal_contributions 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger: Atualizar current_amount da meta
CREATE OR REPLACE FUNCTION update_investment_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Adicionar aporte ao current_amount
    UPDATE investment_goals
    SET current_amount = current_amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remover aporte do current_amount
    UPDATE investment_goals
    SET current_amount = current_amount - OLD.amount,
        updated_at = NOW()
    WHERE id = OLD.goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investment_contribution_update_goal
  AFTER INSERT OR DELETE ON investment_goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_goal_amount();
```

---

## 📊 TYPES TYPESCRIPT

```typescript
// src/types/investment-goals.types.ts

export interface InvestmentGoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  date: string; // ISO date
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContributionInput {
  goal_id: string;
  amount: number;
  date?: string; // Default: hoje
  note?: string;
}
```

---

## 🔧 HOOK: `useInvestmentGoals`

Adicionar métodos:

```typescript
// Adicionar contribuição
const addContribution = useCallback(async (input: CreateContributionInput): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('investment_goal_contributions')
      .insert({
        user_id: user.id,
        goal_id: input.goal_id,
        amount: input.amount,
        date: input.date || new Date().toISOString().split('T')[0],
        note: input.note,
      });

    if (error) throw error;

    // O trigger já atualiza current_amount automaticamente
    toast.success(`Aporte de ${formatCurrency(input.amount)} registrado!`);
    return true;
  } catch (err: any) {
    console.error('Error adding contribution:', err);
    toast.error(err.message || 'Erro ao registrar aporte');
    return false;
  }
}, []);

// Buscar histórico de contribuições
const getContributionHistory = useCallback(async (goalId: string) => {
  try {
    const { data, error } = await supabase
      .from('investment_goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('date', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.error('Error fetching contributions:', err);
    return [];
  }
}, []);

// Retornar nos exports
return {
  // ... existing
  addContribution,
  getContributionHistory,
};
```

---

## 🎨 COMPONENTE: `ContributionDialog`

```tsx
// src/components/investment-goals/ContributionDialog.tsx

interface ContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: InvestmentGoal;
  onSave: (input: CreateContributionInput) => Promise<boolean>;
}

export function ContributionDialog({ open, onOpenChange, goal, onSave }: ContributionDialogProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const newTotal = goal.current_amount + parseFloat(amount || '0');
  const newPercentage = (newTotal / goal.target_amount) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const success = await onSave({
      goal_id: goal.id,
      amount: parseFloat(amount),
      date,
      note: note || undefined,
    });

    if (success) {
      onOpenChange(false);
      setAmount('');
      setNote('');
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Registrar Aporte
          </DialogTitle>
          <DialogDescription>
            Meta: {goal.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Aporte (R$) *</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 3.500,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data do Aporte</Label>
            <DatePickerInput
              value={date}
              onChange={setDate}
              placeholder="Selecione a data"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Input
              id="note"
              placeholder="Ex: Aporte mensal de novembro"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="font-semibold">Novo Progresso</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atual:</span>
                  <span>{formatCurrency(goal.current_amount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Aporte:</span>
                  <span>+{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Novo Total:</span>
                  <span>{formatCurrency(newTotal)} ({newPercentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !amount || parseFloat(amount) <= 0}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Aporte'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔄 INTEGRAÇÃO NO CARD

```tsx
// InvestmentGoalCard.tsx

interface InvestmentGoalCardProps {
  goal: InvestmentGoal;
  onEdit?: (goal: InvestmentGoal) => void;
  onContribute?: (goal: InvestmentGoal) => void; // NOVO
  onDelete?: (id: string) => void;
}

// No CardFooter
<CardFooter className="flex gap-2">
  <Button variant="ghost" size="sm" onClick={() => onEdit?.(goal)}>
    <Edit className="h-4 w-4 mr-2" />
    Editar
  </Button>
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => onContribute?.(goal)}
    className="text-green-600 hover:text-green-700 hover:bg-green-50"
  >
    <TrendingUp className="h-4 w-4 mr-2" />
    Aportar
  </Button>
  <Button variant="ghost" size="sm" onClick={handleDelete}>
    <Trash2 className="h-4 w-4 mr-2" />
    Deletar
  </Button>
</CardFooter>
```

---

## 📋 ROADMAP DE IMPLEMENTAÇÃO

### **FASE 1: Database (30min)**
- [ ] Criar tabela `investment_goal_contributions`
- [ ] Criar trigger para atualizar `current_amount`
- [ ] Configurar RLS policies

### **FASE 2: Types & Hook (20min)**
- [ ] Adicionar interfaces no `investment-goals.types.ts`
- [ ] Adicionar `addContribution()` no hook
- [ ] Adicionar `getContributionHistory()` no hook

### **FASE 3: Componente (40min)**
- [ ] Criar `ContributionDialog.tsx`
- [ ] Preview do novo total
- [ ] Validação de formulário

### **FASE 4: Integração (20min)**
- [ ] Adicionar botão "Aportar" no `InvestmentGoalCard`
- [ ] Adicionar estado e handlers em `Goals.tsx`
- [ ] Testar fluxo completo

### **FASE 5 (Opcional): Histórico (1h)**
- [ ] Aba "Histórico" no `InvestmentGoalDialog`
- [ ] Lista de contribuições
- [ ] Gráfico de evolução (Chart.js)

**Tempo Total:** ~2 horas (sem histórico) | ~3 horas (com histórico)

---

## ✅ BENEFÍCIOS

### **Para o Usuário:**
- ✅ Registra aportes reais (não apenas planejados)
- ✅ Vê progresso atualizar em tempo real
- ✅ Histórico completo de contribuições
- ✅ Motivação visual (gamificação)

### **Para o Sistema:**
- ✅ Dados mais precisos
- ✅ Ana Clara pode dar insights melhores
- ✅ Consistência com metas de economia
- ✅ Trigger automático (sem lógica manual)

---

## 🎯 DECISÃO

**Recomendação:** ✅ **IMPLEMENTAR**

**Prioridade:** Alta  
**Complexidade:** Média  
**Impacto UX:** Alto  
**Tempo:** ~2-3 horas

**Próximo Passo:** Aprovar e iniciar FASE 1 (Database)

---

## 💡 EXTRAS (Futuro)

- [ ] Aportes recorrentes automáticos
- [ ] Lembrete de aporte (notificação no dia X)
- [ ] Meta de aporte mensal vs real
- [ ] Comparação: aportes planejados vs realizados
- [ ] Exportar histórico (CSV/PDF)
- [ ] Gráfico de evolução patrimonial

**Quer que eu implemente agora?** 🚀
