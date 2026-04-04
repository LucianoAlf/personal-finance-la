// WIDGET ANA CLARA DASHBOARD - Widget Principal
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, MoreVertical, History, Settings, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAnaDashboardInsights } from '@/hooks/useAnaDashboardInsights';
import { AnaInsightCard } from './AnaInsightCard';
import { HealthScoreBar } from './HealthScoreBar';
import { useAuth } from '@/hooks/useAuth';
import { AnaInsightsHistoryDialog } from './AnaInsightsHistoryDialog';
import { PreferencesDialog } from './PreferencesDialog';
import { GamificationBadges } from './GamificationBadges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnaDashboardWidgetProps {
  autoRefresh?: boolean;
}

export function AnaDashboardWidget({ autoRefresh = true }: AnaDashboardWidgetProps) {
  const { user } = useAuth();
  const { insights, healthScore, isLoading, error, refresh, meta } = useAnaDashboardInsights(
    user?.id || '',
    autoRefresh
  );
  const hasSufficientData = meta?.hasSufficientData !== false;
  const [openHistory, setOpenHistory] = useState(false);
  const [openPrefs, setOpenPrefs] = useState(false);

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  if (error || !insights) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Sparkles className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">Ana Clara</h3>
                <p className="text-sm text-muted-foreground">Sua Coach Financeira</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            Erro ao carregar insights. Tente novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Ana Clara</h3>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Sua Coach Financeira</p>
                <GamificationBadges meta={meta} />
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-purple-100 dark:hover:bg-purple-900/30">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Opções</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setOpenHistory(true)}>
                    <History className="mr-2 h-4 w-4" />
                    Ver Histórico
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setOpenPrefs(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar/Preferências
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary Insight */}
          <AnaInsightCard insight={insights.primary} size="large" />

          {/* Secondary Insights Grid */}
          {insights.secondary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insights.secondary.map((insight, index) => (
                <AnaInsightCard key={index} insight={insight} size="small" />
              ))}
            </div>
          )}

          {/* Health Score Bar Detalhado */}
          <HealthScoreBar 
            score={healthScore}
            breakdown={{
              bills: Math.round(healthScore * 0.3),
              investments: Math.round(healthScore * 0.3),
              budget: Math.round(healthScore * 0.2),
              diversification: Math.round(healthScore * 0.2),
            }}
            showBreakdown={true}
            label="Saúde Financeira"
            defaultExpanded={false}
            hasSufficientData={hasSufficientData}
          />

          {/* Motivational Quote */}
          <div className="text-center pt-2">
            <p className="text-sm italic text-purple-700 dark:text-purple-300">
              "{insights.motivationalQuote}"
            </p>
          </div>
        </CardContent>
      </Card>
      <AnaInsightsHistoryDialog open={openHistory} onOpenChange={setOpenHistory} />
      <PreferencesDialog open={openPrefs} onOpenChange={setOpenPrefs} />
    </motion.div>
  );
}

function WidgetSkeleton() {
  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

// Funções auxiliares removidas (agora estão no HealthScoreBar)
