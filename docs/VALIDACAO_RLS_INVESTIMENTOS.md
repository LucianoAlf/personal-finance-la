# 🔒 VALIDAÇÃO RLS - INVESTIMENTOS

**Sprint 0 - Etapa 5**  
**Objetivo:** Garantir segurança dos dados (isolamento por usuário)

---

## 🎯 O QUE É RLS?

**Row Level Security (RLS)** garante que:
- ✅ Usuários só veem SEUS próprios investimentos
- ✅ Usuários só podem CRIAR investimentos para si
- ✅ Usuários só podem EDITAR seus investimentos
- ✅ Usuários só podem DELETAR seus investimentos

---

## 📋 ETAPA 1: VERIFICAR POLICIES NO SUPABASE

### **Acessar:**
1. Dashboard Supabase: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw
2. Ir em: Authentication → Policies
3. Ou: Table Editor → investments → "View Policies"

### **Executar SQL para listar policies:**
```sql
-- Ver todas as policies da tabela investments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'investments';
```

### **✅ Resultado Esperado:**

Devem existir **4 policies**:

| Policy Name | Command | Qual/Check |
|-------------|---------|------------|
| Enable read access for users | SELECT | `(auth.uid() = user_id)` |
| Enable insert for users | INSERT | `(auth.uid() = user_id)` |
| Enable update for users | UPDATE | `(auth.uid() = user_id)` |
| Enable delete for users | DELETE | `(auth.uid() = user_id)` |

---

## 🧪 ETAPA 2: CRIAR POLICIES (SE NÃO EXISTIREM)

### **SQL para criar policies:**

```sql
-- Habilitar RLS na tabela
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT (Read)
CREATE POLICY "Enable read access for users"
ON investments
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: INSERT (Create)
CREATE POLICY "Enable insert for users"
ON investments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE (Edit)
CREATE POLICY "Enable update for users"
ON investments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE (Remove)
CREATE POLICY "Enable delete for users"
ON investments
FOR DELETE
USING (auth.uid() = user_id);
```

---

## 🔍 ETAPA 3: TESTAR SEGURANÇA

### **TESTE 1: Tentativa de acesso cruzado (deve falhar)**

```sql
-- 1. Ver seu próprio user_id
SELECT auth.uid();

-- 2. Tentar buscar investimentos de OUTRO usuário
SELECT *
FROM investments
WHERE user_id = '00000000-0000-0000-0000-000000000000'; -- ID fake

-- ✅ RESULTADO ESPERADO: Retorna [] (vazio)
-- ❌ SE RETORNAR DADOS: RLS não está funcionando!
```

### **TESTE 2: Tentativa de inserção com user_id diferente (deve falhar)**

```sql
-- Tentar inserir investimento com user_id de outro usuário
INSERT INTO investments (
  user_id,
  type,
  name,
  ticker,
  quantity,
  purchase_price
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- ID fake
  'stock',
  'Teste Segurança',
  'TEST',
  1,
  10.00
);

-- ✅ RESULTADO ESPERADO: ERROR
-- Mensagem: "new row violates row-level security policy for table investments"
```

### **TESTE 3: Inserção correta (deve funcionar)**

```sql
-- Inserir com seu próprio user_id
INSERT INTO investments (
  user_id,
  type,
  name,
  ticker,
  quantity,
  purchase_price,
  total_invested,
  current_value
) VALUES (
  auth.uid(), -- Seu próprio ID
  'stock',
  'Teste RLS OK',
  'TEST',
  1,
  10.00,
  10.00,
  10.00
);

-- ✅ RESULTADO ESPERADO: Success (1 row inserted)
```

### **TESTE 4: Update de investimento de outro usuário (deve falhar)**

```sql
-- 1. Criar variável com ID fake
DO $$
DECLARE
  fake_investment_id UUID := gen_random_uuid();
BEGIN
  -- Tentar atualizar investimento que não é seu
  UPDATE investments
  SET current_price = 999.99
  WHERE id = fake_investment_id;
  
  -- ✅ RESULTADO ESPERADO: 0 rows affected
END $$;
```

---

## ✅ CHECKLIST DE VALIDAÇÃO RLS

**Policies Criadas:**
- [ ] SELECT policy exists
- [ ] INSERT policy exists
- [ ] UPDATE policy exists
- [ ] DELETE policy exists

**Testes de Segurança:**
- [ ] ❌ Não consegue ler dados de outro usuário
- [ ] ❌ Não consegue inserir com user_id diferente
- [ ] ✅ Consegue inserir com auth.uid()
- [ ] ❌ Não consegue editar investimentos de outros
- [ ] ❌ Não consegue deletar investimentos de outros
- [ ] ✅ Consegue editar SEUS investimentos
- [ ] ✅ Consegue deletar SEUS investimentos

---

## 🎯 RESULTADO ESPERADO

### **✅ RLS FUNCIONANDO:**
```
✓ Usuários isolados (cada um vê apenas seus dados)
✓ Tentativas de acesso cruzado bloqueadas
✓ Operações permitidas apenas em dados próprios
✓ Hook useInvestments funciona normalmente
```

### **❌ RLS COM PROBLEMA:**
```
✗ Consegue ver investimentos de outros
✗ Consegue editar/deletar dados alheios
✗ Políticas não criadas ou desabilitadas
→ AÇÃO: Executar SQL da Etapa 2
```

---

## 🔧 TROUBLESHOOTING

### **Problema: "RLS não está habilitado"**
```sql
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
```

### **Problema: "Policies não existem"**
- Executar SQL completo da Etapa 2

### **Problema: "Hook não carrega dados"**
- Verificar se user está autenticado: `auth.uid()` não pode ser null
- Verificar no console: `localStorage.getItem('sb-access-token')`

---

## 📊 STATUS - ETAPA 5

**RLS Configurado:** ⏳ Aguardando validação  
**Próxima Etapa:** Etapa 6 (Garantir Zero Erros)

**Documentação:** Este arquivo serve como guia de validação
