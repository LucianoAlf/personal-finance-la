import type {
  ReportDataSectionKey,
  ReportIntelligenceContext,
  ReportSectionQuality,
} from '../../../src/utils/reports/intelligence-contract.ts';

export type ReportSummaryMode = 'daily' | 'weekly' | 'monthly' | 'overdue';

export interface RenderReportSummaryMessageParams {
  mode: ReportSummaryMode;
  context: ReportIntelligenceContext;
  userName: string;
  periodLabel: string;
}

export interface OverdueBillAlertItem {
  description: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface RenderOverdueBillAlertMessageParams {
  context: ReportIntelligenceContext;
  userName: string;
  periodLabel: string;
  bills: OverdueBillAlertItem[];
}

const SUMMARY_TITLES: Record<ReportSummaryMode, string> = {
  daily: 'Resumo diário',
  weekly: 'Resumo semanal',
  monthly: 'Resumo mensal',
  overdue: 'Resumo de obrigações',
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function renderReportSummaryMessage({
  mode,
  context,
  userName,
  periodLabel,
}: RenderReportSummaryMessageParams): string {
  const deterministicFacts = buildDeterministicFacts(context);
  const secondaryInterpretation = buildSecondaryInterpretation(context, deterministicFacts);

  const lines = [
    `*${SUMMARY_TITLES[mode]}*`,
    '',
    `Olá ${sanitizeMessageText(userName)}!`,
    `Período: ${sanitizeMessageText(periodLabel)}`,
    '',
    'Resumo determinístico',
    ...(
      deterministicFacts.length > 0
        ? deterministicFacts.map((line) => `- ${line}`)
        : ['- Dados insuficientes para consolidar fatos confiáveis neste período.']
    ),
  ];

  if (secondaryInterpretation) {
    lines.push(
      '',
      secondaryInterpretation.title,
      ...secondaryInterpretation.lines.map((line) => `- ${line}`),
    );
  }

  return lines.join('\n');
}

export function renderOverdueBillAlertMessage({
  context,
  userName,
  periodLabel,
  bills,
}: RenderOverdueBillAlertMessageParams): string {
  const orderedBills = [...bills].sort(compareOverdueBills);
  const totalAmount = orderedBills.reduce((sum, bill) => sum + bill.amount, 0);
  const summary = renderReportSummaryMessage({
    mode: 'overdue',
    context,
    userName,
    periodLabel,
  });

  const lines = [
    summary,
    '',
    'Contas vencidas',
    ...orderedBills.map(
      (bill) =>
        `- ${sanitizeMessageText(bill.description)}: ${formatDisplayCurrency(
          bill.amount,
        )} | vencida em ${formatDate(
          bill.dueDate,
          'dd/MM',
        )} | atraso de ${bill.daysOverdue} dia(s)`,
    ),
    `- Total em atraso: ${formatDisplayCurrency(totalAmount)}`,
    '- Regularize as contas vencidas para reduzir juros e pressão no caixa.',
  ];

  return lines.join('\n');
}

export function hasDeterministicReportFacts(context: ReportIntelligenceContext): boolean {
  return buildDeterministicFacts(context).length > 0;
}

export function buildDeterministicFacts(context: ReportIntelligenceContext): string[] {
  const facts: string[] = [];

  if (
    isSectionAvailable(context, 'overview') &&
    context.overview.financialScore !== null
  ) {
    facts.push(
      addQualitySuffix(`Score financeiro: ${context.overview.financialScore}`, context.quality.overview),
    );
  }

  if (
    isSectionAvailable(context, 'cashflow') &&
    context.overview.savingsRate !== null
  ) {
    facts.push(
      addQualitySuffix(
        `Taxa de economia: ${formatPercentage(context.overview.savingsRate)}`,
        context.quality.cashflow,
      ),
    );
  }

  if (
    isSectionAvailable(context, 'balanceSheet') &&
    context.overview.netWorth !== null
  ) {
    facts.push(
      addQualitySuffix(
        `Patrimônio líquido: ${formatDisplayCurrency(context.overview.netWorth)}`,
        context.quality.balanceSheet,
      ),
    );
  }

  if (isSectionAvailable(context, 'cashflow') && context.cashflow) {
    facts.push(
      addQualitySuffix(
        `Fluxo do período: receitas ${formatDisplayCurrency(
          context.cashflow.incomeTotal,
        )}, despesas ${formatDisplayCurrency(
          context.cashflow.expenseTotal,
        )}, saldo ${formatDisplayCurrency(context.cashflow.netTotal)}`,
        context.quality.cashflow,
      ),
    );
  }

  if (isSectionAvailable(context, 'obligations') && context.obligations) {
    facts.push(
      addQualitySuffix(
        `Obrigações de curto prazo: ${context.obligations.openBillsCount} conta(s) em aberto, ${context.obligations.overdueBillsCount} vencida(s), ${formatDisplayCurrency(context.obligations.pendingBillsAmount)} pendente(s)`,
        context.quality.obligations,
      ),
    );
  }

  if (isSectionAvailable(context, 'goals') && context.goals) {
    facts.push(
      addQualitySuffix(
        `Metas: ${context.goals.active} ativa(s), ${context.goals.completed} concluída(s), ${context.goals.atRisk} em risco`,
        context.quality.goals,
      ),
    );
  }

  if (isSectionAvailable(context, 'investments') && context.investments) {
    facts.push(
      addQualitySuffix(
        `Investimentos: carteira em ${formatDisplayCurrency(context.investments.portfolioValue)} com retorno total de ${formatDisplayCurrency(context.investments.totalReturn)}`,
        context.quality.investments,
      ),
    );
  }

  return facts.map(sanitizeMessageText);
}

function buildSecondaryInterpretation(
  context: ReportIntelligenceContext,
  deterministicFacts: string[],
): { title: string; lines: string[] } | null {
  const anaLines = buildAnaLines(context);
  if (anaLines.length > 0) {
    return {
      title: 'Leitura da Ana Clara',
      lines: anaLines,
    };
  }

  const fallbackLines = buildFallbackInterpretationLines(context, deterministicFacts);
  if (fallbackLines.length === 0) {
    return null;
  }

  return {
    title: 'Leitura complementar',
    lines: fallbackLines,
  };
}

function buildAnaLines(context: ReportIntelligenceContext): string[] {
  if (
    !context.ana ||
    !context.quality.ana ||
    context.quality.ana.source === 'unavailable' ||
    context.quality.ana.completeness === 'unavailable'
  ) {
    return [];
  }

  const lines: string[] = [];

  if (context.ana.summary?.trim()) {
    lines.push(sanitizeMessageText(context.ana.summary));
  }

  context.ana.insights
    .filter(Boolean)
    .slice(0, 2)
    .forEach((insight) => lines.push(sanitizeMessageText(insight)));

  context.ana.recommendations
    .filter(Boolean)
    .slice(0, 1)
    .forEach((recommendation) =>
      lines.push(sanitizeMessageText(`Recomendação: ${recommendation}`)),
    );

  return lines;
}

function buildFallbackInterpretationLines(
  context: ReportIntelligenceContext,
  deterministicFacts: string[],
): string[] {
  if (deterministicFacts.length === 0) {
    return [];
  }

  const lines = [
    'A leitura abaixo resume apenas os fatos consolidados para o período, sem inferências fora do contexto disponível.',
  ];

  if (context.cashflow && context.overview.savingsRate !== null) {
    lines.push(
      context.cashflow.netTotal >= 0
        ? `O período fechou com geração líquida positiva e taxa de economia de ${formatPercentage(context.overview.savingsRate)}.`
        : `O período fechou com saldo negativo e taxa de economia de ${formatPercentage(context.overview.savingsRate)}.`,
    );
  }

  if (context.balanceSheet && context.overview.netWorth !== null) {
    lines.push(
      `O patrimônio líquido consolidado ao fim do período ficou em ${formatDisplayCurrency(context.overview.netWorth)}.`,
    );
  } else {
    lines.push(`Os principais fatos consolidados foram: ${deterministicFacts.slice(0, 2).join('; ')}.`);
  }

  return lines.map(sanitizeMessageText);
}

function isSectionAvailable(
  context: ReportIntelligenceContext,
  key: ReportDataSectionKey,
): boolean {
  const quality = context.quality[key];
  return Boolean(
    quality &&
      quality.source !== 'unavailable' &&
      quality.completeness !== 'unavailable',
  );
}

function addQualitySuffix(value: string, quality: ReportSectionQuality): string {
  return quality.completeness === 'partial' ? `${value} (parcial)` : value;
}

function sanitizeMessageText(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDisplayCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(value)
    .replace(/\u00A0/g, ' ');
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | Date, pattern = 'dd/MM/yyyy'): string {
  const date = parseDateOnly(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  if (pattern === 'dd/MM') {
    return `${day}/${month}`;
  }

  return `${day}/${month}/${year}`;
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (DATE_ONLY_REGEX.test(value)) {
    return new Date(`${value}T12:00:00`);
  }

  return new Date(value);
}

function compareOverdueBills(left: OverdueBillAlertItem, right: OverdueBillAlertItem): number {
  if (right.daysOverdue !== left.daysOverdue) {
    return right.daysOverdue - left.daysOverdue;
  }

  const dueDateComparison = left.dueDate.localeCompare(right.dueDate);
  if (dueDateComparison !== 0) {
    return dueDateComparison;
  }

  const descriptionComparison = sanitizeMessageText(left.description).localeCompare(
    sanitizeMessageText(right.description),
    'pt-BR',
  );
  if (descriptionComparison !== 0) {
    return descriptionComparison;
  }

  return left.amount - right.amount;
}
