# 📋 AUDITORIA DE ARQUITETURA - SESSÃO 1: BANCO DE DADOS

**Data:** 16/12/2025  
**Foco:** Constraints, Defaults, Relacionamentos  
**Tabelas Auditadas:** 8 tabelas principais

---

## 📊 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Tabelas auditadas | 8 |
| Total de colunas | 98 |
| Constraints CHECK | 67 |
| Foreign Keys | 19 |
| Triggers | 28 |
| ⚠️ Colunas NOT NULL sem DEFAULT | 14 |
| ⚠️ CHECK constraints críticas | 12 |

---

## 1. TABELA: `accounts`

### Colunas (13)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `uuid_generate_v4()` | PK |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `name` | varchar | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `type` | varchar | ✅ | ❌ **NENHUM** | ⚠️ CHECK constraint |
| `bank_name` | varchar | ❌ | null | Opcional |
| `initial_balance` | numeric | ❌ | `0` | ✅ |
| `current_balance` | numeric | ❌ | `0` | ✅ |
| `color` | varchar | ❌ | `'#6366f1'` | ✅ |
| `icon` | varchar | ❌ | `'Wallet'` | ✅ |
| `is_shared` | boolean | ❌ | `false` | ✅ |
| `is_active` | boolean | ❌ | `true` | ✅ |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |

### CHECK Constraints

| Constraint | Valores Válidos |
|------------|-----------------|
| `accounts_type_check` | `'checking'`, `'savings'`, `'cash'`, `'investment'`, `'credit_card'` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `user_id` | `users.id` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `update_accounts_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`name`** - NOT NULL sem DEFAULT → Código DEVE fornecer
3. **`type`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer valor válido

---

## 2. TABELA: `categories`

### Colunas (10)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `uuid_generate_v4()` | PK |
| `user_id` | uuid | ❌ | null | FK → users.id (null = global) |
| `name` | varchar | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `type` | varchar | ✅ | ❌ **NENHUM** | ⚠️ CHECK constraint |
| `parent_id` | uuid | ❌ | null | FK → categories.id (self-ref) |
| `color` | varchar | ❌ | `'#6366f1'` | ✅ |
| `icon` | varchar | ❌ | `'FolderOpen'` | ✅ |
| `is_default` | boolean | ❌ | `false` | ✅ |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `keywords` | text[] | ❌ | null | Para auto-categorização |

### CHECK Constraints

| Constraint | Valores Válidos |
|------------|-----------------|
| `categories_type_check` | `'income'`, `'expense'` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `user_id` | `users.id` |
| `parent_id` | `categories.id` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`name`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`type`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer `'income'` ou `'expense'`

---

## 3. TABELA: `transactions`

### Colunas (22)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `uuid_generate_v4()` | PK |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `account_id` | uuid | ❌ | null | FK → accounts.id |
| `category_id` | uuid | ❌ | null | FK → categories.id |
| `type` | varchar | ✅ | ❌ **NENHUM** | ⚠️ CHECK constraint |
| `amount` | numeric | ✅ | ❌ **NENHUM** | ⚠️ CHECK: > 0 |
| `description` | varchar | ❌ | null | Opcional |
| `transaction_date` | date | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `is_paid` | boolean | ❌ | `true` | ✅ |
| `is_recurring` | boolean | ❌ | `false` | ✅ |
| `recurrence_type` | varchar | ❌ | null | CHECK constraint |
| `recurrence_end_date` | date | ❌ | null | Opcional |
| `attachment_url` | varchar | ❌ | null | Opcional |
| `notes` | text | ❌ | null | Opcional |
| `source` | varchar | ❌ | `'manual'` | ✅ CHECK constraint |
| `whatsapp_message_id` | varchar | ❌ | null | Opcional |
| `transfer_to_account_id` | uuid | ❌ | null | FK → accounts.id |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |
| `status` | text | ❌ | `'completed'` | ✅ CHECK constraint |
| `temp_id` | text | ❌ | null | UNIQUE |
| `confirmed_at` | timestamptz | ❌ | null | Opcional |
| `payment_method` | varchar(20) | ❌ | null | CHECK constraint |

### CHECK Constraints

| Constraint | Valores Válidos |
|------------|-----------------|
| `transactions_type_check` | `'income'`, `'expense'`, `'transfer'` |
| `transactions_amount_check` | `amount > 0` |
| `transactions_source_check` | `'manual'`, `'whatsapp'`, `'import'`, `'open_finance'` |
| `transactions_status_check` | `'pending_confirmation'`, `'completed'`, `'cancelled'` |
| `transactions_recurrence_type_check` | `'daily'`, `'weekly'`, `'monthly'`, `'yearly'` |
| `transactions_payment_method_check` | `'pix'`, `'credit'`, `'debit'`, `'cash'`, `'boleto'`, `'transfer'`, `'other'` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `user_id` | `users.id` |
| `account_id` | `accounts.id` |
| `category_id` | `categories.id` |
| `transfer_to_account_id` | `accounts.id` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `transaction_balance_update` | AFTER INSERT/UPDATE/DELETE | `update_account_balance()` |
| `update_transactions_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`type`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer valor válido
3. **`amount`** - NOT NULL sem DEFAULT + CHECK > 0 → Código DEVE fornecer valor positivo
4. **`transaction_date`** - NOT NULL sem DEFAULT → Código DEVE fornecer

---

## 4. TABELA: `payable_bills`

### Colunas (35)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `description` | varchar(255) | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `amount` | numeric | ❌ | null | CHECK: NULL ou > 0 |
| `due_date` | date | ✅ | ❌ **NENHUM** | ⚠️ CHECK: >= 2020-01-01 |
| `bill_type` | varchar(50) | ✅ | ❌ **NENHUM** | ⚠️ CHECK constraint |
| `provider_name` | varchar(255) | ❌ | null | Opcional |
| `category_id` | uuid | ❌ | null | FK → categories.id |
| `status` | varchar(20) | ✅ | `'pending'` | ✅ CHECK constraint |
| `paid_at` | timestamptz | ❌ | null | Obrigatório se status='paid' |
| `paid_amount` | numeric | ❌ | null | Obrigatório se status='paid'/'partial' |
| `payment_account_id` | uuid | ❌ | null | FK → accounts.id |
| `payment_method` | varchar(50) | ❌ | null | CHECK constraint |
| `barcode` | varchar(48) | ❌ | null | Boleto |
| `qr_code_pix` | text | ❌ | null | PIX |
| `reference_number` | varchar(100) | ❌ | null | Opcional |
| `bill_document_url` | text | ❌ | null | Opcional |
| `payment_proof_url` | text | ❌ | null | Opcional |
| `is_recurring` | boolean | ❌ | `false` | ✅ |
| `recurrence_config` | jsonb | ❌ | null | Obrigatório se is_recurring=true |
| `parent_bill_id` | uuid | ❌ | null | FK → payable_bills.id |
| `next_occurrence_date` | date | ❌ | null | Opcional |
| `is_installment` | boolean | ❌ | `false` | ✅ |
| `installment_number` | integer | ❌ | null | CHECK: >= 1 |
| `installment_total` | integer | ❌ | null | CHECK: >= 1 |
| `installment_group_id` | uuid | ❌ | null | Obrigatório se is_installment=true |
| `original_purchase_amount` | numeric | ❌ | null | Opcional |
| `reminder_enabled` | boolean | ❌ | `true` | ✅ |
| `reminder_days_before` | integer | ❌ | `3` | ✅ CHECK: 0-30 |
| `reminder_channels` | text[] | ❌ | `ARRAY['app']` | ✅ |
| `last_reminder_sent_at` | timestamptz | ❌ | null | Opcional |
| `priority` | varchar(20) | ❌ | `'medium'` | ✅ CHECK constraint |
| `tags` | text[] | ❌ | null | Opcional |
| `notes` | text | ❌ | null | Opcional |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |
| `parent_recurring_id` | uuid | ❌ | null | FK → payable_bills.id |
| `credit_card_id` | uuid | ❌ | null | FK → credit_cards.id |

### CHECK Constraints (CRÍTICAS)

| Constraint | Regra |
|------------|-------|
| `payable_bills_bill_type_check` | `'service'`, `'telecom'`, `'subscription'`, `'housing'`, `'education'`, `'healthcare'`, `'insurance'`, `'loan'`, `'installment'`, `'credit_card'`, `'tax'`, `'food'`, `'other'` |
| `payable_bills_status_check` | `'pending'`, `'overdue'`, `'paid'`, `'partial'`, `'cancelled'`, `'scheduled'` |
| `payable_bills_priority_check` | `'low'`, `'medium'`, `'high'`, `'critical'` |
| `payable_bills_payment_method_check` | `'pix'`, `'bank_transfer'`, `'debit_card'`, `'credit_card'`, `'cash'`, `'automatic_debit'`, `'bank_slip'`, `'other'` |
| `payable_bills_amount_check` | `amount IS NULL OR amount > 0` |
| `valid_due_date` | `due_date >= '2020-01-01'` |
| `valid_recurrence` | Se `is_recurring=true` → `recurrence_config IS NOT NULL` |
| `valid_installment` | Se `is_installment=true` → `installment_number > 0 AND installment_total > 0 AND installment_number <= installment_total AND installment_group_id IS NOT NULL` |
| `valid_payment` | Se `status IN ('paid', 'partial')` → `paid_amount IS NOT NULL AND paid_amount > 0` |
| `valid_paid_status` | Se `status = 'paid'` → `paid_at IS NOT NULL AND (amount IS NULL OR paid_amount >= amount)` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `user_id` | `users.id` |
| `category_id` | `categories.id` |
| `payment_account_id` | `accounts.id` |
| `parent_bill_id` | `payable_bills.id` |
| `parent_recurring_id` | `payable_bills.id` |
| `credit_card_id` | `credit_cards.id` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `set_payable_bills_updated_at` | BEFORE UPDATE | `trigger_set_updated_at()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`description`** - NOT NULL sem DEFAULT → Código DEVE fornecer
3. **`due_date`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer data >= 2020-01-01
4. **`bill_type`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer valor válido (13 opções)
5. **Constraint `valid_installment`** - Se `is_installment=true`, DEVE ter `installment_group_id`

---

## 5. TABELA: `credit_cards`

### Colunas (16)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `account_id` | uuid | ❌ | null | FK → accounts.id |
| `name` | varchar(100) | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `last_four_digits` | varchar(4) | ❌ | null | Opcional |
| `brand` | varchar(50) | ❌ | null | Opcional |
| `credit_limit` | numeric | ✅ | ❌ **NENHUM** | ⚠️ CHECK: >= 0 |
| `available_limit` | numeric | ✅ | ❌ **NENHUM** | ⚠️ CHECK: >= 0 |
| `closing_day` | integer | ✅ | ❌ **NENHUM** | ⚠️ CHECK: 1-31 |
| `due_day` | integer | ✅ | ❌ **NENHUM** | ⚠️ CHECK: 1-31 |
| `color` | varchar(7) | ❌ | `'#6366f1'` | ✅ |
| `icon` | varchar(50) | ❌ | `'CreditCard'` | ✅ |
| `is_active` | boolean | ✅ | `true` | ✅ |
| `is_archived` | boolean | ✅ | `false` | ✅ |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |

### CHECK Constraints

| Constraint | Regra |
|------------|-------|
| `credit_cards_credit_limit_check` | `credit_limit >= 0` |
| `credit_cards_available_limit_check` | `available_limit >= 0` |
| `credit_cards_closing_day_check` | `closing_day >= 1 AND closing_day <= 31` |
| `credit_cards_due_day_check` | `due_day >= 1 AND due_day <= 31` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `user_id` | `users.id` |
| `account_id` | `accounts.id` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `update_credit_cards_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`name`** - NOT NULL sem DEFAULT → Código DEVE fornecer
3. **`credit_limit`** - NOT NULL sem DEFAULT → Código DEVE fornecer
4. **`available_limit`** - NOT NULL sem DEFAULT → Código DEVE fornecer
5. **`closing_day`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer 1-31
6. **`due_day`** - NOT NULL sem DEFAULT + CHECK → Código DEVE fornecer 1-31

---

## 6. TABELA: `credit_card_invoices`

### Colunas (15)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `credit_card_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → credit_cards.id |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `reference_month` | date | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `closing_date` | date | ✅ | ❌ **NENHUM** | ⚠️ CHECK: < due_date |
| `due_date` | date | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `total_amount` | numeric | ✅ | `0` | ✅ CHECK: >= 0 |
| `paid_amount` | numeric | ❌ | `0` | ✅ CHECK: >= 0 AND <= total_amount |
| `remaining_amount` | numeric | ❌ | null | Calculado |
| `status` | varchar(20) | ✅ | `'open'` | ✅ CHECK constraint |
| `payment_date` | timestamptz | ❌ | null | Opcional |
| `payment_account_id` | uuid | ❌ | null | FK → accounts.id |
| `notes` | text | ❌ | null | Opcional |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |

### CHECK Constraints

| Constraint | Regra |
|------------|-------|
| `credit_card_invoices_status_check` | `'open'`, `'closed'`, `'paid'`, `'overdue'`, `'partial'` |
| `credit_card_invoices_total_amount_check` | `total_amount >= 0` |
| `credit_card_invoices_paid_amount_check` | `paid_amount >= 0` |
| `credit_card_invoices_check` | `paid_amount <= total_amount` |
| `credit_card_invoices_check1` | `closing_date < due_date` |

### UNIQUE Constraints

| Constraint | Colunas |
|------------|---------|
| `credit_card_invoices_credit_card_id_reference_month_key` | `(credit_card_id, reference_month)` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `credit_card_id` | `credit_cards.id` |
| `user_id` | `users.id` |
| `payment_account_id` | `accounts.id` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `trg_calculate_invoice_total_on_close` | BEFORE UPDATE | `calculate_invoice_total_on_close()` |
| `trg_update_invoice_remaining_amount` | BEFORE UPDATE | `update_invoice_remaining_amount()` |
| `trigger_update_available_limit` | AFTER INSERT/UPDATE/DELETE | `update_available_limit()` |
| `update_invoices_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`credit_card_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
3. **`reference_month`** - NOT NULL sem DEFAULT → Código DEVE fornecer
4. **`closing_date`** - NOT NULL sem DEFAULT → Código DEVE fornecer
5. **`due_date`** - NOT NULL sem DEFAULT → Código DEVE fornecer
6. **Constraint `closing_date < due_date`** - Código DEVE garantir ordem

---

## 7. TABELA: `credit_card_transactions`

### Colunas (17)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `credit_card_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → credit_cards.id |
| `invoice_id` | uuid | ❌ | null | FK → credit_card_invoices.id |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `category_id` | uuid | ❌ | null | FK → categories.id |
| `description` | varchar(255) | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `amount` | numeric | ✅ | ❌ **NENHUM** | ⚠️ CHECK: > 0 |
| `purchase_date` | date | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `is_installment` | boolean | ❌ | `false` | ✅ |
| `installment_number` | integer | ❌ | null | CHECK: > 0 |
| `total_installments` | integer | ❌ | null | CHECK: > 0 |
| `installment_group_id` | uuid | ❌ | null | Opcional |
| `establishment` | varchar(255) | ❌ | null | Opcional |
| `source` | varchar(20) | ❌ | `'manual'` | ✅ CHECK constraint |
| `notes` | text | ❌ | null | Opcional |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |

### CHECK Constraints

| Constraint | Regra |
|------------|-------|
| `credit_card_transactions_amount_check` | `amount > 0` |
| `credit_card_transactions_source_check` | `'manual'`, `'whatsapp'`, `'import'`, `'open_finance'` |
| `credit_card_transactions_installment_number_check` | `installment_number > 0` |
| `credit_card_transactions_total_installments_check` | `total_installments > 0` |
| `credit_card_transactions_check` | Se `is_installment=true` → `installment_number IS NOT NULL AND total_installments IS NOT NULL` |
| `credit_card_transactions_check1` | `installment_number <= total_installments` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `credit_card_id` | `credit_cards.id` |
| `invoice_id` | `credit_card_invoices.id` |
| `user_id` | `users.id` |
| `category_id` | `categories.id` |

### Triggers (10!)

| Trigger | Evento | Função |
|---------|--------|--------|
| `trg_update_card_limit_on_delete` | AFTER DELETE | `update_card_limit_on_delete()` |
| `trg_update_card_limit_on_purchase` | AFTER INSERT | `update_card_limit_on_purchase()` |
| `trg_update_invoice_total_on_delete` | AFTER DELETE | `update_invoice_total_on_delete()` |
| `trg_update_invoice_total_on_transaction` | AFTER INSERT | `update_invoice_total_on_transaction()` |
| `trg_update_spending_goals` | AFTER INSERT/UPDATE/DELETE | `update_spending_goals()` |
| `trigger_apply_category_rules` | BEFORE INSERT | `apply_category_rules()` |
| `trigger_auto_categorize` | BEFORE INSERT/UPDATE | `auto_categorize_transaction()` |
| `trigger_update_invoice_total` | AFTER INSERT/UPDATE/DELETE | `update_invoice_total()` |
| `update_cc_transactions_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`credit_card_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
3. **`description`** - NOT NULL sem DEFAULT → Código DEVE fornecer
4. **`amount`** - NOT NULL sem DEFAULT + CHECK > 0 → Código DEVE fornecer valor positivo
5. **`purchase_date`** - NOT NULL sem DEFAULT → Código DEVE fornecer

---

## 8. TABELA: `conversation_context`

### Colunas (9)

| Coluna | Tipo | NOT NULL | Default | Observação |
|--------|------|----------|---------|------------|
| `id` | uuid | ✅ | `gen_random_uuid()` | PK |
| `user_id` | uuid | ✅ | ❌ **NENHUM** | ⚠️ FK → users.id |
| `phone` | varchar(20) | ✅ | ❌ **NENHUM** | ⚠️ Obrigatório |
| `context_type` | conversation_type | ✅ | `'idle'` | ✅ ENUM |
| `context_data` | jsonb | ❌ | `'{}'` | ✅ |
| `last_interaction` | timestamptz | ❌ | `now()` | ✅ |
| `expires_at` | timestamptz | ❌ | `now() + 5min` | ✅ |
| `created_at` | timestamptz | ❌ | `now()` | ✅ |
| `updated_at` | timestamptz | ❌ | `now()` | ✅ |

### UNIQUE Constraints

| Constraint | Colunas |
|------------|---------|
| `uniq_conversation_context_user_phone_type` | `(user_id, phone, context_type)` |

### Foreign Keys

| Coluna | Referência |
|--------|------------|
| `user_id` | `users.id` |

### Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `update_conversation_context_updated_at` | BEFORE UPDATE | `update_updated_at_column()` |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **`user_id`** - NOT NULL sem DEFAULT → Código DEVE fornecer
2. **`phone`** - NOT NULL sem DEFAULT → Código DEVE fornecer

---

## 🚨 RESUMO DE PROBLEMAS CRÍTICOS

### Colunas NOT NULL sem DEFAULT (14 campos críticos)

| Tabela | Coluna | Impacto |
|--------|--------|---------|
| `accounts` | `user_id`, `name`, `type` | Insert falha sem esses campos |
| `categories` | `name`, `type` | Insert falha sem esses campos |
| `transactions` | `user_id`, `type`, `amount`, `transaction_date` | Insert falha sem esses campos |
| `payable_bills` | `user_id`, `description`, `due_date`, `bill_type` | Insert falha sem esses campos |
| `credit_cards` | `user_id`, `name`, `credit_limit`, `available_limit`, `closing_day`, `due_day` | Insert falha sem esses campos |
| `credit_card_invoices` | `credit_card_id`, `user_id`, `reference_month`, `closing_date`, `due_date` | Insert falha sem esses campos |
| `credit_card_transactions` | `credit_card_id`, `user_id`, `description`, `amount`, `purchase_date` | Insert falha sem esses campos |
| `conversation_context` | `user_id`, `phone` | Insert falha sem esses campos |

### CHECK Constraints Críticas (Código DEVE respeitar)

| Tabela | Constraint | Valores Válidos |
|--------|------------|-----------------|
| `accounts` | `type` | checking, savings, cash, investment, credit_card |
| `categories` | `type` | income, expense |
| `transactions` | `type` | income, expense, transfer |
| `transactions` | `amount` | > 0 |
| `transactions` | `source` | manual, whatsapp, import, open_finance |
| `transactions` | `payment_method` | pix, credit, debit, cash, boleto, transfer, other |
| `payable_bills` | `bill_type` | 13 valores (service, telecom, subscription, etc.) |
| `payable_bills` | `status` | pending, overdue, paid, partial, cancelled, scheduled |
| `payable_bills` | `payment_method` | 8 valores |
| `credit_card_transactions` | `amount` | > 0 |
| `credit_card_invoices` | `closing_date < due_date` | Ordem obrigatória |

### Constraints Compostas (Lógica complexa)

| Tabela | Constraint | Regra |
|--------|------------|-------|
| `payable_bills` | `valid_installment` | Se parcelamento → precisa de group_id |
| `payable_bills` | `valid_recurrence` | Se recorrente → precisa de config |
| `payable_bills` | `valid_payment` | Se pago/parcial → precisa de paid_amount |
| `credit_card_transactions` | `check` | Se parcelamento → precisa de número e total |

---

## ✅ PRÓXIMOS PASSOS

1. **Verificar código WhatsApp** - Garantir que todos os campos obrigatórios são preenchidos
2. **Verificar código Frontend** - Garantir que formulários validam antes de enviar
3. **Adicionar defaults faltantes** - Considerar adicionar defaults onde faz sentido
4. **Criar validações TypeScript** - Tipos que refletem as constraints do banco

---

**Documento gerado automaticamente pela Auditoria de Arquitetura - Sessão 1**
