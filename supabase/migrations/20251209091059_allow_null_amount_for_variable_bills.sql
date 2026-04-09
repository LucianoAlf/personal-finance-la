-- Permitir amount NULL para contas variáveis (luz, água, gás)
ALTER TABLE payable_bills DROP CONSTRAINT payable_bills_amount_check;

-- Nova constraint: amount deve ser > 0 OU NULL (para variáveis)
ALTER TABLE payable_bills ADD CONSTRAINT payable_bills_amount_check 
CHECK (amount IS NULL OR amount > 0);

-- Também precisamos ajustar valid_paid_status para aceitar NULL
ALTER TABLE payable_bills DROP CONSTRAINT valid_paid_status;

-- Nova constraint: se pago, paid_amount >= amount (mas só se amount não for NULL)
ALTER TABLE payable_bills ADD CONSTRAINT valid_paid_status 
CHECK (
  (status <> 'paid') OR 
  (status = 'paid' AND paid_at IS NOT NULL AND (amount IS NULL OR paid_amount >= amount))
);;
