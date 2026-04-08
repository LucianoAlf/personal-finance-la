// src/hooks/useSettings.ts
// Hook principal para gerenciar configurações do usuário

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type {
  UserSettings,
  UpdateUserSettingsInput,
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@/types/settings.types';

interface UpdateSettingsOptions {
  showSuccessToast?: boolean;
}

interface SettingsSnapshot {
  userSettings: UserSettings | null;
  notificationPreferences: NotificationPreferences | null;
}

const settingsCache = new Map<string, SettingsSnapshot>();
const settingsRequests = new Map<string, Promise<SettingsSnapshot>>();

export function useSettings() {
  const { user, loading: authLoading } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllSettings = useCallback(async () => {
    if (!user?.id) {
      setUserSettings(null);
      setNotificationPreferences(null);
      setLoading(false);
      return;
    }

    const cached = settingsCache.get(user.id);
    if (cached) {
      setUserSettings(cached.userSettings);
      setNotificationPreferences(cached.notificationPreferences);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const existingRequest = settingsRequests.get(user.id);
      if (existingRequest) {
        const sharedResult = await existingRequest;
        setUserSettings(sharedResult.userSettings);
        setNotificationPreferences(sharedResult.notificationPreferences);
        return;
      }

      const request = (async (): Promise<SettingsSnapshot> => {
        // Buscar user_settings
        let { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Se não existir, criar com valores padrão
        if (settingsError && settingsError.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
              avatar_url: user.user_metadata?.avatar_url,
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
          .eq('user_id', user.id)
          .single();

        // Se não existir, criar com valores padrão
        if (prefsError && prefsError.code === 'PGRST116') {
          const { data: newPrefs, error: createPrefsError } = await supabase
            .from('notification_preferences')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (createPrefsError) throw createPrefsError;
          prefs = newPrefs;
        } else if (prefsError) {
          throw prefsError;
        }

        const snapshot = {
          userSettings: settings,
          notificationPreferences: prefs,
        };

        settingsCache.set(user.id, snapshot);
        return snapshot;
      })();

      settingsRequests.set(user.id, request);

      const result = await request;
      setUserSettings(result.userSettings);
      setNotificationPreferences(result.notificationPreferences);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
      toast.error('Erro ao carregar configurações');
    } finally {
      if (user?.id) {
        settingsRequests.delete(user.id);
      }
      setLoading(false);
    }
  }, [user]);

  // Atualizar user_settings
  const updateUserSettings = useCallback(async (
    input: UpdateUserSettingsInput,
    options: UpdateSettingsOptions = {}
  ) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(input)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserSettings(data);
      const cached = settingsCache.get(user.id);
      settingsCache.set(user.id, {
        userSettings: data,
        notificationPreferences: cached?.notificationPreferences ?? notificationPreferences,
      });
      if (options.showSuccessToast !== false) {
        toast.success('Configurações atualizadas!');
      }
      return data;
    } catch (err: any) {
      console.error('Error updating user settings:', err);
      toast.error('Erro ao atualizar configurações');
      throw err;
    }
  }, [notificationPreferences, user]);

  // Atualizar notification_preferences
  const updateNotificationPreferences = useCallback(
    async (
      input: UpdateNotificationPreferencesInput,
      options: UpdateSettingsOptions = {}
    ) => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update(input)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        setNotificationPreferences(data);
        const cached = settingsCache.get(user.id);
        settingsCache.set(user.id, {
          userSettings: cached?.userSettings ?? userSettings,
          notificationPreferences: data,
        });
        if (options.showSuccessToast !== false) {
          toast.success('Preferências de notificação atualizadas!');
        }
        return data;
      } catch (err: any) {
        console.error('Error updating notification preferences:', err);
        toast.error('Erro ao atualizar preferências');
        throw err;
      }
    },
    [user, userSettings]
  );

  // Alterar tema (atalho)
  const setTheme = useCallback(
    async (
      theme: 'light' | 'dark' | 'auto',
      options: UpdateSettingsOptions = { showSuccessToast: false }
    ) => {
      return updateUserSettings({ theme }, options);
    },
    [updateUserSettings]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    fetchAllSettings();
  }, [authLoading, fetchAllSettings]);

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
