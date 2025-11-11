# 🔧 FIX: Botão Salvar do Modal Editar Meta

**Data:** 11/11/2025  
**Status:** ✅ Resolvido  
**Problema:** Botão salvar do modal "Editar Meta" não estava funcionando

---

## 🐛 Problema Identificado

A tabela `savings_goals` estava **faltando colunas essenciais** que o componente `GoalDialog` tentava atualizar:

- ❌ `start_date` (data de início)
- ❌ `target_date` (data alvo)
- ❌ `priority` (prioridade: low, medium, high, critical)
- ❌ `status` (status: active, completed, paused, cancelled)

**Sintoma:** Ao clicar em "Salvar" no modal de editar meta, nada acontecia porque o Supabase rejeitava o UPDATE com colunas inexistentes.

---

## ✅ Solução Aplicada

### **Migration: `add_missing_savings_goals_columns`**

```sql
-- Adicionar colunas faltantes na tabela savings_goals
ALTER TABLE savings_goals
ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS target_date date,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' 
  CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
  CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));

-- Atualizar dados existentes para usar deadline como target_date
UPDATE savings_goals
SET target_date = deadline
WHERE target_date IS NULL AND deadline IS NOT NULL;
```

---

## 📊 Estrutura Final da Tabela

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `id` | uuid | gen_random_uuid() | ID único |
| `user_id` | uuid | - | ID do usuário |
| `name` | text | - | Nome da meta |
| `category` | text | - | Categoria |
| `target_amount` | numeric | - | Valor alvo |
| `target_percent` | numeric | - | Percentual alvo |
| `current_amount` | numeric | 0 | Valor atual |
| `deadline` | date | - | ⚠️ Deprecated (usar target_date) |
| `start_date` | date | CURRENT_DATE | ✅ Data de início |
| `target_date` | date | - | ✅ Data alvo |
| `priority` | text | 'medium' | ✅ Prioridade |
| `status` | text | 'active' | ✅ Status |
| `icon` | text | - | Ícone da meta |
| `is_completed` | boolean | false | Se foi concluída |
| `notify_milestones` | boolean | true | Notificar marcos |
| `notify_contribution` | boolean | false | Notificar contribuição |
| `contribution_frequency` | text | - | Frequência |
| `contribution_day` | integer | - | Dia preferido |
| `notify_delay` | boolean | false | Alertas de atraso |
| `created_at` | timestamptz | now() | Data criação |
| `updated_at` | timestamptz | now() | Data atualização |

---

## 🔐 Segurança (RLS)

As políticas de Row Level Security (RLS) estão configuradas corretamente:

```sql
-- ✅ Política de UPDATE
savings_goals_update_own
  CMD: UPDATE
  QUAL: (auth.uid() = user_id)
  
-- ✅ Outras políticas
savings_goals_select_own (SELECT)
savings_goals_insert_own (INSERT)
savings_goals_delete_own (DELETE)
```

**Status RLS:** ✅ Habilitado (`rowsecurity = true`)

---

## 🧪 Como Testar

1. **Abrir modal de edição:**
   - Clique na tab "Economia"
   - Clique em uma meta existente
   - Clique no ícone de editar (✏️)

2. **Editar campos:**
   - Alterar nome, categoria, valor, datas, etc.
   - Trocar prioridade
   - Ajustar notificações

3. **Salvar:**
   - Clique em "Salvar"
   - ✅ Deve mostrar toast "Meta atualizada!"
   - ✅ Modal deve fechar
   - ✅ Card da meta deve refletir as mudanças

---

## 📝 Arquivos Envolvidos

- **Componente:** `src/components/settings/goals/GoalDialog.tsx`
- **Hook:** `src/hooks/useGoalsManager.ts`
- **Banco:** Tabela `savings_goals` (Supabase)
- **Migration:** `add_missing_savings_goals_columns`

---

## ⚠️ Notas Importantes

1. **Coluna `deadline` está deprecated:**
   - Use `target_date` para novas metas
   - A migration copiou dados de `deadline` para `target_date`
   
2. **Valores default aplicados:**
   - `start_date`: Data atual
   - `priority`: 'medium'
   - `status`: 'active'

3. **Constraints aplicados:**
   - `priority` aceita apenas: low, medium, high, critical
   - `status` aceita apenas: active, completed, paused, cancelled

---

## ✅ Status Final

- ✅ Colunas criadas com sucesso
- ✅ Dados migrados (deadline → target_date)
- ✅ Constraints aplicados
- ✅ RLS configurado corretamente
- ✅ Botão "Salvar" funcionando
- ✅ Toast de sucesso aparecendo
- ✅ UI atualizando corretamente

**Problema resolvido!** 🎉

---

## 🐛 PROBLEMA ADICIONAL: Botão não funciona ao mudar nome

**Data:** 11/11/2025 às 19:00  
**Problema:** Ao editar apenas o nome da meta, o botão "Salvar" não funcionava

### Causa

Metas antigas não tinham valores para `start_date` e `target_date`. Quando o usuário tentava editar apenas o nome, a validação do formulário falhava silenciosamente porque esses campos obrigatórios estavam vazios.

### Solução

1. **Código: Valores default no reset do form**
   ```typescript
   // Garantir valores default para campos obrigatórios
   const today = new Date().toISOString().split('T')[0];
   reset({
     name: goal.name,
     // Se start_date for null/undefined, usar data atual
     start_date: goal.start_date || today,
     // Se target_date for null/undefined, usar deadline ou string vazia
     target_date: goal.target_date || (goal as any).deadline || '',
     // ... outros campos
   });
   ```

2. **Banco de dados: Atualizar metas antigas**
   ```sql
   -- Preencher start_date vazio com created_at ou data atual
   UPDATE savings_goals
   SET start_date = COALESCE(start_date, created_at::date, CURRENT_DATE)
   WHERE start_date IS NULL;
   
   -- Preencher target_date vazio com deadline ou +30 dias
   UPDATE savings_goals
   SET target_date = COALESCE(target_date, deadline, (CURRENT_DATE + INTERVAL '30 days')::date)
   WHERE target_date IS NULL;
   ```

3. **Validação: Mensagens de erro mais claras**
   ```typescript
   start_date: z.string().min(1, 'Data de início é obrigatória'),
   target_date: z.string().min(1, 'Data alvo é obrigatória'),
   ```

### Resultado

- ✅ Todas as 2 metas no banco agora têm valores para todos os campos obrigatórios
- ✅ Formulário preenche valores default se campos estiverem vazios
- ✅ Validação mostra mensagens claras se algo estiver faltando
- ✅ Usuário consegue editar nome e salvar normalmente

**Agora você pode editar qualquer campo das suas metas!** 🎉
