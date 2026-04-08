/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useSettings } from './useSettings';

const tableFetchCount = {
  user_settings: 0,
  notification_preferences: 0,
};

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'luciano@example.com',
      user_metadata: { full_name: 'Luciano' },
    },
    loading: false,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'luciano@example.com',
            user_metadata: { full_name: 'Luciano' },
          },
        },
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn((table: 'user_settings' | 'notification_preferences') => {
      return {
        select: () => ({
          eq: () => ({
            single: async () => {
              tableFetchCount[table] += 1;

              if (table === 'user_settings') {
                return {
                  data: {
                    user_id: 'user-1',
                    display_name: 'Luciano',
                    language: 'pt-BR',
                    currency: 'BRL',
                    date_format: 'dd/MM/yyyy',
                    number_format: 'pt-BR',
                    timezone: 'America/Sao_Paulo',
                    theme: 'light',
                  },
                  error: null,
                };
              }

              return {
                data: {
                  user_id: 'user-1',
                  email_notifications: true,
                },
                error: null,
              };
            },
          }),
        }),
      };
    }),
  },
}));

describe('useSettings', () => {
  beforeEach(() => {
    tableFetchCount.user_settings = 0;
    tableFetchCount.notification_preferences = 0;
  });

  it('deduplicates initial settings fetch across simultaneous hook instances', async () => {
    renderHook(() => useSettings());
    renderHook(() => useSettings());

    await waitFor(() => {
      expect(tableFetchCount.user_settings).toBe(1);
      expect(tableFetchCount.notification_preferences).toBe(1);
    });
  });
});
