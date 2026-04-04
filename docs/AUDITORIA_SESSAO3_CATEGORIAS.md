# AUDITORIA DE ARQUITETURA - SESSÃO 3: SISTEMA DE CATEGORIAS

**Data:** 16/12/2025  
**Objetivo:** Mapear e propor unificação dos 3 sistemas de categorização de gastos

---

## 📊 RESUMO EXECUTIVO

O sistema possui **3 formas diferentes** de categorizar gastos, causando inconsistências e duplicação de lógica:

| Sistema | Localização | Propósito | Status |
|---------|-------------|-----------|--------|
| **A) bill_type** | `payable_bills.bill_type` (VARCHAR) | Classificar contas a pagar | ⚠️ LEGADO |
| **B) categories** | Tabela `categories` + `category_id` | Sistema unificado de categorias | ✅ PRINCIPAL |
| **C) mappings.ts** | `supabase/functions/shared/mappings.ts` | Detecção por palavras-chave (WhatsApp) | ✅ AUXILIAR |

### Diagnóstico Rápido:
- **150 contas** em `payable_bills` - **TODAS com category_id preenchido** ✅
- **0 contas** sem `category_id` (migração já feita)
- **31 categorias de despesa** na tabela `categories`
- **12 categorias de receita** na tabela `categories`
- **22 categorias** no `mappings.ts` (CATEGORIA_KEYWORDS)
- **13 valores** de `bill_type` definidos no TypeScript

---

## 1. MAPEAMENTO DOS 3 SISTEMAS

### A) ENUM `bill_type` (payable_bills)

**Tipo no banco:** `VARCHAR` (não é ENUM PostgreSQL)  
**Constraint:** `payable_bills_bill_type_check`

#### Valores Aceitos (13):
```typescript
export type BillType = 
  | 'service'      // Água, luz, gás
  | 'telecom'      // Internet, telefone
  | 'subscription' // Netflix, Spotify
  | 'housing'      // Aluguel, condomínio
  | 'education'    // Escola, curso
  | 'healthcare'   // Plano de saúde
  | 'insurance'    // Seguros
  | 'loan'         // Empréstimos pessoais
  | 'installment'  // Parcelamentos/Financiamentos
  | 'credit_card'  // Cartão terceiros
  | 'tax'          // IPTU, IPVA
  | 'food'         // Alimentação
  | 'other';
```

#### Uso no Banco (dados reais):
| bill_type | Quantidade |
|-----------|------------|
| installment | 95 |
| telecom | 26 |
| subscription | 10 |
| service | 6 |
| housing | 5 |
| education | 2 |
| healthcare | 2 |
| tax | 2 |
| credit_card | 1 |
| insurance | 1 |
| **TOTAL** | **150** |

#### Onde é usado no código:

**Frontend (exibição):**
- `src/types/payable-bills.types.ts` → `BILL_TYPE_LABELS` (labels para UI)
- `src/hooks/useBillReports.ts` → `BILL_TYPE_LABELS` (duplicado!)
- `src/components/payable-bills/BillFilters.tsx` → Dropdown de filtro
- `src/components/payable-bills/BillDialog.tsx` → Select de tipo

**Frontend (lógica):**
- `src/hooks/usePayableBills.ts` → Filtros de query
- `src/pages/PayableBills.tsx` → Mapeamento categoria → bill_type para filtros
- `src/utils/billCalculations.ts` → `BILL_TYPE_TO_CATEGORY` (fallback)

**Backend (WhatsApp):**
- `contas-pagar.ts` → `mapearBillTypeParaBanco()` - Detecta tipo pela descrição
- `context-manager.ts` → Usa `mapearBillTypeParaBanco()` em 4 lugares

---

### B) TABELA `categories` + `category_id`

**Tabela:** `categories`  
**Colunas:** `id`, `name`, `icon`, `type`, `is_default`, `created_at`

#### Categorias de Despesa (31):
| Nome | Ícone | ID (exemplo) |
|------|-------|--------------|
| Alimentação | Utensils | 53efcd69-... |
| Assinaturas | Repeat | 829bb591-... |
| Beleza | Sparkles | e4fcbc0d-... |
| Combustível | Fuel | 4b0db73c-... |
| Compras | ShoppingBag | 924b4bf1-... |
| Contas de Consumo | Zap | 675bbe3b-... |
| Delivery | Bike | d9c9345c-... |
| Educação | GraduationCap | c9a3052f-... |
| Eletrodomésticos | Tv | 37528e86-... |
| Empréstimo | HandCoins | 629c756f-... |
| Esportes | Dumbbell | a2588696-... |
| Estacionamento | ParkingCircle | 751ac82a-... |
| Farmácia | Pill | 21ec079f-... |
| Filhos | Baby | 0fe9c342-... |
| Financiamento | Landmark | 18a32b1c-... |
| Impostos | Receipt | 084452c0-... |
| Lazer | Film | 14de7ab6-... |
| Mercado | ShoppingCart | 55f33b99-... |
| Moradia | Home | 9512349b-... |
| Outros | Package | 7e7a56a5-... |
| Pets | PawPrint | a36c0e7d-... |
| Presentes | Gift | d227a963-... |
| Reparos e Manutenções | Wrench | 5cb74ee2-... |
| Restaurante | UtensilsCrossed | a390363f-... |
| Saúde | HeartPulse | 3dec1a1e-... |
| Seguros | Shield | 5345803c-... |
| Tecnologia | Smartphone | 44815701-... |
| Transferência entre Contas | ArrowLeftRight | 9f8bb5e8-... |
| Transporte | Car | 5a9ba425-... |
| Vestuário | Shirt | 87dd20e0-... |
| Viagens | Plane | 3d6d47a4-... |

#### Categorias de Receita (12):
| Nome | Ícone |
|------|-------|
| 13º Salário | Calendar |
| Aluguel | Home |
| Aposentadoria | User |
| Bônus | Gift |
| Férias | Sun |
| Freelance | Laptop |
| Investimentos | TrendingUp |
| Outras Receitas | Wallet |
| Pensão | Users |
| Presente | Gift |
| Restituição IR | Receipt |
| Salário | Briefcase |

#### Tabelas que usam `category_id`:
| Tabela | Tipo |
|--------|------|
| `budgets` | FK |
| `category_rules` | FK |
| `credit_card_transactions` | FK |
| `financial_goals` | FK |
| `payable_bills` | FK |
| `transactions` | FK |
| `v_all_transactions` | View |
| `v_credit_card_transactions_with_installments` | View |
| `v_recurring_bills_history` | View |

---

### C) MAPEAMENTO `mappings.ts`

**Arquivo:** `supabase/functions/shared/mappings.ts`

#### CATEGORIA_KEYWORDS (22 categorias, ~200 palavras-chave):
| Categoria | Exemplos de Keywords |
|-----------|---------------------|
| Transporte | uber, 99, taxi, gasolina, combustivel, estacionamento, pedagio |
| Alimentação | mercado, supermercado, ifood, rappi, restaurante, lanche, almoco |
| Moradia | aluguel, condominio, iptu |
| Contas de Consumo | luz, energia, agua, gas |
| Assinaturas | internet, wifi, telefone, celular plano, assinatura, plano, premium |
| Reparos e Manutenções | manutencao, reparo, conserto, eletricista, encanador |
| Eletrodomésticos | purificador, ar condicionado, geladeira, fogao, microondas, tv |
| Saúde | farmacia, remedio, medico, consulta, exame, hospital, academia |
| Educação | escola, faculdade, universidade, curso, livro, udemy, alura |
| Lazer | cinema, teatro, show, netflix, spotify, amazon prime, disney |
| Vestuário | roupa, camisa, calca, sapato, tenis, loja, shopping |
| Beleza | salao, cabelo, corte, manicure, pedicure, estetica, maquiagem |
| Pets | pet, veterinario, racao, petshop, cachorro, gato |
| Tecnologia | celular, smartphone, computador, notebook, tablet, fone |
| Viagens | viagem, passagem aerea, hotel, airbnb, hospedagem |
| Esportes | esporte, futebol, corrida, bicicleta, bike, natacao |
| Investimentos | investimento, acao, fundo, tesouro, cdb, corretora, cripto |
| Financiamento | financiamento, financiar, parcela do carro, prestação |
| Empréstimo | emprestimo, consignado, credito pessoal, cheque especial, divida |
| Transferência entre Contas | transferencia, ted, doc |
| Compras | (não definido explicitamente) |
| Outros | (fallback) |

#### CATEGORIAS_VALIDAS (lista oficial):
```typescript
export const CATEGORIAS_VALIDAS = [
  'Transporte', 'Alimentação', 'Moradia', 'Contas de Consumo',
  'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Beleza', 'Pets',
  'Tecnologia', 'Assinaturas', 'Viagens', 'Esportes', 'Investimentos',
  'Financiamento', 'Empréstimo', 'Transferência entre Contas',
  'Eletrodomésticos', 'Compras', 'Reparos e Manutenções', 'Outros'
];
```

---

## 2. ANÁLISE DE CONSISTÊNCIA

### Queries Executadas:

#### Contas a pagar SEM category_id:
```sql
SELECT bill_type, COUNT(*) 
FROM payable_bills 
WHERE category_id IS NULL 
GROUP BY bill_type;
```
**Resultado:** `[]` (vazio) ✅ **TODAS as contas têm category_id!**

#### Contas a pagar COM category_id:
```sql
SELECT c.name, COUNT(*) 
FROM payable_bills pb
JOIN categories c ON pb.category_id = c.id
GROUP BY c.name;
```
**Resultado:**
| Categoria | Quantidade |
|-----------|------------|
| Empréstimo | 41 |
| Financiamento | 36 |
| Tecnologia | 24 |
| Eletrodomésticos | 18 |
| Assinaturas | 14 |
| Moradia | 5 |
| Contas de Consumo | 4 |
| Esportes | 2 |
| Impostos | 2 |
| Educação | 2 |
| Seguros | 1 |
| Compras | 1 |

#### Transações sem category_id:
```sql
SELECT type, COUNT(*) 
FROM transactions 
WHERE category_id IS NULL 
GROUP BY type;
```
**Resultado:** `expense: 2` (apenas 2 transações sem categoria)

#### Transações de cartão sem category_id:
```sql
SELECT COUNT(*) 
FROM credit_card_transactions 
WHERE category_id IS NULL;
```
**Resultado:** `0` ✅ **TODAS têm category_id!**

---

## 3. MAPEAMENTO bill_type → category

### Tabela de Correspondência:

| bill_type (enum) | category.name (tabela) | Match? | Observação |
|------------------|------------------------|--------|------------|
| service | Contas de Consumo | ✅ | Luz, água, gás |
| telecom | Assinaturas | ⚠️ | Poderia ser categoria própria |
| subscription | Assinaturas | ✅ | Netflix, Spotify |
| housing | Moradia | ✅ | Aluguel, condomínio |
| education | Educação | ✅ | Escola, curso |
| healthcare | Saúde | ✅ | Plano de saúde |
| insurance | Seguros | ✅ | Seguros |
| loan | Empréstimo | ✅ | Empréstimos pessoais |
| installment | Financiamento | ⚠️ | Parcelamentos (deveria ser Compras?) |
| credit_card | Compras | ⚠️ | Cartão terceiros |
| tax | Impostos | ✅ | IPTU, IPVA |
| food | Alimentação | ✅ | Alimentação |
| other | Outros | ✅ | Fallback |

### Inconsistências Identificadas:

1. **telecom vs Assinaturas:** Internet/telefone são mapeados para Assinaturas, mas poderiam ter categoria própria "Telecomunicações"

2. **installment vs Financiamento:** Parcelamentos de compras (TV, geladeira) são mapeados para "Financiamento", mas deveriam ser "Compras" ou "Eletrodomésticos"

3. **Duplicação de labels:** `BILL_TYPE_LABELS` existe em 2 arquivos:
   - `src/types/payable-bills.types.ts`
   - `src/hooks/useBillReports.ts`

---

## 4. CÓDIGO QUE USA bill_type

### Frontend:

| Arquivo | Uso | Linha |
|---------|-----|-------|
| `payable-bills.types.ts` | Definição do tipo + labels | 7-20, 260-274 |
| `useBillReports.ts` | Labels duplicados | 135-148 |
| `usePayableBills.ts` | Filtros de query | 50-70 |
| `PayableBills.tsx` | Mapeamento categoria→bill_type | 186-223 |
| `BillFilters.tsx` | Dropdown de seleção | 137-143 |
| `BillDialog.tsx` | Select de tipo | 74, 155-158 |
| `billCalculations.ts` | BILL_TYPE_TO_CATEGORY | 330-344 |

### Backend (WhatsApp):

| Arquivo | Função | Linha |
|---------|--------|-------|
| `contas-pagar.ts` | `mapearBillTypeParaBanco()` | 1005-1075 |
| `contas-pagar.ts` | `buscarCategoryIdPorDescricao()` | 1081-1149 |
| `context-manager.ts` | Usa `mapearBillTypeParaBanco` | 2426, 2690, 2769, 3002 |

---

## 5. CÓDIGO QUE USA category_id

### Onde category_id é LIDO:

| Arquivo | Uso |
|---------|-----|
| `BillCard.tsx` | `getCategoryName()` - prioriza category_id |
| `BillTable.tsx` | `getCategoryInfo()` - prioriza category_id |
| `BillHistoryTable.tsx` | `getCategoryName()` - prioriza category_id |
| `RecurringBillCard.tsx` | `getCategoryName()` - prioriza category_id |
| `RecurringBillTable.tsx` | `getCategoryName()` - prioriza category_id |
| `InstallmentGroupCard.tsx` | `getCategoryName()` - prioriza category_id |

### Onde category_id é ESCRITO:

| Arquivo | Uso |
|---------|-----|
| `BillDialog.tsx` | Form field + submit |
| `usePayableBills.ts` | `createBill()`, `createInstallmentBills()` |
| `contas-pagar.ts` | `buscarCategoryIdPorDescricao()` - WhatsApp |

### Padrão Atual (CORRETO):
```typescript
const getCategoryName = () => {
  if (bill.category_id) {
    const cat = categories.find(c => c.id === bill.category_id);
    if (cat) return cat.name;
  }
  return getBillCategoryName(bill.bill_type); // fallback
};
```

---

## 6. PROPOSTA DE UNIFICAÇÃO

### Recomendação: **category_id como sistema PRINCIPAL**

O sistema já está 90% migrado para usar `category_id`. O `bill_type` deve ser mantido apenas como **metadado auxiliar** para lógica de negócio (recorrência, parcelamento).

### Plano de Ação:

#### Fase 1: Limpeza de Código (1-2h)
1. ❌ **Remover** `BILL_TYPE_LABELS` duplicado de `useBillReports.ts`
2. ❌ **Remover** dropdown de `bill_type` do `BillFilters.tsx` (usar categorias)
3. ✅ **Manter** `bill_type` no `BillDialog.tsx` (necessário para lógica)

#### Fase 2: Simplificar Mapeamentos (1h)
1. **Unificar** `mapearBillTypeParaBanco()` com `buscarCategoryIdPorDescricao()`
2. **Remover** `BILL_TYPE_TO_CATEGORY` de `billCalculations.ts`
3. **Usar** apenas `category_id` para exibição

#### Fase 3: Atualizar Filtros (1h)
1. **Substituir** filtro por `bill_type` por filtro por `category_id`
2. **Remover** mapeamento `categoryToBillType` de `PayableBills.tsx`

### Script SQL de Migração:

```sql
-- Verificar se todas as contas têm category_id (já está OK)
SELECT COUNT(*) as sem_categoria
FROM payable_bills 
WHERE category_id IS NULL;

-- Se houver contas sem category_id, migrar baseado em bill_type:
UPDATE payable_bills pb
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.type = 'expense' 
  AND c.name = CASE pb.bill_type
    WHEN 'service' THEN 'Contas de Consumo'
    WHEN 'telecom' THEN 'Assinaturas'
    WHEN 'subscription' THEN 'Assinaturas'
    WHEN 'housing' THEN 'Moradia'
    WHEN 'education' THEN 'Educação'
    WHEN 'healthcare' THEN 'Saúde'
    WHEN 'insurance' THEN 'Seguros'
    WHEN 'loan' THEN 'Empréstimo'
    WHEN 'installment' THEN 'Financiamento'
    WHEN 'credit_card' THEN 'Compras'
    WHEN 'tax' THEN 'Impostos'
    WHEN 'food' THEN 'Alimentação'
    ELSE 'Outros'
  END
  LIMIT 1
)
WHERE category_id IS NULL;

-- Verificar resultado
SELECT c.name, COUNT(*) 
FROM payable_bills pb
JOIN categories c ON pb.category_id = c.id
GROUP BY c.name
ORDER BY COUNT(*) DESC;
```

### Plano de Deprecação do bill_type:

| Etapa | Ação | Prazo |
|-------|------|-------|
| 1 | Manter `bill_type` como campo auxiliar | Imediato |
| 2 | Usar `category_id` para TODA exibição | Imediato |
| 3 | Usar `bill_type` apenas para lógica (recorrência, parcelamento) | Imediato |
| 4 | Remover filtros por `bill_type` do frontend | 1 semana |
| 5 | Avaliar remoção do campo `bill_type` | 1 mês |

---

## 7. CONCLUSÃO

### Status Atual: ✅ BOM (90% migrado)

O sistema já usa `category_id` como principal. O `bill_type` é mantido por compatibilidade e para lógica de negócio.

### Ações Prioritárias:

1. **Remover duplicação** de `BILL_TYPE_LABELS`
2. **Substituir filtro** por `bill_type` por filtro por `category_id`
3. **Documentar** que `bill_type` é apenas metadado auxiliar

### Arquivos a Modificar:

| Arquivo | Ação |
|---------|------|
| `src/hooks/useBillReports.ts` | Remover `BILL_TYPE_LABELS` duplicado |
| `src/components/payable-bills/BillFilters.tsx` | Substituir dropdown por categorias |
| `src/pages/PayableBills.tsx` | Remover mapeamento `categoryToBillType` |
| `src/utils/billCalculations.ts` | Marcar `BILL_TYPE_TO_CATEGORY` como deprecated |

---

## ANEXO: Comparação de Sistemas

### Categorias em Cada Sistema:

| Categoria | categories (DB) | mappings.ts | bill_type |
|-----------|-----------------|-------------|-----------|
| Alimentação | ✅ | ✅ | ✅ food |
| Assinaturas | ✅ | ✅ | ✅ subscription |
| Beleza | ✅ | ✅ | ❌ |
| Combustível | ✅ | ❌ (em Transporte) | ❌ |
| Compras | ✅ | ❌ | ⚠️ credit_card |
| Contas de Consumo | ✅ | ✅ | ✅ service |
| Delivery | ✅ | ❌ (em Alimentação) | ❌ |
| Educação | ✅ | ✅ | ✅ education |
| Eletrodomésticos | ✅ | ✅ | ❌ |
| Empréstimo | ✅ | ✅ | ✅ loan |
| Esportes | ✅ | ✅ | ❌ |
| Estacionamento | ✅ | ❌ (em Transporte) | ❌ |
| Farmácia | ✅ | ❌ (em Saúde) | ❌ |
| Filhos | ✅ | ❌ | ❌ |
| Financiamento | ✅ | ✅ | ⚠️ installment |
| Impostos | ✅ | ❌ | ✅ tax |
| Lazer | ✅ | ✅ | ❌ |
| Mercado | ✅ | ❌ (em Alimentação) | ❌ |
| Moradia | ✅ | ✅ | ✅ housing |
| Outros | ✅ | ✅ | ✅ other |
| Pets | ✅ | ✅ | ❌ |
| Presentes | ✅ | ❌ | ❌ |
| Reparos e Manutenções | ✅ | ✅ | ❌ |
| Restaurante | ✅ | ❌ (em Alimentação) | ❌ |
| Saúde | ✅ | ✅ | ✅ healthcare |
| Seguros | ✅ | ❌ | ✅ insurance |
| Tecnologia | ✅ | ✅ | ❌ |
| Telecomunicações | ❌ | ❌ | ✅ telecom |
| Transferência entre Contas | ✅ | ✅ | ❌ |
| Transporte | ✅ | ✅ | ❌ |
| Vestuário | ✅ | ✅ | ❌ |
| Viagens | ✅ | ✅ | ❌ |

**Legenda:**
- ✅ Existe
- ❌ Não existe
- ⚠️ Existe com nome diferente

---

*Documento gerado em 16/12/2025 - Auditoria de Arquitetura Sessão 3*
