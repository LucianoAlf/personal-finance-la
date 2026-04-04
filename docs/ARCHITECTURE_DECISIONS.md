# Architecture Decisions

## Purpose

This document captures architecture decisions and known structural gaps that should not be lost in chat history. It is intended to record the current source of truth for financial flow decisions, pending fixes, and constraints that future changes must respect.

## 1. Recurring Planned Expenses

### Decision

`payable_bills` is the official source for planned recurring expenses.

### Why

`payable_bills` already models the concepts that recurring planned expenses need:

- due dates
- reminders
- partial payments
- installments
- payment account
- payment history

This is a better fit than treating recurring planned expenses as plain entries in `transactions`.

### Implication

The approved direction is Option A:

- planned recurring expenses live in `payable_bills`
- when a bill payment is registered, the system should generate the corresponding financial transaction
- that bridge should be based on payment events recorded in `bill_payment_history`

This bridge is a separate implementation front and is not completed yet.

## 2. Current Gap Between `payable_bills` and `transactions`

### Current State

`payable_bills` and `transactions` currently operate as parallel systems.

- marking a bill as paid updates `payable_bills` and `bill_payment_history`
- it does not currently create a corresponding row in `transactions`
- `v_all_transactions` does not include `payable_bills`

### Impact

This creates a real gap between:

- planned obligations
- actual financial movements

Until the bridge is implemented, payment flows in `payable_bills` should not be assumed to appear automatically in transaction history or account movement reports.

## 3. Pending Bug: `revertPayment()` References Missing Column

### Bug

`revertPayment()` currently references `transactions.payable_bill_id`, but that column does not exist in the current database schema.

### Risk

Any logic that assumes a direct bill-to-transaction link through `payable_bill_id` is unsafe until the linkage strategy is explicitly modeled and implemented.

### Required Follow-up

Before implementing the full bridge between bills and transactions, define the correct linkage model for payment events and reversals.

## 4. `transactions` Recurrence Exists in Schema but Not in UI

### Current State

The `transactions` schema already includes:

- `is_recurring`
- `recurrence_type`
- `recurrence_end_date`

However, the current `TransactionDialog` does not expose recurrence fields and currently saves new transaction payloads with `is_recurring: false`.

### Decision

Do not expose recurrence in the transaction modal yet.

### Why

The data fields exist, but the full product behavior for recurring transactions is not complete or clearly defined end-to-end. Exposing the UI now would suggest a capability that is not fully implemented across creation, generation, editing, cancellation, and reporting flows.

### Status

This should be treated as a real product and architecture gap, not as "N/A".

## 5. Account Balance Rule for `transactions`

### Rule

For rows in `transactions`, account balances should continue to be derived by the database trigger `transaction_balance_update`.

### Implication

Avoid manual `current_balance` updates in flows that already persist through `transactions`, because that creates a risk of duplicated balance effects or drift from the database trigger behavior.

### Note

If a future bill-payment bridge creates rows in `transactions`, that flow must rely on the trigger-driven balance model instead of mixing manual account balance updates with transaction inserts.

## 6. Unified Transactions Feed Must Route Clicks By Source Type

### Decision

The `Transacoes` page should continue to work as a unified financial feed visually, but click behavior must eventually route to the correct editor or detail flow based on the underlying business object source.

### Why

The current list now aggregates different kinds of financial items into one visual feed:

- manual transactions
- credit card purchases
- grouped credit card installment purchases
- transfers
- future bill payment events

That unified presentation is useful, but it should not imply that every row is edited through the same modal.

Today, the click behavior still opens the generic `TransactionDialog`, which is semantically incorrect for grouped card purchases and will also be incorrect for future bill payment entries if they are added to the same feed.

### Required Direction

The feed should eventually route click behavior by a business-level source type, such as:

- `manual_transaction`
- `credit_card_purchase`
- `credit_card_installment_group`
- `bill_payment`
- `transfer`

Each source type should open the correct detail or editing surface for that object instead of forcing all items through the generic transaction editor.

### Current Status

Do not implement this now.

The current priority is to continue QA across the remaining modules. The database data is correct and the visual grouping fix for installment purchases is acceptable for now, but the click behavior mismatch remains a known architectural gap.

### Priority

Implement after the full QA cycle is completed for the remaining phases and modules.

## 7. Credit Card Purchases Must Not Be Stored As Generic `payable_bills`

### Decision

`payable_bills` remains the source of truth for obligations and planned bills.

`credit_card_transactions` remains the source of truth for purchases made on a real credit card, including installment purchases.

For now, the `Contas a Pagar` modal should not offer `Cartão de Crédito` as an active payment path.

### Why

The audit on `Contas a Pagar` exposed a structural bug:

- the modal allowed `payment_method = credit_card`
- installment creation in `payable_bills` interpreted `amount` as installment value
- the flow created duplicated bill rows without a reliable `credit_card_id` link
- no corresponding rows were created in `credit_card_transactions`

This produced broken UX and broken data:

- the same purchase looked like a bill installment group
- the cards module did not know about the purchase
- totals became semantically wrong because `amount` meant different things in different flows

### Required Direction

The current approved rule is:

- `payable_bills` is for aluguel, luz, boletos, carnês, financiamentos and similar obligations
- `credit_card_transactions` is for credit card purchases
- installment support inside `Contas a Pagar` is only for obligations whose form model is "value per installment"
- credit card purchases, whether one-time or installment, must be created through `Cartões -> Nova Compra`

### UI Implication

The `Contas a Pagar` modal should remove or disable `Cartão de Crédito` for now, instead of pretending to support that flow.

This is intentionally stricter than a hybrid UI because it avoids another misleading unified surface with the wrong business object under it.

### Data Cleanup

Incorrect legacy test data created through the old path should be deleted or migrated after verification, including installment groups like the `Celular` example that were saved in `payable_bills` without corresponding card transactions.

## 8. Recurring Bills Must Materialize a Rolling Horizon

### Decision

Recurring bills in `payable_bills` should be modeled as:

- one recurring template row with `is_recurring = true` and `parent_bill_id = null`
- future materialized occurrences as child rows with `parent_bill_id = template_id`

### Required Product Behavior

The user should not need to wait for the daily cron to see the next month in the UI.

When a recurring bill is created or edited, the system should materialize a rolling horizon of future occurrences immediately, and the cron should act only as a safety net to keep that horizon filled.

### Current Rule

The system now keeps a rolling horizon of future recurring bills ahead of the current date.

### Variable Recurring Amounts

Recurring bills such as utilities may vary month to month.

Because each future month is materialized as its own child row, the generated occurrence can be adjusted for that month without destroying the recurring template itself.

## Code References

The following files are the main implementation entry points related to the decisions above:

- `src/hooks/usePayableBills.ts`
  Contains the current `markAsPaid()` and `revertPayment()` flows for `payable_bills`.

- `src/components/payable-bills/BillDialog.tsx`
  Current UI entry point for creating and editing payable bills, including recurrence, reminders, and payment configuration.

- `src/hooks/useTransactions.ts`
  Main CRUD flow for `transactions`, including `addTransaction()`, `updateTransaction()`, and `deleteTransaction()`.

- `src/components/transactions/TransactionDialog.tsx`
  Current transaction modal. This is where recurrence is currently hidden at the UI layer and where new transaction payloads are created.

- `src/pages/Transacoes.tsx`
  Main transaction list and editing flow for manual transaction management.

- `docs/database-finance-personal-la.sql`
  Versioned schema reference that documents the `transactions` recurrence fields and the `transaction_balance_update` trigger behavior.

- Supabase function `mark_bill_as_paid`
  Live database function currently responsible for marking bills as paid and writing `bill_payment_history`, without yet creating a corresponding row in `transactions`.

- View `v_all_transactions`
  Live database view currently used to unify financial movement sources, but it does not include `payable_bills`.

