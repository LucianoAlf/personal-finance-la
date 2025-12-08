# 🔍 AUDITORIA COMPLETA - Personal Finance LA

**Data:** 07/12/2025  
**Versão:** 1.0  
**Objetivo:** Mapear toda a estrutura para integração completa com Ana Clara (WhatsApp)

---

## 📊 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Tabelas no banco** | 24 |
| **Edge Functions** | 39 |
| **Componentes Frontend** | 23 módulos |
| **Transações registradas** | 133 |
| **Usuários** | 1 |
| **Contas cadastradas** | 2 |
| **Categorias** | 21 |

---

## 🏦 TIPOS DE CONTA (accounts.type)

### Constraint Atual
```sql
CHECK (type IN ('checking', 'savings', 'cash', 'investment', 'credit_card'))
```

### Mapeamento de Tipos

| Tipo BD | Nome PT-BR | Emoji | Funcionalidades |
|---------|------------|-------|-----------------|
| `checking` | Conta Corrente | 🏦 | Saldo, Entradas, Saídas, Transferências |
| `savings` | Poupança | 🐷 | Meta, Prazo, Rendimento, Aportes |
| `cash` | Carteira | 💵 | Dinheiro em espécie |
| `investment` | Investimento | 📈 | Portfólio, Cotações, Dividendos |
| `credit_card` | Cartão de Crédito | 💳 | Limite, Fatura, Vencimento, Parcelas |

---

## 📋 TABELAS DO BANCO DE DADOS

### 1. TABELAS PRINCIPAIS

#### `users` - Usuários
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| email | varchar | Email único |
| full_name | varchar | Nome completo |
| phone | varchar | Telefone (WhatsApp) |
| whatsapp_connected | boolean | Conectado ao WhatsApp |
| nickname | varchar | Apelido para mensagens |
| closing_day | integer | Dia fechamento ciclo (1-31) |
| monthly_savings_goal | numeric | Meta % economia mensal |
| couple_mode | boolean | Modo casal ativo |
| partner_id | uuid | FK → users |

#### `accounts` - Contas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| name | varchar | Nome da conta |
| type | varchar | checking, savings, cash, investment, credit_card |
| bank_name | varchar | Nome do banco |
| initial_balance | numeric | Saldo inicial |
| current_balance | numeric | Saldo atual |
| color | varchar | Cor hex |
| icon | varchar | Ícone Lucide |
| is_shared | boolean | Conta compartilhada (casal) |
| is_active | boolean | Conta ativa |

#### `transactions` - Transações
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| account_id | uuid | FK → accounts |
| category_id | uuid | FK → categories |
| type | varchar | income, expense, transfer |
| amount | numeric | Valor (> 0) |
| description | varchar | Descrição |
| transaction_date | date | Data |
| is_paid | boolean | Pago/Recebido |
| is_recurring | boolean | Recorrente |
| recurrence_type | varchar | daily, weekly, monthly, yearly |
| source | varchar | whatsapp, web, manual, api |
| transfer_to_account_id | uuid | FK → accounts (destino transferência) |
| notes | text | Observações |

#### `categories` - Categorias
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | NULL = sistema, UUID = personalizada |
| name | varchar | Nome |
| type | varchar | income, expense |
| parent_id | uuid | FK → categories (subcategoria) |
| color | varchar | Cor |
| icon | varchar | Ícone |
| keywords | text[] | Palavras-chave para detecção |
| is_default | boolean | Categoria padrão |

---

### 2. TABELAS DE CARTÃO DE CRÉDITO

#### `credit_cards` - Cartões
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| account_id | uuid | FK → accounts (conta para pagar fatura) |
| name | varchar | Nome do cartão |
| brand | varchar | Bandeira (visa, mastercard, etc) |
| last_four_digits | varchar(4) | Últimos 4 dígitos |
| credit_limit | numeric | Limite total |
| available_limit | numeric | Limite disponível |
| closing_day | integer | Dia fechamento (1-31) |
| due_day | integer | Dia vencimento (1-31) |
| is_active | boolean | Ativo |
| color | varchar | Cor |

#### `credit_card_transactions` - Transações do Cartão
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| credit_card_id | uuid | FK → credit_cards |
| category_id | uuid | FK → categories |
| amount | numeric | Valor |
| description | varchar | Descrição |
| purchase_date | date | Data da compra |
| total_installments | integer | Total de parcelas |
| current_installment | integer | Parcela atual |
| installment_amount | numeric | Valor da parcela |
| invoice_date | date | Mês da fatura |
| is_recurring | boolean | Recorrente |
| source | varchar | Origem |

#### `credit_card_invoices` - Faturas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| credit_card_id | uuid | FK → credit_cards |
| user_id | uuid | FK → users |
| reference_month | date | Mês referência |
| closing_date | date | Data fechamento |
| due_date | date | Data vencimento |
| total_amount | numeric | Valor total |
| paid_amount | numeric | Valor pago |
| status | varchar | open, closed, paid, overdue |
| payment_account_id | uuid | FK → accounts |
| paid_at | timestamp | Data pagamento |

#### `credit_card_payments` - Pagamentos de Fatura
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| invoice_id | uuid | FK → credit_card_invoices |
| account_id | uuid | FK → accounts |
| amount | numeric | Valor pago |
| payment_date | date | Data pagamento |
| payment_type | varchar | full, partial, minimum |

---

### 3. TABELAS DE INVESTIMENTOS

#### `investments` - Ativos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| ticker | varchar | Código (PETR4, ITUB4) |
| name | varchar | Nome do ativo |
| type | varchar | stock, fii, etf, crypto, fixed_income, treasury |
| sector | varchar | Setor |
| total_shares | numeric | Quantidade total |
| average_price | numeric | Preço médio |
| current_price | numeric | Preço atual |
| total_invested | numeric | Total investido |
| current_value | numeric | Valor atual |
| profit_loss | numeric | Lucro/Prejuízo |
| profit_loss_percentage | numeric | % Lucro/Prejuízo |
| last_dividend | numeric | Último dividendo |
| dividend_yield | numeric | Dividend Yield |

#### `investment_transactions` - Operações
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| investment_id | uuid | FK → investments |
| user_id | uuid | FK → users |
| type | varchar | buy, sell, dividend, split, bonus |
| shares | numeric | Quantidade |
| price_per_share | numeric | Preço unitário |
| total_amount | numeric | Valor total |
| fees | numeric | Taxas |
| transaction_date | date | Data |
| notes | text | Observações |

#### `investment_goals` - Metas de Investimento
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| name | varchar | Nome da meta |
| target_amount | numeric | Valor alvo |
| current_amount | numeric | Valor atual |
| monthly_contribution | numeric | Aporte mensal |
| target_date | date | Data alvo |
| status | varchar | active, completed, cancelled |

---

### 4. TABELAS DE CONTAS A PAGAR

#### `payable_bills` - Contas a Pagar
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| name | varchar | Nome |
| amount | numeric | Valor |
| due_date | date | Vencimento |
| category_id | uuid | FK → categories |
| payment_account_id | uuid | FK → accounts |
| is_recurring | boolean | Recorrente |
| recurrence_type | varchar | monthly, yearly, etc |
| status | varchar | pending, paid, overdue |
| paid_at | timestamp | Data pagamento |
| reminder_days | integer | Dias antes para lembrete |

#### `bill_payment_history` - Histórico de Pagamentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bill_id | uuid | FK → payable_bills |
| amount_paid | numeric | Valor pago |
| payment_date | date | Data |
| account_from_id | uuid | FK → accounts |

---

### 5. TABELAS DE ORÇAMENTO E METAS

#### `budgets` - Orçamentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| category_id | uuid | FK → categories |
| amount | numeric | Valor limite |
| period | varchar | monthly, yearly |
| start_date | date | Início |
| end_date | date | Fim |
| alert_threshold | numeric | % para alerta |

#### `financial_goals` - Metas Financeiras
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| name | varchar | Nome |
| target_amount | numeric | Valor alvo |
| current_amount | numeric | Valor atual |
| target_date | date | Data alvo |
| category_id | uuid | FK → categories |
| priority | varchar | high, medium, low |
| status | varchar | active, completed, cancelled |

---

### 6. TABELAS DE WHATSAPP/ANA CLARA

#### `whatsapp_messages` - Mensagens
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| from_number | varchar | Telefone origem |
| content | text | Conteúdo |
| message_type | varchar | text, audio, image |
| direction | varchar | incoming, outgoing |
| processing_status | varchar | pending, processing, completed, failed |
| intent | varchar | Intenção detectada |
| transcription | text | Transcrição (áudio) |
| raw_payload | jsonb | Payload original |

#### `conversation_context` - Contexto de Conversa
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| phone | varchar | Telefone |
| context_type | enum | idle, editing_transaction, creating_transaction, confirming_action, multi_step_flow |
| context_data | jsonb | Dados do contexto |
| expires_at | timestamp | Expira em 5 min |

#### `user_memory` - Memória do Usuário
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| tipo | text | giria, preferencia, local_frequente, apelido, conta_padrao |
| chave | text | Chave |
| valor | jsonb | Valor |
| confianca | numeric | 0.00 a 1.00 |
| frequencia | integer | Vezes usado |
| origem | text | inferido, explicito, correcao, sistema |

#### `whatsapp_connections` - Conexões WhatsApp
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| instance_id | text | ID da instância UAZAPI |
| status | text | connected, disconnected |
| phone_number | text | Número conectado |
| profile_name | text | Nome do perfil |

---

### 7. OUTRAS TABELAS

#### `transaction_edits` - Histórico de Edições
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| transaction_id | uuid | FK → transactions |
| edit_type | enum | edit_value, edit_description, edit_category, edit_date, edit_account, delete |
| old_value | text | Valor anterior |
| new_value | text | Novo valor |
| edited_via | text | whatsapp, web, mobile |

#### `notifications_log` - Log de Notificações
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| type | varchar | budget_alert, upcoming_bills, goals_achieved, dividends_received |
| channel | varchar | whatsapp, push, email |
| status | varchar | sent, failed |
| metadata | jsonb | Dados adicionais |

#### `push_tokens` - Tokens Push
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| token | text | Token FCM |
| device_type | varchar | ios, android, web |

#### `ai_provider_configs` - Configuração IA
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| provider | varchar | openai, anthropic, google |
| api_key | text | Chave API (criptografada) |
| model | varchar | Modelo preferido |
| response_tone | enum | formal, friendly, casual |
| system_prompt | text | Prompt personalizado |

---

## ⚡ EDGE FUNCTIONS

### Funções de WhatsApp/Ana Clara

| Function | Responsabilidade | Status |
|----------|------------------|--------|
| `process-whatsapp-message` | Processa mensagens (texto, áudio, imagem) | ✅ Ativo |
| `webhook-uazapi` | Recebe webhooks do UAZAPI | ✅ Ativo |
| `send-whatsapp-message` | Envia mensagens WhatsApp | ✅ Ativo |
| `transcribe-audio` | Transcreve áudios (Whisper) | ✅ Ativo |

### Funções de Notificações Proativas

| Function | Responsabilidade | Status |
|----------|------------------|--------|
| `send-daily-summary` | Resumo diário | ✅ Existe |
| `send-weekly-summary` | Resumo semanal | ✅ Existe |
| `send-monthly-summary` | Resumo mensal | ✅ Existe |
| `send-bill-reminders` | Lembrete de contas | ✅ Existe |
| `send-overdue-bill-alerts` | Alerta contas vencidas | ✅ Existe |
| `send-low-balance-alerts` | Alerta saldo baixo | ✅ Existe |
| `send-large-transaction-alerts` | Alerta transação grande | ✅ Existe |
| `send-investment-summary` | Resumo investimentos | ✅ Existe |
| `send-ana-tips` | Dicas da Ana | ✅ Existe |
| `send-proactive-notifications` | Notificações proativas | ✅ Existe |
| `send-opportunity-notification` | Oportunidades | ✅ Existe |
| `send-portfolio-snapshot-notification` | Snapshot portfólio | ✅ Existe |

### Funções de Investimentos

| Function | Responsabilidade | Status |
|----------|------------------|--------|
| `sync-investment-prices` | Sincroniza cotações | ✅ Existe |
| `get-quote` | Busca cotação | ✅ Existe |
| `fetch-benchmarks` | Busca benchmarks | ✅ Existe |
| `create-portfolio-snapshot` | Cria snapshot | ✅ Existe |
| `ana-investment-insights` | Insights investimentos | ✅ Existe |
| `generate-opportunities` | Gera oportunidades | ✅ Existe |

### Funções de IA/Análise

| Function | Responsabilidade | Status |
|----------|------------------|--------|
| `llm-intent-parser` | Parser de intenção | ✅ Existe |
| `categorize-transaction` | Categoriza transação | ✅ Existe |
| `extract-receipt-data` | Extrai dados de recibo | ✅ Existe |
| `ana-dashboard-insights` | Insights dashboard | ✅ Existe |
| `analytics-query` | Consultas analíticas | ✅ Existe |

### Funções de Configuração

| Function | Responsabilidade | Status |
|----------|------------------|--------|
| `get-user-settings` | Busca configurações | ✅ Existe |
| `update-ai-config` | Atualiza config IA | ✅ Existe |
| `validate-api-key` | Valida chave API | ✅ Existe |
| `generate-qr-code` | Gera QR Code WhatsApp | ✅ Existe |

### Funções de Automação

| Function | Responsabilidade | Status |
|----------|------------------|--------|
| `invoice-automation` | Automação faturas | ✅ Existe |
| `execute-quick-command` | Comandos rápidos | ✅ Existe |

---

## 🖥️ FRONTEND - COMPONENTES

### Páginas Principais

| Página | Componentes | Funcionalidades |
|--------|-------------|-----------------|
| `/dashboard` | Dashboard | Resumo geral, gráficos, insights |
| `/transactions` | Transactions | CRUD transações, filtros |
| `/accounts` | Accounts | CRUD contas, saldos |
| `/categories` | Categories | CRUD categorias |
| `/credit-cards` | CreditCards | Cartões, faturas, parcelas |
| `/investments` | Investments | Portfólio, cotações, operações |
| `/goals` | Goals | Metas financeiras |
| `/budget` | Budget | Orçamentos por categoria |
| `/payable-bills` | PayableBills | Contas a pagar |
| `/analytics` | Analytics | Relatórios, gráficos |
| `/settings` | Settings | Configurações, WhatsApp |

### Componentes por Módulo

```
src/components/
├── accounts/          # Contas bancárias
├── analytics/         # Gráficos e relatórios
├── budget/            # Orçamentos
├── categories/        # Categorias
├── credit-cards/      # Cartões de crédito
├── dashboard/         # Dashboard principal
├── gamification/      # Gamificação
├── goals/             # Metas
├── investment-goals/  # Metas de investimento
├── investments/       # Investimentos
├── invoices/          # Faturas
├── payable-bills/     # Contas a pagar
├── transactions/      # Transações
├── whatsapp/          # Integração WhatsApp
└── settings/          # Configurações
```

---

## 🎯 ANÁLISE DE GAPS - ANA CLARA

### ✅ O QUE JÁ FUNCIONA

| Funcionalidade | Status | Detalhes |
|----------------|--------|----------|
| Registro de despesas (texto) | ✅ | "gastei 50 no mercado" |
| Registro de receitas (texto) | ✅ | "recebi 1000 de salário" |
| Transcrição de áudio | ✅ | Whisper API |
| Leitura de imagens | ✅ | iFood, nota fiscal, PIX, Shell Box |
| Seleção de conta | ✅ | Lista contas e registra |
| Detecção de categoria | ✅ | Por keywords e NLP |
| Edição de transação | ✅ | "era 95", "muda pra Nubank" |
| Exclusão de transação | ✅ | "exclui essa" |
| Contexto de conversa | ✅ | Multi-step flows |
| Memória do usuário | ✅ | Gírias, preferências |

### ❌ O QUE FALTA IMPLEMENTAR

#### 1. CARTÃO DE CRÉDITO
| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| Lançar compra no cartão | 🔴 Alta | Média |
| Lançar compra parcelada | 🔴 Alta | Alta |
| Consultar fatura atual | 🔴 Alta | Baixa |
| Consultar limite disponível | 🟡 Média | Baixa |
| Lembrete de vencimento | 🟡 Média | Baixa |
| Pagar fatura | 🟡 Média | Média |

#### 2. TRANSFERÊNCIAS
| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| Transferir entre contas | 🔴 Alta | Média |
| "transfere 100 da Nubank pra Itaú" | 🔴 Alta | Média |

#### 3. POUPANÇA/METAS
| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| Guardar dinheiro | 🟡 Média | Média |
| "guarda 500 na poupança" | 🟡 Média | Média |
| Consultar progresso meta | 🟡 Média | Baixa |
| Lembrete de aporte | 🟢 Baixa | Baixa |

#### 4. INVESTIMENTOS
| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| Consultar portfólio | 🟡 Média | Baixa |
| "quanto tenho investido?" | 🟡 Média | Baixa |
| Registrar compra de ativo | 🟢 Baixa | Alta |
| Consultar dividendos | 🟢 Baixa | Média |

#### 5. CONSULTAS E RELATÓRIOS
| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| "meu saldo" | 🔴 Alta | Baixa |
| "quanto gastei esse mês" | 🔴 Alta | Baixa |
| "resumo do dia" | 🟡 Média | Média |
| "quanto gastei em alimentação" | 🟡 Média | Baixa |

#### 6. CONTAS A PAGAR
| Funcionalidade | Prioridade | Complexidade |
|----------------|------------|--------------|
| Cadastrar conta a pagar | 🟡 Média | Média |
| Marcar como paga | 🟡 Média | Baixa |
| Lembrete de vencimento | 🟡 Média | Baixa |

---

## 📅 ROADMAP SUGERIDO

### FASE 1 - CONSULTAS (1-2 dias)
- [ ] "meu saldo" - Retorna saldo de todas as contas
- [ ] "quanto gastei esse mês" - Total de despesas
- [ ] "quanto recebi esse mês" - Total de receitas
- [ ] "resumo" - Resumo geral

### FASE 2 - CARTÃO DE CRÉDITO (3-5 dias)
- [ ] Detectar quando é compra no cartão
- [ ] "gastei 200 no cartão Nubank"
- [ ] "comprei 600 em 3x no cartão"
- [ ] "fatura do Nubank" - Mostra fatura atual
- [ ] "limite do cartão" - Mostra limite

### FASE 3 - TRANSFERÊNCIAS (1-2 dias)
- [ ] "transfere 500 da Nubank pra Itaú"
- [ ] "manda 100 pra poupança"

### FASE 4 - METAS E POUPANÇA (2-3 dias)
- [ ] "guarda 500 na poupança"
- [ ] "quanto falta pra minha meta"
- [ ] "progresso das metas"

### FASE 5 - INVESTIMENTOS (3-5 dias)
- [ ] "meu portfólio"
- [ ] "quanto tenho investido"
- [ ] "como estão meus investimentos"
- [ ] "dividendos do mês"

### FASE 6 - NOTIFICAÇÕES PROATIVAS (2-3 dias)
- [ ] Ativar crons existentes
- [ ] Lembrete de fatura (3 dias antes)
- [ ] Alerta de limite baixo
- [ ] Resumo diário automático

---

## 🔧 PRÓXIMOS PASSOS IMEDIATOS

1. **Implementar comando "meu saldo"** - Consulta rápida
2. **Implementar detecção de cartão de crédito** - "gastei X no cartão"
3. **Implementar transferências** - "transfere X de A pra B"
4. **Ativar notificações proativas** - Crons já existem

---

## 📝 NOTAS TÉCNICAS

### Enums Importantes

```sql
-- conversation_type
'idle', 'editing_transaction', 'creating_transaction', 'confirming_action', 'multi_step_flow'

-- edit_command_type
'edit_value', 'edit_description', 'edit_category', 'edit_date', 'edit_account', 'delete'

-- response_tone
'formal', 'friendly', 'casual'
```

### Constraints de Source (transactions)
```sql
CHECK (source IN ('whatsapp', 'web', 'manual', 'api'))
```

### Tipos de Transação
```sql
CHECK (type IN ('income', 'expense', 'transfer'))
```

### Tipos de Conta
```sql
CHECK (type IN ('checking', 'savings', 'cash', 'investment', 'credit_card'))
```

---

**Documento gerado automaticamente pela auditoria do sistema.**
