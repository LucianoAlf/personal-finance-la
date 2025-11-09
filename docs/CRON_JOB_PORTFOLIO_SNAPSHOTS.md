# 📅 CONFIGURAR CRON JOB: Portfolio Snapshots

## 🎯 Objetivo
Executar snapshots diários do portfólio automaticamente às **00:30** (após o mercado fechar).

---

## ⚙️ INSTRUÇÕES

### **1. Acessar SQL Editor**
1. Acesse: https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/sql
2. Clique em "+ New query"

### **2. Executar SQL**
Cole e execute o seguinte SQL:

```sql
-- SPRINT 5.1: Cron Job para criar snapshots diários do portfólio
SELECT cron.schedule(
  'daily-portfolio-snapshot',
  '30 0 * * *',  -- Todos os dias às 00:30
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/create-portfolio-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  ) AS request_id;
  $$
);
```

### **3. Verificar Cron Job**
Para listar todos os cron jobs:

```sql
SELECT * FROM cron.job ORDER BY jobid DESC;
```

### **4. Testar Manualmente**
Para testar agora sem esperar o cron:

```sql
SELECT net.http_post(
  url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/create-portfolio-snapshot',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
  )
) AS request_id;
```

### **5. Ver Logs**
No Dashboard do Supabase:
1. Edge Functions → `create-portfolio-snapshot`
2. Ver logs de execução

---

## 🔍 VERIFICAR SNAPSHOTS CRIADOS

```sql
SELECT 
  snapshot_date,
  COUNT(*) as total_users,
  SUM(total_invested) as total_invested,
  SUM(current_value) as current_value,
  AVG(return_percentage) as avg_return_pct
FROM portfolio_snapshots
GROUP BY snapshot_date
ORDER BY snapshot_date DESC
LIMIT 10;
```

---

## 🗑️ REMOVER CRON JOB (se necessário)

```sql
SELECT cron.unschedule('daily-portfolio-snapshot');
```

---

**Status:** ✅ Pronto para configurar
