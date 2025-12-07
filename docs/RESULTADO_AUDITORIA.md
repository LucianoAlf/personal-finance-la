# 🔍 RESULTADO DA AUDITORIA DO BANCO DE DADOS

**Data:** 15/11/2025  
**Executor:** Luciano Alf  
**Objetivo:** Identificar divergências entre Dashboard, Transações, Contas e Cartões

---

## 📋 DIVERGÊNCIAS REPORTADAS

### **Dashboard:**
- Saldo Total: R$ 12.648,82
- Receitas do Mês: R$ 17.699,80
- Despesas do Mês: R$ 9.905,30
- Cartões de Crédito: R$ 1.645,00

### **Página Transações:**
- Receitas do Mês: R$ 17.699,80 ✅ (IGUAL)
- Despesas do Mês: R$ 10.083,01 ❌ (DIFERENÇA: R$ 177,71)
- Saldo do Mês: R$ 7.616,79

### **Página Contas:**
- Saldo Total Geral: R$ 12.648,82 ✅ (IGUAL)
- Contas Bancárias: R$ 12.648,82
- Carteira/Dinheiro: R$ 0,00

### **Página Cartões:**
- Limite Total: R$ 26.000,00 ❌ (Widget mostra R$ 76.000,00 - DIFERENÇA: R$ 50.000,00)
- Limite Usado: R$ 1.095,00 ❌ (Widget mostra R$ 1.645,00 - DIFERENÇA: R$ 550,00)
- Limite Disponível: R$ 24.905,00 ❌ (Widget mostra R$ 74.355,00 - DIFERENÇA: R$ 49.905,00)
- Quantidade de Cartões: 2 ❌ (Widget mostra 4 - DIFERENÇA: 2 cartões)

---

## 🔍 AUDITORIA DO BANCO DE DADOS

### **QUERY 1.1 - Cartões Ativos:**

```sql
SELECT 
  id,
  name,
  bank_name,
  credit_limit,
  available_limit,
  (credit_limit - available_limit) as used_limit_calculado,
  is_active
FROM credit_cards
WHERE is_active = true
ORDER BY name;
```

**Resultado:**
| # | Nome | Brand | Últimos 4 | Limite | Disponível | Usado | Ativo | Arquivado |
|---|------|-------|-----------|--------|------------|-------|-------|-----------|
| 1 | _________ | _________ | _________ | _________ | _________ | _________ | _____ | _____ |
| 2 | _________ | _________ | _________ | _________ | _________ | _________ | _____ | _____ |
| 3 | _________ | _________ | _________ | _________ | _________ | _________ | _____ | _____ |
| 4 | _________ | _________ | _________ | _________ | _________ | _________ | _____ | _____ |

**Total de cartões ativos (não arquivados):** _____

---

### **QUERY 1.2 - Soma Total dos Cartões:**

```sql
SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(available_limit) as disponivel_total,
  SUM(credit_limit - available_limit) as usado_total
FROM credit_cards
WHERE is_active = true;
```

**Resultado:**
- **Total de Cartões:** _____
- **Limite Total:** R$ _____
- **Disponível Total:** R$ _____
- **Usado Total:** R$ _____

**Esperado (Página Cartões):**
- Total: 2
- Limite: R$ 26.000,00
- Usado: R$ 1.095,00
- Disponível: R$ 24.905,00

**Esperado (Widget Dashboard - ERRADO):**
- Total: 4
- Limite: R$ 76.000,00
- Usado: R$ 1.645,00
- Disponível: R$ 74.355,00

---

### **QUERY 2.1 - Contas Ativas:**

```sql
SELECT 
  id,
  name,
  bank_name,
  type,
  current_balance,
  is_active
FROM accounts
WHERE is_active = true
ORDER BY name;
```

**Resultado:**
| # | Nome | Banco | Tipo | Saldo | Ativo |
|---|------|-------|------|-------|-------|
| 1 | _________ | _________ | _________ | _________ | _____ |
| 2 | _________ | _________ | _________ | _________ | _____ |

---

### **QUERY 2.2 - Soma Total das Contas:**

```sql
SELECT 
  SUM(current_balance) as saldo_total
FROM accounts
WHERE is_active = true;
```

**Resultado:** R$ _____

**Esperado:** R$ 12.648,82 ✅

---

### **QUERY 3.1 - Transações do Mês (Novembro 2025):**

```sql
SELECT 
  type,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
GROUP BY type
ORDER BY type;
```

**Resultado:**
| Tipo | Quantidade | Total |
|------|------------|-------|
| income | _____ | R$ _____ |
| expense | _____ | R$ _____ |

**Esperado:**
- **Income:** R$ 17.699,80 ✅
- **Expense:** R$ 10.083,01 (Transações) OU R$ 9.905,30 (Dashboard)?

---

### **QUERY 3.3 - Soma EXATA das Despesas:**

```sql
SELECT 
  SUM(amount) as total_despesas_novembro_2025
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11;
```

**Resultado:** R$ _____

**Qual é o correto?**
- R$ 9.905,30 (Dashboard)
- R$ 10.083,01 (Transações)
- Outro valor?

---

### **QUERY 3.4 - Transações DELETADAS:**

```sql
SELECT 
  type,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND deleted_at IS NOT NULL
GROUP BY type;
```

**Resultado:**
- **Tem transações deletadas?** ⬜ SIM | ⬜ NÃO
- **Se SIM, quantas?** _____
- **Valor total deletado:** R$ _____

**⚠️ IMPORTANTE:** Se houver transações deletadas, pode ser a causa da divergência!

---

### **QUERY 4.1 - Cartões com Mesmo Nome (Duplicatas):**

```sql
SELECT 
  name,
  COUNT(*) as quantidade,
  STRING_AGG(CAST(id AS TEXT), ', ') as ids
FROM credit_cards
WHERE is_active = true
GROUP BY name
HAVING COUNT(*) > 1;
```

**Resultado:**
- **Tem duplicatas?** ⬜ SIM | ⬜ NÃO
- **Se SIM, quais?** _____________________

---

### **QUERY 4.2 - Cartões INATIVOS:**

```sql
SELECT 
  id,
  name,
  bank_name,
  credit_limit,
  available_limit,
  is_active
FROM credit_cards
WHERE is_active = false
ORDER BY created_at DESC;
```

**Resultado:**
| # | Nome | Brand | Últimos 4 | Limite | Disponível | Ativo | Arquivado |
|---|------|-------|-----------|--------|------------|-------|-----------|
| 1 | _________ | _________ | _________ | _________ | _________ | _____ | _____ |
| 2 | _________ | _________ | _________ | _________ | _________ | _____ | _____ |

**Total de cartões inativos ou arquivados:** _____

**⚠️ HIPÓTESE PRINCIPAL:** Widget do Dashboard pode estar somando cartões inativos ou arquivados!

---

### **QUERY 4.3 - Contas do Tipo CREDIT_CARD:**

```sql
SELECT 
  id,
  name,
  type,
  current_balance
FROM accounts
WHERE type = 'credit_card'
  AND is_active = true;
```

**Resultado:**
- **Tem contas do tipo credit_card?** ⬜ SIM | ⬜ NÃO
- **Se SIM, quantas?** _____

**⚠️ IMPORTANTE:** Cartões devem estar em `credit_cards`, NÃO em `accounts`!

---

### **QUERY 5.1 - Diferença de R$ 177,71:**

```sql
WITH despesas_dashboard AS (
  SELECT SUM(amount) as total
  FROM transactions
  WHERE type = 'expense'
    AND EXTRACT(YEAR FROM transaction_date) = 2025
    AND EXTRACT(MONTH FROM transaction_date) = 11
)
SELECT 
  total as total_real,
  9905.30 as total_dashboard,
  (total - 9905.30) as diferenca
FROM despesas_dashboard;
```

**Resultado:**
- **Total Real:** R$ _____
- **Total Dashboard:** R$ 9.905,30
- **Diferença:** R$ _____

**Qual transação está causando isso?** _____________________

---

### **QUERY 5.2 - Transações Suspeitas:**

```sql
SELECT 
  id,
  description,
  amount,
  type,
  transaction_date,
  deleted_at
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND (
    amount > 1000
    OR amount = 177.71
    OR deleted_at IS NOT NULL
  )
ORDER BY amount DESC;
```

**Resultado:**
| ID | Descrição | Valor | Tipo | Data | Deletada? |
|----|-----------|-------|------|------|-----------|
| ___ | _________ | _____ | ____ | ____ | _________ |

---

## 📊 DIAGNÓSTICO

### **🔴 PROBLEMA #1: Divergência nas Despesas do Mês**

**Dashboard:** R$ 9.905,30  
**Transações:** R$ 10.083,01  
**Diferença:** R$ 177,71

**Causa Provável:**
- [ ] Transação deletada não filtrada no Dashboard
- [ ] Transação com data duplicada
- [ ] Transação em outra moeda
- [ ] Bug no cálculo do Dashboard
- [ ] Outro: _____________________

**Solução:**
```
________________________________________
________________________________________
```

---

### **🔴 PROBLEMA #2: Widget de Cartões Completamente Errado**

**Widget Dashboard:**
- Limite: R$ 76.000,00
- Usado: R$ 1.645,00
- Disponível: R$ 74.355,00
- Cartões: 4

**Página Cartões (CORRETO):**
- Limite: R$ 26.000,00
- Usado: R$ 1.095,00
- Disponível: R$ 24.905,00
- Cartões: 2

**Diferenças:**
- Limite: +R$ 50.000,00
- Usado: +R$ 550,00
- Disponível: +R$ 49.905,00
- Cartões: +2

**Causa Provável:**
- [ ] Widget somando cartões inativos
- [ ] Widget somando cartões duplicados
- [ ] Widget usando cache antigo (React Query)
- [ ] Widget usando query diferente da página
- [ ] Bug no cálculo do Widget
- [ ] Outro: _____________________

**Solução:**
```
________________________________________
________________________________________
```

---

## ✅ AÇÕES CORRETIVAS

### **CORREÇÃO #1: Despesas do Mês**

**Arquivo:** `src/pages/Dashboard.tsx` (linha 84-108)

**Problema:**
```typescript
const totalExpenses = filteredTransactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + Number(t.amount), 0);
```

**Possível Fix:**
```typescript
const totalExpenses = filteredTransactions
  .filter(t => t.type === 'expense' && t.deleted_at === null) // Filtrar deletadas
  .reduce((sum, t) => sum + Number(t.amount), 0);
```

---

### **CORREÇÃO #2: Widget de Cartões**

**Arquivo:** `src/components/creditcards/CreditCardsWidget.tsx` (linha 13-29)

**Problema:**
- Widget pode estar usando dados de cartões inativos
- Widget pode estar duplicando cartões

**Possível Fix:**
```typescript
// Adicionar filtro is_active no hook useCreditCardsQuery
const { data, error } = await supabase
  .from('credit_cards')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_active', true) // ✅ Garantir apenas ativos
  .order('name');
```

---

### **CORREÇÃO #3: Limpar Cache React Query**

**Ação:**
1. Abrir DevTools (F12)
2. Console
3. Executar: `localStorage.clear()`
4. Atualizar página (F5)

**OU**

**Arquivo:** Onde for necessário

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidar queries
queryClient.invalidateQueries({ queryKey: ['creditCards'] });
```

---

## 📝 CONCLUSÃO

**Total de divergências encontradas:** _____

**Divergências críticas (bloqueadoras):** _____

**Divergências menores:** _____

**Status:** ⬜ AUDITORIA COMPLETA | ⬜ AUDITORIA PARCIAL | ⬜ AUDITORIA PENDENTE

**Próximos passos:**
1. [ ] Implementar correções
2. [ ] Testar no frontend
3. [ ] Validar dados novamente
4. [ ] Atualizar documentação

---

**Assinatura:** _____________________  
**Data:** 15/11/2025
