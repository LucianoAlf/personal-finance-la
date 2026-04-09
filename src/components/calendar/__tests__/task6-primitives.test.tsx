/* @vitest-environment jsdom */

import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OwnershipChooser } from '../OwnershipChooser';
import { CategorySelect } from '../CategorySelect';
import { PrioritySelect } from '../PrioritySelect';

beforeEach(() => {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.scrollIntoView = function () {};
  const testGlobal = globalThis as typeof globalThis & {
    CSS?: { escape?: (value: string) => string };
  };
  if (!testGlobal.CSS) {
    (testGlobal as any).CSS = {
      escape: (value: string) => value,
    };
  } else if (!testGlobal.CSS.escape) {
    testGlobal.CSS.escape = (value: string) => value;
  }
});

afterEach(() => {
  cleanup();
});

describe('OwnershipChooser', () => {
  it('announces the current exclusive selection', () => {
    render(<OwnershipChooser value="agenda" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup', { name: /tipo de item/i })).toBeTruthy();
    expect((screen.getByRole('radio', { name: /compromisso de agenda/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /obrigação financeira/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('emits agenda when the user chooses compromisso de agenda', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OwnershipChooser value="financial" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /compromisso de agenda/i }));
    expect(onChange).toHaveBeenCalledWith('agenda');
  });

  it('emits financial when the user chooses obrigação financeira', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OwnershipChooser value="agenda" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /obrigação financeira/i }));
    expect(onChange).toHaveBeenCalledWith('financial');
  });

  it('supports native keyboard radio interaction', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [value, setValue] = useState<'agenda' | 'financial'>('agenda');
      return <OwnershipChooser value={value} onChange={setValue} />;
    }

    render(<Harness />);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /compromisso de agenda/i }));

    await user.keyboard('{ArrowRight}');

    expect((screen.getByRole('radio', { name: /obrigação financeira/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /compromisso de agenda/i }) as HTMLInputElement).checked).toBe(false);
  });
});

describe('CategorySelect', () => {
  it('only exposes agenda categories (personal, work, mentoring), not financial', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategorySelect value="personal" onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: /categoria da agenda/i }));

    const listbox = await waitFor(() => screen.getByRole('listbox'));
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Pessoal', 'Trabalho', 'Mentoria']),
    );
    expect(within(listbox).queryByRole('option', { name: /^conta$/i })).toBeNull();
    expect(within(listbox).queryByRole('option', { name: /financeiro/i })).toBeNull();
  });

  it('emits the selected agenda category', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategorySelect value="personal" onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: /categoria da agenda/i }));
    await user.click(await waitFor(() => screen.getByRole('option', { name: /^trabalho$/i })));

    expect(onChange).toHaveBeenCalledWith('work');
  });
});

describe('PrioritySelect', () => {
  it('lists PT-BR labels for none through high', async () => {
    const user = userEvent.setup();
    render(<PrioritySelect value="none" onChange={() => {}} />);

    await user.click(screen.getByRole('combobox', { name: /prioridade/i }));

    const listbox = await waitFor(() => screen.getByRole('listbox'));
    const labels = within(listbox).getAllByRole('option').map((o) => o.textContent?.trim());
    expect(labels).toEqual(['Nenhuma', 'Baixa', 'Média', 'Alta']);
  });

  it('emits the selected priority value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrioritySelect value="none" onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: /prioridade/i }));
    await user.click(await waitFor(() => screen.getByRole('option', { name: /^média$/i })));

    expect(onChange).toHaveBeenCalledWith('medium');
  });
});
