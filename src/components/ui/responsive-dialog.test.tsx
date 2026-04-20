/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
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
});
