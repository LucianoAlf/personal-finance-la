import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getReportsSectionMeta } from '@/utils/reports/view-model';

interface ReportsSpendingSectionProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

const COLORS = ['#2563eb', '#7c3aed', '#0f766e', '#ea580c', '#db2777', '#64748b'];

export function ReportsSpendingSection({
  context,
  loading = false,
}: ReportsSpendingSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  const section = context.spending;
  const meta = getReportsSectionMeta(context.quality.spending);

  if (!section || section.categoryBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading title="Composição das despesas" metaLabel={meta.label} />
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhuma despesa categorizada foi encontrada para este período.
        </CardContent>
      </Card>
    );
  }

  const chartData = section.topCategories.map((category, index) => ({
    name: category.categoryName,
    value: category.amount,
    fill: COLORS[index % COLORS.length],
    share: category.share,
  }));

  return (
    <Card>
      <CardHeader>
        <SectionHeading title="Composição das despesas" metaLabel={meta.label} partial={meta.isPartial} />
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {meta.isPartial && (
          <Alert>
            <AlertTitle>Visualização parcial</AlertTitle>
            <AlertDescription>{meta.description}</AlertDescription>
          </Alert>
        )}

        {section.uncategorizedShare > 0 && (
          <Alert>
            <AlertTitle>Parte do gasto ainda está sem categoria</AlertTitle>
            <AlertDescription>
              {formatPercentage(section.uncategorizedShare)} das despesas seguem sem classificação.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="h-72">
            {meta.isAvailable ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Gráfico indisponível para este período.
              </div>
            )}
          </div>

          <div className="space-y-3">
            {section.topCategories.map((category, index) => (
              <div
                key={`${category.categoryId ?? 'sem-categoria'}-${category.categoryName}`}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <p className="font-medium text-gray-900">{category.categoryName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.transactionCount} lançamentos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(category.amount)}</p>
                    <p className="text-sm text-muted-foreground">{formatPercentage(category.share)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({
  title,
  metaLabel,
  partial = false,
}: {
  title: string;
  metaLabel: string;
  partial?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <CardTitle className="text-xl">{title}</CardTitle>
      <span
        className={cn(
          'inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium',
          partial
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        )}
      >
        {metaLabel}
      </span>
    </div>
  );
}
