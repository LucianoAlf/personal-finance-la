-- Migration: Adicionar coluna issuing_bank e preencher baseado no nome do cartão
-- Data: 2024-12-13

-- 1. Adicionar coluna issuing_bank se não existir
ALTER TABLE credit_cards 
ADD COLUMN IF NOT EXISTS issuing_bank TEXT;

-- 2. Atualizar cartões existentes baseado no nome
UPDATE credit_cards SET issuing_bank = 'nubank' 
WHERE LOWER(name) LIKE '%nubank%' OR LOWER(name) LIKE '%nu %' OR LOWER(name) LIKE '%roxinho%';

UPDATE credit_cards SET issuing_bank = 'itau' 
WHERE LOWER(name) LIKE '%itau%' OR LOWER(name) LIKE '%itaú%';

UPDATE credit_cards SET issuing_bank = 'bradesco' 
WHERE LOWER(name) LIKE '%bradesco%';

UPDATE credit_cards SET issuing_bank = 'santander' 
WHERE LOWER(name) LIKE '%santander%';

UPDATE credit_cards SET issuing_bank = 'bb' 
WHERE LOWER(name) LIKE '%banco do brasil%' OR LOWER(name) LIKE '% bb %' OR name LIKE 'BB %';

UPDATE credit_cards SET issuing_bank = 'caixa' 
WHERE LOWER(name) LIKE '%caixa%';

UPDATE credit_cards SET issuing_bank = 'inter' 
WHERE LOWER(name) LIKE '%inter%' AND LOWER(name) NOT LIKE '%internacional%';

UPDATE credit_cards SET issuing_bank = 'c6' 
WHERE LOWER(name) LIKE '%c6%';

UPDATE credit_cards SET issuing_bank = 'btg' 
WHERE LOWER(name) LIKE '%btg%';

UPDATE credit_cards SET issuing_bank = 'xp' 
WHERE LOWER(name) LIKE '%xp %' OR LOWER(name) LIKE '%xp%';

UPDATE credit_cards SET issuing_bank = 'picpay' 
WHERE LOWER(name) LIKE '%picpay%';

UPDATE credit_cards SET issuing_bank = 'mercadopago' 
WHERE LOWER(name) LIKE '%mercado pago%' OR LOWER(name) LIKE '%mercadopago%';

-- 3. Comentário na coluna
COMMENT ON COLUMN credit_cards.issuing_bank IS 'Código do banco emissor do cartão (nubank, itau, bradesco, etc.)';
