import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  renderOverdueBillAlertMessage,
  renderReportSummaryMessage,
} from '../../../supabase/functions/_shared/report-renderers.ts';
import {
  buildReportsOverviewCards,
  getReportsSectionMeta,
  hasDisplayableDeterministicReportData,
} from '@/utils/reports/view-model';
import {
  createEmptyReportContext,
  type ReportIntelligenceContext,
} from '@/utils/reports/intelligence-contract';

const REPORT_RENDERERS_PATH = fileURLToPath(
  new URL('../../../supabase/functions/_shared/report-renderers.ts', import.meta.url),
);

describe('reports view model', () => {
  it('keeps the shared backend report renderer free of frontend formatter imports', () => {
    const source = readFileSync(REPORT_RENDERERS_PATH, 'utf8');

    expect(source).not.toContain("../../../src/utils/formatters.ts");
  });

  it('maps canonical overview into the top cards', () => {
    const context = {
      overview: {
        financialScore: 82,
        savingsRate: 24.5,
        netWorth: 15619,
        goalsReached: 1,
        activeGoals: 2,
        hasSufficientData: true,
      },
      quality: {
        overview: { source: 'database_state', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    expect(buildReportsOverviewCards(context)).toEqual([
      expect.objectContaining({ title: 'Score Financeiro', value: '82' }),
      expect.objectContaining({ title: 'Taxa de Economia', value: '24,5%' }),
      expect.objectContaining({ title: 'Patrimônio Líquido', value: 'R$ 15.619,00' }),
      expect.objectContaining({ title: 'Metas Alcançadas', value: '1' }),
    ]);
  });

  it('keeps deterministic partial sections renderable even without a strong overview', () => {
    const context = {
      ...createEmptyReportContext(),
      quality: {
        ...createEmptyReportContext().quality,
        spending: { source: 'internal_calculation', completeness: 'partial' },
        ana: { source: 'ai_interpretation', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    expect(hasDisplayableDeterministicReportData(context)).toBe(true);
  });

  it('does not let ana alone unlock the reports page', () => {
    const context = {
      ...createEmptyReportContext(),
      quality: {
        ...createEmptyReportContext().quality,
        ana: { source: 'ai_interpretation', completeness: 'complete' },
      },
    } as ReportIntelligenceContext;

    expect(hasDisplayableDeterministicReportData(context)).toBe(false);
  });

  it('maps null overview values and unavailable quality into safe fallback copy', () => {
    const context = createEmptyReportContext();

    expect(buildReportsOverviewCards(context)).toEqual([
      expect.objectContaining({ title: 'Score Financeiro', value: 'Sem dado' }),
      expect.objectContaining({ title: 'Taxa de Economia', value: 'Sem cálculo' }),
      expect.objectContaining({ title: 'Patrimônio Líquido', value: 'Sem dado' }),
      expect.objectContaining({ title: 'Metas Alcançadas', value: '0' }),
    ]);
  });

  it('describes partial and unavailable section quality explicitly', () => {
    expect(
      getReportsSectionMeta({
        source: 'internal_calculation',
        completeness: 'partial',
      }),
    ).toEqual(
      expect.objectContaining({
        isAvailable: true,
        isPartial: true,
      }),
    );

    expect(
      getReportsSectionMeta({
        source: 'unavailable',
        completeness: 'unavailable',
      }),
    ).toEqual(
      expect.objectContaining({
        label: 'Indisponível',
        isAvailable: false,
        isPartial: false,
      }),
    );
  });

  it('puts deterministic facts before Ana Clara interpretation', () => {
    const message = renderReportSummaryMessage({
      mode: 'daily',
      userName: 'Ana',
      periodLabel: 'Hoje',
      context: {
        ...createEmptyReportContext(),
        overview: {
          ...createEmptyReportContext().overview,
          netWorth: 15619,
          savingsRate: 24.5,
          hasSufficientData: true,
        },
        ana: {
          summary: 'Bom controle financeiro no período.',
          insights: [],
          risks: [],
          recommendations: [],
          nextBestActions: [],
        },
        quality: {
          ...createEmptyReportContext().quality,
          overview: { source: 'internal_calculation', completeness: 'complete' },
          ana: { source: 'ai_interpretation', completeness: 'complete' },
        },
      },
    });

    expect(message.indexOf('Resumo determinístico')).toBeGreaterThanOrEqual(0);
    expect(message.indexOf('Leitura da Ana Clara')).toBeGreaterThanOrEqual(0);
    expect(message.indexOf('Resumo determinístico')).toBeLessThan(
      message.indexOf('Leitura da Ana Clara'),
    );
  });

  it('adds a fallback secondary interpretation when Ana context is unavailable', () => {
    const message = renderReportSummaryMessage({
      mode: 'weekly',
      userName: 'Ana',
      periodLabel: '01/04/2026 a 07/04/2026',
      context: {
        ...createEmptyReportContext(),
        overview: {
          ...createEmptyReportContext().overview,
          savingsRate: 24.5,
          netWorth: 15619,
          hasSufficientData: true,
        },
        quality: {
          ...createEmptyReportContext().quality,
          cashflow: { source: 'internal_calculation', completeness: 'complete' },
          balanceSheet: { source: 'internal_calculation', completeness: 'complete' },
          ana: { source: 'unavailable', completeness: 'unavailable' },
        },
      },
    });

    expect(message).toContain('Resumo determinístico');
    expect(message).toContain('Leitura complementar');
    expect(message).toContain('A leitura abaixo resume apenas os fatos consolidados');
    expect(message.indexOf('Resumo determinístico')).toBeLessThan(
      message.indexOf('Leitura complementar'),
    );
  });

  it('sanitizes message text and keeps overdue bills in deterministic tie-break order', () => {
    const message = renderOverdueBillAlertMessage({
      userName: 'Ana*\n',
      periodLabel: '01/04/2026\n*teste*',
      context: {
        ...createEmptyReportContext(),
        overview: {
          ...createEmptyReportContext().overview,
          netWorth: 15619,
          hasSufficientData: true,
        },
        ana: {
          summary: 'Linha 1\n*Linha 2*',
          insights: [],
          risks: [],
          recommendations: [],
          nextBestActions: [],
        },
        quality: {
          ...createEmptyReportContext().quality,
          balanceSheet: { source: 'internal_calculation', completeness: 'complete' },
          ana: { source: 'ai_interpretation', completeness: 'complete' },
        },
      },
      bills: [
        { description: 'Z conta\n2', amount: 30, dueDate: '2026-04-03', daysOverdue: 3 },
        { description: 'A *conta*', amount: 20, dueDate: '2026-04-02', daysOverdue: 3 },
        { description: 'A conta', amount: 10, dueDate: '2026-04-02', daysOverdue: 3 },
      ],
    });

    expect(message).toContain('Olá Ana!');
    expect(message).toContain('Período: 01/04/2026 teste');
    expect(message).toContain('- Linha 1 Linha 2');
    expect(message).not.toContain('Ana*\n');
    expect(message).not.toContain('*teste*');
    expect(message).not.toContain('A *conta*');
    expect(message).not.toContain('Z conta\n2');

    expect(message.indexOf('A conta: R$ 10,00')).toBeLessThan(
      message.indexOf('A conta: R$ 20,00'),
    );
    expect(message.indexOf('A conta: R$ 20,00')).toBeLessThan(
      message.indexOf('Z conta 2: R$ 30,00'),
    );
  });
});
