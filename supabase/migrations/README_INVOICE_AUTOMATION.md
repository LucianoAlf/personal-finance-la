# 🤖 Automação de Faturas - Instruções de Configuração

## 📋 O que esta migration faz?

Esta migration configura a automação completa do sistema de faturas de cartão de crédito:

1. **Fechamento Automático**: Fecha faturas abertas quando o período termina
2. **Verificação de Vencidas**: Marca faturas como vencidas após a data de vencimento
3. **Cálculo Automático**: Calcula totais ao fechar faturas
4. **Atualização de Pagamentos**: Atualiza status ao registrar pagamentos

---

## 🚀 Como Aplicar no Supabase

### **Opção 1: Via Dashboard do Supabase (Recomendado)**

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor** (ícone de banco de dados na sidebar)
3. Clique em **New Query**
4. Copie todo o conteúdo do arquivo `20250105_invoice_automation.sql`
5. Cole no editor SQL
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a confirmação de sucesso

### **Opção 2: Via Supabase CLI**

```bash
# Na raiz do projeto
npx supabase db push
```

---

## ⚙️ Cron Jobs Configurados

### **1. Fechamento Automático de Faturas**
- **Nome**: `close-invoices-daily`
- **Horário**: Todo dia à meia-noite (00:00)
- **Função**: Fecha faturas cujo `closing_date` já passou

### **2. Verificação de Faturas Vencidas**
- **Nome**: `check-overdue-invoices-daily`
- **Horário**: Todo dia às 01:00
- **Função**: Marca faturas como `overdue` após `due_date`

---

## 🧪 Testar Manualmente

Você pode executar as funções manualmente para testar:

```sql
-- Fechar faturas manualmente
SELECT close_invoices_automatically();

-- Verificar faturas vencidas manualmente
SELECT check_overdue_invoices();
```

---

## 📊 Verificar Cron Jobs Ativos

Para ver os jobs agendados:

```sql
SELECT * FROM cron.job;
```

Você deve ver 2 jobs:
- `close-invoices-daily`
- `check-overdue-invoices-daily`

---

## 🗑️ Remover Cron Jobs (se necessário)

```sql
-- Remover job de fechamento
SELECT cron.unschedule('close-invoices-daily');

-- Remover job de verificação
SELECT cron.unschedule('check-overdue-invoices-daily');
```

---

## 🔧 Triggers Configurados

### **1. calculate_invoice_total_on_close**
- **Quando**: Ao fechar uma fatura (status: open → closed)
- **O que faz**: Soma todas as transações e atualiza `total_amount`

### **2. update_invoice_remaining_amount**
- **Quando**: Ao registrar um pagamento
- **O que faz**: 
  - Atualiza `remaining_amount`
  - Marca como `paid` se pagamento total
  - Marca como `partial` se pagamento parcial

---

## ⚠️ Requisitos

### **pg_cron Extension**

A extensão `pg_cron` é necessária para os cron jobs. Ela já está incluída na migration.

**Nota**: Em planos gratuitos do Supabase, `pg_cron` pode não estar disponível. Neste caso:
- Os triggers continuarão funcionando normalmente
- O fechamento automático precisará ser feito manualmente ou via Edge Function

### **Alternativa sem pg_cron**

Se `pg_cron` não estiver disponível, você pode:

1. **Criar uma Edge Function** que roda via GitHub Actions
2. **Executar manualmente** quando necessário
3. **Usar um serviço externo** como Cron-job.org

---

## 📝 Logs e Monitoramento

As funções emitem logs que podem ser visualizados:

```sql
-- Ver últimos logs
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%close_invoices%' 
OR query LIKE '%check_overdue%'
ORDER BY calls DESC;
```

---

## ✅ Checklist de Verificação

Após aplicar a migration, verifique:

- [ ] Migration executada sem erros
- [ ] Funções criadas: `close_invoices_automatically()` e `check_overdue_invoices()`
- [ ] Triggers criados: `trg_calculate_invoice_total_on_close` e `trg_update_invoice_remaining_amount`
- [ ] Cron jobs agendados (se disponível)
- [ ] Teste manual das funções funcionando

---

## 🆘 Troubleshooting

### **Erro: "extension pg_cron does not exist"**

**Solução**: Seu plano do Supabase não suporta pg_cron. Use a alternativa manual ou Edge Functions.

### **Cron jobs não estão rodando**

1. Verifique se estão agendados: `SELECT * FROM cron.job;`
2. Verifique logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. Execute manualmente para testar

### **Triggers não estão disparando**

1. Verifique se foram criados: `SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%invoice%';`
2. Teste com uma atualização manual
3. Verifique logs de erro do Supabase

---

## 📚 Documentação Adicional

- [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 🎉 Pronto!

Sua automação de faturas está configurada e funcionando! 🚀
