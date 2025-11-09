// SPRINT 4: Hook para gerenciar badges do usuário
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'investment' | 'engagement' | 'performance';
  condition_type: string;
  condition_value: Record<string, any>;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  created_at: string;
  // Joined data
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
}

export function useBadges() {
  const { user } = useAuth();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all available badges
  const fetchAllBadges = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      setAllBadges(data || []);
    } catch (error) {
      console.error('Erro ao buscar badges:', error);
    }
  }, []);

  // Fetch user's unlocked badges
  const fetchUserBadges = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_badges_detailed')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;

      setUserBadges(data || []);
    } catch (error) {
      console.error('Erro ao buscar badges do usuário:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check and unlock badges manually
  const checkBadges = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_and_unlock_badges', {
        p_user_id: user.id,
      });

      if (error) throw error;

      // Se desbloqueou novos badges
      if (data && data.length > 0) {
        // Buscar detalhes dos novos badges
        const newBadgeIds = data.map((b: any) => b.badge_id);
        
        const { data: badgeDetails } = await supabase
          .from('badges')
          .select('*')
          .in('id', newBadgeIds);

        // Notificar usuário
        badgeDetails?.forEach((badge) => {
          toast.success(`🎉 Novo badge desbloqueado: ${badge.icon} ${badge.name}!`, {
            description: badge.description,
            duration: 5000,
          });
        });

        // Atualizar lista
        await fetchUserBadges();
      }
    } catch (error) {
      console.error('Erro ao verificar badges:', error);
    }
  }, [user, fetchUserBadges]);

  // Get badge progress (quantos de cada categoria)
  const getBadgeProgress = useCallback(() => {
    const categories = {
      investment: { total: 0, unlocked: 0 },
      engagement: { total: 0, unlocked: 0 },
      performance: { total: 0, unlocked: 0 },
    };

    allBadges.forEach((badge) => {
      categories[badge.category].total++;
    });

    userBadges.forEach((userBadge) => {
      const badge = allBadges.find((b) => b.id === userBadge.badge_id);
      if (badge) {
        categories[badge.category].unlocked++;
      }
    });

    return categories;
  }, [allBadges, userBadges]);

  // Check if user has specific badge
  const hasBadge = useCallback(
    (badgeId: string) => {
      return userBadges.some((ub) => ub.badge_id === badgeId);
    },
    [userBadges]
  );

  // Get badges grouped by category
  const getBadgesByCategory = useCallback(() => {
    return allBadges.reduce((acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push({
        ...badge,
        unlocked: hasBadge(badge.id),
        unlockedAt: userBadges.find((ub) => ub.badge_id === badge.id)?.unlocked_at,
      });
      return acc;
    }, {} as Record<string, Array<Badge & { unlocked: boolean; unlockedAt?: string }>>);
  }, [allBadges, userBadges, hasBadge]);

  // Setup realtime subscription for new badges
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_badges_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newBadge = payload.new as UserBadge;

          // Buscar detalhes do badge
          const { data: badgeData } = await supabase
            .from('badges')
            .select('*')
            .eq('id', newBadge.badge_id)
            .single();

          if (badgeData) {
            toast.success(`🎉 Novo badge desbloqueado: ${badgeData.icon} ${badgeData.name}!`, {
              description: badgeData.description,
              duration: 5000,
            });
          }

          // Atualizar lista
          await fetchUserBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserBadges]);

  // Initial fetch
  useEffect(() => {
    fetchAllBadges();
    if (user) {
      fetchUserBadges();
    }
  }, [user, fetchAllBadges, fetchUserBadges]);

  return {
    allBadges,
    userBadges,
    loading,
    checkBadges,
    hasBadge,
    getBadgeProgress: getBadgeProgress(),
    getBadgesByCategory: getBadgesByCategory(),
    refetch: fetchUserBadges,
  };
}
