import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

const profileCache = new Map<string, UserProfile | null>();
const profileRequests = new Map<string, Promise<UserProfile | null>>();

function buildFallbackProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    phone: user.phone ?? null,
  };
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Buscar perfil do usuário
  const fetchProfile = async (currentUser: User) => {
    const cached = profileCache.get(currentUser.id);
    if (cached) {
      setProfile(cached);
      return cached;
    }

    const existingRequest = profileRequests.get(currentUser.id);
    if (existingRequest) {
      const existingProfile = await existingRequest;
      setProfile(existingProfile);
      return existingProfile;
    }

    const request = (async () => {
      const fallbackProfile = buildFallbackProfile(currentUser);

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url, phone')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (error) throw error;

        const resolvedProfile = data ?? fallbackProfile;
        profileCache.set(currentUser.id, resolvedProfile);
        return resolvedProfile;
      } catch (error) {
        console.warn('Profile fetch fallback activated', error);
        profileCache.set(currentUser.id, fallbackProfile);
        return fallbackProfile;
      } finally {
        profileRequests.delete(currentUser.id);
      }
    })();

    profileRequests.set(currentUser.id, request);

    try {
      const resolvedProfile = await request;
      setProfile(resolvedProfile);
      return resolvedProfile;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      }
      setLoading(false);
    });

    // Escutar mudanças
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    if (user?.id) {
      profileCache.delete(user.id);
      profileRequests.delete(user.id);
    }
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    loading,
    signOut,
  };
};