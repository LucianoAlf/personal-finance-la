-- Corrigir transações do WhatsApp que estão marcadas como pendentes
UPDATE transactions 
SET 
  is_paid = true,
  status = 'completed',
  updated_at = NOW()
WHERE 
  user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND source = 'whatsapp'
  AND is_paid = false;

-- Verificar resultado
SELECT 
  id,
  description,
  amount,
  is_paid,
  status,
  source,
  created_at
FROM transactions
WHERE 
  user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND source = 'whatsapp'
ORDER BY created_at DESC
LIMIT 10;
