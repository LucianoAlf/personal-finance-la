/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ReconciliationImportPanel } from '../ReconciliationImportPanel';

const state = {
  mode: 'paste',
  setMode: vi.fn(),
  pasteText: 'linha 1\nlinha 2',
  setPasteText: vi.fn(),
  pasteCount: 2,
  selectedFileName: null,
  preview: { source: 'paste', itemCount: 2, note: '2 linhas detectadas para normaliza˜˜o.' },
  manualDraft: { description: '', amount: '', date: '', accountName: '' },
  setManualDraft: vi.fn(),
  handlePasteAnalyze: vi.fn(),
  handleCsvSelected: vi.fn(),
  handleManualPreview: vi.fn(),
  handleImport: vi.fn(),
  importPending: false,
  canImport: true,
};

afterEach(() => {
  cleanup();
});

describe('ReconciliationImportPanel', () => {
  it('renders import methods and preview area', () => {
    render(<ReconciliationImportPanel state={state as any} />);

    expect(screen.getByRole('tab', { name: /Colar extrato/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Upload CSV/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Manual/i })).toBeTruthy();
    expect(screen.getByText(/origem: paste/i)).toBeTruthy();

    fireEvent.click(screen.getAllByText(/Gerar preview/i)[0]);
    expect(state.handlePasteAnalyze).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Importar para conciliacao/i })).toBeTruthy();
  });

  it('uses the design-system date picker in manual mode', () => {
    render(<ReconciliationImportPanel state={{ ...state, mode: 'manual', preview: null } as any} />);

    expect(screen.getByRole('button', { name: /Selecione uma data/i })).toBeTruthy();
  });
});
