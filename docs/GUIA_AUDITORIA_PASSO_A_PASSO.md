# 🔍 GUIA DE AUDITORIA PASSO A PASSO

**Objetivo:** Auditar o banco de dados e identificar divergências entre as páginas do sistema.

**Duração estimada:** 15-20 minutos

---

## 📋 PRÉ-REQUISITOS

- [ ] Acesso ao Supabase Dashboard
- [ ] Projeto: `sbnpmhmvcspwcyjhftlw`
- [ ] Arquivos abertos:
  - `docs/AUDITORIA_BANCO_DADOS.sql` (queries)
  - `docs/RESULTADO_AUDITORIA.md` (template para anotar)

---

## 🚀 PASSO 1: ACESSAR SUPABASE SQL EDITOR

1. Abra: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw
2. No menu lateral, clique em **SQL Editor**
3. Clique em **+ New query**

---

## 🔍 PASSO 2: AUDITAR CARTÕES DE CRÉDITO

### **Query 1.1 - Listar Cartões Ativos**

Copie e execute:

```sql
SELECT 
  id,
  name,
  bank_name,
  credit_limit,
  available_limit,
  (credit_limit - available_limit) as used_limit_calculado,
  is_active,
  created_at
FROM credit_cards
WHERE is_active = true
ORDER BY name;
```

**O que anotar:**
- Quantos cartões estão ativos?
- Quais são os nomes?
- Valores de `credit_limit`, `available_limit` e `used_limit_calculado`

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 1.1

---

### **Query 1.2 - Soma Total dos Cartões**

Copie e execute:

```sql
SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(available_limit) as disponivel_total,
  SUM(credit_limit - available_limit) as usado_total
FROM credit_cards
WHERE is_active = true;
```

**O que anotar:**
- Total de cartões
- Limite total
- Usado total
- Disponível total

**Compare com:**
- **Página Cartões:** Limite R$ 26.000, Usado R$ 1.095
- **Widget Dashboard:** Limite R$ 76.000, Usado R$ 1.645

**Se os valores forem diferentes, há um BUG!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 1.2

---

## 🏦 PASSO 3: AUDITAR CONTAS

### **Query 2.1 - Listar Contas Ativas**

Copie e execute:

```sql
SELECT 
  id,
  name,
  bank_name,
  type,
  current_balance,
  is_active,
  created_at
FROM accounts
WHERE is_active = true
ORDER BY name;
```

**O que anotar:**
- Quantas contas ativas?
- Nome de cada conta
- Saldo de cada conta
- Tipo de cada conta

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 2.1

---

### **Query 2.2 - Soma Total das Contas**

Copie e execute:

```sql
SELECT 
  COUNT(*) as total_contas,
  SUM(current_balance) as saldo_total,
  SUM(CASE WHEN type = 'checking' THEN current_balance ELSE 0 END) as contas_bancarias,
  SUM(CASE WHEN type = 'cash' THEN current_balance ELSE 0 END) as carteira_dinheiro
FROM accounts
WHERE is_active = true;
```

**O que anotar:**
- Saldo total
- Contas bancárias
- Carteira/Dinheiro

**Compare com:**
- **Dashboard:** R$ 12.648,82
- **Página Contas:** R$ 12.648,82

**Deve ser IGUAL! Se diferente, há um BUG!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 2.2

---

## 💰 PASSO 4: AUDITAR TRANSAÇÕES

### **Query 3.1 - Transações do Mês (Novembro 2025)**

Copie e execute:

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

**O que anotar:**
- Total de receitas (income)
- Total de despesas (expense)

**Compare com:**
- **Dashboard:** Receitas R$ 17.699,80, Despesas R$ 9.905,30
- **Página Transações:** Receitas R$ 17.699,80, Despesas R$ 10.083,01

**⚠️ DIVERGÊNCIA CONHECIDA:** Despesas diferem em R$ 177,71!

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 3.1

---

### **Query 3.3 - Soma EXATA das Despesas**

Copie e execute:

```sql
SELECT 
  SUM(amount) as total_despesas_novembro_2025
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11;
```

**O que anotar:**
- Valor EXATO das despesas do banco

**Este é o valor CORRETO!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 3.3

---

### **Query 3.4 - Transações DELETADAS (Soft Delete)**

Copie e execute:

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

**O que anotar:**
- Existem transações deletadas? (SIM/NÃO)
- Se SIM, quantas?
- Qual o valor total deletado?

**⚠️ IMPORTANTE:** Se houver transações deletadas, pode ser a causa da divergência!

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 3.4

---

## 🔍 PASSO 5: INVESTIGAR DUPLICATAS E INCONSISTÊNCIAS

### **Query 4.1 - Cartões com Mesmo Nome (Duplicatas)**

Copie e execute:

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

**O que anotar:**
- Existem cartões duplicados? (SIM/NÃO)
- Se SIM, quais?

**⚠️ Se houver duplicatas, pode estar somando em dobro!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 4.1

---

### **Query 4.2 - Cartões INATIVOS**

Copie e execute:

```sql
SELECT 
  id,
  name,
  bank_name,
  credit_limit,
  available_limit,
  is_active,
  created_at
FROM credit_cards
WHERE is_active = false
ORDER BY created_at DESC;
```

**O que anotar:**
- Quantos cartões inativos?
- Quais são?
- Valores de limite

**⚠️ HIPÓTESE:** Widget do Dashboard pode estar somando cartões inativos!

**Se houver 2 cartões inativos com R$ 50.000 total, ENCONTRAMOS O BUG!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 4.2

---

### **Query 4.3 - Contas do Tipo CREDIT_CARD (Erro de Modelagem)**

Copie e execute:

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

**O que anotar:**
- Existem contas do tipo `credit_card`? (SIM/NÃO)
- Se SIM, quantas?

**⚠️ IMPORTANTE:** Cartões devem estar em `credit_cards`, NÃO em `accounts`!

**Se houver, pode estar somando em dobro!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 4.3

---

## 🎯 PASSO 6: IDENTIFICAR A DIFERENÇA DE R$ 177,71

### **Query 5.1 - Calcular Diferença**

Copie e execute:

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

**O que anotar:**
- Total real (do banco)
- Diferença exata

**Se diferença = R$ 177,71, confirma o bug!**

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 5.1

---

### **Query 5.2 - Transações Suspeitas**

Copie e execute:

```sql
SELECT 
  id,
  description,
  amount,
  type,
  transaction_date,
  created_at,
  updated_at,
  deleted_at
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND (
    amount > 1000 -- Valores grandes
    OR amount = 177.71 -- Exatamente a diferença
    OR deleted_at IS NOT NULL -- Deletadas
  )
ORDER BY amount DESC;
```

**O que anotar:**
- Quais transações aparecem?
- Alguma com valor R$ 177,71?
- Alguma deletada?

**Anote em:** `docs/RESULTADO_AUDITORIA.md` → QUERY 5.2

---

## 📊 PASSO 7: COMPILAR RESULTADOS

Agora, abra `docs/RESULTADO_AUDITORIA.md` e preencha TODOS os campos com os resultados das queries.

### **Informações Importantes:**

1. **Total de cartões ativos:** _____
2. **Total de cartões inativos:** _____
3. **Soma de limites (ativos):** R$ _____
4. **Soma de limites (ativos + inativos):** R$ _____
5. **Total de despesas (banco):** R$ _____
6. **Total de despesas (Dashboard):** R$ 9.905,30
7. **Diferença:** R$ _____

---

## 🎯 PASSO 8: DIAGNOSTICAR PROBLEMAS

Com base nos resultados, identifique:

### **PROBLEMA #1: Widget de Cartões Errado**

**Se os valores forem:**
- Ativos: 2 cartões, R$ 26.000 limite
- Inativos: 2 cartões, R$ 50.000 limite
- **Widget somando:** 4 cartões, R$ 76.000 limite

**DIAGNÓSTICO:** ✅ Widget está somando cartões inativos!

**SOLUÇÃO:** Filtrar `is_active = true` no hook `useCreditCardsQuery`

---

### **PROBLEMA #2: Despesas Divergentes**

**Se houver transações deletadas:**
- Deletadas: R$ 177,71
- **Dashboard não filtra:** deletadas

**DIAGNÓSTICO:** ✅ Dashboard não filtra `deleted_at IS NULL`!

**SOLUÇÃO:** Adicionar filtro `deleted_at IS NULL` no cálculo

---

## ✅ PASSO 9: IMPLEMENTAR CORREÇÕES

Após identificar os problemas, vou implementar as correções no código!

---

## 📝 CHECKLIST FINAL

- [ ] Executei TODAS as queries SQL
- [ ] Anotei TODOS os resultados
- [ ] Identifiquei a causa da divergência dos cartões
- [ ] Identifiquei a causa da divergência das despesas
- [ ] Preenchi `docs/RESULTADO_AUDITORIA.md` completo
- [ ] Pronto para solicitar correções no código

---

**🚀 APÓS COMPLETAR, ME AVISE COM O RESULTADO!**

Vou implementar as correções cirurgicamente no código. 💪
