/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

let mockConnectionState: any;
let mockMessagesState: any;

vi.mock('@/hooks/useWhatsAppConnection', () => ({
  useWhatsAppConnection: () => mockConnectionState,
}));

vi.mock('@/hooks/useWhatsAppMessages', () => ({
  useWhatsAppMessages: () => mockMessagesState,
}));

vi.mock('@/components/whatsapp/QRCodeModal', () => ({
  QRCodeModal: () => <div>qr-code-modal</div>,
}));

vi.mock('@/components/whatsapp/MessageHistory', () => ({
  MessageHistory: () => <div>message-history</div>,
}));

vi.mock('@/components/whatsapp/WhatsAppStats', () => ({
  WhatsAppStats: () => <div>whatsapp-stats</div>,
}));

vi.mock('@/components/whatsapp/WhatsAppOnboarding', () => ({
  WhatsAppOnboarding: () => <div>whatsapp-onboarding</div>,
}));

vi.mock('@/components/whatsapp/WhatsAppCommands', () => ({
  WhatsAppCommands: () => <div>whatsapp-commands</div>,
}));

import { IntegrationsSettings } from './IntegrationsSettings';

describe('IntegrationsSettings badges', () => {
  beforeEach(() => {
    mockConnectionState = {
      connection: {
        connected_at: '2026-04-01T12:00:00.000Z',
        phone_number: '5511999999999',
      },
      isConnected: true,
      qrCode: null,
      qrCodeExpiry: null,
      isLoading: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      refreshQRCode: vi.fn(),
    };

    mockMessagesState = {
      stats: null,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('uses semantic success tokens for the connected WhatsApp badge instead of light green classes', () => {
    render(<IntegrationsSettings />);

    const connectedBadge = screen.getByText('Conectado');

    expect(connectedBadge.className).toContain('border-success-border');
    expect(connectedBadge.className).toContain('bg-success-subtle');
    expect(connectedBadge.className).toContain('text-success');
    expect(connectedBadge.className).not.toContain('bg-green-100');
    expect(connectedBadge.className).not.toContain('text-green-700');
    expect(connectedBadge.className).not.toContain('border-green-200');
  });

  it('uses semantic warning tokens for planned integration badges instead of light amber classes', () => {
    render(<IntegrationsSettings />);

    const planningBadges = screen.getAllByText('Em planejamento');

    expect(planningBadges.length).toBeGreaterThanOrEqual(2);

    for (const badge of planningBadges) {
      expect(badge.className).toContain('border-warning-border');
      expect(badge.className).toContain('bg-warning-subtle');
      expect(badge.className).toContain('text-warning');
      expect(badge.className).not.toContain('bg-amber-50');
      expect(badge.className).not.toContain('text-amber-700');
      expect(badge.className).not.toContain('border-amber-200');
    }
  });
});
