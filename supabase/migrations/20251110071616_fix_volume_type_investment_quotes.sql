-- Corrigir tipo da coluna volume para suportar valores grandes de crypto
ALTER TABLE investment_quotes_history 
ALTER COLUMN volume TYPE NUMERIC(30, 2);;
