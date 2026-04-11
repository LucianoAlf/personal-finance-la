/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

let mockProvidersState: any;

vi.mock('@/hooks/useAIProviders', () => ({
  useAIProviders: () => mockProvidersState,
}));

vi.mock('./AIProviderCard', () => ({
  AIProviderCard: ({ provider }: { provider: string }) => <div>{provider}-provider-card</div>,
}));

vi.mock('./CreateAIProviderDialog', () => ({
  CreateAIProviderDialog: () => <div>create-ai-provider-dialog</div>,
}));

import { AIProviderSettings } from './AIProviderSettings';

describe('AIProviderSettings', () => {
  beforeEach(() => {
    mockProvidersState = {
      providers: [],
      defaultProvider: null,
      validatedProviders: [],
      loading: false,
      validating: false,
      createProvider: vi.fn(),
      updateProvider: vi.fn(),
      setDefaultProvider: vi.fn(),
      validateApiKey: vi.fn(),
      refresh: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the default provider advisory with premium success tokens instead of light green surfaces', () => {
    mockProvidersState = {
      ...mockProvidersState,
      providers: [
        {
          id: 'provider-1',
          user_id: 'user-1',
          provider: 'gemini',
          is_default: true,
          is_active: true,
          model_name: 'gemini-3.1-flash-lite-preview',
          temperature: 0.7,
          max_tokens: 2048,
          response_style: 'medium',
          response_tone: 'friendly',
          system_prompt: '',
          is_validated: true,
          last_validated_at: null,
          validation_error: null,
          plan_type: 'free',
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
        },
      ],
      defaultProvider: {
        id: 'provider-1',
        user_id: 'user-1',
        provider: 'gemini',
        is_default: true,
        is_active: true,
        model_name: 'gemini-3.1-flash-lite-preview',
        temperature: 0.7,
        max_tokens: 2048,
        response_style: 'medium',
        response_tone: 'friendly',
        system_prompt: '',
        is_validated: true,
        last_validated_at: null,
        validation_error: null,
        plan_type: 'free',
        created_at: '2026-04-10T00:00:00.000Z',
        updated_at: '2026-04-10T00:00:00.000Z',
      },
      validatedProviders: [{ id: 'provider-1' }],
    };

    render(<AIProviderSettings />);

    const advisory = screen.getByText(/provedor padrão:/i).closest('[role="alert"]');

    expect(advisory).not.toBeNull();
    expect(advisory?.className).toContain('border-success-border');
    expect(advisory?.className).toContain('bg-success-subtle');
    expect(advisory?.className).toContain('text-success');
    expect(advisory?.className).not.toContain('border-green-200');
    expect(advisory?.className).not.toContain('bg-green-50');
  });

  it('renders the fallback advisory with premium warning tokens instead of light amber surfaces', () => {
    mockProvidersState = {
      ...mockProvidersState,
      providers: [
        {
          id: 'provider-2',
          user_id: 'user-1',
          provider: 'openai',
          is_default: false,
          is_active: true,
          model_name: 'gpt-5-mini',
          temperature: 0.7,
          max_tokens: 2048,
          response_style: 'medium',
          response_tone: 'friendly',
          system_prompt: '',
          is_validated: false,
          last_validated_at: null,
          validation_error: null,
          plan_type: 'free',
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
        },
      ],
    };

    render(<AIProviderSettings />);

    const advisory = screen
      .getByText(/nenhum provedor padrão definido/i)
      .closest('[role="alert"]');

    expect(advisory).not.toBeNull();
    expect(advisory?.className).toContain('border-warning-border');
    expect(advisory?.className).toContain('bg-warning-subtle');
    expect(advisory?.className).toContain('text-warning');
    expect(advisory?.className).not.toContain('border-amber-200');
    expect(advisory?.className).not.toContain('bg-amber-50');
  });
});
