import { TrendingUp, TrendingDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { useTopSpending } from '@/hooks/useTopSpending';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsScope } from '@/hooks/analyticsScope';

interface TopCategoriesCardProps {
  scope?: AnalyticsScope;
}

export function TopCategoriesCard({ scope }: TopCategoriesCardProps) {
  const { topCategories, totalSpent, loading } = useTopSpending(scope);

  if (loading) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">Top 5 Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-[88px] w-full rounded-[22px]" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topCategories.length === 0) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">Top 5 Categorias</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="py-8 text-center text-muted-foreground">
            <p>Nenhum gasto registrado neste periodo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="analytics-top-categories-card"
      className="rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle className="flex items-center justify-between text-[1.65rem] font-semibold tracking-tight text-foreground">
          <span>Top 5 Categorias</span>
          <span className="rounded-full border border-border/60 bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            Total: {formatCurrency(totalSpent)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent
        data-testid="analytics-top-categories-content"
        className="space-y-4 pt-5"
      >
        {topCategories.map((category, index) => {
          const IconComponent = (LucideIcons as any)[category.categoryIcon] || LucideIcons.Tag;
          const isPositiveChange = category.changeFromLastMonth >= 0;

          return (
            <div
              key={category.categoryId}
              data-testid={`analytics-top-category-row-${category.categoryId}`}
              className="flex items-center gap-4 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:bg-surface-elevated/68"
            >
              {/* Ranking */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface text-sm font-bold text-foreground">
                {index + 1}
              </div>

              {/* Ícone da Categoria */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50"
                style={{ backgroundColor: `${category.categoryColor}20` }}
              >
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: category.categoryColor }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate font-medium text-foreground">
                    {category.categoryName}
                  </span>
                  <span className="ml-2 font-semibold text-foreground">
                    {formatCurrency(category.totalAmount)}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="mb-1 h-2 w-full rounded-full bg-surface-overlay/75">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${category.percentageOfTotal}%`,
                      backgroundColor: category.categoryColor,
                    }}
                  />
                </div>

                {/* Estatísticas */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {category.transactionCount} {category.transactionCount === 1 ? 'transacao' : 'transacoes'} • {category.percentageOfTotal.toFixed(1)}% do total
                  </span>
                  
                  {/* Variação (placeholder por enquanto) */}
                  {category.changeFromLastMonth !== 0 && (
                    <span className={`flex items-center gap-1 ${isPositiveChange ? 'text-danger' : 'text-success'}`}>
                      {isPositiveChange ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(category.changeFromLastMonth).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
