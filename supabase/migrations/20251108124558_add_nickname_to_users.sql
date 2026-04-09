-- Adicionar campo nickname na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

COMMENT ON COLUMN users.nickname IS 'Apelido do usuário para uso em mensagens personalizadas';

-- Atualizar seu usuário com o apelido "Alf"
UPDATE users 
SET nickname = 'Alf'
WHERE email = 'lucianoalf.la@gmail.com';;
