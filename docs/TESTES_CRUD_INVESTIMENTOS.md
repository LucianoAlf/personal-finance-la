# 🧪 GUIA DE TESTES - CRUD INVESTIMENTOS

**Sprint 0 - Etapa 4**  
**Objetivo:** Validar todas operações CRUD via console do navegador

---

## 🚀 PREPARAÇÃO

1. **Abrir aplicação:**
   - URL: http://localhost:5173
   - Login: lucianoalf.la@gmail.com
   - Senha: 250178Alf#

2. **Navegar para Investimentos:**
   - Sidebar → Investimentos
   - Ou: http://localhost:5173/investimentos

3. **Abrir Console:**
   - Pressionar `F12`
   - Ir na aba "Console"

---

## ✅ TESTE 1: READ (Verificar dados)

### **Objetivo:** Garantir que dados carregam do Supabase

### **Passos:**
1. Verificar se página carrega sem erros
2. Verificar no console do navegador:
   ```
   🔔 Realtime update: ...
   ```
3. Se houver dados, verificar cards de resumo
4. Se vazio, deve aparecer empty state

### **✅ Critérios de Sucesso:**
- [ ] Página carrega sem erros
- [ ] Console sem erros vermelhos
- [ ] Loading aparece e desaparece
- [ ] Empty state OU lista aparece

---

## ✅ TESTE 2: CREATE (Adicionar investimento)

### **Objetivo:** Criar novo investimento via console

### **Código para testar:**
```javascript
// Abrir console (F12) e colar:

// 1. Pegar referência do hook (via React DevTools)
// Ou usar este atalho:
const testCreate = async () => {
  // Simular adição via console
  const response = await fetch('http://localhost:54321/rest/v1/investments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'SUA_ANON_KEY_AQUI',
      'Authorization': 'Bearer ' + localStorage.getItem('sb-access-token')
    },
    body: JSON.stringify({
      type: 'stock',
      name: 'Petrobras PN',
      ticker: 'PETR4',
      quantity: 100,
      purchase_price: 35.20,
      current_price: 38.50,
      total_invested: 3520,
      current_value: 3850,
      purchase_date: '2024-01-15',
      notes: 'Primeira compra - Teste Sprint 0',
      is_active: true
    })
  });
  
  const data = await response.json();
  console.log('✅ Investimento criado:', data);
};

testCreate();
```

### **OU usar Supabase diretamente:**

1. Ir para: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/editor

2. Executar SQL:
```sql
INSERT INTO investments (
  user_id,
  type,
  name,
  ticker,
  quantity,
  purchase_price,
  current_price,
  total_invested,
  current_value,
  purchase_date,
  notes,
  is_active
) VALUES (
  auth.uid(),
  'stock',
  'Petrobras PN',
  'PETR4',
  100,
  35.20,
  38.50,
  3520.00,
  3850.00,
  '2024-01-15',
  'Primeira compra - Teste Sprint 0',
  TRUE
);
```

### **✅ Critérios de Sucesso:**
- [ ] Toast aparece: "✅ Petrobras PN adicionado ao portfólio!"
- [ ] Investimento aparece na lista automaticamente
- [ ] Cards de resumo atualizam (totais)
- [ ] Console mostra: `🔔 Realtime update`

---

## ✅ TESTE 3: UPDATE (Atualizar preço)

### **Objetivo:** Atualizar cotação de um investimento

### **Via SQL (Supabase Editor):**
```sql
-- Atualizar preço do PETR4
UPDATE investments
SET 
  current_price = 40.00,
  current_value = quantity * 40.00
WHERE ticker = 'PETR4'
  AND user_id = auth.uid();
```

### **✅ Critérios de Sucesso:**
- [ ] Preço atualiza na tabela automaticamente
- [ ] Current_value recalcula
- [ ] Rentabilidade % muda
- [ ] Cards de resumo atualizam
- [ ] Console mostra: `🔔 Realtime update`

---

## ✅ TESTE 4: UPDATE (Editar quantidade)

### **Objetivo:** Alterar quantidade de ações

### **Via SQL:**
```sql
-- Aumentar quantidade de PETR4 para 200
UPDATE investments
SET 
  quantity = 200,
  total_invested = 200 * purchase_price,
  current_value = 200 * current_price
WHERE ticker = 'PETR4'
  AND user_id = auth.uid();
```

### **✅ Critérios de Sucesso:**
- [ ] Quantidade atualiza na tabela
- [ ] Total investido recalcula
- [ ] Valor atual recalcula
- [ ] Cards atualizam

---

## ✅ TESTE 5: DELETE (Soft delete)

### **Objetivo:** Remover investimento (marcar como inativo)

### **Via SQL:**
```sql
-- Soft delete do PETR4
UPDATE investments
SET is_active = FALSE
WHERE ticker = 'PETR4'
  AND user_id = auth.uid();
```

### **✅ Critérios de Sucesso:**
- [ ] Investimento desaparece da lista
- [ ] Cards de resumo atualizam
- [ ] Console mostra: `🔔 Realtime update`
- [ ] Empty state aparece se era o único

---

## ✅ TESTE 6: DELETE REAL (Hard delete - cuidado!)

### **Objetivo:** Deletar permanentemente (apenas para limpar testes)

### **Via SQL:**
```sql
-- ATENÇÃO: Isso deleta permanentemente!
DELETE FROM investments
WHERE notes LIKE '%Teste Sprint 0%'
  AND user_id = auth.uid();
```

### **✅ Critérios de Sucesso:**
- [ ] Registro removido do banco
- [ ] Não aparece mais na lista

---

## 📊 RESUMO DOS TESTES

| Teste | Operação | Status |
|-------|----------|--------|
| 1 | READ | ⏳ |
| 2 | CREATE | ⏳ |
| 3 | UPDATE (preço) | ⏳ |
| 4 | UPDATE (quantidade) | ⏳ |
| 5 | DELETE (soft) | ⏳ |
| 6 | DELETE (hard) | ⏳ |

---

## 🔍 CHECKLIST FINAL - ETAPA 4

**Funcional:**
- [ ] Hook carrega dados do Supabase
- [ ] CREATE adiciona investimento
- [ ] UPDATE altera dados
- [ ] DELETE remove (soft delete)
- [ ] Realtime funciona (auto-refresh)

**Visual:**
- [ ] Loading state aparece
- [ ] Empty state quando vazio
- [ ] Cards de resumo corretos
- [ ] Tabela renderiza corretamente
- [ ] Toasts aparecem nas ações

**Console:**
- [ ] Sem erros vermelhos
- [ ] Logs de Realtime aparecem
- [ ] Network tab mostra 200 OK

---

## 🎯 PRÓXIMA ETAPA

Após validar todos testes:
→ **ETAPA 5:** Validar RLS (Row Level Security)

**Status:** Aguardando testes manuais...
