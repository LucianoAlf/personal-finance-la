import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import {
  getReportQualityLabel,
  type ReportAnaSection,
  type ReportIntelligenceContext,
  type ReportSectionQuality,
} from '@/utils/reports/intelligence-contract';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface ReportsPdfSection {
  title: string;
  description?: string;
  rows: Array<[string, string]>;
}

export interface ExportReportsToPdfOptions {
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  generatedAt?: Date;
  filename?: string;
}

export function buildReportsPdfSections(
  context: ReportIntelligenceContext,
): ReportsPdfSection[] {
  const sections: ReportsPdfSection[] = [];
  const overviewAvailable = hasAvailableSection(context.quality?.overview);
  const cashflowAvailable = hasAvailableSection(context.quality?.cashflow);
  const spendingAvailable = hasAvailableSection(context.quality?.spending);
  const balanceSheetAvailable = hasAvailableSection(context.quality?.balanceSheet);
  const obligationsAvailable = hasAvailableSection(context.quality?.obligations);
  const goalsAvailable = hasAvailableSection(context.quality?.goals);
  const investmentsAvailable = hasAvailableSection(context.quality?.investments);

  appendSection(sections, {
    title: 'Resumo Executivo',
    description: buildDeterministicDescription(context.quality?.overview),
    rows: overviewAvailable
      ? [
          buildOptionalRow(
            'Score Financeiro',
            context.overview?.financialScore,
            (value) => String(value),
          ),
          buildOptionalRow(
            'Taxa de Economia',
            context.overview?.savingsRate,
            formatPercentage,
          ),
          buildOptionalRow(
            'Patrimônio Líquido',
            context.overview?.netWorth,
            formatCurrency,
          ),
          buildOptionalRow(
            'Metas Alcançadas',
            goalsAvailable && context.overview
              ? `${context.overview.goalsReached} de ${context.overview.activeGoals}`
              : null,
          ),
        ]
      : [],
  });

  appendSection(sections, {
    title: 'Fluxo de Caixa',
    description: buildDeterministicDescription(context.quality?.cashflow),
    rows: cashflowAvailable && context.cashflow
      ? [
          ['Receitas', formatCurrency(context.cashflow.incomeTotal)],
          ['Despesas', formatCurrency(context.cashflow.expenseTotal)],
          ['Resultado Líquido', formatCurrency(context.cashflow.netTotal)],
          buildOptionalRow(
            'Taxa média de economia',
            context.cashflow.averageMonthlySavingsRate,
            formatPercentage,
          ),
          ['Tendência', translateTrendLabel(context.cashflow.trend)],
        ]
      : [],
  });

  appendSection(sections, {
    title: 'Composição de Gastos',
    description: buildDeterministicDescription(context.quality?.spending),
    rows: spendingAvailable && context.spending
      ? [
          ...context.spending.topCategories.slice(0, 3).map((category, index) => [
            `Top ${index + 1}: ${category.categoryName}`,
            `${formatCurrency(category.amount)} (${formatPercentage(category.share)})`,
          ] as [string, string]),
          buildOptionalRow(
            'Participação sem categoria',
            context.spending.uncategorizedShare,
            formatPercentage,
          ),
        ]
      : [],
  });

  appendSection(sections, {
    title: 'Patrimônio e Balanço',
    description: buildDeterministicDescription(context.quality?.balanceSheet),
    rows: balanceSheetAvailable && context.balanceSheet
      ? [
          ['Ativos', formatCurrency(context.balanceSheet.totalAssets)],
          ['Passivos', formatCurrency(context.balanceSheet.totalLiabilities)],
          ['Patrimônio Líquido', formatCurrency(context.balanceSheet.netWorth)],
        ]
      : [],
  });

  appendSection(sections, {
    title: 'Obrigações',
    description: buildDeterministicDescription(context.quality?.obligations),
    rows: obligationsAvailable && context.obligations
      ? [
          ['Contas em aberto', String(context.obligations.openBillsCount)],
          ['Contas vencidas', String(context.obligations.overdueBillsCount)],
          [
            'Valor pendente',
            formatCurrency(context.obligations.pendingBillsAmount),
          ],
          [
            'Uso do cartão',
            formatPercentage(context.obligations.creditCardUtilization),
          ],
        ]
      : [],
  });

  appendSection(sections, {
    title: 'Metas',
    description: buildDeterministicDescription(context.quality?.goals),
    rows: goalsAvailable && context.goals
      ? [
          ['Metas ativas', String(context.goals.active)],
          ['Metas concluídas', String(context.goals.completed)],
          ['Metas em risco', String(context.goals.atRisk)],
          ['Taxa de conclusão', formatPercentage(context.goals.completionRate)],
        ]
      : [],
  });

  appendSection(sections, {
    title: 'Investimentos',
    description: buildDeterministicDescription(context.quality?.investments),
    rows: investmentsAvailable && context.investments
      ? [
          ['Valor da carteira', formatCurrency(context.investments.portfolioValue)],
          ['Retorno total', formatCurrency(context.investments.totalReturn)],
          ...context.investments.planningHighlights
            .slice(0, 2)
            .map((highlight, index) => [
              `Destaque ${index + 1}`,
              highlight,
            ] as [string, string]),
        ]
      : [],
  });

  const anaRows = hasAvailableSection(context.quality?.ana)
    ? buildAnaRows(context.ana)
    : [];
  if (anaRows.length > 0) {
    sections.push({
      title: 'Leitura da Ana Clara',
      description:
        'Bloco interpretativo opcional, sempre apresentado depois dos fatos determinísticos.',
      rows: anaRows,
    });
  }

  return sections;
}

export async function exportReportsToPDF(
  context: ReportIntelligenceContext,
  options: ExportReportsToPdfOptions,
): Promise<void> {
  const sections = buildReportsPdfSections(context);
  if (sections.length === 0) {
    throw new Error('Nenhuma seção exportável foi encontrada para este relatório.');
  }

  const [{ default: JsPdf }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = options.generatedAt ?? new Date();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Relatórios Financeiros', pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(options.periodLabel, pageWidth / 2, 26, { align: 'center' });

  if (options.startDate && options.endDate) {
    doc.setFontSize(9);
    doc.text(
      `${formatDate(options.startDate)} a ${formatDate(options.endDate)}`,
      pageWidth / 2,
      32,
      { align: 'center' },
    );
  }

  doc.setFontSize(9);
  doc.text(
    `Gerado em ${formatDate(generatedAt, "dd/MM/yyyy 'às' HH:mm")}`,
    pageWidth / 2,
    38,
    { align: 'center' },
  );
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 42, pageWidth - 14, 42);

  let currentY = 50;

  for (const section of sections) {
    if (currentY > pageHeight - 56) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(section.title, 14, currentY);

    if (section.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const wrapped = doc.splitTextToSize(section.description, pageWidth - 28);
      doc.text(wrapped, 14, currentY + 6);
      currentY += 6 + wrapped.length * 4;
    } else {
      currentY += 4;
    }

    autoTable(doc, {
      startY: currentY + 2,
      head: [['Campo', 'Valor']],
      body: section.rows,
      theme: 'grid',
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 62 },
        1: { cellWidth: 'auto' },
      },
    });

    currentY = (doc.lastAutoTable?.finalY ?? currentY + 24) + 10;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    doc.text('Personal Finance LA', 14, pageHeight - 10);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: 'right',
    });
  }

  doc.save(options.filename ?? buildReportsPdfFilename(options.periodLabel));
}

function appendSection(
  sections: ReportsPdfSection[],
  section: ReportsPdfSection,
): void {
  const rows = section.rows.filter(
    (row): row is [string, string] =>
      Array.isArray(row) && row.length === 2 && row.every((value) => value !== null),
  );

  if (rows.length === 0) {
    return;
  }

  sections.push({
    ...section,
    rows,
  });
}

function buildOptionalRow<T>(
  label: string,
  value: T | null | undefined,
  formatter?: (value: T) => string,
): [string, string] | null {
  if (value === null || value === undefined) {
    return null;
  }

  return [label, formatter ? formatter(value) : String(value)];
}

function buildDeterministicDescription(
  quality: ReportSectionQuality | null | undefined,
): string | undefined {
  if (!quality || quality.source === 'unavailable') {
    return undefined;
  }

  const sourceLabel = getReportQualityLabel(quality.source);
  if (quality.completeness === 'partial') {
    return `Seção parcialmente consolidada com base em ${sourceLabel.toLowerCase()}.`;
  }

  return `Seção consolidada com base em ${sourceLabel.toLowerCase()}.`;
}

function hasAvailableSection(
  quality: ReportSectionQuality | null | undefined,
): boolean {
  return Boolean(
    quality &&
      quality.source !== 'unavailable' &&
      quality.completeness !== 'unavailable',
  );
}

function buildAnaRows(section: ReportAnaSection | null): Array<[string, string]> {
  if (!section) {
    return [];
  }

  const insights = section.insights ?? [];
  const risks = section.risks ?? [];
  const recommendations = section.recommendations ?? [];
  const nextBestActions = section.nextBestActions ?? [];

  return [
    buildOptionalRow('Resumo', section.summary),
    ...insights.slice(0, 2).map((item, index) => [
      `Insight ${index + 1}`,
      item,
    ] as [string, string]),
    ...risks.slice(0, 2).map((item, index) => [
      `Risco ${index + 1}`,
      item,
    ] as [string, string]),
    ...recommendations.slice(0, 2).map((item, index) => [
      `Recomendação ${index + 1}`,
      item,
    ] as [string, string]),
    ...nextBestActions.slice(0, 2).map((item, index) => [
      `Próxima ação ${index + 1}`,
      item,
    ] as [string, string]),
  ].filter((row): row is [string, string] => row !== null);
}

function translateTrendLabel(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'Alta';
    case 'down':
      return 'Queda';
    case 'stable':
    default:
      return 'Estável';
  }
}

function buildReportsPdfFilename(periodLabel: string): string {
  const slug = periodLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `relatorios-${slug || 'periodo'}.pdf`;
}
