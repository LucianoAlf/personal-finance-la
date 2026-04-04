# 🚀 SPRINT 1: EXECUTAR MIGRATIONS - GUIA COMPLETO

**Status:** ✅ Arquivos SQL criados  
**Ação Necessária:** Executar migrations no Supabase Dashboard

---

## 📁 **ARQUIVOS CRIADOS (5 MIGRATIONS)**

1. ✅ `20251108_sprint1_dia1_expand_investments.sql`
2. ✅ `20251108_sprint1_dia1_create_accounts.sql`
3. ✅ `20251108_sprint1_dia2_create_transactions.sql`
4. ✅ `20251108_sprint1_dia2_create_allocation_targets.sql`
5. ✅ `20251108_sprint1_dia3_create_quotes_opportunities.sql`
6. ✅ `20251108_sprint1_dia4_create_views_functions.sql`

**Localização:** `supabase/migrations/`

---

## 🎯 **COMO EXECUTAR**

### **Método 1: Supabase Dashboard (RECOMENDADO)**

1. **Acesse:** https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/sql/new

2. **Execute NA ORDEM:**

#### **Migration 1: Expandir investments**
```sql
-- Copiar e colar todo conteúdo de:
-- 20251108_sprint1_dia1_expand_investments.sql
```

#### **Migration 2: Criar accounts**
```sql
-- Copiar e colar todo conteúdo de:
-- 20251108_sprint1_dia1_create_accounts.sql
```

#### **Migration 3: Criar transactions**
```sql
-- Copiar e colar todo conteúdo de:
-- 20251108_sprint1_dia2_create_transactions.sql
```

#### **Migration 4: Criar allocation targets**
```sql
-- Copiar e colar todo conteúdo de:
-- 20251108_sprint1_dia2_create_allocation_targets.sql
```

#### **Migration 5: Criar quotes + opportunities**
```sql
-- Copiar e colar todo conteúdo de:
-- 20251108_sprint1_dia3_create_quotes_opportunities.sql
```

#### **Migration 6: Criar views + functions**
```sql
-- Copiar e colar todo conteúdo de:
-- 20251108_sprint1_dia4_create_views_functions.sql
```

3. **Clicar em "RUN"** para cada migration

4. **Verificar:** Mensagem "Success. No rows returned"

---

### **Método 2: Supabase CLI (Alternativo)**

```bash
# 1. Fazer login
supabase login

# 2. Link projeto
supabase link --project-ref sbnpmhmvcspwcyjhftlw

# 3. Aplicar migrations
supabase db push
```

---

## ✅ **VALIDAÇÃO PÓS-EXECUÇÃO**

### **1. Verificar tabelas criadas:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name LIKE 'investment%'
ORDER BY table_name;
```

**Resultado esperado:**
```
investment_accounts
investment_allocation_targets
investment_quotes_history
investment_transactions
investments (expandida)
market_opportunities
```

### **2. Verificar campos novos em investments:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'investments'
  AND column_name IN ('category', 'subcategory', 'dividend_yield', 'maturity_date', 'annual_rate', 'status', 'account_id')
ORDER BY column_name;
```

**Resultado esperado:** 7 linhas

### **3. Verificar views:**
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%investment%';
```

**Resultado esperado:**
```
v_investment_performance
v_portfolio_summary
```

### **4. Verificar functions:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('calculate_portfolio_metrics', 'sync_investment_prices', 'expire_old_opportunities', 'dismiss_opportunity')
ORDER BY routine_name;
```

**Resultado esperado:** 4 functions

### **5. Verificar RLS policies:**
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'investment%' OR tablename = 'market_opportunities'
ORDER BY tablename, policyname;
```

**Resultado esperado:** ~25 policies

---

## 🧪 **TESTES BÁSICOS**

### **Teste 1: Criar conta de investimento**
```sql
INSERT INTO investment_accounts (user_id, name, institution_name, account_type)
VALUES (auth.uid(), 'XP Investimentos', 'XP Inc.', 'brokerage');
```

### **Teste 2: Atualizar investment com novos campos**
```sql
UPDATE investments
SET 
  category = 'stock',
  dividend_yield = 6.5,
  status = 'active',
  account_id = (SELECT id FROM investment_accounts WHERE name = 'XP Investimentos' LIMIT 1)
WHERE ticker = 'PETR4' AND user_id = auth.uid();
```

### **Teste 3: Criar transação de compra**
```sql
INSERT INTO investment_transactions (
  investment_id,
  user_id,
  transaction_type,
  quantity,
  price,
  total_value,
  fees,
  transaction_date
)
SELECT 
  id,
  auth.uid(),
  'buy',
  50,
  40.00,
  2000.00,
  19.80,
  NOW()
FROM investments
WHERE ticker = 'PETR4' AND user_id = auth.uid()
LIMIT 1;
```

### **Teste 4: Verificar trigger (investment deve ter sido atualizado)**
```sql
SELECT ticker, quantity, purchase_price, total_invested
FROM investments
WHERE ticker = 'PETR4' AND user_id = auth.uid();
```

### **Teste 5: Criar meta de alocação**
```sql
INSERT INTO investment_allocation_targets (user_id, asset_class, target_percentage)
VALUES 
  (auth.uid(), 'stock', 40),
  (auth.uid(), 'fixed_income', 40),
  (auth.uid(), 'crypto', 20);
```

### **Teste 6: Calcular métricas do portfólio**
```sql
SELECT * FROM calculate_portfolio_metrics(auth.uid());
```

### **Teste 7: Ver resumo do portfólio (view)**
```sql
SELECT * FROM v_portfolio_summary WHERE user_id = auth.uid();
```

### **Teste 8: Ver performance por categoria (view)**
```sql
SELECT * FROM v_investment_performance WHERE user_id = auth.uid();
```

---

## 📊 **ESTRUTURA COMPLETA PÓS-SPRINT 1**

### **TABELAS (6):**
```
1. investments (23 campos - expandida)
2. investment_accounts (8 campos)
3. investment_transactions (11 campos)
4. investment_allocation_targets (5 campos)
5. investment_quotes_history (6 campos)
6. market_opportunities (14 campos)
```

### **VIEWS (2):**
```
1. v_portfolio_summary
2. v_investment_performance
```

### **FUNCTIONS (4):**
```
1. calculate_portfolio_metrics()
2. sync_investment_prices() (stub)
3. expire_old_opportunities()
4. dismiss_opportunity()
```

### **TRIGGERS (3):**
```
1. update_investment_after_transaction
2. check_allocation_total
3. update_updated_at (accounts)
```

### **RELACIONAMENTOS:**
```
users (auth)
  ├─ investments (1:N) ───┐
  │   ├─ account_id → investment_accounts
  │   └─ investment_transactions (1:N)
  │
  ├─ investment_accounts (1:N)
  ├─ investment_allocation_targets (1:N)
  └─ market_opportunities (1:N)

investment_quotes_history (global)
```

---

## 🎯 **PRÓXIMOS PASSOS**

Após executar todas as migrations com sucesso:

### **1. Validar TypeScript:**
```bash
pnpm tsc --noEmit
```
✅ Deve compilar sem erros (types já atualizados)

### **2. Criar Hooks TypeScript (Sprint 1.5):**
- `useInvestmentAccounts.ts`
- `useInvestmentTransactions.ts`
- `useAllocationTargets.ts`
- `usePortfolioMetrics.ts`

### **3. Testar integração:**
- Criar investimento com categoria
- Registrar transação
- Ver métricas calculadas

---

## 🔍 **TROUBLESHOOTING**

### **Erro: "relation already exists"**
- Normal se executar migration 2x
- Ignore ou use `IF NOT EXISTS` (já incluído)

### **Erro: "violates foreign key constraint"**
- Executar migrations NA ORDEM
- Verificar se migrations anteriores rodaram

### **Erro: "column already exists"**
- Migration 1 já foi executada
- Pode pular

### **Erro RLS: "new row violates row-level security"**
- Verificar se está autenticado
- Usar `auth.uid()` ao inserir

---

## ✅ **CHECKLIST FINAL**

- [ ] Migration 1 executada (expand investments)
- [ ] Migration 2 executada (accounts)
- [ ] Migration 3 executada (transactions)
- [ ] Migration 4 executada (allocation targets)
- [ ] Migration 5 executada (quotes + opportunities)
- [ ] Migration 6 executada (views + functions)
- [ ] 6 tabelas criadas/expandidas
- [ ] 2 views funcionando
- [ ] 4 functions criadas
- [ ] RLS policies ativas (~25)
- [ ] TypeScript types atualizados
- [ ] Testes básicos passando

---

## 🎊 **CONCLUSÃO**

Após executar todas as migrations:
- ✅ Sprint 1 database completo
- ✅ Base sólida para Sprint 2 (APIs)
- ✅ Pronto para criar hooks TypeScript

**Tempo estimado de execução:** 10-15 minutos

**Pronto para começar Sprint 2!** 🚀
