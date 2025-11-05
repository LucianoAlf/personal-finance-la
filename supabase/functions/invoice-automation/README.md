# 🤖 Edge Function: Invoice Automation

## 📋 Descrição

Esta Edge Function substitui o `pg_cron` para planos gratuitos do Supabase, executando automaticamente:

1. **Fechamento de Faturas**: Fecha faturas cujo período terminou
2. **Verificação de Vencidas**: Marca faturas vencidas após a data de vencimento
3. **Cálculo de Totais**: Soma transações e atualiza valores

---

## 🚀 Deploy da Edge Function

### **1. Instalar Supabase CLI**

```bash
npm install -g supabase
```

### **2. Login no Supabase**

```bash
supabase login
```

### **3. Link com seu projeto**

```bash
supabase link --project-ref SEU_PROJECT_REF
```

### **4. Deploy da função**

```bash
supabase functions deploy invoice-automation
```

### **5. Verificar deploy**

```bash
supabase functions list
```

---

## 🔑 Configurar Secrets no GitHub

Para o GitHub Action funcionar, você precisa adicionar 2 secrets:

### **1. Acessar Settings do Repositório**
- Vá em: `Settings` → `Secrets and variables` → `Actions`

### **2. Adicionar Secrets**

**Secret 1: SUPABASE_URL**
```
Nome: SUPABASE_URL
Valor: https://SEU_PROJECT_REF.supabase.co
```

**Secret 2: SUPABASE_SERVICE_ROLE_KEY**
```
Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: sua_service_role_key_aqui
```

**Onde encontrar:**
- Acesse: [Supabase Dashboard](https://app.supabase.com)
- Vá em: `Settings` → `API`
- Copie: `service_role` key (⚠️ NUNCA exponha publicamente!)

---

## ⏰ Configurar Horário do Cron

O GitHub Action está configurado para rodar **diariamente às 00:00 UTC** (21:00 horário de Brasília).

Para alterar o horário, edite `.github/workflows/invoice-automation.yml`:

```yaml
schedule:
  # Formato: minuto hora dia mês dia-da-semana
  - cron: '0 0 * * *'  # 00:00 UTC
  
  # Exemplos:
  # - cron: '0 3 * * *'  # 03:00 UTC (00:00 Brasília)
  # - cron: '30 1 * * *' # 01:30 UTC (22:30 Brasília)
  # - cron: '0 */6 * * *' # A cada 6 horas
```

**Conversor de Timezone:**
- 00:00 UTC = 21:00 Brasília (dia anterior)
- 03:00 UTC = 00:00 Brasília
- 06:00 UTC = 03:00 Brasília

---

## 🧪 Testar Manualmente

### **Opção 1: Via GitHub Actions UI**

1. Acesse: `Actions` → `Invoice Automation`
2. Clique em: `Run workflow`
3. Selecione: `main` branch
4. Clique em: `Run workflow`

### **Opção 2: Via cURL (Local)**

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://SEU_PROJECT_REF.supabase.co/functions/v1/invoice-automation"
```

### **Opção 3: Via Supabase Dashboard**

1. Acesse: `Edge Functions` no dashboard
2. Selecione: `invoice-automation`
3. Clique em: `Invoke function`

---

## 📊 Resposta da Função

```json
{
  "success": true,
  "closedInvoices": 3,
  "overdueInvoices": 1,
  "errors": [],
  "timestamp": "2025-01-05T00:00:00.000Z"
}
```

**Campos:**
- `success`: `true` se executou sem erros
- `closedInvoices`: Número de faturas fechadas
- `overdueInvoices`: Número de faturas marcadas como vencidas
- `errors`: Array de erros (vazio se sucesso)
- `timestamp`: Data/hora da execução

---

## 📝 Logs

### **Ver logs da Edge Function:**

```bash
supabase functions logs invoice-automation
```

### **Ver logs do GitHub Action:**

1. Acesse: `Actions` no GitHub
2. Clique no workflow executado
3. Veja os logs de cada step

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────┐
│  GitHub Action (Cron Diário às 00:00 UTC)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Chama Edge Function via HTTP POST         │
│  + Authorization: Bearer SERVICE_ROLE_KEY   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Edge Function: invoice-automation          │
│  1. Fecha faturas (closing_date < hoje)     │
│  2. Marca vencidas (due_date < hoje)        │
│  3. Calcula totais                          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Supabase Database                          │
│  - Atualiza credit_card_invoices            │
│  - Triggers calculam remaining_amount       │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Limitações do Plano Gratuito

### **GitHub Actions:**
- ✅ 2.000 minutos/mês (mais que suficiente)
- ✅ Cron gratuito ilimitado
- ✅ Execução manual ilimitada

### **Supabase Edge Functions:**
- ✅ 500.000 invocações/mês
- ✅ 2 GB de transferência/mês
- ✅ Execução rápida (< 1 segundo)

**Conclusão:** Totalmente viável para plano gratuito! 🎉

---

## 🛠️ Troubleshooting

### **Erro: "Missing authorization header"**
- Verifique se o secret `SUPABASE_SERVICE_ROLE_KEY` está configurado
- Confirme que está usando a `service_role` key, não a `anon` key

### **Erro: "Invalid JWT"**
- A service_role key expirou ou está incorreta
- Gere uma nova no Dashboard: `Settings` → `API`

### **GitHub Action não executa**
- Verifique se o repositório está público OU
- Se privado, confirme que tem minutos disponíveis
- Veja logs em: `Actions` → workflow executado

### **Edge Function não foi encontrada**
- Execute: `supabase functions deploy invoice-automation`
- Verifique: `supabase functions list`

---

## 📚 Documentação Adicional

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Actions Cron](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Crontab Guru](https://crontab.guru/) - Gerador de expressões cron

---

## ✅ Checklist de Configuração

- [ ] Edge Function deployada no Supabase
- [ ] Secrets configurados no GitHub (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)
- [ ] GitHub Action commitado no repositório
- [ ] Teste manual executado com sucesso
- [ ] Cron configurado para o horário desejado
- [ ] Logs verificados

---

## 🎉 Pronto!

Sua automação de faturas está configurada e rodando gratuitamente! 🚀

**Próxima execução:** Todo dia às 00:00 UTC (21:00 Brasília)
