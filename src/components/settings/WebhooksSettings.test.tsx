/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useWebhooks', () => ({
  useWebhooks: () => ({
    webhooks: [
      {
        id: 'wh-1',
        name: 'N8N Expenses',
        description: 'Webhook principal',
        url: 'https://example.com/webhook/expenses',
        method: 'POST',
        auth_type: 'none',
        is_active: true,
        total_calls: 10,
        success_count: 9,
      },
      {
        id: 'wh-2',
        name: 'N8N Archive',
        description: null,
        url: 'https://example.com/webhook/archive',
        method: 'POST',
        auth_type: 'none',
        is_active: false,
        total_calls: 0,
        success_count: 0,
      },
    ],
    logs: [
      {
        id: 'log-1',
        triggered_at: '2026-04-11T12:00:00.000Z',
        status: 'success',
        response_status_code: 200,
        status_code: 200,
        response_time_ms: 120,
        retry_count: 0,
      },
    ],
    loading: false,
    testWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    fetchLogs: vi.fn(),
  }),
}));

vi.mock('./WebhookFormDialog', () => ({
  WebhookFormDialog: () => null,
}));

import { WebhooksSettings } from './WebhooksSettings';

describe('WebhooksSettings premium semantics', () => {
  it('uses semantic status badges instead of light-mode green and gray classes', () => {
    render(<WebhooksSettings />);

    const activeBadge = screen.getByText('Ativo');
    const inactiveBadge = screen.getByText('Inativo');

    expect(activeBadge.className).toContain('border-success-border');
    expect(activeBadge.className).toContain('bg-success-subtle');
    expect(activeBadge.className).toContain('text-success');
    expect(activeBadge.className).not.toContain('bg-green-100');
    expect(activeBadge.className).not.toContain('text-green-700');

    expect(inactiveBadge.className).toContain('border-border');
    expect(inactiveBadge.className).toContain('bg-surface-elevated');
    expect(inactiveBadge.className).toContain('text-muted-foreground');
    expect(inactiveBadge.className).not.toContain('bg-gray-50');
  });
});
