/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

let sonnerProps: Record<string, unknown> | null = null;
const scrollIntoViewMock = vi.fn();

vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonnerProps = props;
    return <div data-testid="sonner-proxy" />;
  },
}));

describe('premium dark-mode primitives', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
    sonnerProps = null;
    scrollIntoViewMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('uses premium semantic tokens instead of hardcoded light surfaces', async () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey="premium-theme-test">
        <Button variant="outline">Outline</Button>
        <Badge variant="success">Premium active</Badge>

        <Select defaultOpen value="premium">
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select a tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open>
          <DialogContent>
            <DialogTitle>Premium dialog</DialogTitle>
            <DialogDescription>Layered surface</DialogDescription>
          </DialogContent>
        </Dialog>

        <DropdownMenu open modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button">Menu</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Open</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Table data-testid="premium-table">
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Synced</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Toaster />
      </ThemeProvider>,
    );

    const outlineButton = screen.getByText('Outline').closest('button');

    expect(outlineButton).not.toBeNull();
    expect(outlineButton?.className).toContain('bg-surface');
    expect(outlineButton?.className).toContain('border-border');
    expect(screen.getByText('Premium active').className).toContain('bg-success-subtle');
    expect(screen.getByText('Premium active').className).toContain('border-success-border');
    expect(screen.getByTestId('select-trigger').className).toContain('bg-surface');
    expect(screen.getByTestId('select-trigger').className).toContain('border-border');
    expect(screen.getByRole('dialog', { hidden: true }).className).toContain('bg-surface-overlay');
    expect(screen.getByRole('dialog', { hidden: true }).className).toContain('border-border');
    expect(screen.getByRole('menu', { hidden: true }).className).toContain('bg-surface-overlay');
    expect(screen.getByRole('menu', { hidden: true }).className).toContain('border-border');
    expect(screen.getByTestId('premium-table').className).toContain('bg-surface');

    await waitFor(() => {
      expect(sonnerProps?.theme).toBe('dark');
    });

    const toastClassNames = sonnerProps?.toastOptions as
      | { classNames?: Record<string, string> }
      | undefined;

    expect(toastClassNames?.classNames?.toast).toContain('bg-surface-overlay');
    expect(toastClassNames?.classNames?.toast).toContain('border-border');
  });
});
