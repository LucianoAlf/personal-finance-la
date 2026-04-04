-- =====================================================
-- MIGRATION: Sistema de Gamificação Completo
-- Data: 2025-01-07
-- Descrição: Cria todas as tabelas necessárias para gamificação
-- =====================================================

-- =====================================================
-- TABELA 1: user_gamification
-- Perfil de gamificação (XP, nível, streaks)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sistema de XP e Níveis
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  
  -- Streaks
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  
  -- Preferências
  animations_enabled BOOLEAN NOT NULL DEFAULT true,
  sounds_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- TABELA 2: badge_progress
-- Progresso das conquistas (badges)
-- =====================================================
CREATE TABLE IF NOT EXISTS badge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  
  -- Progresso e Tier
  tier TEXT NOT NULL DEFAULT 'bronze', -- bronze, silver, gold
  progress NUMERIC(10,2) NOT NULL DEFAULT 0,
  target NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Status
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  
  -- Recompensas
  xp_reward INTEGER NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id, tier)
);

-- =====================================================
-- TABELA 3: challenges
-- Desafios personalizados do usuário
-- =====================================================
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações do desafio
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- savings, spending, streak, custom
  
  -- Metas
  target_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Prazo
  deadline DATE,
  
  -- Recompensas
  xp_reward INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, failed, expired
  completed_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES para Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id 
  ON user_gamification(user_id);

CREATE INDEX IF NOT EXISTS idx_badge_progress_user_id 
  ON badge_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_badge_progress_unlocked 
  ON badge_progress(user_id, unlocked);

CREATE INDEX IF NOT EXISTS idx_badge_progress_badge_id 
  ON badge_progress(badge_id);

CREATE INDEX IF NOT EXISTS idx_challenges_user_id 
  ON challenges(user_id);

CREATE INDEX IF NOT EXISTS idx_challenges_status 
  ON challenges(user_id, status);

CREATE INDEX IF NOT EXISTS idx_challenges_deadline 
  ON challenges(deadline) WHERE status = 'active';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Policies para user_gamification
DROP POLICY IF EXISTS "Users can view own gamification" ON user_gamification;
CREATE POLICY "Users can view own gamification"
  ON user_gamification FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gamification" ON user_gamification;
CREATE POLICY "Users can insert own gamification"
  ON user_gamification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gamification" ON user_gamification;
CREATE POLICY "Users can update own gamification"
  ON user_gamification FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies para badge_progress
DROP POLICY IF EXISTS "Users can view own badges" ON badge_progress;
CREATE POLICY "Users can view own badges"
  ON badge_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own badges" ON badge_progress;
CREATE POLICY "Users can insert own badges"
  ON badge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own badges" ON badge_progress;
CREATE POLICY "Users can update own badges"
  ON badge_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies para challenges
DROP POLICY IF EXISTS "Users can view own challenges" ON challenges;
CREATE POLICY "Users can view own challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own challenges" ON challenges;
CREATE POLICY "Users can insert own challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own challenges" ON challenges;
CREATE POLICY "Users can update own challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own challenges" ON challenges;
CREATE POLICY "Users can delete own challenges"
  ON challenges FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_gamification_updated_at ON user_gamification;
CREATE TRIGGER update_user_gamification_updated_at
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS update_badge_progress_updated_at ON badge_progress;
CREATE TRIGGER update_badge_progress_updated_at
  BEFORE UPDATE ON badge_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS update_challenges_updated_at ON challenges;
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função: Calcular XP necessário para próximo nível
-- Fórmula: 100 * level^1.5
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(100 * POWER(level, 1.5))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função: Adicionar XP e atualizar nível
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp_amount INTEGER
)
RETURNS TABLE(
  new_level INTEGER,
  new_xp INTEGER,
  total_xp INTEGER,
  leveled_up BOOLEAN
) AS $$
DECLARE
  v_profile RECORD;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
  v_new_current_xp INTEGER;
  v_xp_for_next_level INTEGER;
  v_leveled_up BOOLEAN := false;
BEGIN
  -- Buscar perfil atual
  SELECT * INTO v_profile
  FROM user_gamification
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar perfil inicial
  IF NOT FOUND THEN
    INSERT INTO user_gamification (user_id, xp, total_xp)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_profile;
  END IF;
  
  -- Calcular novo total de XP
  v_new_total_xp := v_profile.total_xp + p_xp_amount;
  v_new_current_xp := v_profile.xp + p_xp_amount;
  v_new_level := v_profile.level;
  
  -- Loop para verificar level ups múltiplos
  LOOP
    v_xp_for_next_level := calculate_xp_for_level(v_new_level);
    
    -- Sair se não tem XP suficiente para próximo nível
    EXIT WHEN v_new_current_xp < v_xp_for_next_level;
    
    -- Subir de nível
    v_new_current_xp := v_new_current_xp - v_xp_for_next_level;
    v_new_level := v_new_level + 1;
    v_leveled_up := true;
  END LOOP;
  
  -- Atualizar perfil no banco
  UPDATE user_gamification
  SET 
    level = v_new_level,
    xp = v_new_current_xp,
    total_xp = v_new_total_xp,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Retornar resultados
  RETURN QUERY SELECT v_new_level, v_new_current_xp, v_new_total_xp, v_leveled_up;
END;
$$ LANGUAGE plpgsql;

-- Função: Desbloquear badge
CREATE OR REPLACE FUNCTION unlock_badge(
  p_user_id UUID,
  p_badge_id TEXT,
  p_tier TEXT,
  p_xp_reward INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_unlocked BOOLEAN;
BEGIN
  -- Verificar se já está desbloqueado
  SELECT unlocked INTO v_already_unlocked
  FROM badge_progress
  WHERE user_id = p_user_id 
    AND badge_id = p_badge_id 
    AND tier = p_tier;
  
  -- Se já desbloqueado, retornar false
  IF v_already_unlocked THEN
    RETURN false;
  END IF;
  
  -- Desbloquear badge
  UPDATE badge_progress
  SET 
    unlocked = true,
    unlocked_at = NOW(),
    xp_reward = p_xp_reward
  WHERE user_id = p_user_id 
    AND badge_id = p_badge_id 
    AND tier = p_tier;
  
  -- Se não existia, criar
  IF NOT FOUND THEN
    INSERT INTO badge_progress (
      user_id, badge_id, tier, unlocked, unlocked_at, xp_reward
    ) VALUES (
      p_user_id, p_badge_id, p_tier, true, NOW(), p_xp_reward
    );
  END IF;
  
  -- Adicionar XP de recompensa
  PERFORM add_xp_to_user(p_user_id, p_xp_reward);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função: Atualizar progresso de badge
CREATE OR REPLACE FUNCTION update_badge_progress(
  p_user_id UUID,
  p_badge_id TEXT,
  p_tier TEXT,
  p_progress NUMERIC,
  p_target NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Inserir ou atualizar progresso
  INSERT INTO badge_progress (
    user_id, badge_id, tier, progress, target
  ) VALUES (
    p_user_id, p_badge_id, p_tier, p_progress, p_target
  )
  ON CONFLICT (user_id, badge_id, tier) 
  DO UPDATE SET 
    progress = EXCLUDED.progress,
    target = EXCLUDED.target,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função: Completar desafio
CREATE OR REPLACE FUNCTION complete_challenge(
  p_challenge_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Buscar desafio
  SELECT * INTO v_challenge
  FROM challenges
  WHERE id = p_challenge_id
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Marcar como completado
  UPDATE challenges
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_challenge_id;
  
  -- Adicionar XP de recompensa
  PERFORM add_xp_to_user(v_challenge.user_id, v_challenge.xp_reward);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função: Verificar desafios expirados
CREATE OR REPLACE FUNCTION check_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE challenges
  SET status = 'expired'
  WHERE status = 'active'
    AND deadline < CURRENT_DATE;
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE user_gamification IS 'Perfil de gamificação do usuário com XP, níveis e preferências';
COMMENT ON TABLE badge_progress IS 'Progresso das conquistas (badges) por usuário';
COMMENT ON TABLE challenges IS 'Desafios personalizados criados pelo usuário';
COMMENT ON FUNCTION calculate_xp_for_level IS 'Calcula XP necessário para atingir um nível específico';
COMMENT ON FUNCTION add_xp_to_user IS 'Adiciona XP ao usuário e atualiza nível automaticamente';
COMMENT ON FUNCTION unlock_badge IS 'Desbloqueia um badge e concede XP de recompensa';
COMMENT ON FUNCTION update_badge_progress IS 'Atualiza o progresso de um badge';
COMMENT ON FUNCTION complete_challenge IS 'Marca um desafio como completado e concede XP';
COMMENT ON FUNCTION check_expired_challenges IS 'Verifica e marca desafios expirados';
