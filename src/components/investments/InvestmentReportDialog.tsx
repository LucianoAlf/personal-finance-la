// SPRINT 5: Dialog para Gerar Relatórios de Investimentos
import { useState, useMemo } from 'react';
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
import { FileText, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { useInvestmentTransactions } from '@/hooks/useInvestmentTransactions';
import { generateInvestmentReport, type ReportPeriod } from '@/utils/investmentReports';
import { exportReportToPDF } from '@/utils/pdfExport';
import { formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function InvestmentReportDialog() {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const { investments } = useInvestments();
  const { transactions } = useInvestmentTransactions();
  const { toast } = useToast();

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
        description: 'O relatório foi baixado para seu computador.',
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de Investimentos</DialogTitle>
          <DialogDescription>
            Visualize um resumo completo dos seus investimentos e performance
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as ReportPeriod)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
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
              <SelectTrigger className="w-[140px]">
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

        {/* Report Content */}
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <h3 className="text-xl font-bold text-gray-900">{report.period.label}</h3>
            <p className="text-sm text-muted-foreground">
              {report.period.start.toLocaleDateString()} -{' '}
              {report.period.end.toLocaleDateString()}
            </p>
          </div>

          {/* Summary */}
          <div>
            <h4 className="font-semibold mb-3">Resumo</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Investido</p>
                <p className="text-lg font-bold">{formatCurrency(report.summary.totalInvested)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Valor Atual</p>
                <p className="text-lg font-bold">{formatCurrency(report.summary.currentValue)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Retorno Total</p>
                <p
                  className={cn(
                    'text-lg font-bold',
                    report.summary.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(report.summary.totalReturn)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Rentabilidade</p>
                <p
                  className={cn(
                    'text-lg font-bold',
                    report.summary.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {report.summary.returnPercentage >= 0 ? '+' : ''}
                  {report.summary.returnPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance */}
          <div>
            <h4 className="font-semibold mb-3">Performance</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-green-900">Melhor</p>
                </div>
                <p className="text-sm font-semibold">
                  {report.performance.bestPerformer?.name || '-'}
                </p>
                <p className="text-xs text-green-600">
                  +{report.performance.bestPerformer?.return.toFixed(2) || 0}%
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-red-900">Pior</p>
                </div>
                <p className="text-sm font-semibold">
                  {report.performance.worstPerformer?.name || '-'}
                </p>
                <p className="text-xs text-red-600">
                  {report.performance.worstPerformer?.return.toFixed(2) || 0}%
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-900">Média</p>
                </div>
                <p className="text-sm font-semibold">Retorno Médio</p>
                <p className="text-xs text-blue-600">
                  {report.performance.avgReturn.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dividends */}
          <div>
            <h4 className="font-semibold mb-3">Dividendos</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(report.dividends.totalReceived)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Pagamentos</p>
                <p className="text-lg font-bold">{report.dividends.count}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Yield on Cost</p>
                <p className="text-lg font-bold">{report.dividends.yieldOnCost.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transactions */}
          <div>
            <h4 className="font-semibold mb-3">Transações no Período</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Compras</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.transactions.buys.length}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Vendas</p>
                <p className="text-2xl font-bold text-red-600">
                  {report.transactions.sells.length}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Dividendos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {report.transactions.dividends.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
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
