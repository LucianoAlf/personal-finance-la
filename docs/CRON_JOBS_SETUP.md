# ⏰ CRON JOBS - CONFIGURAÇÃO COMPLETA

**Sprint 4 - Automações em Background**  
**Data:** 10 Nov 2025

---

## 📋 RESUMO

Configuração de Cron Jobs no Supabase para executar tarefas automáticas em intervalos regulares.

**Total de Cron Jobs:** 3
1. ✅ Check Price Alerts (a cada hora) - **JÁ CONFIGURADO**
2. ✅ Send Bill Reminders (a cada 10 min) - **JÁ CONFIGURADO**
3. 🆕 Investment Radar (1x/dia às 09:00) - **NOVO**

---

## 🎯 INVESTMENT RADAR CRON JOB

### **Objetivo:**
Executar automaticamente 1x/dia para:
- Analisar TODOS os portfólios de usuários ativos
- Gerar oportunidades de investimento personalizadas
- Expirar oportunidades antigas (>7 dias)

### **Configuração:**

**Frequência:** Diária às 09:00 (horário de Brasília)  
**Edge Function:** `_cron/investment-radar`  
**Cron Expression:** `0 9 * * *`

---

## 🛠️ PASSO A PASSO - SUPABASE DASHBOARD

### **1. Deploy da Edge Function**

```bash
# No terminal (na raiz do projeto)
npx supabase functions deploy _cron/investment-radar
```

**Verificar:**
- ✅ Function aparece em `Edge Functions` no dashboard
- ✅ Status: `Active`

### **2. Criar Cron Job no Dashboard**

**Caminho:** `Database` → `Cron Jobs` → `Create a new cron job`

**Configuração:**

```sql
-- Nome: investment_radar_daily
-- Schedule: 0 9 * * *
-- Command:
SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/_cron/investment-radar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object()
  ) AS request_id;
```

**⚠️ IMPORTANTE:**
- Substituir `YOUR_PROJECT_REF` pelo ID do seu projeto
- A key `service_role_key` já está configurada automaticamente

### **3. Configurar Service Role Key (se necessário)**

```sql
-- Executar no SQL Editor (apenas 1x)
ALTER DATABASE postgres SET "app.settings.service_role_key" TO 'YOUR_SERVICE_ROLE_KEY';
```

**Onde encontrar a Service Role Key:**
`Settings` → `API` → `Project API keys` → `service_role` (secret)

### **4. Testar o Cron Job**

**Opção 1: Trigger manual**
```sql
-- No SQL Editor
SELECT cron.schedule('test-investment-radar', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/_cron/investment-radar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object()
  );
$$);

-- Aguardar 1 minuto, depois remover:
SELECT cron.unschedule('test-investment-radar');
```

**Opção 2: Invocar Edge Function diretamente**
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/_cron/investment-radar \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### **5. Monitorar Execuções**

**Ver logs da Edge Function:**
`Edge Functions` → `_cron/investment-radar` → `Logs`

**Ver histórico do Cron Job:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'investment_radar_daily'
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📊 CRON JOBS CONFIGURADOS

### **1. Check Price Alerts** ✅
```
Frequência: A cada hora (0 */1 * * *)
Edge Function: check-price-alerts
Objetivo: Verificar se ativos atingiram preço-alvo
Status: ATIVO
```

### **2. Send Bill Reminders** ✅
```
Frequência: A cada 10 minutos (*/10 * * * *)
Edge Function: send-bill-reminders
Objetivo: Enviar lembretes de contas via WhatsApp
Status: ATIVO
```

### **3. Investment Radar** 🆕
```
Frequência: Diária às 09:00 (0 9 * * *)
Edge Function: _cron/investment-radar
Objetivo: Gerar oportunidades de investimento
Status: PENDENTE CONFIGURAÇÃO
```

---

## 🔧 CRON EXPRESSIONS REFERENCE

```
┌───────────── minuto (0-59)
│ ┌───────────── hora (0-23)
│ │ ┌───────────── dia do mês (1-31)
│ │ │ ┌───────────── mês (1-12)
│ │ │ │ ┌───────────── dia da semana (0-6, 0 = domingo)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Exemplos comuns:**
```
0 9 * * *         → Diariamente às 09:00
*/10 * * * *      → A cada 10 minutos
0 */1 * * *       → A cada hora
0 0 * * 0         → Toda segunda às 00:00
0 0 1 * *         → Todo dia 1 do mês às 00:00
*/30 9-17 * * 1-5 → A cada 30min, 9h-17h, seg-sex
```

---

## 🐛 TROUBLESHOOTING

### **Problema: Cron não executa**

**Verificar:**
1. Edge Function está deployada? `supabase functions list`
2. Service Role Key configurada? `SHOW app.settings.service_role_key;`
3. URL correta no comando? Verificar `YOUR_PROJECT_REF`
4. Cron job está ativo? `SELECT * FROM cron.job WHERE jobname = 'investment_radar_daily';`

**Solução:**
```sql
-- Ver todos os jobs
SELECT * FROM cron.job;

-- Ver últimas execuções
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Remover job problemático
SELECT cron.unschedule('investment_radar_daily');

-- Recriar job
-- (executar novamente o CREATE)
```

### **Problema: Edge Function retorna erro 401**

**Causa:** Service Role Key inválida ou não configurada

**Solução:**
```sql
-- Verificar se está configurada
SHOW app.settings.service_role_key;

-- Se retornar vazio, configurar:
ALTER DATABASE postgres SET "app.settings.service_role_key" TO 'eyJhbG...';
```

### **Problema: Timeout na Edge Function**

**Causa:** Muitos usuários para processar

**Solução:**
- Aumentar timeout da Edge Function (máx 300s)
- Processar em lotes menores
- Adicionar paginação

---

## 📈 MÉTRICAS E MONITORAMENTO

### **Dashboard de Monitoramento:**

```sql
-- Ver estatísticas do Cron Investment Radar
SELECT
  jobname,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) AS avg_duration_seconds
FROM cron.job_run_details
WHERE jobname = 'investment_radar_daily'
  AND start_time >= NOW() - INTERVAL '30 days'
GROUP BY jobname;
```

### **Ver últimos erros:**

```sql
SELECT
  start_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'investment_radar_daily'
  AND status = 'failed'
ORDER BY start_time DESC
LIMIT 5;
```

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

### **Investment Radar Cron Job:**

- [ ] Edge Function `_cron/investment-radar` deployada
- [ ] SQL Function `get_active_users()` criada
- [ ] SQL Function `expire_old_opportunities()` criada
- [ ] Service Role Key configurada no database
- [ ] Cron Job criado no dashboard (0 9 * * *)
- [ ] Teste manual executado com sucesso
- [ ] Logs verificados sem erros
- [ ] Monitoramento configurado

### **Badges System:**

- [ ] Migration `20250110000002_badges_system.sql` executada
- [ ] 8 badges iniciais inseridos
- [ ] Triggers configurados (investments, transactions)
- [ ] Function `check_and_unlock_badges()` funcionando
- [ ] View `user_badges_detailed` criada
- [ ] RLS policies ativas

---

## 🚀 PRÓXIMOS PASSOS

Após configurar o Investment Radar:

1. **Monitorar primeira execução** (09:00 do dia seguinte)
2. **Verificar oportunidades geradas** na tabela `market_opportunities`
3. **Testar notificações** no frontend
4. **Ajustar threshold** se necessário (muito/poucas oportunidades)

**Otimizações futuras:**
- Adicionar cache de análises
- Implementar rate limiting
- Enviar resumo diário por email
- Integrar com N8N para WhatsApp proativo

---

**Status:** 📋 Pronto para configuração  
**Tempo estimado:** 10 minutos  
**Complexidade:** Baixa

**Data:** 10 Nov 2025
