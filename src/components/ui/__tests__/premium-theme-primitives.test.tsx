/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import path from 'node:path';
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
const indexCss = readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
const tailwindConfig = readFileSync(path.resolve(process.cwd(), 'tailwind.config.js'), 'utf8');

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

  it('keeps action and status tokens high-contrast and defines semantic info tokens', () => {
    expect(indexCss).toContain('--primary: 268 52% 40%;');
    expect(indexCss).toContain('--primary-foreground: 0 0% 100%;');
    expect(indexCss).toContain('--danger: 358 72% 42%;');
    expect(indexCss).toContain('--danger-foreground: 0 0% 100%;');
    expect(indexCss).toContain('--warning: 32 78% 24%;');
    expect(indexCss).toContain('--warning-subtle: 38 67% 90%;');
    expect(indexCss).toContain('--info: 217 70% 30%;');
    expect(indexCss).toContain('--info-subtle: 214 82% 93%;');
    expect(indexCss).toContain('--primary: 270 72% 74%;');
    expect(indexCss).toContain('--primary-foreground: 228 38% 9%;');
    expect(indexCss).toContain('--danger: 0 82% 72%;');
    expect(indexCss).toContain('--danger-foreground: 228 38% 9%;');
    expect(indexCss).toContain('--info: 214 88% 74%;');
    expect(tailwindConfig).toContain("DEFAULT: 'hsl(var(--info))'");
    expect(tailwindConfig).toContain("subtle: 'hsl(var(--info-subtle))'");
    expect(tailwindConfig).toContain("border: 'hsl(var(--info-border))'");
  });

  it('uses dedicated info badge tokens and a stronger light-mode dialog overlay', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="premium-theme-light">
        <Badge variant="info">Info</Badge>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Light dialog</DialogTitle>
            <DialogDescription>Overlay separation</DialogDescription>
          </DialogContent>
        </Dialog>
      </ThemeProvider>,
    );

    const overlay = document.querySelector('[class*="backdrop-blur"]');

    expect(screen.getByText('Info').className).toContain('bg-info-subtle');
    expect(screen.getByText('Info').className).toContain('border-info-border');
    expect(screen.getByText('Info').className).toContain('text-info');
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain('bg-slate-950/48');
  });
});
