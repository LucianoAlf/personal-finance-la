# 📅 CONFIGURAR CRON JOBS - SISTEMA PREMIUM

**Data:** 12/11/2024 20:50  
**Projeto:** Personal Finance LA (`sbnpmhmvcspwcyjhftlw`)

---

## 🎯 CRON JOBS A CONFIGURAR

### **1. send-overdue-bill-alerts**
- **Horário:** 09:00 (America/Sao_Paulo)
- **Frequência:** Diária
- **Cron Expression:** `0 9 * * *`

### **2. send-low-balance-alerts**
- **Horário:** 08:00 (America/Sao_Paulo)
- **Frequência:** Diária
- **Cron Expression:** `0 8 * * *`

### **3. send-investment-summary**
- **Horário:** 18:00 (America/Sao_Paulo)
- **Frequência:** Diária (verifica dia correto internamente)
- **Cron Expression:** `0 18 * * *`

---

## 📋 PASSO A PASSO (DASHBOARD)

### **OPÇÃO 1: Via Supabase Dashboard (Recomendado)**

1. **Acesse o Dashboard:**
   ```
   https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/functions
   ```

2. **Para cada Edge Function:**

   **send-overdue-bill-alerts:**
   - Clique na função `send-overdue-bill-alerts`
   - Aba "Cron Jobs" ou "Schedule"
   - Clique em "Add Schedule" ou "New Cron Job"
   - Preencha:
     - **Name:** `daily-overdue-bills-check`
     - **Cron Expression:** `0 9 * * *`
     - **Timezone:** `America/Sao_Paulo`
     - **Enabled:** ✅
   - Salvar

   **send-low-balance-alerts:**
   - Clique na função `send-low-balance-alerts`
   - Aba "Cron Jobs" ou "Schedule"
   - Clique em "Add Schedule"
   - Preencha:
     - **Name:** `daily-low-balance-check`
     - **Cron Expression:** `0 8 * * *`
     - **Timezone:** `America/Sao_Paulo`
     - **Enabled:** ✅
   - Salvar

   **send-investment-summary:**
   - Clique na função `send-investment-summary`
   - Aba "Cron Jobs" ou "Schedule"
   - Clique em "Add Schedule"
   - Preencha:
     - **Name:** `daily-investment-summary`
     - **Cron Expression:** `0 18 * * *`
     - **Timezone:** `America/Sao_Paulo`
     - **Enabled:** ✅
   - Salvar

---

### **OPÇÃO 2: Via Supabase CLI**

```bash
# Criar arquivo de configuração cron.yaml na raiz do projeto
# Depois aplicar com:
supabase functions schedule create --project-ref sbnpmhmvcspwcyjhftlw
```

**Arquivo `supabase/cron.yaml`:**
```yaml
schedules:
  - name: daily-overdue-bills-check
    function: send-overdue-bill-alerts
    schedule: "0 9 * * *"
    timezone: America/Sao_Paulo
    enabled: true

  - name: daily-low-balance-check
    function: send-low-balance-alerts
    schedule: "0 8 * * *"
    timezone: America/Sao_Paulo
    enabled: true

  - name: daily-investment-summary
    function: send-investment-summary
    schedule: "0 18 * * *"
    timezone: America/Sao_Paulo
    enabled: true
```

---

### **OPÇÃO 3: Via Management API (Programático)**

```bash
# Obter token de acesso no Dashboard > Settings > API > Service Role Key

# Criar Cron Job para send-overdue-bill-alerts
curl -X POST \
  'https://api.supabase.com/v1/projects/sbnpmhmvcspwcyjhftlw/functions/schedules' \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "function_slug": "send-overdue-bill-alerts",
    "cron": "0 9 * * *",
    "timezone": "America/Sao_Paulo"
  }'

# Repetir para as outras 2 funções
```

---

## 🕐 CRON EXPRESSIONS EXPLICADAS

### **Formato:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Dia da semana (0-6, 0 = Domingo)
│ │ │ └───── Mês (1-12)
│ │ └─────── Dia do mês (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

### **Nossos Cron Jobs:**
- `0 9 * * *` → Todo dia às 09:00
- `0 8 * * *` → Todo dia às 08:00
- `0 18 * * *` → Todo dia às 18:00

### **Outros Exemplos:**
- `0 */2 * * *` → A cada 2 horas
- `0 9 * * 1` → Toda segunda-feira às 09:00
- `0 18 1 * *` → Dia 1 de cada mês às 18:00
- `*/30 * * * *` → A cada 30 minutos

---

## ✅ VERIFICAR CONFIGURAÇÃO

Após configurar, verifique:

1. **Dashboard > Functions > [Nome da função] > Cron Jobs**
   - Status: ✅ Enabled
   - Next Run: [Data/hora próxima execução]
   - Last Run: (vazio até primeira execução)

2. **Testar manualmente:**
   ```bash
   # Invocar Edge Function diretamente
   curl -X POST \
     'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-overdue-bill-alerts' \
     -H "Authorization: Bearer <ANON_KEY>" \
     -H "x-cron-secret: <CRON_SECRET>"
   ```

---

## 🔐 SEGURANÇA: CRON_SECRET

**IMPORTANTE:** Configure a variável `CRON_SECRET` nas Edge Functions para proteger contra invocações não autorizadas:

1. **Dashboard > Settings > Edge Functions > Secrets**
2. Adicionar:
   ```
   CRON_SECRET=<uuid_seguro>
   ```
3. Gerar UUID seguro:
   ```bash
   # PowerShell
   [guid]::NewGuid()
   
   # Bash
   uuidgen
   ```

---

## 📊 MONITORAMENTO

### **Logs de Execução:**
1. Dashboard > Functions > [Nome] > Logs
2. Filtrar por data/hora do cron
3. Verificar:
   - Status code 200
   - Mensagens de sucesso
   - Quantidade de notificações enviadas

### **Métricas:**
- **Invocations:** Quantidade de execuções
- **Errors:** Taxa de erro (deve ser 0%)
- **Duration:** Tempo médio de execução
- **Success Rate:** Taxa de sucesso (deve ser 100%)

---

## 🐛 TROUBLESHOOTING

### **Cron não está executando:**
1. Verificar timezone (America/Sao_Paulo)
2. Verificar se está Enabled
3. Verificar Next Run no Dashboard
4. Testar invocação manual

### **Erro 401 Unauthorized:**
- Adicionar/verificar CRON_SECRET nos secrets
- Verificar header `x-cron-secret` na requisição

### **Nenhuma notificação enviada:**
1. Verificar logs da Edge Function
2. Verificar preferências dos usuários no banco:
   ```sql
   SELECT user_id, overdue_bill_alerts_enabled, whatsapp_enabled
   FROM notification_preferences
   WHERE overdue_bill_alerts_enabled = true;
   ```
3. Verificar se há contas/dados para alertar

---

## 🎯 PRÓXIMOS TESTES

1. **Aguardar primeira execução automática**
2. **Verificar logs no Dashboard**
3. **Confirmar recebimento de notificações WhatsApp**
4. **Validar métricas de sucesso**

---

## ✅ CHECKLIST FINAL

- [ ] Cron Job `send-overdue-bill-alerts` configurado (09:00)
- [ ] Cron Job `send-low-balance-alerts` configurado (08:00)
- [ ] Cron Job `send-investment-summary` configurado (18:00)
- [ ] `CRON_SECRET` configurado nos secrets
- [ ] Timezone configurado (America/Sao_Paulo)
- [ ] Teste manual executado com sucesso
- [ ] Primeira execução automática verificada
- [ ] Logs sem erros

---

**Status:** Pronto para configuração manual no Dashboard! 🚀
