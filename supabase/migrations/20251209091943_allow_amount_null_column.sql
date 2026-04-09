-- Permitir NULL na coluna amount
ALTER TABLE payable_bills ALTER COLUMN amount DROP NOT NULL;;
