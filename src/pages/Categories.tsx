import { useState } from 'react';
import { Plus, FolderTree, BarChart3 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryStats } from '@/hooks/useCategoryStats';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { CreateCategoryDialog } from '@/components/categories/CreateCategoryDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function Categories() {
  const { categories, loading: loadingCategories } = useCategories();
  const { stats, loading: loadingStats } = useCategoryStats();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const defaultCategories = categories.filter(cat => cat.is_default);
  const userCategories = categories.filter(cat => !cat.is_default);

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

      {/* Categorias Padrão */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Categorias Padrão
          <span className="text-sm font-normal text-gray-500">
            ({defaultCategories.length})
          </span>
        </h2>
        <div className="space-y-3">
          {defaultCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              stats={getCategoryStats(category.id)}
              isDefault={true}
            />
          ))}
        </div>
      </div>

      {/* Minhas Categorias */}
      {userCategories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-purple-600" />
            Minhas Categorias
            <span className="text-sm font-normal text-gray-500">
              ({userCategories.length})
            </span>
          </h2>
          <div className="space-y-3">
            {userCategories.map(category => (
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

      {/* Empty State */}
      {userCategories.length === 0 && (
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FolderTree className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma categoria personalizada
          </h3>
          <p className="text-gray-600 mb-4">
            Crie suas próprias categorias para organizar melhor suas transações
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Categoria
          </Button>
        </div>
      )}

      {/* Dialog Criar Categoria */}
      <CreateCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      </div>
    </>
  );
}
