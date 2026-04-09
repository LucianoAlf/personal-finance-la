-- Remover constraint antiga
ALTER TABLE payable_bills DROP CONSTRAINT IF EXISTS payable_bills_bill_type_check;

-- Adicionar nova constraint com 'installment'
ALTER TABLE payable_bills ADD CONSTRAINT payable_bills_bill_type_check 
CHECK (bill_type IN ('service', 'telecom', 'subscription', 'housing', 'education', 
                     'healthcare', 'insurance', 'loan', 'installment', 'credit_card', 
                     'tax', 'food', 'other'));;
