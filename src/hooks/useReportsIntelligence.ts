import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';

import { supabase } from '@/lib/supabase';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';

export type ReportsPeriodPreset =
  | 'last_30_days'
  | 'last_90_days'
  | 'year_to_date'
  | 'last_12_months';

export interface ReportsPeriod {
  preset: ReportsPeriodPreset;
  label: string;
  startDate: string;
  endDate: string;
}

export const REPORTS_PERIOD_PRESET_LABELS: Record<ReportsPeriodPreset, string> = {
  last_30_days: '30 dias',
  last_90_days: '90 dias',
  year_to_date: 'Ano atual',
  last_12_months: '12 meses',
};

export const REPORTS_PERIOD_PRESETS: ReportsPeriodPreset[] = [
  'last_30_days',
  'last_90_days',
  'year_to_date',
  'last_12_months',
];

export function buildReportsPeriod(
  preset: ReportsPeriodPreset,
  referenceDate: Date = new Date(),
): ReportsPeriod {
  const endDate = toDateOnly(referenceDate);

  switch (preset) {
    case 'last_30_days':
      return {
        preset,
        label: 'Últimos 30 dias',
        startDate: toDateOnly(subDays(referenceDate, 29)),
        endDate,
      };
    case 'last_90_days':
      return {
        preset,
        label: 'Últimos 90 dias',
        startDate: toDateOnly(subDays(referenceDate, 89)),
        endDate,
      };
    case 'year_to_date':
      return {
        preset,
        label: 'Ano atual até hoje',
        startDate: toDateOnly(startOfYear(referenceDate)),
        endDate,
      };
    case 'last_12_months':
    default:
      return {
        preset: 'last_12_months',
        label: 'Últimos 12 meses',
        startDate: toDateOnly(startOfMonth(subMonths(referenceDate, 11))),
        endDate,
      };
  }
}

export function getDefaultReportsPeriod(): ReportsPeriod {
  return buildReportsPeriod('last_12_months');
}

export function useReportsIntelligence(period: Pick<ReportsPeriod, 'startDate' | 'endDate'>) {
  return useQuery({
    queryKey: ['report-intelligence', period.startDate, period.endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('report-intelligence', {
        body: {
          startDate: period.startDate,
          endDate: period.endDate,
        },
      });

      if (error) {
        throw error;
      }

      return data as ReportIntelligenceContext;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
