import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, TrendingUp, BarChart3 } from 'lucide-react';
import { ExpensesPieChart } from './ExpensesPieChart';
import { ExpensesTimeline } from './ExpensesTimeline';
import { MonthlyComparison } from './MonthlyComparison';
import { AnalyticsData } from '@/hooks/useAnalytics';

interface ChartsSectionProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
}

export function ChartsSection({ analyticsData, loading }: ChartsSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Gráficos Interativos</h2>
      
      <Tabs defaultValue="pizza" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.4rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]">
          <TabsTrigger value="pizza" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Por Categoria</span>
            <span className="sm:hidden">Categoria</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
            <span className="sm:hidden">Tempo</span>
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Comparativo</span>
            <span className="sm:hidden">Comparar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pizza" className="mt-6">
          <ExpensesPieChart analyticsData={analyticsData} loading={loading} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <ExpensesTimeline analyticsData={analyticsData} loading={loading} />
        </TabsContent>

        <TabsContent value="comparativo" className="mt-6">
          <MonthlyComparison analyticsData={analyticsData} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
