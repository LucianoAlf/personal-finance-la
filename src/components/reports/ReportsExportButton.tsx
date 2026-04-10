import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { exportReportsToPDF } from '@/utils/reports/pdfExport';
import { hasDisplayableDeterministicReportData } from '@/utils/reports/view-model';

interface ReportsExportButtonProps {
  context: ReportIntelligenceContext | null;
  period: {
    label: string;
    startDate: string;
    endDate: string;
  };
  disabled?: boolean;
}

export function ReportsExportButton({
  context,
  period,
  disabled = false,
}: ReportsExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const canExport =
    Boolean(context) &&
    Boolean(context && hasDisplayableDeterministicReportData(context)) &&
    !disabled;

  const handleExport = async () => {
    if (!context || !hasDisplayableDeterministicReportData(context)) {
      return;
    }

    try {
      setIsExporting(true);
      await exportReportsToPDF(context, {
        periodLabel: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
      });

      toast.success('PDF exportado com sucesso.', {
        description: `Relatório de ${period.label.toLowerCase()} pronto para download.`,
      });
    } catch (error) {
      console.error('Erro ao exportar relatório em PDF:', error);
      toast.error('Erro ao exportar PDF', {
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível gerar o relatório deste período.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay"
      disabled={!canExport || isExporting}
      onClick={() => {
        void handleExport();
      }}
    >
      {isExporting ? (
        <Loader2 size={16} className="mr-1 animate-spin" />
      ) : (
        <Download size={16} className="mr-1" />
      )}
      Exportar PDF
    </Button>
  );
}
