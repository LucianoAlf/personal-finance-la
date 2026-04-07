import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { parseDateOnlyAsLocal } from '@/utils/dateOnly';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import {
  getReportQualityLabel,
  RENDERABLE_REPORT_SECTION_KEYS,
  isReportSectionReliable,
  type ReportIntelligenceContext,
  type ReportSectionQuality,
} from '@/utils/reports/intelligence-contract';

export interface ReportsOverviewCard {
  title: string;
  value: string;
  subtitle: string;
}

export interface ReportsSectionMeta {
  label: string;
  description: string;
  isAvailable: boolean;
  isPartial: boolean;
  isReliable: boolean;
}

export function buildReportsOverviewCards(
  context: ReportIntelligenceContext,
): ReportsOverviewCard[] {
  return [
    {
      title: 'Score Financeiro',
      value:
        context.overview.financialScore === null
          ? 'Sem dado'
          : String(context.overview.financialScore),
      subtitle: buildQualitySubtitle(context.quality.overview),
    },
    {
      title: 'Taxa de Economia',
      value:
        context.overview.savingsRate === null
          ? 'Sem cálculo'
          : formatPercentage(context.overview.savingsRate),
      subtitle: buildQualitySubtitle(context.quality.cashflow),
    },
    {
      title: 'Patrimônio Líquido',
      value:
        context.overview.netWorth === null
          ? 'Sem dado'
          : formatDisplayCurrency(context.overview.netWorth),
      subtitle: buildQualitySubtitle(context.quality.balanceSheet),
    },
    {
      title: 'Metas Alcançadas',
      value: String(context.overview.goalsReached),
      subtitle:
        context.overview.activeGoals > 0
          ? `${context.overview.activeGoals} metas ativas`
          : 'Nenhuma meta ativa',
    },
  ];
}

export function getReportsSectionMeta(
  quality: ReportSectionQuality | null | undefined,
): ReportsSectionMeta {
  if (!quality || quality.source === 'unavailable' || quality.completeness === 'unavailable') {
    return {
      label: 'Indisponível',
      description: 'Esta seção ainda não tem base suficiente para o período selecionado.',
      isAvailable: false,
      isPartial: false,
      isReliable: false,
    };
  }

  const sourceLabel = getReportQualityLabel(quality.source);
  const isReliable = isReportSectionReliable(quality);
  const isPartial = quality.completeness === 'partial';

  return {
    label: isPartial ? `${sourceLabel} parcial` : sourceLabel,
    description: isPartial
      ? 'Mostrando apenas a parte do contexto que já foi consolidada para este período.'
      : `Seção consolidada com base em ${sourceLabel.toLowerCase()}.`,
    isAvailable: true,
    isPartial,
    isReliable,
  };
}

export function buildQualitySubtitle(
  quality: ReportSectionQuality | null | undefined,
): string {
  return getReportsSectionMeta(quality).label;
}

export function hasDisplayableDeterministicReportData(
  context: ReportIntelligenceContext,
): boolean {
  return Boolean(
    context.overview?.hasSufficientData ||
      RENDERABLE_REPORT_SECTION_KEYS.some((key) => {
        const quality = context.quality?.[key];
        return Boolean(
          quality &&
            quality.source !== 'unavailable' &&
            quality.completeness !== 'unavailable',
        );
      }),
  );
}

export function formatReportMonth(monthKey: string): string {
  const normalized = /^\d{4}-\d{2}$/.test(monthKey) ? `${monthKey}-01` : monthKey;
  return format(parseDateOnlyAsLocal(normalized), 'MMM/yy', { locale: ptBR });
}

function formatDisplayCurrency(value: number): string {
  return formatCurrency(value).replace(/\u00A0/g, ' ');
}

export function hasPositiveValues<T extends object>(
  collection: T[],
  keys: Array<keyof T>,
): boolean {
  return collection.some((item) =>
    keys.some((key) => {
      const value = Number((item as Record<string, unknown>)[String(key)] ?? 0);
      return Number.isFinite(value) && value > 0;
    }),
  );
}
