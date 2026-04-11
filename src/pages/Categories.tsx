import { useState } from 'react';
import { FolderTree, Layers3, Plus, TrendingDown, TrendingUp } from 'lucide-react';

import { CategoryCard } from '@/components/categories/CategoryCard';
import { CreateCategoryDialog } from '@/components/categories/CreateCategoryDialog';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryStats } from '@/hooks/useCategoryStats';
import type { CategoryType } from '@/types/categories';

const categoriesPrimaryButtonClass =
  'h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.24)] hover:bg-primary/90';

const categoriesPanelClass =
  'rounded-[28px] border border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

const emptyStateClass =
  'rounded-[24px] border border-dashed border-border/70 bg-surface/55 px-6 py-14 text-center';

export default function Categories() {
  const { categories, loading: loadingCategories } = useCategories();
  const { stats, loading: loadingStats, refetch: refetchCategoryStats } = useCategoryStats();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');

  const expenseCategories = categories.filter((category) => category.type === 'expense');
  const incomeCategories = categories.filter((category) => category.type === 'income');

  const defaultExpenseCategories = expenseCategories.filter((category) => category.is_default);
  const userExpenseCategories = expenseCategories.filter((category) => !category.is_default);
  const defaultIncomeCategories = incomeCategories.filter((category) => category.is_default);
  const userIncomeCategories = incomeCategories.filter((category) => !category.is_default);

  const getCategoryStats = (categoryId: string) =>
    stats.find((item) => item.categoryId === categoryId) || {
      transactionCount: 0,
      totalAmount: 0,
      payableBillsCount: 0,
      financialGoalsCount: 0,
      legacyBudgetsCount: 0,
    };

  if (loadingCategories || loadingStats) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-16 rounded-[28px]" />
        <Skeleton className="h-[560px] rounded-[28px]" />
      </div>
    );
  }

  const renderCategorySection = (
    title: string,
    description: string,
    items: typeof categories,
    isDefault: boolean,
  ) => (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
          <Layers3 className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/75 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {items.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={emptyStateClass}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary shadow-sm">
            <FolderTree className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Nenhuma categoria nesta seção</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {isDefault
              ? 'As categorias base deste tipo ainda não foram carregadas.'
              : 'Crie uma categoria personalizada para organizar seus lançamentos com mais clareza.'}
          </p>
          {!isDefault ? (
            <div className="mt-6">
              <Button className={categoriesPrimaryButtonClass} onClick={() => setCreateDialogOpen(true)}>
                <Plus size={16} className="mr-1" />
                Criar categoria agora
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              stats={getCategoryStats(category.id)}
              isDefault={isDefault}
              onTransactionsChanged={refetchCategoryStats}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <Header
        title="Gerenciar Categorias"
        subtitle="Organize suas transações com categorias personalizadas."
        icon={<FolderTree size={24} />}
        actions={
          <Button className={categoriesPrimaryButtonClass} onClick={() => setCreateDialogOpen(true)}>
            <Plus size={16} className="mr-1" />
            Nova Categoria
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <section className={`${categoriesPanelClass} overflow-hidden`}>
          <div className="border-b border-border/60 px-6 py-5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Biblioteca de categorias
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie categorias padrão e personalizadas sem transformar esta tela em área
              analítica.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as CategoryType)}
            className="space-y-6 p-6"
          >
            <TabsList className="grid h-auto w-full max-w-[470px] grid-cols-2 rounded-2xl border border-border/70 bg-surface/70 p-1">
              <TabsTrigger
                value="expense"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Despesas
                <span className="ml-2 inline-flex min-w-7 items-center justify-center rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-semibold text-danger">
                  {expenseCategories.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="income"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Receitas
                <span className="ml-2 inline-flex min-w-7 items-center justify-center rounded-full bg-success-subtle px-2 py-0.5 text-xs font-semibold text-success">
                  {incomeCategories.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense" className="space-y-8">
              {renderCategorySection(
                'Categorias padrão',
                'Base do sistema para despesas recorrentes e classificação principal.',
                defaultExpenseCategories,
                true,
              )}

              {renderCategorySection(
                'Minhas categorias',
                'Categorias personalizadas para complementar sua organização com simplicidade.',
                userExpenseCategories,
                false,
              )}
            </TabsContent>

            <TabsContent value="income" className="space-y-8">
              {renderCategorySection(
                'Categorias padrão',
                'Base do sistema para receitas e entradas recorrentes.',
                defaultIncomeCategories,
                true,
              )}

              {renderCategorySection(
                'Minhas categorias',
                'Categorias personalizadas para organizar melhor suas receitas.',
                userIncomeCategories,
                false,
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <CreateCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        categoryType={activeTab}
      />
    </>
  );
}
