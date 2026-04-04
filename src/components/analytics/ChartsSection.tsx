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
      <h2 className="text-2xl font-bold text-gray-900">Gráficos Interativos</h2>
      
      <Tabs defaultValue="pizza" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pizza" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Por Categoria</span>
            <span className="sm:hidden">Categoria</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
            <span className="sm:hidden">Tempo</span>
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="flex items-center gap-2">
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
