import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PiggyBank, TrendingDown } from 'lucide-react';

interface GoalTabsProps {
  savingsContent: React.ReactNode;
  spendingContent: React.ReactNode;
  defaultTab?: 'savings' | 'spending';
}

export function GoalTabs({ 
  savingsContent, 
  spendingContent,
  defaultTab = 'savings'
}: GoalTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
        <TabsTrigger value="savings" className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4" />
          <span>Metas de Economia</span>
        </TabsTrigger>
        <TabsTrigger value="spending" className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          <span>Metas de Gastos</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="savings" className="mt-6">
        {savingsContent}
      </TabsContent>

      <TabsContent value="spending" className="mt-6">
        {spendingContent}
      </TabsContent>
    </Tabs>
  );
}
