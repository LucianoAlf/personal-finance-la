# 🔍 DEBUG: Portfolio Snapshots não foram criados

## 📊 RESULTADOS DOS TESTES

✅ **Cron Job Criado:** ID 18 - `daily-portfolio-snapshot`  
✅ **Request enviado:** request_id = 398  
❌ **Snapshots criados:** 0 (nenhum)

---

## 🔧 POSSÍVEIS CAUSAS

### 1. **Nenhum usuário ativo**
A Edge Function só processa usuários com `is_active = true`

**SQL para verificar:**
```sql
SELECT id, email, is_active 
FROM auth.users 
LIMIT 10;
```

### 2. **Nenhum investimento ativo**
Usuário precisa ter investimentos com `is_active = true`

**SQL para verificar:**
```sql
SELECT 
  user_id,
  COUNT(*) as total_investments,
  SUM(total_invested) as total_invested,
  SUM(current_value) as current_value
FROM investments
WHERE is_active = true
GROUP BY user_id;
```

### 3. **Erro na Edge Function**
Verificar logs de execução

**Como ver logs:**
1. Acesse: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions
2. Clique em `create-portfolio-snapshot`
3. Vá na aba "Logs"
4. Procure por erros

### 4. **Problema com Service Role Key**
A função usa `current_setting('app.settings.service_role_key')`

**SQL para verificar se está configurada:**
```sql
SELECT current_setting('app.settings.service_role_key', true) IS NOT NULL as key_configured;
```

---

## 🛠️ SOLUÇÃO: Testar diretamente a Edge Function

Execute este SQL para chamar a função com mais detalhes:

```sql
SELECT 
  net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/create-portfolio-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTE2OTI1OCwiZXhwIjoyMDQ2NzQ1MjU4fQ.g9dq1NcZnhJqQDWYk_sKNO7PmUjXyD8TI0WDXlpj8Yo'
    ),
    body := '{}'::jsonb
  )::jsonb AS response;
```

**Nota:** Esse SQL usa o service_role_key direto (mais seguro do que app.settings)

---

## ✅ SQL PARA POPULAR MANUALMENTE (TEMPORÁRIO)

Se quiser criar um snapshot manualmente para testar a UI:

```sql
INSERT INTO portfolio_snapshots (
  user_id,
  snapshot_date,
  total_invested,
  current_value,
  return_amount,
  return_percentage,
  allocation,
  top_performers,
  dividends_ytd,
  dividend_yield
)
SELECT 
  user_id,
  CURRENT_DATE as snapshot_date,
  SUM(total_invested) as total_invested,
  SUM(current_value) as current_value,
  SUM(current_value) - SUM(total_invested) as return_amount,
  CASE 
    WHEN SUM(total_invested) > 0 
    THEN ((SUM(current_value) - SUM(total_invested)) / SUM(total_invested)) * 100
    ELSE 0 
  END as return_percentage,
  '{}'::jsonb as allocation,
  '[]'::jsonb as top_performers,
  0 as dividends_ytd,
  0 as dividend_yield
FROM investments
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 0;
```

Depois execute novamente:
```sql
SELECT * FROM portfolio_snapshots ORDER BY snapshot_date DESC, created_at DESC LIMIT 10;
```

---

## 📝 CHECKLIST DE DEBUG

- [ ] Verificar se há usuários ativos
- [ ] Verificar se há investimentos ativos
- [ ] Ver logs da Edge Function
- [ ] Testar com service_role_key direto
- [ ] Popular manualmente se necessário
- [ ] Verificar se tabela portfolio_snapshots existe

---

**Data:** 09 Nov 2025  
**Status:** 🔍 Em investigação
