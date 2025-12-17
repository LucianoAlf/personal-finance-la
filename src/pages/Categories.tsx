import { useState } from 'react';
import { Plus, FolderTree, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryStats } from '@/hooks/useCategoryStats';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { CreateCategoryDialog } from '@/components/categories/CreateCategoryDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function Categories() {
  const { categories, loading: loadingCategories } = useCategories();
  const { stats, loading: loadingStats } = useCategoryStats();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Separar categorias por tipo
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  // Separar padrão vs personalizadas dentro de cada tipo
  const defaultExpenseCategories = expenseCategories.filter(cat => cat.is_default);
  const userExpenseCategories = expenseCategories.filter(cat => !cat.is_default);
  const defaultIncomeCategories = incomeCategories.filter(cat => cat.is_default);
  const userIncomeCategories = incomeCategories.filter(cat => !cat.is_default);

  const getCategoryStats = (categoryId: string) => {
    return stats.find(s => s.categoryId === categoryId) || {
      transactionCount: 0,
      totalAmount: 0,
    };
  };

  if (loadingCategories || loadingStats) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Gerenciar Categorias"
        subtitle="Organize suas transações com categorias personalizadas"
        icon={<FolderTree size={24} />}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus size={20} />
            Nova Categoria
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* Tabs para separar Despesas e Receitas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span>Despesas</span>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {expenseCategories.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Receitas</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {incomeCategories.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Tab de Despesas */}
        <TabsContent value="expense" className="space-y-6">
          {/* Categorias Padrão de Despesa */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              Categorias Padrão
              <span className="text-sm font-normal text-gray-500">
                ({defaultExpenseCategories.length})
              </span>
            </h2>
            <div className="space-y-3">
              {defaultExpenseCategories.map(category => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  stats={getCategoryStats(category.id)}
                  isDefault={true}
                />
              ))}
            </div>
          </div>

          {/* Minhas Categorias de Despesa */}
          {userExpenseCategories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-red-500" />
                Minhas Categorias
                <span className="text-sm font-normal text-gray-500">
                  ({userExpenseCategories.length})
                </span>
              </h2>
              <div className="space-y-3">
                {userExpenseCategories.map(category => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    stats={getCategoryStats(category.id)}
                    isDefault={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State para categorias personalizadas de despesa */}
          {userExpenseCategories.length === 0 && (
            <div className="bg-red-50 rounded-lg border-2 border-dashed border-red-200 p-8 text-center">
              <FolderTree className="h-12 w-12 mx-auto mb-3 text-red-300" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Nenhuma categoria personalizada de despesa
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Crie categorias personalizadas para organizar melhor seus gastos
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar Categoria
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab de Receitas */}
        <TabsContent value="income" className="space-y-6">
          {/* Categorias Padrão de Receita */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Categorias Padrão
              <span className="text-sm font-normal text-gray-500">
                ({defaultIncomeCategories.length})
              </span>
            </h2>
            <div className="space-y-3">
              {defaultIncomeCategories.map(category => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  stats={getCategoryStats(category.id)}
                  isDefault={true}
                />
              ))}
            </div>
          </div>

          {/* Minhas Categorias de Receita */}
          {userIncomeCategories.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-green-500" />
                Minhas Categorias
                <span className="text-sm font-normal text-gray-500">
                  ({userIncomeCategories.length})
                </span>
              </h2>
              <div className="space-y-3">
                {userIncomeCategories.map(category => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    stats={getCategoryStats(category.id)}
                    isDefault={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State para categorias personalizadas de receita */}
          {userIncomeCategories.length === 0 && (
            <div className="bg-green-50 rounded-lg border-2 border-dashed border-green-200 p-8 text-center">
              <FolderTree className="h-12 w-12 mx-auto mb-3 text-green-300" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Nenhuma categoria personalizada de receita
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Crie categorias personalizadas para organizar melhor suas receitas
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar Categoria
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Criar Categoria */}
      <CreateCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      </div>
    </>
  );
}
