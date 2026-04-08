import { describe, expect, it } from 'vitest';
import {
  mapWebhookFormToCreateInput,
  mapWebhookFormToUpdateInput,
} from './webhookPayload';

describe('webhook payload mapping', () => {
  it('maps auth and custom headers into the backend contract for create', () => {
    expect(
      mapWebhookFormToCreateInput({
        name: 'Webhook',
        description: 'Teste',
        url: 'https://example.com/hook',
        http_method: 'POST',
        auth_type: 'bearer',
        auth_token: 'secret-token',
        auth_username: '',
        auth_password: '',
        custom_headers: '{"X-App":"finance","X-Version":2}',
        retry_enabled: true,
        retry_max_attempts: 3,
        retry_delay_seconds: 60,
        is_active: true,
      }),
    ).toEqual(
      expect.objectContaining({
        auth_token_encrypted: 'secret-token',
        custom_headers: {
          'X-App': 'finance',
          'X-Version': '2',
        },
      }),
    );
  });

  it('keeps encrypted credentials on update when the user leaves auth fields blank', () => {
    expect(
      mapWebhookFormToUpdateInput(
        {
          name: 'Webhook',
          description: '',
          url: 'https://example.com/hook',
          http_method: 'POST',
          auth_type: 'basic',
          auth_token: '',
          auth_username: 'luciano',
          auth_password: '',
          custom_headers: '{}',
          retry_enabled: false,
          retry_max_attempts: 2,
          retry_delay_seconds: 30,
          is_active: true,
        },
        {
          id: '1',
          user_id: 'u1',
          name: 'Webhook',
          description: null,
          url: 'https://example.com/hook',
          http_method: 'POST',
          auth_type: 'basic',
          auth_token_encrypted: 'stored-token',
          auth_username: 'luciano',
          auth_password_encrypted: 'stored-password',
          custom_headers: {},
          retry_enabled: true,
          retry_max_attempts: 3,
          retry_delay_seconds: 60,
          is_active: true,
          total_calls: 0,
          success_calls: 0,
          failed_calls: 0,
          last_triggered_at: null,
          last_status_code: null,
          created_at: '2026-04-08T00:00:00.000Z',
          updated_at: '2026-04-08T00:00:00.000Z',
        },
      ),
    ).toEqual(
      expect.objectContaining({
        auth_token_encrypted: 'stored-token',
        auth_password_encrypted: 'stored-password',
      }),
    );
  });
});
