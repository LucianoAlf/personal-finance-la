-- Corrigir transações do WhatsApp que estão marcadas como pendentes
-- Todas as transações do WhatsApp devem ser marcadas como pagas por padrão

UPDATE transactions 
SET 
  is_paid = true,
  status = 'completed',
  updated_at = NOW()
WHERE 
  source = 'whatsapp'
  AND is_paid = false;
