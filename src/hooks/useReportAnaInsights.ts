import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ReportAnaSection, ReportSectionQuality } from '@/utils/reports/intelligence-contract';

interface UseReportAnaInsightsParams {
  startDate: string;
  endDate: string;
  periodLabel: string;
  contextFingerprint?: string;
  enabled?: boolean;
}

interface ReportAnaInsightsResponse {
  ana: ReportAnaSection | null;
  quality: ReportSectionQuality;
}

export function useReportAnaInsights({
  startDate,
  endDate,
  periodLabel,
  contextFingerprint = 'no-context',
  enabled = true,
}: UseReportAnaInsightsParams) {
  return useQuery({
    queryKey: ['ana-report-insights', startDate, endDate, periodLabel, contextFingerprint],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ana-report-insights', {
        body: {
          startDate,
          endDate,
          periodLabel,
        },
      });

      if (error) {
        throw error;
      }

      return data as ReportAnaInsightsResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
}
