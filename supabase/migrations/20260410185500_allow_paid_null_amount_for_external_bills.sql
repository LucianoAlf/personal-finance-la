-- Allow imported bills without known amount to be marked as paid.
-- This is required for TickTick inbound sync, where remote tasks can be completed
-- even when the local payable_bill was imported without an amount.

ALTER TABLE public.payable_bills DROP CONSTRAINT IF EXISTS valid_payment;

ALTER TABLE public.payable_bills ADD CONSTRAINT valid_payment
CHECK (
  (status NOT IN ('paid', 'partial')) OR
  (
    status IN ('paid', 'partial')
    AND (
      (paid_amount IS NOT NULL AND paid_amount > 0)
      OR (amount IS NULL AND paid_amount IS NULL)
    )
  )
);
