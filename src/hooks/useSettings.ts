// src/hooks/useSettings.ts
// Hook principal para gerenciar configurações do usuário

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  UserSettings,
  UpdateUserSettingsInput,
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
  UserSettingsResponse,
} from '@/types/settings.types';

export function useSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar todas as configurações diretamente do banco (fallback)
  const fetchAllSettings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar user_settings
      let { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Se não existir, criar com valores padrão
      if (settingsError && settingsError.code === 'PGRST116') {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
            avatar_url: user?.user_metadata?.avatar_url,
          })
          .select()
          .single();

        if (createError) throw createError;
        settings = newSettings;
      } else if (settingsError) {
        throw settingsError;
      }

      // Buscar notification_preferences
      let { data: prefs, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Se não existir, criar com valores padrão
      if (prefsError && prefsError.code === 'PGRST116') {
        const { data: newPrefs, error: createPrefsError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: userId })
          .select()
          .single();

        if (createPrefsError) throw createPrefsError;
        prefs = newPrefs;
      } else if (prefsError) {
        throw prefsError;
      }

      setUserSettings(settings);
      setNotificationPreferences(prefs);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Atualizar user_settings
  const updateUserSettings = useCallback(async (input: UpdateUserSettingsInput) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(input)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      setUserSettings(data);
      toast.success('Configurações atualizadas!');
      return data;
    } catch (err: any) {
      console.error('Error updating user settings:', err);
      toast.error('Erro ao atualizar configurações');
      throw err;
    }
  }, [userId]);

  // Atualizar notification_preferences
  const updateNotificationPreferences = useCallback(
    async (input: UpdateNotificationPreferencesInput) => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update(input)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        setNotificationPreferences(data);
        toast.success('Preferências de notificação atualizadas!');
        return data;
      } catch (err: any) {
        console.error('Error updating notification preferences:', err);
        toast.error('Erro ao atualizar preferências');
        throw err;
      }
    },
    [userId]
  );

  // Alterar tema (atalho)
  const setTheme = useCallback(
    async (theme: 'light' | 'dark' | 'auto') => {
      return updateUserSettings({ theme });
    },
    [updateUserSettings]
  );

  // Carregar ao montar
  useEffect(() => {
    fetchAllSettings();
  }, [fetchAllSettings]);

  return {
    // State
    userSettings,
    notificationPreferences,
    loading,
    error,

    // Actions
    updateUserSettings,
    updateNotificationPreferences,
    setTheme,
    refresh: fetchAllSettings,
  };
}
