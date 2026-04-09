import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { generateInvestmentReport, type ReportPeriod } from '@/utils/investmentReports';
import { exportReportToPDF } from '@/utils/pdfExport';
import { formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Investment, InvestmentTransaction } from '@/types/database.types';

interface InvestmentReportDialogProps {
  investments: Investment[];
  transactions: InvestmentTransaction[];
  onPrefetchTransactions?: () => void;
}

export function InvestmentReportDialog({
  investments,
  transactions,
  onPrefetchTransactions,
}: InvestmentReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const { toast } = useToast();

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        onPrefetchTransactions?.();
      }
    },
    [onPrefetchTransactions]
  );

  const report = useMemo(
    () => generateInvestmentReport(investments, transactions, period, year, month),
    [investments, transactions, period, year, month]
  );

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportReportToPDF(report);
      toast({
        title: 'PDF exportado com sucesso!',
        description: 'O relatório foi baixado para o seu computador.',
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro ao exportar PDF',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-border/70 bg-background/80 text-foreground shadow-sm transition-colors hover:bg-muted/80"
        >
          <FileText className="mr-2 h-4 w-4" />
          Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <div className="border-b border-border/60 bg-gradient-to-br from-background via-background to-muted/20 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
              Relatório de Investimentos
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-relaxed text-foreground/72">
              Visualize um resumo completo dos seus investimentos e da performance do período.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto px-6 py-5">
          <div className="rounded-[1.2rem] border border-border/60 bg-surface-elevated/75 p-3 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <Select
                value={period}
                onValueChange={(value) => setPeriod(value as ReportPeriod)}
              >
                <SelectTrigger className="h-10 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>

              <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-10 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {period === 'monthly' && (
                <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="h-10 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-muted/20 via-background to-muted/30 p-5 text-center shadow-sm">
              <h3 className="text-xl font-semibold tracking-tight">{report.period.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.period.start.toLocaleDateString()} - {report.period.end.toLocaleDateString()}
              </p>
            </div>

            <section className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Resumo
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Total Investido',
                    value: formatCurrency(report.summary.totalInvested),
                    tone: 'default',
                  },
                  {
                    label: 'Valor Atual',
                    value: formatCurrency(report.summary.currentValue),
                    tone: 'default',
                  },
                  {
                    label: 'Retorno Total',
                    value: formatCurrency(report.summary.totalReturn),
                    tone: report.summary.totalReturn >= 0 ? 'positive' : 'negative',
                  },
                  {
                    label: 'Rentabilidade',
                    value: `${report.summary.returnPercentage >= 0 ? '+' : ''}${report.summary.returnPercentage.toFixed(2)}%`,
                    tone: report.summary.returnPercentage >= 0 ? 'positive' : 'negative',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm"
                  >
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p
                      className={cn(
                        'mt-2 text-lg font-semibold tracking-tight',
                        item.tone === 'positive' && 'text-emerald-500',
                        item.tone === 'negative' && 'text-rose-500'
                      )}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="bg-border/60" />

            <section className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Performance
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-emerald-500/10 p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs font-medium text-emerald-500">Melhor</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.performance.bestPerformer?.name || '-'}
                  </p>
                  <p className="text-xs text-emerald-500">
                    +{report.performance.bestPerformer?.return.toFixed(2) || 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-rose-500/10 p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                    <p className="text-xs font-medium text-rose-500">Pior</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.performance.worstPerformer?.name || '-'}
                  </p>
                  <p className="text-xs text-rose-500">
                    {report.performance.worstPerformer?.return.toFixed(2) || 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-sky-500/10 p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-sky-500" />
                    <p className="text-xs font-medium text-sky-500">Média</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Retorno Médio</p>
                  <p className="text-xs text-sky-500">{report.performance.avgReturn.toFixed(2)}%</p>
                </div>
              </div>
            </section>

            <Separator className="bg-border/60" />

            <section className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Dividendos
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Total Recebido</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-500">
                    {formatCurrency(report.dividends.totalReceived)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Pagamentos</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {report.dividends.count}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Yield on Cost</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {report.dividends.yieldOnCost.toFixed(2)}%
                  </p>
                </div>
              </div>
            </section>

            <Separator className="bg-border/60" />

            <section className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Transações no Período
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-center shadow-sm">
                  <p className="text-xs text-muted-foreground">Compras</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-500">
                    {report.transactions.buys.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-center shadow-sm">
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-500">
                    {report.transactions.sells.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-center shadow-sm">
                  <p className="text-xs text-muted-foreground">Dividendos</p>
                  <p className="mt-2 text-2xl font-semibold text-sky-500">
                    {report.transactions.dividends.length}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button onClick={handleExportPDF} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
