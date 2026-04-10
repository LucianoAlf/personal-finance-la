/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReportsAnaSection } from './ReportsAnaSection';
import { ReportsEmptyState } from './ReportsEmptyState';
import { ReportsExportButton } from './ReportsExportButton';
import { createEmptyReportContext } from '@/utils/reports/intelligence-contract';

const exportReportsToPDFMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: vi.fn(),
  },
}));

vi.mock('@/utils/reports/pdfExport', () => ({
  exportReportsToPDF: (...args: unknown[]) => exportReportsToPDFMock(...args),
}));

describe('Reports auxiliary premium shell', () => {
  it('renders the Ana Clara reading and empty state with the premium report language', () => {
    const context = createEmptyReportContext();
    context.ana = {
      summary: 'O patrimônio mostra estabilidade, com espaço para evolução.',
      insights: ['Liquidez preservada no período.'],
      risks: ['Rentabilidade ainda neutra.'],
      recommendations: ['Rebalancear a carteira gradualmente.'],
      nextBestActions: ['Priorizar aportes recorrentes.'],
    };
    context.quality.ana = { source: 'ai_interpretation', completeness: 'complete' };

    const { container } = render(
      <div className="space-y-6">
        <ReportsAnaSection context={context} />
        <ReportsEmptyState periodLabel="Últimos 12 meses" />
      </div>,
    );

    expect(screen.getByText('Leitura da Ana Clara')).not.toBeNull();
    expect(screen.getByText('Insights')).not.toBeNull();
    expect(screen.getByText('Dados insuficientes para montar o relatório')).not.toBeNull();
    expect(container.textContent).not.toContain('Ã');
  });

  it('exports the report with corrected toast copy', async () => {
    const context = createEmptyReportContext();
    context.overview.hasSufficientData = true;
    context.quality.overview = { source: 'internal_calculation', completeness: 'complete' };
    exportReportsToPDFMock.mockResolvedValue(undefined);

    render(
      <ReportsExportButton
        context={context}
        period={{
          label: 'Últimos 12 meses',
          startDate: '2025-05-01',
          endDate: '2026-04-30',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /exportar pdf/i }));

    expect(exportReportsToPDFMock).toHaveBeenCalledTimes(1);
  });
});
