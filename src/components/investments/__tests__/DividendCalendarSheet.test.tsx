/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DividendCalendarSheet } from '../DividendCalendarSheet';

vi.mock('../DividendCalendar', () => ({
  DividendCalendar: () => <div data-testid="dividend-calendar-inline">calendar</div>,
}));

describe('DividendCalendarSheet', () => {
  afterEach(() => cleanup());

  it('is pointer-events-none and translated off-screen when closed', () => {
    const { container } = render(
      <DividendCalendarSheet open={false} onOpenChange={vi.fn()} />,
    );
    const root = container.querySelector('[data-testid="dividend-calendar-sheet-root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('pointer-events-none');
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(sheet.className).toContain('translate-y-full');
  });

  it('slides in and renders the DividendCalendar when open', () => {
    const { container } = render(
      <DividendCalendarSheet open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByTestId('dividend-calendar-inline')).toBeTruthy();
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(sheet.className).toContain('translate-y-0');
  });

  it('closes when the backdrop is tapped', () => {
    const onOpenChange = vi.fn();
    render(<DividendCalendarSheet open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByLabelText('Fechar calendário'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the X button is tapped', () => {
    const onOpenChange = vi.fn();
    render(<DividendCalendarSheet open={true} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^fechar$/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<DividendCalendarSheet open={true} onOpenChange={onOpenChange} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
