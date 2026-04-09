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
      <Card className="border-danger-border bg-surface/95 shadow-[0_22px_55px_rgba(3,8,20,0.28)]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-danger-border bg-danger-subtle p-2">
                <Sparkles className="h-6 w-6 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ana Clara</h3>
                <p className="text-sm text-muted-foreground">Sua Coach Financeira</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              className="rounded-xl border border-border/70 bg-surface-elevated/80 text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <p className="text-sm text-danger">Erro ao carregar insights. Tente novamente.</p>
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
      <Card className="relative overflow-hidden border border-primary/20 bg-surface/95 shadow-[0_26px_60px_rgba(3,8,20,0.32)] backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(151,117,250,0.24),transparent_58%)]" />
        <div className="pointer-events-none absolute right-0 top-12 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />

        <CardHeader className="relative pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(145,110,255,0.95),rgba(104,76,201,0.92))] p-2 shadow-[0_18px_34px_rgba(66,34,132,0.4)]"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Ana Clara</h3>
                <p className="text-sm text-muted-foreground">Sua Coach Financeira</p>
                <GamificationBadges meta={meta} />
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={refresh}
                className="rounded-xl border border-border/70 bg-surface-elevated/70 text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl border border-border/70 bg-surface-elevated/70 text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-border/70 bg-surface-overlay text-foreground">
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

        <CardContent className="relative space-y-4 pt-1">
          <AnaInsightCard insight={insights.primary} size="large" />

          {insights.secondary.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {insights.secondary.map((insight, index) => (
                <AnaInsightCard key={index} insight={insight} size="small" />
              ))}
            </div>
          ) : null}

          <HealthScoreBar
            score={healthScore}
            breakdown={insights.healthBreakdown || {
              bills: Math.round(healthScore * 0.3),
              investments: Math.round(healthScore * 0.3),
              budget: Math.round(healthScore * 0.2),
              planning: Math.round(healthScore * 0.2),
            }}
            showBreakdown={true}
            label="Saúde Financeira"
            defaultExpanded={false}
            hasSufficientData={hasSufficientData}
          />

          <div className="pt-2 text-center">
            <p className="text-sm italic text-primary/90">"{insights.motivationalQuote}"</p>
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
    <Card className="border border-primary/20 bg-surface/95 shadow-[0_26px_60px_rgba(3,8,20,0.32)]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl bg-surface-elevated" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-surface-elevated" />
              <Skeleton className="h-3 w-32 bg-surface-elevated" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-xl bg-surface-elevated" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <Skeleton className="h-32 w-full rounded-2xl bg-surface-elevated" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full rounded-2xl bg-surface-elevated" />
          <Skeleton className="h-24 w-full rounded-2xl bg-surface-elevated" />
          <Skeleton className="h-24 w-full rounded-2xl bg-surface-elevated" />
        </div>
        <Skeleton className="h-2 w-full rounded-full bg-surface-elevated" />
      </CardContent>
    </Card>
  );
}
