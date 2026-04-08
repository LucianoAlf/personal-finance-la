import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookEndpoint,
} from '@/types/settings.types';

export interface WebhookFormPayload {
  name: string;
  description?: string;
  url: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  auth_type: 'none' | 'bearer' | 'api_key' | 'basic';
  auth_token?: string;
  auth_username?: string;
  auth_password?: string;
  custom_headers?: string;
  retry_enabled: boolean;
  retry_max_attempts: number;
  retry_delay_seconds: number;
  is_active: boolean;
}

function parseHeaders(rawHeaders?: string): Record<string, string> {
  if (!rawHeaders?.trim()) {
    return {};
  }

  const parsed = JSON.parse(rawHeaders) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Headers customizados devem ser um objeto JSON válido.');
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, String(value)]),
  );
}

export function mapWebhookFormToCreateInput(
  payload: WebhookFormPayload,
): CreateWebhookInput {
  return {
    name: payload.name,
    description: payload.description || undefined,
    url: payload.url,
    http_method: payload.http_method,
    auth_type: payload.auth_type,
    auth_token_encrypted: payload.auth_token || undefined,
    auth_username: payload.auth_username || undefined,
    auth_password_encrypted: payload.auth_password || undefined,
    custom_headers: parseHeaders(payload.custom_headers),
    retry_enabled: payload.retry_enabled,
    retry_max_attempts: payload.retry_max_attempts,
    retry_delay_seconds: payload.retry_delay_seconds,
    is_active: payload.is_active,
  };
}

export function mapWebhookFormToUpdateInput(
  payload: WebhookFormPayload,
  existingWebhook?: WebhookEndpoint | null,
): UpdateWebhookInput {
  return {
    name: payload.name,
    description: payload.description || undefined,
    url: payload.url,
    http_method: payload.http_method,
    auth_type: payload.auth_type,
    auth_token_encrypted:
      payload.auth_token || existingWebhook?.auth_token_encrypted || undefined,
    auth_username: payload.auth_username || undefined,
    auth_password_encrypted:
      payload.auth_password || existingWebhook?.auth_password_encrypted || undefined,
    custom_headers: parseHeaders(payload.custom_headers),
    retry_enabled: payload.retry_enabled,
    retry_max_attempts: payload.retry_max_attempts,
    retry_delay_seconds: payload.retry_delay_seconds,
    is_active: payload.is_active,
  };
}
