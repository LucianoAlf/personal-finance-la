import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ExportButtonProps {
  bills: PayableBill[];
  filename?: string;
}

export function ExportButton({ bills, filename = 'contas-a-pagar' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const exportToCSV = async () => {
    try {
      setLoading(true);

      // Preparar dados
      const csvData = bills.map(bill => ({
        'Descrição': bill.description,
        'Fornecedor': bill.provider_name || '-',
        'Valor': bill.amount.toFixed(2),
        'Vencimento': format(new Date(bill.due_date), 'dd/MM/yyyy'),
        'Status': getStatusLabel(bill.status),
        'Tipo': getBillTypeLabel(bill.bill_type),
        'Prioridade': getPriorityLabel(bill.priority),
        'Pago em': bill.paid_at ? format(new Date(bill.paid_at), 'dd/MM/yyyy HH:mm') : '-',
        'Valor Pago': bill.paid_amount?.toFixed(2) || '-',
        'Forma Pagamento': bill.payment_method || '-',
        'Conta': bill.payment_account_id || '-',
        'Recorrente': bill.is_recurring ? 'Sim' : 'Não',
        'Parcelamento': bill.is_installment ? `${bill.installment_number}/${bill.installment_total}` : '-',
        'Observações': bill.notes || '-'
      }));

      // Converter para CSV
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(';'),
        ...csvData.map(row => 
          headers.map(header => `"${row[header as keyof typeof row]}"`).join(';')
        )
      ].join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast.success('CSV exportado com sucesso!', {
        description: `${bills.length} contas exportadas`
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setLoading(true);

      // Importação dinâmica do jsPDF
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();

      // Título
      doc.setFontSize(18);
      doc.text('Relatório de Contas a Pagar', 14, 22);

      // Data
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30);
      doc.text(`Total de contas: ${bills.length}`, 14, 36);

      // Resumo
      const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
      const paidAmount = bills
        .filter(b => b.status === 'paid')
        .reduce((sum, bill) => sum + (bill.paid_amount || bill.amount), 0);
      const overdueAmount = bills
        .filter(b => b.status === 'overdue')
        .reduce((sum, bill) => sum + bill.amount, 0);

      doc.text(`Total Geral: R$ ${totalAmount.toFixed(2)}`, 14, 42);
      doc.text(`Total Pago: R$ ${paidAmount.toFixed(2)}`, 14, 48);
      doc.text(`Total Vencido: R$ ${overdueAmount.toFixed(2)}`, 14, 54);

      // Tabela
      const tableData = bills.map(bill => [
        bill.description.slice(0, 30),
        bill.provider_name?.slice(0, 20) || '-',
        format(new Date(bill.due_date), 'dd/MM/yy'),
        `R$ ${bill.amount.toFixed(2)}`,
        getStatusLabel(bill.status),
        bill.priority === 'critical' ? '!!!' : bill.priority === 'high' ? '!!' : bill.priority === 'low' ? '-' : '!'
      ]);

      // @ts-ignore
      doc.autoTable({
        head: [['Descrição', 'Fornecedor', 'Vencimento', 'Valor', 'Status', 'Prior.']],
        body: tableData,
        startY: 62,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 62 }
      });

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Download
      doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast.success('PDF exportado com sucesso!', {
        description: `${bills.length} contas exportadas`
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF', {
        description: 'Verifique se as bibliotecas estão instaladas'
      });
    } finally {
      setLoading(false);
    }
  };

  if (bills.length === 0) {
    return (
      <Button variant="outline" disabled>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar ({bills.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helpers
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    overdue: 'Vencida',
    paid: 'Paga',
    partial: 'Parcial',
    cancelled: 'Cancelada',
    scheduled: 'Agendada'
  };
  return labels[status] || status;
}

function getBillTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    service: 'Serviço',
    telecom: 'Telecom',
    subscription: 'Assinatura',
    utilities: 'Utilidades',
    tax: 'Imposto',
    rent: 'Aluguel',
    loan: 'Empréstimo',
    insurance: 'Seguro',
    education: 'Educação',
    health: 'Saúde',
    other: 'Outro'
  };
  return labels[type] || type;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa'
  };
  return labels[priority] || priority;
}
