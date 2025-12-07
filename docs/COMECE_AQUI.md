# 🚀 COMECE AQUI - AUDITORIA RÁPIDA (5 MINUTOS)

## ❌ ERRO CORRIGIDO!

O erro `column "bank_name" does not exist` foi corrigido.

A tabela `credit_cards` usa estas colunas:
- ✅ `name` (nome do cartão)
- ✅ `brand` (visa, mastercard, etc.)
- ✅ `last_four_digits` (últimos 4 dígitos)
- ✅ `credit_limit` (limite total)
- ✅ `available_limit` (limite disponível)
- ✅ `is_active` (ativo/inativo)
- ✅ `is_archived` (arquivado/não arquivado)

---

## 🎯 EXECUTE APENAS 5 QUERIES

### **📍 Passo 1: Abrir Supabase SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/sql/new
2. Abra o arquivo: `docs/AUDITORIA_RAPIDA.sql`
3. Copie e cole no SQL Editor

---

### **📍 Passo 2: Executar Query por Query**

#### **QUERY 1: Verificar Colunas**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_cards' 
  AND column_name IN ('available_limit', 'brand', 'last_four_digits')
ORDER BY column_name;
```

**Deve retornar 3 colunas:**
- `available_limit` → decimal
- `brand` → varchar
- `last_four_digits` → varchar

**⚠️ SE `available_limit` NÃO APARECER:**
```sql
ALTER TABLE credit_cards ADD COLUMN available_limit DECIMAL(10,2);
UPDATE credit_cards SET available_limit = credit_limit WHERE available_limit IS NULL;
```

---

#### **QUERY 2: Cartões ATIVOS**

```sql
SELECT 
  id,
  name,
  brand,
  credit_limit,
  COALESCE(available_limit, credit_limit) as available_limit,
  (credit_limit - COALESCE(available_limit, 0)) as usado,
  is_active,
  is_archived
FROM credit_cards
WHERE is_active = true
  AND (is_archived = false OR is_archived IS NULL)
ORDER BY name;
```

**Anote:**
- Quantos cartões? ____
- Limite total? ____
- Usado total? ____

---

#### **QUERY 3: Cartões INATIVOS ou ARQUIVADOS**

```sql
SELECT 
  id,
  name,
  brand,
  credit_limit,
  COALESCE(available_limit, credit_limit) as available_limit,
  is_active,
  is_archived,
  created_at
FROM credit_cards
WHERE is_active = false OR is_archived = true
ORDER BY created_at DESC;
```

**Anote:**
- Quantos cartões inativos/arquivados? ____
- Limite total deles? ____

**🎯 HIPÓTESE:** Se houver 2 cartões com R$ 50.000 total, ENCONTRAMOS O BUG!

---

#### **QUERY 4: SOMA CORRETA (apenas ativos)**

```sql
SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(COALESCE(available_limit, credit_limit)) as disponivel_total,
  SUM(credit_limit - COALESCE(available_limit, 0)) as usado_total
FROM credit_cards
WHERE is_active = true
  AND (is_archived = false OR is_archived IS NULL);
```

**Deve bater com a PÁGINA CARTÕES:**
- Total: 2
- Limite: R$ 26.000
- Usado: R$ 1.095
- Disponível: R$ 24.905

---

#### **QUERY 5: SOMA ERRADA (todos os cartões)**

```sql
SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(COALESCE(available_limit, credit_limit)) as disponivel_total,
  SUM(credit_limit - COALESCE(available_limit, 0)) as usado_total
FROM credit_cards;
```

**Deve bater com o WIDGET DASHBOARD (errado):**
- Total: 4
- Limite: R$ 76.000
- Usado: R$ 1.645
- Disponível: R$ 74.355

---

## 🎯 DIAGNÓSTICO RÁPIDO

### **Se QUERY 4 ≠ QUERY 5:**

✅ **CONFIRMADO!** Widget está somando TODOS os cartões (ativos + inativos)

**Causa:** Hook `useCreditCardsQuery.ts` não filtra `is_active` e `is_archived`

**Solução:** Adicionar filtros no hook (eu faço isso!)

---

### **Se QUERY 2 retorna 2 cartões E QUERY 3 retorna 2 cartões:**

✅ **CONFIRMADO!** Há 2 cartões inativos/arquivados que o widget está somando

**Total:** 2 (ativos) + 2 (inativos) = 4 (widget)

---

## 📝 ME AVISE COM OS RESULTADOS

Depois de executar as 5 queries, me envie:

```markdown
🔍 RESULTADOS:

QUERY 2 (Ativos):
- Quantidade: ___
- Limite Total: R$ ___
- Usado Total: R$ ___

QUERY 3 (Inativos):
- Quantidade: ___
- Limite Total: R$ ___

QUERY 4 (Soma Correta):
- Total: ___ cartões
- Limite: R$ ___
- Usado: R$ ___

QUERY 5 (Soma Errada):
- Total: ___ cartões
- Limite: R$ ___
- Usado: R$ ___

✅ Confirmação: Widget soma cartões inativos? SIM/NÃO
```

---

## ⏭️ PRÓXIMOS PASSOS

**Assim que você me enviar os resultados, eu vou:**

1. ✅ Corrigir o hook `useCreditCardsQuery.ts`
2. ✅ Adicionar filtros `is_active = true` e `is_archived = false`
3. ✅ Validar que widget agora mostra os valores corretos
4. ✅ Investigar a divergência de R$ 177,71 nas despesas (se necessário)

---

**🚀 TEMPO TOTAL: 5 MINUTOS**

Vá direto ao SQL Editor e execute! 💪
