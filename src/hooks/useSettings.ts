// src/hooks/useSettings.ts
// Hook principal para gerenciar configurações do usuário

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import type {
  UserSettings,
  UpdateUserSettingsInput,
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
  UserSettingsResponse,
} from '@/types/settings.types';

export function useSettings() {
  const { user } = useAuthStore();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as configurações via Edge Function
  const fetchAllSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar configurações');
      }

      const data: UserSettingsResponse = await response.json();
      
      setUserSettings(data.user_settings);
      setNotificationPreferences(data.notification_preferences);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Atualizar user_settings
  const updateUserSettings = useCallback(async (input: UpdateUserSettingsInput) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(input)
        .eq('user_id', user.id)
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
  }, [user]);

  // Atualizar notification_preferences
  const updateNotificationPreferences = useCallback(
    async (input: UpdateNotificationPreferencesInput) => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .update(input)
          .eq('user_id', user.id)
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
    [user]
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
