# Auditoria Técnica – Personal Finance LA

_Última revisão: 09/01/2025 · Ambiente: Supabase `sbnpmhmvcspwcyjhftlw`_

## 1. Contexto Geral
- **Assistente Ana Clara com múltiplos provedores IA**: UI completa para OpenAI, Gemini, Claude e OpenRouter incluindo teste de API key, definição de provedor padrão e ajuste de prompt/modelo (`src/components/settings/AIProviderSettings.tsx:1-163` + hook `src/hooks/useAIProviders.ts:1-212`). Edge Function `supabase/functions/update-ai-config/index.ts` aplica CRUD seguro.
- **Autenticação pronta**: login por e-mail/senha + OAuth Google (`src/pages/Login.tsx:1-164`). Session management reaproveitado em todos os hooks via `supabase.auth`.
- **Integrações**: camada dedicada em `integration_configs` para WhatsApp / Google Calendar / TickTick com RLS (`supabase/migrations/20251110000003_create_integration_configs.sql:1-101`). UI de gerenciamento fica em `IntegrationsSettings` (ver seção 2.10).
- **Núcleo de notificações**: preferências detalhadas no hook `useSettings` e tab Notifications, com Edge Functions agendadas (`send-daily-summary`, `send-weekly-summary`, `send-monthly-summary`, `send-ana-tips`, `send-bill-reminders`, etc.) para push/WhatsApp.
- **Orquestração externa**: N8N self-host controla webhooks e fluxos; Edge Functions `process-whatsapp-message` e `execute-quick-command` fecham o loop com UAZAPI/WhatsApp, enquanto `update-webhook` gerencia endpoints usados no N8N.

## 2. Frontend (UI/UX)

### 2.1 Dashboard
- Cards dinâmicos para saldo, receitas, despesas e cartões com drill-down para páginas dedicadas e cálculo de orçamento real-time (`src/pages/Dashboard.tsx:1-185`).
- Gráficos de despesas por categoria e tendência mensal + widgets agregados (Investimentos, Contas a pagar, Metas, Orçamento) e assistente Ana Clara (`src/pages/Dashboard.tsx:188-219`).
- Lista de transações recentes e widget de cartões com CTA para telas completas (`src/pages/Dashboard.tsx:220-270`).

### 2.2 Transações
- Versão “simples” (`src/pages/Transactions.tsx:1-125`) cobre resumo e listagem com filtros básicos, import CSV e criação rápida.
- Versão avançada `Transacoes` entrega UX tipo console: filtros por URL, busca inteligente, filtros avançados (datas, categorias, contas, tags, status, tipos), seleção de mês, e modal transacional completo (`src/pages/Transacoes.tsx:1-400`). Integrações com `TransactionDialog`, `AdvancedFiltersModal` e hook `useTransactions` garantem operações CRUD em tempo real (`src/hooks/useTransactions.ts:14-200`).

### 2.3 Contas
- `Accounts` exibe cards responsivos com saldos atualizados, ícones de banco e CTA para transferência/ajuste (`src/pages/Accounts.tsx:1-196`).
- `Contas` (nova versão) adiciona CRUD completo via `AccountDialog`, ajuste de saldo com validação, arquivamento, navegação para transações filtradas e estados de loading/erro (`src/pages/Contas.tsx:1-200`).

### 2.4 Cartões de Crédito
- Página tabulada com **Meus Cartões / Faturas / Análises / Histórico** (`src/pages/CreditCards.tsx:22-220`).
- Dialogs para criar/editar cartão, registrar compras, pagar faturas e ver detalhes sincronizados com `useCreditCards` + `useInvoices`.
- AnalyticsTab e InvoiceHistory cobrem as abas avançadas; toast/resfresh asseguram feedback pós-ação.

### 2.5 Contas a Pagar
- Seis abas (“Todas”, “Próximas”, “Recorrentes”, “Histórico”, “Analytics”, “Relatórios”) controladas por `Tabs` (`src/pages/PayableBills.tsx:1-339`).
- Componentes especializados: filtros salvos, timeline visual, cards recorrentes, exportador, dashboard com alertas de variação (`RecurringBillVariationAlert`) e gráfico de tendência (`RecurringBillTrendChart`).
- Dialogs para criar/editar, pagar, configurar lembretes (WhatsApp + push) e gerar parcelas, todos acoplados a `usePayableBills`.

### 2.6 Dashboard Principal
- coberto na 2.1; mantido aqui para mapear requisito “Dashboard” -> pronto para produção.

### 2.7 Metas (Economia, Gastos, Investimentos, Progresso, Orçamento, Configurações)
- Tabstrip controlada via URL (`src/pages/Goals.tsx:1-200`). Cada aba inclui:
  - **Economia/Gastos**: cards, gamificação, diálogos de criar/editar/adicionar valor (`CreatingGoalDialog`, `AddValueDialog`).
  - **Investimentos**: metas de aporte com `InvestmentGoalCard` e `InvestmentGoalDialog`.
  - **Progresso**: XP, conquistas, heatmap e toasters (gamification components).
  - **Orçamento**: `BudgetSummaryCards`, `BudgetGrid`, insights por mês e `MonthSelector`.
  - **Configurações**: gerenciadores `SavingsGoalsManager`, `FinancialCyclesManager`, `FinancialSettingsCard`.
- Hooks `useGoals`, `useGoalNotifications`, `useGamification`, `useBudgets`, `useInvestmentGoals` fornecem dados reais e RPCs.

### 2.8 Investimentos (Portfólio – Transações – Dividendos – Alertas – Visão Geral)
- Header com `MarketStatus`, atualização de cotações e relatório PDF (`src/pages/Investments.tsx:1-397`).
- Abas:
  - **Portfólio**: tabela responsiva com ganhos e botões de CRUD.
  - **Transações**: timeline com exclusão.
  - **Dividendos**: calendário + histórico.
  - **Alertas**: lista com toggle/delete e dialog Novo Alerta.
  - **Visão Geral**: widgets Ana Clara, Diversification Score, Heatmap, Benchmark, gráficos e feed de oportunidades.
- Hooks `useInvestments`, `useInvestmentPrices`, `useInvestmentTransactions`, `useDividendCalendar`, `useInvestmentAlerts`.

### 2.9 Relatórios & Educação
- **Relatórios**: UI placeholder com cards e skeletons de gráficos, pronta para conectar a dados reais (falta backend/Grafana) (`src/pages/Reports.tsx:1-86`).
- **Educação**: conteúdo estático inspirado em gamificação (trilha, conquistas, dica do dia). Ainda não consome API externa, mas UI está finalizada (`src/pages/Education.tsx:1-145`).

### 2.10 Tags & Categorias
- Tags CRUD completo com cores, edição inline e tabelas responsivas (`src/pages/Tags.tsx:1-200` + hook `useTags`).
- Categorias separadas por padrão/personalizadas, analytics por categoria e dialog de criação (`src/pages/Categories.tsx:1-127`).

### 2.11 Configurações
- **Shell**: `Settings` organiza tabs Geral, IA, Integrações, Webhooks e Notificações (`src/pages/Settings.tsx:1-76`).
- **IA**: ver seção 1.
- **Integrações**: painel multi-tab para WhatsApp (status, QR code, histórico), Google Calendar (sync interval, OAuth placeholder) e Tick Tick (API key, projeto, teste de conexão) com onboarding modal (`src/components/settings/IntegrationsSettings.tsx:1-200`).
- **Webhooks**: CRUD completo com tabela, métricas, logs e diálogo `WebhookFormDialog`, acionando Edge Function `update-webhook` (`src/components/settings/WebhooksSettings.tsx:1-200`).
- **Notificações**: >30 switches/inputs cobrindo canais, DND, resumos, alertas e automações personalizadas (`src/components/settings/NotificationsSettings.tsx:1-200`).

## 3. Backend, Dados e Integrações

### 3.1 Hooks & Queries (Supabase-js v2)
- **Transações**: `useTransactions` faz join de categorias, contas e tags numa única query e expõe CRUD/aggregate helpers (`src/hooks/useTransactions.ts:14-205`).
- **Contas**: `useAccounts` (não mostrado acima) cobre agregações por tipo e saldo total utilizado em Dashboard/Contas.
- **Cartões & Faturas**: `useCreditCards` consulta `credit_cards` e view `v_credit_cards_summary`, com soft delete e cálculo de limites (`src/hooks/useCreditCards.ts:11-200`). `useInvoices` (não exibido) sincroniza faturas/pagamentos.
- **Contas a pagar**: `usePayableBills` centraliza filtros, geração parcelada e RPC `mark_bill_as_paid` (ver 3.2).
- **Webhooks / IA / WhatsApp**: `useWebhooks`, `useAIProviders`, `useWhatsAppConnection`, `useWhatsAppMessages` monitoram tabelas dedicadas e chamam Edge Functions quando necessário.

### 3.2 RPCs e Funções SQL
- `mark_bill_as_paid`, `get_bill_analytics` e `useRecurringTrend` recorrem a RPCs (`src/hooks/usePayableBills.ts:271` e `src/hooks/useBillAnalytics.ts:88`).
- Metas: `calculate_spending_streak`, `update_best_streak` (`src/hooks/useGoals.ts:318-333`), investimento: `get_investment_goal_metrics`, `calculate_investment_projection` (`src/hooks/useInvestmentGoals.ts:137-157`).
- Portfólio: `get_portfolio_summary` (utilizado em `getInvestimentos`, `src/pages/execute-quick-command/index.ts:321-347`).

### 3.3 Edge Functions & Automação
- **WhatsApp**:
  - `process-whatsapp-message` recebe webhooks UAZAPI, persiste mensagens, identifica usuários, roteia comandos/LLM e responde via `send-whatsapp-message` (`supabase/functions/process-whatsapp-message/index.ts:1-400`).
  - `execute-quick-command` atende comandos `saldo`, `meta`, `cartões`, etc., agora corrigido para usar `savings_goals` e `credit_card_invoices` (`supabase/functions/execute-quick-command/index.ts:248-447`).
  - `generate-qr-code`, `send-whatsapp-message`, `webhook-uazapi` completam o trio de integração.
- **Configurações & Webhooks**: `update-webhook` e `update-ai-config` fazem CRUD autenticado sob bearer do usuário.
- **Notificações**: `send-daily-summary`, `send-weekly-summary`, `send-monthly-summary`, `send-ana-tips`, `send-bill-reminders`, `send-low-balance-alerts`, `send-large-transaction-alerts`, etc., leem `notification_preferences` e disparam via Resend/WhatsApp (exemplo `supabase/functions/send-daily-summary/index.ts:1-40`).
- **Investimentos**: `send-investment-summary`, `sync-investment-prices`, `create-portfolio-snapshot`, `ana-investment-insights`.

### 3.4 Integrações Externas
- **WhatsApp (UAZAPI)**: Status da conexão em `whatsapp_connections` + `whatsapp_connection_status`; hooks para QR, métricas e mensageria (`src/hooks/useWhatsAppConnection.ts:1-200`). Edge Functions acima fecham loop com UAZAPI.
- **Google Calendar**: UI permite simular OAuth + configurar frequência; dados persistem em `integration_configs`. Backend para sync ainda está planejado (ver plano em `docs/configuracoes-provider-n8n-calendar.md`).
- **Tick Tick**: UI aceita API key e projeto, mas integração está marcada como mock (evidência em `docs/AUDITORIA_INTEGRACOES_COMPLETA.md:16-340`, que ainda lista “❌ Tick Tick”). Falta implementar hooks `useTickTick` e webhooks de retorno.
- **N8N & Webhooks**: Tab Webhooks + Edge `update-webhook` permitem cadastrar endpoints e logs no Supabase; N8N workflows (self-host) podem ler a própria coluna `webhook_endpoints` e consomem UAZAPI/Google integrados (`docs/n8n/*`).
- **Google Login**: ativo via `supabase.auth.signInWithOAuth('google')` (vide Login page).

### 3.5 Notificações & Preferências
- Tabela `notification_preferences` centraliza canais, DND e parâmetros específicos. Hooks `useSettings` e tab Notifications sincronizam switches enquanto Edge Functions respeitam flags e horários (ex.: `send-daily-summary` consulta `daily_summary_days_of_week`, `do_not_disturb_*`).
- Agendamentos via Supabase Cron já definidos em docs e scripts (`docs/CONFIGURAR_CRON_JOBS.md`, `supabase/functions/_cron`).

### 3.6 Banco de Dados & Segurança
- `integration_configs`, `webhook_endpoints`, `webhook_logs`, `ai_provider_configs`, `notification_preferences`, `whatsapp_*`, `credit_cards`, `credit_card_invoices`, `payable_bills`, `savings_goals`, `investment_*` todos com RLS habilitado (ver migrations correspondentes).
- Índices e constraints recentes: `credit_cards_user_id_last_four_digits_active_key`, triggers de `updated_at`, partial indexes para performance (ex.: migrations `20250107_fix_rls_policies.sql` e `20250107_clean_duplicate_policies.sql`).

## 4. Status por Área (Resumo Executivo)

| Área | Frontend | Backend / Dados | Observações |
|------|----------|-----------------|-------------|
| Dashboard | ✅ | ✅ | Pronto para produção; depende dos hooks já listados. |
| Transações | ✅ (básico + avançado) | ✅ (CRUD + filtros) | Import CSV ainda mockado; filtros avançados já funcionam. |
| Contas | ✅ | ✅ | Ajuste de saldo/transferência com dialogs; precisa wiring de ação Transferência. |
| Cartões / Faturas / Analytics | ✅ | ✅ (cartões, invoices, analytics view) | Apagar fatura em histórico ainda pendente (`toast` avisa WIP). |
| Contas a Pagar | ✅ (6 abas) | ✅ (+ RPC, lembretes) | Export/analytics utilizam dados reais; relatórios PDF ainda em aberto. |
| Metas / Orçamento / Gamificação | ✅ | ✅ (RPCs e gatilhos) | Config tab já oferece gerenciadores. |
| Investimentos | ✅ (5 abas) | ✅ (quotes, RPCs, alertas) | Benchmark depende de dados em `metrics`; re-balance automático via `SmartRebalanceWidget`. |
| Relatórios | ⚠️ UI pronta | 🚧 | Necessário conectar gráficos e KPIs ao backend. |
| Educação | ⚠️ UI estática | 🚧 | Conteúdo dummy, falta CMS/LLM. |
| Tags & Categorias | ✅ | ✅ | CRUD completo. |
| Configurações (IA, Integrações, Webhooks, Notificações) | ✅ | ✅ (exceto Tick Tick real / Google sync real) | Tick Tick e Google Calendar ainda dependem de providers externos. |
| WhatsApp | ✅ (UI) | ✅ (Edge + supabase) | Produção com UAZAPI 100% operacional. |
| Google Calendar | ⚠️ UI & schema | 🚧 | Falta implementar OAuth real + workers. |
| Tick Tick | ⚠️ UI & schema | 🚧 | Mock; sem API real. |
| Notificações | ✅ | ✅ (Edge + cron) | Precisam apenas de monitoramento de quotas SMTP/UAZAPI. |

## 5. Próximos Passos Recomendados
1. **Relatórios & Educação**: ligar gráficos a queries/RPCs e definir fonte dos conteúdos educativos.
2. **Tick Tick & Google Calendar**: implementar hooks `useTickTick`, `useGoogleCalendar`, Edge Functions e webhooks conforme plano em `docs/configuracoes-provider-n8n-calendar.md` e `docs/AUDITORIA_INTEGRACOES_COMPLETA.md`.
3. **Automação de Transferência / Ajuste**: completar a lógica dos botões em Contas (criar dialogs + endpoints).
4. **Faturas – excluir/editar histórico**: finalizar handlers no componente `InvoiceHistory` (atualmente retorna toast “em desenvolvimento”).
5. **Testes E2E / Monitoria**: adicionar smoke tests para Edge Functions críticas (process-whatsapp-message, execute-quick-command, send-daily-summary).

> **Referências complementares**: documentação N8N e integrações específica em `docs/n8n/*`, planos de integrações em `docs/PLANO_IMPLEMENTACAO_INTEGRACOES.md` e auditorias anteriores em `docs/AUDITORIA_INTEGRACOES_COMPLETA.md`.
