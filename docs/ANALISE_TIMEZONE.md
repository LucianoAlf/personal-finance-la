# 🔍 ANÁLISE: Problema de Timezone

**Data:** 15/11/2025  
**Status:** 🟡 HIPÓTESE is_paid DESCARTADA - NOVA HIPÓTESE: TIMEZONE

---

## ❌ HIPÓTESE #1: is_paid (DESCARTADA!)

**Resultado da Investigação:**
```sql
total_pagas: R$ 10.083,01
total_nao_pagas: R$ 0
total_geral: R$ 10.083,01
```

**Conclusão:** Todas as 55 transações têm `is_paid = true`. O problema NÃO é o filtro `is_paid`!

---

## 🎯 HIPÓTESE #2: Problema de Timezone (PROVÁVEL!)

### **Problema:**
- **Dashboard:** R$ 9.905,30 (falta R$ 177,71)
- **Página Transações:** R$ 10.083,01 (correto)
- **Banco de Dados:** R$ 10.083,01 (correto)

### **Transação Suspeita:**
```
ID: 8638c064-53b7-450d-abf6-cc6d6195c526
Descrição: "Despesa 1-2"
Valor: R$ 177,71 (EXATAMENTE a diferença!)
Data: 2025-11-01
```

### **Teoria:**

#### **Cenário 1: Data sem Timezone (mais provável)**

Se `transaction_date` está armazenado como `date` (sem hora):
```
Banco: '2025-11-01' (apenas data, sem hora)
```

Quando o JavaScript faz `new Date('2025-11-01')`:
```javascript
// ⚠️ JavaScript interpreta como UTC 00:00:00
new Date('2025-11-01') 
// → 2025-11-01T00:00:00Z (UTC)
// → 2025-10-31T21:00:00-03:00 (BRT)
//    ^^^^^^^^^^^^ MÊS 10 (OUTUBRO)!
```

**Resultado:**
- `transactionDate.getMonth()` retorna `10` (outubro)
- `selectedDate.getMonth()` retorna `10` (novembro selecionado)
- **10 !== 10?** Não, espera...

Hmm, deixa eu repensar. Se o `selectedDate` é novembro, então `getMonth()` retorna `10` (mês 10 = novembro, pois JavaScript conta de 0-11).

Mas se a data `2025-11-01` é interpretada como UTC e convertida para BRT, ela vira `2025-10-31`, que é mês `9` (outubro).

**Portanto:**
- Dashboard filtra: `transactionDate.getMonth() === 10` (novembro)
- Mas `new Date('2025-11-01')` em BRT vira mês `9` (outubro)
- **9 !== 10** → Transação é EXCLUÍDA!

#### **Cenário 2: Página Transações usa filtro diferente**

A Página Transações pode estar usando `getTotalExpenses(true)`, que faz query direta no banco:
```typescript
// Página Transações
const monthlyExpenses = getTotalExpenses(true);
```

Essa função pode estar fazendo:
```sql
WHERE EXTRACT(MONTH FROM transaction_date) = 11
```

Que retorna `11` (novembro) corretamente, pois o banco não faz conversão de timezone em colunas `date`.

---

## 🔬 PRÓXIMO PASSO: CONFIRMAR HIPÓTESE

Execute o arquivo: **`docs/INVESTIGACAO_TIMEZONE.sql`**

### **QUERY 1: Ver data exata da transação suspeita**
```sql
SELECT 
  id,
  description,
  amount,
  transaction_date,
  EXTRACT(MONTH FROM transaction_date) as mes_db,
  EXTRACT(DAY FROM transaction_date) as dia_db
FROM transactions
WHERE id = '8638c064-53b7-450d-abf6-cc6d6195c526';
```

**Esperado:**
- `mes_db` = 11 (novembro no banco) ✅
- Mas JavaScript interpreta como mês 10 (outubro) ❌

### **QUERY 5: Verificar tipo de coluna**
```sql
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'transaction_date';
```

**Esperado:**
- `date` → Sem timezone (causa o problema!)
- `timestamp` → Com hora, sem timezone
- `timestamptz` → Com hora e timezone (ideal!)

---

## 🔧 POSSÍVEIS SOLUÇÕES

### **SOLUÇÃO #1: Forçar parsing em local timezone**

**Arquivo:** `src/pages/Dashboard.tsx` (linha 75)

```typescript
// ❌ ANTES (interpreta como UTC):
const transactionDate = new Date(t.transaction_date);

// ✅ DEPOIS (força timezone local):
const transactionDate = new Date(t.transaction_date + 'T00:00:00');
// ou
const [year, month, day] = t.transaction_date.split('-');
const transactionDate = new Date(+year, +month - 1, +day);
```

### **SOLUÇÃO #2: Usar string comparison**

```typescript
// ❌ ANTES:
const filteredTransactions = useMemo(() => {
  return transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      transactionDate.getMonth() === selectedDate.getMonth() &&
      transactionDate.getFullYear() === selectedDate.getFullYear()
    );
  });
}, [transactions, selectedDate]);

// ✅ DEPOIS:
const filteredTransactions = useMemo(() => {
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const selectedYearMonth = `${selectedYear}-${selectedMonth}`;
  
  return transactions.filter(t => {
    return t.transaction_date.startsWith(selectedYearMonth);
  });
}, [transactions, selectedDate]);
```

### **SOLUÇÃO #3: Alterar coluna no banco para timestamptz**

```sql
-- Migração para adicionar timezone
ALTER TABLE transactions 
  ALTER COLUMN transaction_date TYPE timestamptz 
  USING transaction_date::timestamptz;
```

---

## 📊 COMPARAÇÃO DE SOLUÇÕES

| Solução | Prós | Contras | Recomendação |
|---------|------|---------|--------------|
| #1: Parse local | Simples, rápido | Pode quebrar em outros lugares | 🟡 OK |
| #2: String comparison | Mais robusto, sem conversão | Funciona apenas com formato YYYY-MM-DD | 🟢 MELHOR |
| #3: Alterar banco | Resolve raiz do problema | Requer migração, pode quebrar código existente | 🔴 Arriscado |

---

## 🚀 RECOMENDAÇÃO FINAL

**IMPLEMENTAR SOLUÇÃO #2** (string comparison)

**Motivo:**
1. Não depende de timezone do navegador
2. Mais performático (sem `new Date()`)
3. Funciona com colunas `date`, `timestamp` ou `timestamptz`
4. Não requer migração de banco

---

**Aguardando:** Execução de `docs/INVESTIGACAO_TIMEZONE.sql` para confirmar tipo de coluna!
