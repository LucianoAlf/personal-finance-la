// SPRINT 5.1: Exportação de Relatórios para PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './formatters';
import type { InvestmentReport } from './investmentReports';

// Extend jsPDF com autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

/**
 * Exporta relatório de investimentos para PDF
 */
export function exportReportToPDF(report: InvestmentReport): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // ==================== HEADER ====================
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Investimentos', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(report.period.label, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `${report.period.start.toLocaleDateString('pt-BR')} - ${report.period.end.toLocaleDateString('pt-BR')}`,
    pageWidth / 2,
    34,
    { align: 'center' }
  );

  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 39, {
    align: 'center',
  });

  // Linha separadora
  doc.setDrawColor(200);
  doc.line(14, 42, pageWidth - 14, 42);

  let currentY = 48;

  // ==================== RESUMO ====================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Resumo Financeiro', 14, currentY);

  const summaryData = [
    ['Total Investido', formatCurrency(report.summary.totalInvested)],
    ['Valor Atual', formatCurrency(report.summary.currentValue)],
    [
      'Retorno Total',
      formatCurrency(report.summary.totalReturn),
      report.summary.totalReturn >= 0 ? '✓' : '✗',
    ],
    [
      'Rentabilidade',
      `${report.summary.returnPercentage >= 0 ? '+' : ''}${report.summary.returnPercentage.toFixed(2)}%`,
      report.summary.returnPercentage >= 0 ? '✓' : '✗',
    ],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Métrica', 'Valor', 'Status']],
    body: summaryData,
    theme: 'grid',
    headStyles: {
      fillColor: [99, 102, 241],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right', cellWidth: 80 },
      2: { halign: 'center', cellWidth: 20 },
    },
    styles: {
      fontSize: 9,
    },
  });

  currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 60;

  // ==================== ALOCAÇÃO ====================
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Alocação por Categoria', 14, currentY);

  const allocationData = Object.entries(report.allocation).map(([cat, data]) => [
    cat.charAt(0).toUpperCase() + cat.slice(1),
    formatCurrency(data.value),
    `${data.percentage.toFixed(2)}%`,
  ]);

  if (allocationData.length > 0) {
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Categoria', 'Valor', 'Percentual']],
      body: allocationData,
      theme: 'striped',
      headStyles: {
        fillColor: [139, 92, 246],
        fontSize: 10,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 40 },
      },
      styles: {
        fontSize: 9,
      },
    });

    currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 40;
  }

  // ==================== PERFORMANCE ====================
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance', 14, currentY);

  const performanceData = [
    [
      'Melhor Ativo',
      report.performance.bestPerformer?.name || '-',
      report.performance.bestPerformer
        ? `+${report.performance.bestPerformer.return.toFixed(2)}%`
        : '-',
    ],
    [
      'Pior Ativo',
      report.performance.worstPerformer?.name || '-',
      report.performance.worstPerformer
        ? `${report.performance.worstPerformer.return.toFixed(2)}%`
        : '-',
    ],
    ['Retorno Médio', '-', `${report.performance.avgReturn.toFixed(2)}%`],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Métrica', 'Ativo', 'Retorno']],
    body: performanceData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 70 },
      2: { halign: 'right', cellWidth: 50 },
    },
    styles: {
      fontSize: 9,
    },
  });

  currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 40;

  // ==================== DIVIDENDOS ====================
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Dividendos', 14, currentY);

  const dividendData = [
    ['Total Recebido', formatCurrency(report.dividends.totalReceived)],
    ['Quantidade de Pagamentos', report.dividends.count.toString()],
    ['Yield on Cost', `${report.dividends.yieldOnCost.toFixed(2)}%`],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Métrica', 'Valor']],
    body: dividendData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', cellWidth: 80 },
    },
    styles: {
      fontSize: 9,
    },
  });

  currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 40;

  // ==================== TRANSAÇÕES ====================
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transações no Período', 14, currentY);

  const transactionData = [
    ['Compras', report.transactions.buys.length.toString()],
    ['Vendas', report.transactions.sells.length.toString()],
    ['Dividendos', report.transactions.dividends.length.toString()],
  ];

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Tipo', 'Quantidade']],
    body: transactionData,
    theme: 'grid',
    headStyles: {
      fillColor: [251, 191, 36],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'center', cellWidth: 80 },
    },
    styles: {
      fontSize: 9,
    },
  });

  // ==================== FOOTER ====================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);

    // Linha no footer
    doc.setDrawColor(200);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    // Texto do footer
    doc.text(`Personal Finance LA - Relatório de Investimentos`, 14, pageHeight - 10);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: 'right',
    });
  }

  // ==================== SAVE ====================
  const fileName = `relatorio-investimentos-${report.period.label
    .replace(/\s/g, '-')
    .toLowerCase()}-${new Date().getTime()}.pdf`;

  doc.save(fileName);
}
