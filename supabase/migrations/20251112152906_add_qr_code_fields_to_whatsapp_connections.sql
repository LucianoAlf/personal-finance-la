-- =====================================================
-- ADICIONAR CAMPOS DE QR CODE
-- =====================================================

ALTER TABLE whatsapp_connections
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS qr_code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_number TEXT;;
