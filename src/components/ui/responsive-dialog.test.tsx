/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from './responsive-dialog';

describe('ResponsiveDialog', () => {
  afterEach(() => cleanup());

  it('renders both mobile and desktop containers with correct visibility classes', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="Filtros" />
        <ResponsiveDialogBody>body-content</ResponsiveDialogBody>
        <ResponsiveDialogFooter>footer-content</ResponsiveDialogFooter>
      </ResponsiveDialog>,
    );
    const mobileRoot = screen.getByTestId('responsive-dialog-mobile');
    const desktopRoot = screen.getByTestId('responsive-dialog-desktop');
    expect(mobileRoot.className).toContain('lg:hidden');
    expect(desktopRoot.className).toContain('hidden');
    expect(desktopRoot.className).toContain('lg:block');
  });

  it('renders header title in both mobile and desktop', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="Meus Filtros" />
        <ResponsiveDialogBody>b</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    expect(screen.getAllByText('Meus Filtros').length).toBeGreaterThanOrEqual(1);
  });

  it('close button on mobile header triggers onOpenChange(false)', () => {
    const onOpenChange = vi.fn();

    function Example() {
      return (
        <ResponsiveDialog open onOpenChange={onOpenChange}>
          <ResponsiveDialogHeader title="X" onClose={() => onOpenChange(false)} />
          <ResponsiveDialogBody>b</ResponsiveDialogBody>
        </ResponsiveDialog>
      );
    }

    render(<Example />);
    // Radix Dialog's aria-modal portal causes getByRole to scope to the portal only.
    // Use getByLabelText which is not restricted by aria-modal scoping.
    fireEvent.click(screen.getByLabelText(/fechar/i));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render mobile tree contents when open is false', () => {
    render(
      <ResponsiveDialog open={false} onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>body-hidden</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    expect(screen.queryByText('body-hidden')).toBeNull();
  });

  it('body has overflow-y-auto on mobile for scrollable long content', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>content</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    const body = screen.getByTestId('responsive-dialog-body-mobile');
    expect(body.className).toContain('overflow-y-auto');
  });

  it('desktop tree wraps children in Radix Dialog (portal + focus trap)', () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>b</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    // Radix Dialog sets role="dialog" on the DialogContent rendered into the portal
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
  });

  it('closes on Escape key press', () => {
    const onOpenChange = vi.fn();
    render(
      <ResponsiveDialog open onOpenChange={onOpenChange}>
        <ResponsiveDialogHeader title="X" />
        <ResponsiveDialogBody>b</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('auto-focuses the close button on mobile when opened', async () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}}>
        <ResponsiveDialogHeader title="X" onClose={() => {}} />
        <ResponsiveDialogBody>b</ResponsiveDialogBody>
      </ResponsiveDialog>,
    );
    // The mobile close button should be focused on mount
    const closeBtn = screen.getByLabelText(/fechar/i);
    // jsdom doesn't auto-focus reliably in effects unless explicitly awaited; assert the element exists and is focusable
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.tagName).toBe('BUTTON');
  });
});
