-- Migration: Sistema de Gamificação
-- Descrição: Cria tabelas e funções para sistema de XP, níveis e conquistas

-- =====================================================
-- TABELA: user_gamification_profile
-- Perfil de gamificação do usuário (XP, nível, streaks)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_gamification_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sistema de XP e Níveis
  current_level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
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
-- TABELA: user_achievements
-- Conquistas desbloqueadas e progresso
-- =====================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  
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
  
  UNIQUE(user_id, achievement_id, tier)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_gamification_profile_user_id 
  ON user_gamification_profile(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
  ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked 
  ON user_achievements(user_id, unlocked);

CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id 
  ON user_achievements(achievement_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE user_gamification_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies para user_gamification_profile
DROP POLICY IF EXISTS "Users can view own gamification profile" ON user_gamification_profile;
CREATE POLICY "Users can view own gamification profile"
  ON user_gamification_profile FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gamification profile" ON user_gamification_profile;
CREATE POLICY "Users can insert own gamification profile"
  ON user_gamification_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gamification profile" ON user_gamification_profile;
CREATE POLICY "Users can update own gamification profile"
  ON user_gamification_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies para user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;
CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_user_gamification_profile_updated_at ON user_gamification_profile;
CREATE TRIGGER update_user_gamification_profile_updated_at
  BEFORE UPDATE ON user_gamification_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON user_achievements;
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para calcular XP necessário para próximo nível
-- Fórmula: 100 * level^1.5 (progressão exponencial suave)
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(100 * POWER(level, 1.5))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para adicionar XP e atualizar nível automaticamente
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
  FROM user_gamification_profile
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar perfil inicial
  IF NOT FOUND THEN
    INSERT INTO user_gamification_profile (user_id, current_xp, total_xp)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_profile;
  END IF;
  
  -- Calcular novo total de XP
  v_new_total_xp := v_profile.total_xp + p_xp_amount;
  v_new_current_xp := v_profile.current_xp + p_xp_amount;
  v_new_level := v_profile.current_level;
  
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
  UPDATE user_gamification_profile
  SET 
    current_level = v_new_level,
    current_xp = v_new_current_xp,
    total_xp = v_new_total_xp,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Retornar resultados
  RETURN QUERY SELECT v_new_level, v_new_current_xp, v_new_total_xp, v_leveled_up;
END;
$$ LANGUAGE plpgsql;

-- Função para desbloquear conquista
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_tier TEXT,
  p_xp_reward INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_unlocked BOOLEAN;
BEGIN
  -- Verificar se já está desbloqueada
  SELECT unlocked INTO v_already_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id 
    AND achievement_id = p_achievement_id 
    AND tier = p_tier;
  
  -- Se já desbloqueada, retornar false
  IF v_already_unlocked THEN
    RETURN false;
  END IF;
  
  -- Desbloquear conquista
  UPDATE user_achievements
  SET 
    unlocked = true,
    unlocked_at = NOW(),
    xp_reward = p_xp_reward
  WHERE user_id = p_user_id 
    AND achievement_id = p_achievement_id 
    AND tier = p_tier;
  
  -- Se não existia, criar
  IF NOT FOUND THEN
    INSERT INTO user_achievements (
      user_id, achievement_id, tier, unlocked, unlocked_at, xp_reward
    ) VALUES (
      p_user_id, p_achievement_id, p_tier, true, NOW(), p_xp_reward
    );
  END IF;
  
  -- Adicionar XP de recompensa
  PERFORM add_xp_to_user(p_user_id, p_xp_reward);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar progresso de conquista
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_tier TEXT,
  p_progress NUMERIC,
  p_target NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Inserir ou atualizar progresso
  INSERT INTO user_achievements (
    user_id, achievement_id, tier, progress, target
  ) VALUES (
    p_user_id, p_achievement_id, p_tier, p_progress, p_target
  )
  ON CONFLICT (user_id, achievement_id, tier) 
  DO UPDATE SET 
    progress = EXCLUDED.progress,
    target = EXCLUDED.target,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE user_gamification_profile IS 'Perfil de gamificação do usuário com XP, níveis e preferências';
COMMENT ON TABLE user_achievements IS 'Conquistas desbloqueadas e progresso por usuário';
COMMENT ON FUNCTION calculate_xp_for_level IS 'Calcula XP necessário para atingir um nível específico';
COMMENT ON FUNCTION add_xp_to_user IS 'Adiciona XP ao usuário e atualiza nível automaticamente';
COMMENT ON FUNCTION unlock_achievement IS 'Desbloqueia uma conquista e concede XP de recompensa';
COMMENT ON FUNCTION update_achievement_progress IS 'Atualiza o progresso de uma conquista';
