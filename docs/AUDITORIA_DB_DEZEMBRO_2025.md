# 🔍 AUDITORIA COMPLETA DO BANCO DE DADOS - PERSONAL FINANCE LA

**Data da Auditoria:** 06 de Dezembro de 2025  
**Projeto:** Personal Finance LA  
**Supabase Project ID:** `sbnpmhmvcspwcyjhftlw`  
**Região:** us-east-1  
**Status:** ACTIVE_HEALTHY  
**PostgreSQL:** 17.6.1.036

---

## 📊 RESUMO EXECUTIVO

| Métrica | Quantidade |
|---------|------------|
| **Tabelas** | 56 |
| **Views** | 12 |
| **Functions/RPCs** | 67 |
| **Triggers** | 70 |
| **Cron Jobs** | 20 |
| **Edge Functions** | 43 |
| **ENUMs** | 16 |
| **Foreign Keys** | 44 |
| **RLS Policies** | ~150 |
| **Storage Buckets** | 1 |
| **Total de Registros** | ~2.200+ |

### 🟢 Status Geral: SAUDÁVEL
- ✅ 55/56 tabelas com RLS ativado
- ✅ Todas as Edge Functions ativas
- ✅ Todos os Cron Jobs ativos
- ⚠️ 1 tabela sem RLS: `bill_tags`
- ⚠️ 14 tabelas vazias (sem uso ainda)

---

## 📋 INVENTÁRIO DE TABELAS (56 tabelas)

### Por Quantidade de Registros (Top 20)

| Tabela | Registros | Colunas | Descrição |
|--------|-----------|---------|-----------|
| `investment_quotes_history` | 1.607 | 8 | Cache de cotações de investimentos |
| `whatsapp_messages` | 203 | 21 | Histórico de mensagens WhatsApp |
| `market_opportunities` | 124 | 16 | Oportunidades de mercado (Ana Clara) |
| `transactions` | 85 | 22 | Transações financeiras |
| `payable_bills` | 33 | 37 | Contas a pagar |
| `portfolio_snapshots` | 28 | 12 | Snapshots diários do portfólio |
| `categories` | 21 | 10 | Categorias de transações |
| `badge_progress` | 20 | 11 | Progresso de badges (gamificação) |
| `credit_card_transactions` | 16 | 18 | Transações de cartão de crédito |
| `budgets` | 14 | 8 | Orçamentos por categoria |
| `credit_card_transaction_tags` | 13 | 4 | Tags de transações de cartão |
| `investment_transactions` | 9 | 12 | Transações de investimentos |
| `badges` | 8 | 8 | Definição de badges |
| `whatsapp_quick_commands` | 8 | 13 | Comandos rápidos WhatsApp |
| `user_badges` | 7 | 5 | Badges conquistados por usuário |
| `transaction_edits` | 6 | 9 | Histórico de edições de transações |
| `investments` | 6 | 23 | Investimentos ativos |
| `tags` | 5 | 6 | Tags personalizadas |
| `credit_card_invoices` | 4 | 15 | Faturas de cartão de crédito |
| `credit_cards` | 4 | 17 | Cartões de crédito cadastrados |

### Tabelas Vazias (14 tabelas - sem uso)

| Tabela | Colunas | Observação |
|--------|---------|------------|
| `bill_reminders` | 15 | Sistema de lembretes não utilizado |
| `bill_payment_history` | 11 | Histórico de pagamentos vazio |
| `whatsapp_conversation_context` | 12 | Contexto de conversa não usado |
| `saved_filters` | 6 | Filtros salvos não implementado |
| `challenges` | 13 | Desafios de gamificação não usado |
| `transaction_tags` | 4 | Tags de transações não usado |
| `user_achievements` | 11 | Conquistas não implementado |
| `investment_alerts` | 12 | Alertas de investimento vazios |
| `bill_tags` | 3 | Tags de contas não usado |
| `user_gamification_profile` | 13 | Perfil de gamificação vazio |
| `integration_configs` | 21 | Configurações de integração vazias |
| `webhook_endpoints` | 22 | Webhooks não configurados |
| `webhook_logs` | 17 | Logs de webhooks vazios |
| `notifications_log` | 8 | Log de notificações vazio |

---

## 🗂️ MÓDULOS IDENTIFICADOS

### 1. 💰 CORE FINANCEIRO (8 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `users` | 1 | Usuários do sistema |
| `accounts` | 2 | Contas bancárias |
| `categories` | 21 | Categorias de transações |
| `transactions` | 85 | Transações financeiras |
| `tags` | 5 | Tags personalizadas |
| `transaction_tags` | 0 | Relação transação-tag |
| `transaction_edits` | 6 | Histórico de edições |
| `saved_filters` | 0 | Filtros salvos |

### 2. 💳 CARTÕES DE CRÉDITO (6 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `credit_cards` | 4 | Cartões cadastrados |
| `credit_card_invoices` | 4 | Faturas |
| `credit_card_transactions` | 16 | Transações de cartão |
| `credit_card_payments` | 3 | Pagamentos de fatura |
| `credit_card_transaction_tags` | 13 | Tags de transações |

### 3. 📅 CONTAS A PAGAR (5 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `payable_bills` | 33 | Contas a pagar |
| `bill_payment_history` | 0 | Histórico de pagamentos |
| `bill_reminders` | 0 | Lembretes agendados |
| `bill_tags` | 0 | Tags de contas |

### 4. 📈 INVESTIMENTOS (9 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `investments` | 6 | Investimentos ativos |
| `investment_accounts` | 3 | Corretoras/bancos |
| `investment_transactions` | 9 | Histórico de transações |
| `investment_allocation_targets` | 4 | Metas de alocação |
| `investment_quotes_history` | 1.607 | Cache de cotações |
| `investment_alerts` | 0 | Alertas de preço |
| `investment_goals` | 3 | Metas de investimento |
| `investment_goal_contributions` | 1 | Contribuições para metas |
| `market_opportunities` | 124 | Oportunidades (Ana Clara) |
| `portfolio_snapshots` | 28 | Snapshots diários |

### 5. 🎯 METAS E ORÇAMENTOS (6 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `budgets` | 14 | Orçamentos por categoria |
| `budget_summaries` | 2 | Resumos de orçamento |
| `savings_goals` | 2 | Metas de economia (legado) |
| `goal_contributions` | 3 | Contribuições para metas |
| `financial_goals` | 4 | Metas financeiras unificadas |
| `financial_goal_contributions` | 1 | Contribuições |
| `financial_cycles` | 1 | Ciclos financeiros |

### 6. 📱 WHATSAPP (6 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `whatsapp_messages` | 203 | Histórico de mensagens |
| `whatsapp_quick_commands` | 8 | Comandos rápidos |
| `whatsapp_connections` | 1 | Conexões ativas |
| `whatsapp_connection_status` | 1 | Status da conexão |
| `whatsapp_conversation_context` | 0 | Contexto de conversa |
| `conversation_context` | 1 | Contexto alternativo |

### 7. 🎮 GAMIFICAÇÃO (6 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `badges` | 8 | Definição de badges |
| `badge_progress` | 20 | Progresso de badges |
| `user_badges` | 7 | Badges conquistados |
| `user_gamification` | 1 | Perfil de gamificação |
| `user_gamification_profile` | 0 | Perfil alternativo |
| `user_achievements` | 0 | Conquistas |
| `challenges` | 0 | Desafios |

### 8. ⚙️ CONFIGURAÇÕES (6 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `user_settings` | 1 | Configurações do usuário |
| `ai_provider_configs` | 4 | Configurações de IA |
| `notification_preferences` | 1 | Preferências de notificação |
| `push_tokens` | 1 | Tokens de push |
| `integration_configs` | 0 | Configurações de integração |

### 9. 🔗 WEBHOOKS (2 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `webhook_endpoints` | 0 | Endpoints configurados |
| `webhook_logs` | 0 | Logs de execução |

### 10. 🤖 ANA CLARA (2 tabelas)
| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `ana_insights_cache` | 2 | Cache de insights |
| `notifications_log` | 0 | Log de notificações |

---

## 🔗 RELACIONAMENTOS (FOREIGN KEYS)

### Diagrama de Dependências Principais

```
users
├── accounts
│   ├── credit_cards
│   │   ├── credit_card_invoices
│   │   │   ├── credit_card_transactions
│   │   │   └── credit_card_payments
│   │   └── credit_card_transactions
│   ├── transactions
│   ├── payable_bills
│   └── credit_card_invoices (payment_account_id)
├── categories
│   ├── transactions
│   ├── credit_card_transactions
│   ├── budgets
│   ├── payable_bills
│   └── financial_goals
├── transactions
│   ├── transaction_tags
│   └── transaction_edits
├── savings_goals
│   └── goal_contributions
├── financial_goals
│   └── financial_goal_contributions
├── investments
│   ├── investment_transactions
│   └── investment_alerts
├── investment_accounts
│   └── investments
├── investment_goals
│   └── investment_goal_contributions
├── payable_bills
│   ├── bill_payment_history
│   ├── bill_reminders
│   ├── bill_tags
│   └── payable_bills (parent_recurring_id, parent_bill_id)
├── tags
│   ├── transaction_tags
│   ├── credit_card_transaction_tags
│   └── bill_tags
├── badges
│   └── user_badges
├── webhook_endpoints
│   └── webhook_logs
├── whatsapp_messages
│   └── whatsapp_conversation_context
└── push_tokens
```

### Lista Completa de FKs (44 relacionamentos)

| Origem | Coluna | Destino | Coluna |
|--------|--------|---------|--------|
| accounts | user_id | users | id |
| bill_payment_history | bill_id | payable_bills | id |
| bill_payment_history | account_from_id | accounts | id |
| bill_reminders | bill_id | payable_bills | id |
| bill_tags | tag_id | tags | id |
| bill_tags | bill_id | payable_bills | id |
| budgets | category_id | categories | id |
| categories | parent_id | categories | id |
| categories | user_id | users | id |
| conversation_context | user_id | users | id |
| credit_card_invoices | credit_card_id | credit_cards | id |
| credit_card_invoices | payment_account_id | accounts | id |
| credit_card_payments | account_id | accounts | id |
| credit_card_payments | invoice_id | credit_card_invoices | id |
| credit_card_transaction_tags | credit_card_transaction_id | credit_card_transactions | id |
| credit_card_transaction_tags | tag_id | tags | id |
| credit_card_transactions | credit_card_id | credit_cards | id |
| credit_card_transactions | invoice_id | credit_card_invoices | id |
| credit_card_transactions | category_id | categories | id |
| credit_cards | account_id | accounts | id |
| financial_goal_contributions | goal_id | financial_goals | id |
| financial_goals | category_id | categories | id |
| goal_contributions | goal_id | savings_goals | id |
| investment_alerts | investment_id | investments | id |
| investment_goal_contributions | goal_id | investment_goals | id |
| investment_transactions | investment_id | investments | id |
| investments | account_id | investment_accounts | id |
| payable_bills | category_id | categories | id |
| payable_bills | payment_account_id | accounts | id |
| payable_bills | parent_recurring_id | payable_bills | id |
| payable_bills | parent_bill_id | payable_bills | id |
| push_tokens | user_id | users | id |
| transaction_edits | user_id | users | id |
| transaction_edits | transaction_id | transactions | id |
| transaction_tags | transaction_id | transactions | id |
| transaction_tags | tag_id | tags | id |
| transactions | category_id | categories | id |
| transactions | user_id | users | id |
| transactions | transfer_to_account_id | accounts | id |
| transactions | account_id | accounts | id |
| user_badges | badge_id | badges | id |
| users | partner_id | users | id |
| webhook_logs | webhook_id | webhook_endpoints | id |
| whatsapp_conversation_context | last_message_id | whatsapp_messages | id |

---

## ⚡ FUNCTIONS/RPCs (67 funções)

### Funções de Negócio

| Função | Tipo | Retorno | Descrição |
|--------|------|---------|-----------|
| `add_xp_to_user` | FUNCTION | record | Adiciona XP ao usuário |
| `auto_generate_recurring_bills` | FUNCTION | integer | Gera contas recorrentes automaticamente |
| `calculate_investment_projection` | FUNCTION | record | Projeção de investimentos |
| `calculate_next_occurrence` | FUNCTION | date | Calcula próxima ocorrência de recorrência |
| `calculate_portfolio_metrics` | FUNCTION | record | Métricas do portfólio |
| `calculate_spending_streak` | FUNCTION | integer | Calcula streak de gastos |
| `calculate_xp_for_level` | FUNCTION | integer | Calcula XP necessário para nível |
| `check_and_unlock_badges` | FUNCTION | USER-DEFINED | Verifica e desbloqueia badges |
| `check_expired_challenges` | FUNCTION | integer | Verifica desafios expirados |
| `cleanup_expired_conversation_contexts` | FUNCTION | integer | Limpa contextos expirados |
| `complete_challenge` | FUNCTION | boolean | Completa um desafio |
| `dismiss_opportunity` | FUNCTION | void | Descarta oportunidade |
| `expire_old_opportunities` | FUNCTION | void | Expira oportunidades antigas |
| `generate_recurring_bills` | FUNCTION | record | Gera contas recorrentes |
| `get_active_opportunities` | FUNCTION | USER-DEFINED | Busca oportunidades ativas |
| `get_active_users` | FUNCTION | record | Busca usuários ativos |
| `get_bill_analytics` | FUNCTION | jsonb | Analytics de contas a pagar |
| `get_investment_goal_metrics` | FUNCTION | jsonb | Métricas de metas de investimento |
| `get_monthly_summary` | FUNCTION | record | Resumo mensal |
| `get_pending_reminders` | FUNCTION | record | Busca lembretes pendentes |
| `mark_bill_as_paid` | FUNCTION | jsonb | Marca conta como paga |
| `mark_reminder_failed` | FUNCTION | void | Marca lembrete como falho |
| `mark_reminder_sent` | FUNCTION | void | Marca lembrete como enviado |
| `process_whatsapp_command` | FUNCTION | text | Processa comando WhatsApp |
| `schedule_bill_reminders` | FUNCTION | void | Agenda lembretes de contas |
| `send_proactive_whatsapp_notifications` | FUNCTION | jsonb | Envia notificações proativas |
| `sync_investment_prices` | FUNCTION | jsonb | Sincroniza preços de investimentos |
| `unlock_achievement` | FUNCTION | boolean | Desbloqueia conquista |
| `unlock_badge` | FUNCTION | boolean | Desbloqueia badge |
| `update_achievement_progress` | FUNCTION | void | Atualiza progresso de conquista |
| `update_badge_progress` | FUNCTION | void | Atualiza progresso de badge |
| `update_best_streak` | FUNCTION | void | Atualiza melhor streak |
| `update_overdue_bills` | FUNCTION | integer | Atualiza contas vencidas |

### Funções de Trigger

| Função | Descrição |
|--------|-----------|
| `apply_savings_contribution` | Aplica contribuição em meta |
| `auto_categorize_transaction` | Categoriza transação automaticamente |
| `calculate_investment_returns` | Calcula retornos de investimento |
| `calculate_invoice_total_on_close` | Calcula total da fatura ao fechar |
| `check_allocation_total` | Verifica total de alocação |
| `ensure_single_default_provider` | Garante único provider padrão |
| `handle_new_user` | Processa novo usuário |
| `set_updated_at` | Define updated_at |
| `trigger_check_badges` | Verifica badges |
| `trigger_set_updated_at` | Define updated_at (trigger) |
| `update_account_balance` | Atualiza saldo da conta |
| `update_available_limit` | Atualiza limite disponível |
| `update_budget_summary` | Atualiza resumo de orçamento |
| `update_card_limit_on_delete` | Atualiza limite ao deletar |
| `update_card_limit_on_purchase` | Atualiza limite na compra |
| `update_gamification_updated_at` | Atualiza timestamp gamificação |
| `update_goal_amount_on_contribution` | Atualiza valor da meta |
| `update_goal_contributions_updated_at` | Atualiza timestamp contribuições |
| `update_investment_after_transaction` | Atualiza investimento após transação |
| `update_investment_alerts_updated_at` | Atualiza timestamp alertas |
| `update_investment_goal_amount` | Atualiza valor da meta de investimento |
| `update_invoice_remaining_amount` | Atualiza valor restante da fatura |
| `update_invoice_total` | Atualiza total da fatura |
| `update_invoice_total_on_delete` | Atualiza total ao deletar |
| `update_invoice_total_on_transaction` | Atualiza total na transação |
| `update_spending_goals` | Atualiza metas de gastos |
| `update_updated_at_column` | Atualiza coluna updated_at |
| `update_webhook_stats` | Atualiza estatísticas de webhook |
| `update_whatsapp_connections_updated_at` | Atualiza timestamp conexões |

### Funções Utilitárias

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `current_date_brasilia` | date | Data atual em Brasília |
| `current_time_brasilia` | time | Hora atual em Brasília |
| `now_brasilia` | timestamp | Timestamp atual em Brasília |
| `check_overdue_invoices` | void | Verifica faturas vencidas |
| `close_invoices_automatically` | void | Fecha faturas automaticamente |

---

## 🔄 TRIGGERS (70 triggers)

### Por Tabela

| Tabela | Triggers | Eventos |
|--------|----------|---------|
| `credit_card_transactions` | 9 | INSERT, UPDATE, DELETE |
| `credit_card_invoices` | 5 | INSERT, UPDATE, DELETE |
| `investment_transactions` | 2 | INSERT |
| `investments` | 4 | INSERT, UPDATE |
| `transactions` | 2 | INSERT, UPDATE, DELETE |
| `payable_bills` | 1 | UPDATE |
| `budgets` | 2 | INSERT, UPDATE |
| `goal_contributions` | 2 | INSERT, UPDATE |
| `financial_goal_contributions` | 1 | INSERT |
| `investment_goal_contributions` | 2 | INSERT, DELETE, UPDATE |
| `investment_allocation_targets` | 1 | INSERT, UPDATE |
| `ai_provider_configs` | 2 | INSERT, UPDATE |
| `webhook_logs` | 1 | INSERT, UPDATE |
| *Demais tabelas* | 1 cada | UPDATE (updated_at) |

### Triggers de updated_at (automáticos)
Todas as 56 tabelas possuem trigger para atualizar `updated_at` automaticamente.

---

## ⏰ CRON JOBS (20 jobs ativos)

| ID | Schedule | Função | Descrição |
|----|----------|--------|-----------|
| 1 | `0 0 * * *` | `close_invoices_automatically()` | Fecha faturas à meia-noite |
| 2 | `0 1 * * *` | `check_overdue_invoices()` | Verifica faturas vencidas às 01:00 |
| 3 | `0 9 * * *` | `cron-generate-bills` | Gera contas recorrentes às 09:00 |
| 7 | `*/10 * * * *` | `send-bill-reminders` | Envia lembretes a cada 10 min |
| 11 | `*/5 10-17 * * 1-5` | `sync-investment-prices` | Sincroniza preços (horário comercial) |
| 12 | `0 * * * *` | `sync-investment-prices` | Sincroniza preços (fora do horário) |
| 13 | `*/5 * * * *` | `sync-investment-prices` | Sincroniza preços a cada 5 min |
| 14 | `*/5 10-17 * * 1-5` | `check-investment-alerts` | Verifica alertas (horário comercial) |
| 15 | `0 * * * *` | `check-investment-alerts` | Verifica alertas (fora do horário) |
| 16 | `30 12 * * *` | `investment-radar` | Radar de oportunidades às 12:30 |
| 19 | `30 3 * * *` | `create-portfolio-snapshot` | Snapshot do portfólio às 03:30 |
| 20 | `35 3 * * *` | `send-portfolio-snapshot-notification` | Notificação do snapshot às 03:35 |
| 25 | `0 9 * * *` | `send_proactive_whatsapp_notifications()` | Notificações WhatsApp às 09:00 |
| 27 | `0 9 * * *` | `send-overdue-bill-alerts` | Alertas de contas vencidas às 09:00 |
| 28 | `0 8 * * *` | `send-low-balance-alerts` | Alertas de saldo baixo às 08:00 |
| 29 | `0 18 * * *` | `send-investment-summary` | Resumo de investimentos às 18:00 |
| 34 | `0 20 * * *` | `send-daily-summary` | Resumo diário às 20:00 |
| 35 | `0 18 * * *` | `send-weekly-summary` | Resumo semanal às 18:00 |
| 36 | `0 10 * * *` | `send-monthly-summary` | Resumo mensal às 10:00 |
| 37 | `0 10 * * *` | `send-ana-tips` | Dicas da Ana Clara às 10:00 |

---

## 🚀 EDGE FUNCTIONS (43 funções)

### WhatsApp & Comunicação (10)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `process-whatsapp-message` | v63 | ACTIVE | Processa mensagens WhatsApp |
| `send-whatsapp-message` | v10 | ACTIVE | Envia mensagens WhatsApp |
| `execute-quick-command` | v4 | ACTIVE | Executa comandos rápidos |
| `transcribe-audio` | v5 | ACTIVE | Transcreve áudio (Whisper) |
| `extract-receipt-data` | v5 | ACTIVE | Extrai dados de recibos (Vision) |
| `webhook-uazapi` | v6 | ACTIVE | Webhook UAZAPI |
| `webhook-whatsapp-public` | v5 | ACTIVE | Webhook público WhatsApp |
| `generate-qr-code` | v12 | ACTIVE | Gera QR Code |
| `llm-intent-parser` | v2 | ACTIVE | Parser de intenção LLM |
| `categorize-transaction` | v19 | ACTIVE | Categoriza transações |

### Investimentos (8)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `sync-investment-prices` | v6 | ACTIVE | Sincroniza preços |
| `check-investment-alerts` | v6 | ACTIVE | Verifica alertas |
| `generate-opportunities` | v8 | ACTIVE | Gera oportunidades |
| `investment-radar` | v8 | ACTIVE | Radar de investimentos |
| `send-opportunity-notification` | v10 | ACTIVE | Notifica oportunidades |
| `fetch-benchmarks` | v7 | ACTIVE | Busca benchmarks |
| `create-portfolio-snapshot` | v7 | ACTIVE | Cria snapshot |
| `send-portfolio-snapshot-notification` | v8 | ACTIVE | Notifica snapshot |
| `get-quote` | v10 | ACTIVE | Busca cotação |

### Ana Clara & IA (4)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `ana-dashboard-insights` | v15 | ACTIVE | Insights do dashboard |
| `ana-investment-insights` | v9 | ACTIVE | Insights de investimentos |
| `validate-api-key` | v16 | ACTIVE | Valida API key |
| `update-ai-config` | v7 | ACTIVE | Atualiza config IA |

### Contas a Pagar (4)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `cron-generate-bills` | v20 | ACTIVE | Gera contas recorrentes |
| `send-reminders` | v20 | ACTIVE | Envia lembretes |
| `send-bill-reminders` | v33 | ACTIVE | Envia lembretes de contas |
| `invoice-automation` | v20 | ACTIVE | Automação de faturas |

### Notificações (9)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `send-proactive-notifications` | v10 | ACTIVE | Notificações proativas |
| `send-overdue-bill-alerts` | v4 | ACTIVE | Alertas de contas vencidas |
| `send-low-balance-alerts` | v4 | ACTIVE | Alertas de saldo baixo |
| `send-large-transaction-alerts` | v3 | ACTIVE | Alertas de transações grandes |
| `send-investment-summary` | v5 | ACTIVE | Resumo de investimentos |
| `send-daily-summary` | v5 | ACTIVE | Resumo diário |
| `send-weekly-summary` | v5 | ACTIVE | Resumo semanal |
| `send-monthly-summary` | v5 | ACTIVE | Resumo mensal |
| `send-ana-tips` | v3 | ACTIVE | Dicas da Ana Clara |

### Configurações & Webhooks (5)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `get-user-settings` | v4 | ACTIVE | Busca configurações |
| `test-webhook-connection` | v4 | ACTIVE | Testa webhook |
| `trigger-webhook` | v4 | ACTIVE | Dispara webhook |
| `update-webhook` | v4 | ACTIVE | Atualiza webhook |
| `test-email` | v14 | ACTIVE | Testa email |

### Analytics (1)
| Função | Versão | Status | Descrição |
|--------|--------|--------|-----------|
| `analytics-query` | v5 | ACTIVE | Consultas analíticas |

---

## 🔒 POLÍTICAS RLS

### Status por Tabela

| Tabela | RLS Ativo | Políticas |
|--------|-----------|-----------|
| `accounts` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `ai_provider_configs` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `ana_insights_cache` | ✅ | SELECT, ALL (service role) |
| `badge_progress` | ✅ | SELECT, INSERT, UPDATE |
| `badges` | ✅ | SELECT (authenticated) |
| `bill_payment_history` | ✅ | SELECT, INSERT |
| `bill_reminders` | ✅ | SELECT, INSERT, UPDATE |
| **`bill_tags`** | ⚠️ **NÃO** | - |
| `budget_summaries` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `budgets` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `categories` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `challenges` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `conversation_context` | ✅ | ALL |
| `credit_card_*` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `financial_*` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `investment_*` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `market_opportunities` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `notification_preferences` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `notifications_log` | ✅ | SELECT, INSERT |
| `payable_bills` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `portfolio_snapshots` | ✅ | SELECT, INSERT |
| `push_tokens` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `saved_filters` | ✅ | ALL |
| `savings_goals` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `tags` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `transaction_*` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `user_*` | ✅ | SELECT, INSERT, UPDATE |
| `webhook_*` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `whatsapp_*` | ✅ | SELECT, INSERT, UPDATE, DELETE |

### ⚠️ PROBLEMA: `bill_tags` sem RLS
A tabela `bill_tags` está com RLS **desativado**, o que pode ser uma vulnerabilidade de segurança.

---

## 📊 VIEWS (12 views)

| View | Descrição |
|------|-----------|
| `monthly_expenses_by_category` | Despesas mensais por categoria |
| `user_badges_detailed` | Badges detalhados do usuário |
| `user_total_balance` | Saldo total do usuário |
| `v_bills_summary` | Resumo de contas a pagar |
| `v_credit_cards_summary` | Resumo de cartões de crédito |
| `v_investment_performance` | Performance de investimentos |
| `v_invoices_detailed` | Faturas detalhadas |
| `v_monthly_budget_summary` | Resumo mensal de orçamento |
| `v_portfolio_summary` | Resumo do portfólio |
| `v_recurring_bills_history` | Histórico de contas recorrentes |
| `v_recurring_bills_trend` | Tendência de contas recorrentes |
| `v_reminders_brasilia` | Lembretes em horário de Brasília |

---

## 🏷️ ENUMS (16 tipos)

| Enum | Valores |
|------|---------|
| `ai_provider_type` | openai, gemini, claude, openrouter |
| `auth_type` | none, bearer, api_key, basic |
| `conversation_type` | idle, editing_transaction, creating_transaction, confirming_action, multi_step_flow |
| `edit_command_type` | edit_value, edit_description, edit_category, edit_date, edit_account, delete |
| `http_method` | GET, POST, PUT, PATCH, DELETE |
| `integration_status` | disconnected, connecting, connected, error |
| `integration_type` | whatsapp, google_calendar, ticktick |
| `intent_type` | transaction, quick_command, conversation, help, unknown |
| `message_direction` | inbound, outbound |
| `notification_channel` | push, email, whatsapp |
| `processing_status` | pending, processing, completed, failed, cancelled |
| `response_style` | short, medium, long |
| `response_tone` | formal, friendly, casual |
| `summary_frequency` | daily, weekly, monthly |
| `webhook_log_status` | pending, success, failed, retrying |
| `whatsapp_message_type` | text, audio, image, document, video, location, contact |

---

## 📦 STORAGE BUCKETS

| Bucket | Público | Criado em |
|--------|---------|-----------|
| `user-uploads` | ✅ Sim | 11/11/2025 |

---

## ⚠️ ANOMALIAS E PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICO

1. **`bill_tags` sem RLS**
   - Tabela está com Row Level Security desativado
   - **Risco:** Qualquer usuário autenticado pode ver/modificar tags de outros usuários
   - **Ação:** Ativar RLS e criar políticas

### 🟡 ATENÇÃO

2. **Tabelas Duplicadas/Legado**
   - `savings_goals` vs `financial_goals` - parecem ter a mesma função
   - `user_gamification` vs `user_gamification_profile` - duplicação
   - `conversation_context` vs `whatsapp_conversation_context` - duplicação
   - **Ação:** Consolidar e migrar dados

3. **14 Tabelas Vazias**
   - Funcionalidades implementadas mas não utilizadas
   - Pode indicar features incompletas ou abandonadas
   - **Ação:** Revisar e remover se não necessárias

4. **Cron Jobs Duplicados**
   - Jobs 11, 12, 13 fazem a mesma coisa (`sync-investment-prices`)
   - **Ação:** Consolidar em um único job

5. **Service Role Key Exposta em Cron Jobs**
   - Alguns jobs têm a service role key hardcoded
   - **Risco:** Segurança
   - **Ação:** Usar `current_setting('app.settings.service_role_key', true)`

### 🟢 OBSERVAÇÕES

6. **Muitas Edge Functions**
   - 43 Edge Functions é um número alto
   - Pode dificultar manutenção
   - **Sugestão:** Considerar consolidação

7. **Versionamento Alto**
   - `process-whatsapp-message` está na v63
   - Indica muitas iterações/correções
   - **Sugestão:** Documentar mudanças

---

## 📋 RECOMENDAÇÕES

### Imediato (Crítico)

1. **Ativar RLS em `bill_tags`**
```sql
ALTER TABLE bill_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bill tags"
ON bill_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM payable_bills pb
    WHERE pb.id = bill_tags.bill_id
    AND pb.user_id = auth.uid()
  )
);
```

### Curto Prazo

2. **Consolidar Cron Jobs de Investimentos**
   - Manter apenas job 11 (horário comercial)
   - Remover jobs 12 e 13

3. **Limpar Tabelas Legado**
   - Migrar `savings_goals` → `financial_goals`
   - Remover `user_gamification_profile` (usar `user_gamification`)
   - Consolidar contextos de conversa

### Médio Prazo

4. **Documentar Edge Functions**
   - Criar README para cada função
   - Documentar parâmetros e retornos

5. **Implementar Features Vazias ou Remover**
   - `challenges` - gamificação avançada
   - `user_achievements` - conquistas
   - `webhook_endpoints` - integrações externas

6. **Revisar Secrets em Cron Jobs**
   - Usar variáveis de ambiente
   - Não hardcodar tokens

---

## 📈 MÉTRICAS DE USO

### Tabelas Mais Utilizadas
1. `investment_quotes_history` - 1.607 registros (cache de cotações)
2. `whatsapp_messages` - 203 registros (mensagens)
3. `market_opportunities` - 124 registros (oportunidades)
4. `transactions` - 85 registros (transações)
5. `payable_bills` - 33 registros (contas)

### Funcionalidades Ativas
- ✅ WhatsApp Bidirecional (203 mensagens)
- ✅ Investimentos (6 ativos, 1.607 cotações)
- ✅ Transações (85 registros)
- ✅ Contas a Pagar (33 registros)
- ✅ Cartões de Crédito (4 cartões, 16 transações)
- ✅ Gamificação (8 badges, 7 conquistados)
- ✅ Ana Clara (124 oportunidades, 2 caches)

### Funcionalidades Não Utilizadas
- ❌ Desafios (0 registros)
- ❌ Conquistas (0 registros)
- ❌ Webhooks externos (0 registros)
- ❌ Lembretes de contas (0 registros)
- ❌ Alertas de investimento (0 registros)

---

## 🏁 CONCLUSÃO

O banco de dados do Personal Finance LA está **bem estruturado** e **saudável**, com:
- Arquitetura modular clara
- RLS ativo em quase todas as tabelas
- Triggers automatizados funcionando
- Cron Jobs ativos para automações
- 43 Edge Functions cobrindo todas as funcionalidades

**Pontos de Atenção:**
1. Corrigir RLS em `bill_tags` (CRÍTICO)
2. Consolidar tabelas duplicadas
3. Limpar cron jobs redundantes
4. Documentar Edge Functions

**Status Geral:** ✅ PRONTO PARA PRODUÇÃO (após correção do RLS)

---

*Auditoria realizada em 06/12/2025 via Supabase MCP*
