import { TrendingUp, TrendingDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { useTopSpending } from '@/hooks/useTopSpending';
import { Skeleton } from '@/components/ui/skeleton';

export function TopCategoriesCard() {
  const { topCategories, totalSpent, loading } = useTopSpending();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (topCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum gasto registrado neste período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Top 5 Categorias</span>
          <span className="text-sm font-normal text-gray-500">
            Total: {formatCurrency(totalSpent)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topCategories.map((category, index) => {
          const IconComponent = (LucideIcons as any)[category.categoryIcon] || LucideIcons.Tag;
          const isPositiveChange = category.changeFromLastMonth >= 0;

          return (
            <div
              key={category.categoryId}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Ranking */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                {index + 1}
              </div>

              {/* Ícone da Categoria */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
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
                  <span className="font-medium text-gray-900 truncate">
                    {category.categoryName}
                  </span>
                  <span className="font-semibold text-gray-900 ml-2">
                    {formatCurrency(category.totalAmount)}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${category.percentageOfTotal}%`,
                      backgroundColor: category.categoryColor,
                    }}
                  />
                </div>

                {/* Estatísticas */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {category.transactionCount} {category.transactionCount === 1 ? 'transação' : 'transações'} • {category.percentageOfTotal.toFixed(1)}% do total
                  </span>
                  
                  {/* Variação (placeholder por enquanto) */}
                  {category.changeFromLastMonth !== 0 && (
                    <span className={`flex items-center gap-1 ${isPositiveChange ? 'text-red-600' : 'text-green-600'}`}>
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
