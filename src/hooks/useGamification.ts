import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  UserGamification, 
  BadgeProgress, 
  AddXPResult 
} from '@/types/database.types';

// =====================================================
// CONSTANTES: Sistema de Níveis
// =====================================================
export const LEVEL_TITLES: Record<number, string> = {
  1: 'Iniciante',
  5: 'Poupador',
  10: 'Investidor',
  20: 'Expert',
  35: 'Mestre',
  50: 'Lenda',
};

export const getLevelTitle = (level: number): string => {
  const thresholds = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const threshold of thresholds) {
    if (level >= threshold) {
      return LEVEL_TITLES[threshold];
    }
  }
  
  return LEVEL_TITLES[1];
};

// Fórmula: 100 * level^1.5
export const calculateXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(level, 1.5));
};

// =====================================================
// CONSTANTES: Recompensas de XP
// =====================================================
export const XP_REWARDS = {
  CREATE_GOAL: 50,
  COMPLETE_GOAL: 200,
  ADD_CONTRIBUTION: 20,
  MAINTAIN_STREAK_MONTH: 100,
  EXCEED_SAVINGS_TARGET: 150,
  STAY_UNDER_SPENDING_LIMIT: 100,
  CREATE_FIRST_GOAL: 100,
  COMPLETE_ALL_MONTHLY_GOALS: 300,
  UNLOCK_ACHIEVEMENT_BRONZE: 50,
  UNLOCK_ACHIEVEMENT_SILVER: 150,
  UNLOCK_ACHIEVEMENT_GOLD: 300,
} as const;

// =====================================================
// HOOK: useGamification
// =====================================================
export function useGamification() {
  const [profile, setProfile] = useState<UserGamification | null>(null);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Fila de celebrações de conquistas recém-desbloqueadas
  const [celebrationQueue, setCelebrationQueue] = useState<BadgeProgress[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const initializedRef = useRef(false);
  const celebratedRef = useRef<Set<string>>(new Set());

  // =====================================================
  // Buscar perfil de gamificação
  // =====================================================
  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // Se não existe, criar perfil inicial
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_gamification')
            .insert({
              user_id: user.id,
              level: 1,
              xp: 0,
              total_xp: 0,
              current_streak: 0,
              best_streak: 0,
            })
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
          return;
        }
        throw fetchError;
      }

      setProfile(data);
    } catch (err) {
      setError(err as Error);
      console.error('Erro ao buscar perfil de gamificação:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // Buscar conquistas
  // =====================================================
  const fetchBadges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('badge_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBadges(data || []);
    } catch (err) {
      console.error('Erro ao buscar badges:', err);
    }
  }, []);

  // =====================================================
  // Adicionar XP
  // =====================================================
  const addXP = useCallback(async (amount: number): Promise<AddXPResult | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Chamar função RPC do Supabase
      const { data, error: rpcError } = await supabase
        .rpc('add_xp_to_user', {
          p_user_id: user.id,
          p_xp_amount: amount,
        });

      if (rpcError) throw rpcError;

      // Atualizar perfil local
      await fetchProfile();

      return data?.[0] || null;
    } catch (err) {
      console.error('Erro ao adicionar XP:', err);
      return null;
    }
  }, [fetchProfile]);

  // =====================================================
  // Desbloquear conquista
  // =====================================================
  const unlockBadge = useCallback(async (
    badgeId: string,
    tier: 'bronze' | 'silver' | 'gold',
    xpReward: number
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Chamar função RPC do Supabase
      const { data, error: rpcError } = await supabase
        .rpc('unlock_badge', {
          p_user_id: user.id,
          p_badge_id: badgeId,
          p_tier: tier,
          p_xp_reward: xpReward,
        });

      if (rpcError) throw rpcError;

      // Se desbloqueou (não era duplicado)
      if (data) {
        await fetchBadges();
        await fetchProfile();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erro ao desbloquear badge:', err);
      return false;
    }
  }, [fetchBadges, fetchProfile]);

  // =====================================================
  // Atualizar progresso de conquista
  // =====================================================
  const updateBadgeProgress = useCallback(async (
    badgeId: string,
    tier: 'bronze' | 'silver' | 'gold',
    progress: number,
    target: number
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await supabase.rpc('update_badge_progress', {
        p_user_id: user.id,
        p_badge_id: badgeId,
        p_tier: tier,
        p_progress: progress,
        p_target: target,
      });

      await fetchBadges();
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
    }
  }, [fetchBadges]);

  // =====================================================
  // Atualizar preferências
  // =====================================================
  const updatePreferences = useCallback(async (
    preferences: Partial<Pick<UserGamification, 'animations_enabled' | 'sounds_enabled' | 'notifications_enabled'>>
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error: updateError } = await supabase
        .from('user_gamification')
        .update(preferences)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchProfile();
    } catch (err) {
      console.error('Erro ao atualizar preferências:', err);
    }
  }, [fetchProfile]);

  // =====================================================
  // Calcular informações derivadas
  // =====================================================
  const xpForNextLevel = profile ? calculateXPForLevel(profile.level) : 0;
  const xpProgress = profile && xpForNextLevel > 0 
    ? (profile.xp / xpForNextLevel) * 100 
    : 0;
  const levelTitle = profile ? getLevelTitle(profile.level) : 'Iniciante';

  const unlockedBadges = badges.filter(a => a.unlocked);
  const lockedBadges = badges.filter(a => !a.unlocked);

  // =====================================================
  // Efeitos
  // =====================================================
  useEffect(() => {
    fetchProfile();
    fetchBadges();
  }, [fetchProfile, fetchBadges]);

  // Detectar conquistas recém-desbloqueadas (após primeira carga)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    // Considerar como "recentes" as conquistas desbloqueadas nos últimos 10s
    const getUnlockedMs = (val: unknown): number => {
      if (!val) return 0;
      if (typeof val === 'string') {
        const t = Date.parse(val);
        return isNaN(t) ? 0 : t;
      }
      if (val instanceof Date) return val.getTime();
      return 0;
    };

    const recent = badges.filter((b) => {
      if (!b.unlocked || !b.unlocked_at) return false;
      const ts = getUnlockedMs(b.unlocked_at as unknown);
      return ts > 0 && Date.now() - ts < 10_000;
    });

    const newOnes: BadgeProgress[] = [];
    for (const b of recent) {
      const key = `${b.badge_id}|${b.tier}|${b.unlocked_at}`;
      if (!celebratedRef.current.has(key)) {
        celebratedRef.current.add(key);
        newOnes.push(b);
      }
    }

    if (newOnes.length > 0) {
      setCelebrationQueue((prev) => [...prev, ...newOnes]);
      setShowCelebration(true);
    }
  }, [badges]);

  const dismissCelebration = useCallback(() => {
    setCelebrationQueue((prev) => prev.slice(1));
    setShowCelebration(false);
  }, []);

  // Realtime subscription para perfil
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('gamification_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_gamification',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchProfile();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'badge_progress',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchBadges();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchProfile, fetchBadges]);

  return {
    // Estado
    profile,
    badges,
    unlockedBadges,
    lockedBadges,
    loading,
    error,
    
    // Informações derivadas
    xpForNextLevel,
    xpProgress,
    levelTitle,
    
    // Ações
    addXP,
    unlockBadge,
    updateBadgeProgress,
    updatePreferences,
    refreshProfile: fetchProfile,
    refreshBadges: fetchBadges,
    // Celebrações
    celebrationQueue,
    showCelebration,
    setShowCelebration,
    dismissCelebration,
  };
}
