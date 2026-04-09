import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, AlertTriangle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarketOpportunity } from '@/hooks/useMarketOpportunities';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: MarketOpportunity;
  onDismiss: (id: string) => void;
}

export function OpportunityCard({ opportunity, onDismiss }: OpportunityCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'medium':
        return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'high':
        return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300';
      default:
        return 'border-border/60 bg-surface/80 text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string | undefined) => {
    if (!type) return <TrendingUp className="h-5 w-5" />;

    if (
      type.includes('diversification') ||
      type.includes('concentration') ||
      type.includes('sell_signal')
    ) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    if (type.includes('international') || type.includes('sector_rotation')) {
      return <Globe className="h-5 w-5" />;
    }
    return <TrendingUp className="h-5 w-5" />;
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'Baixo risco';
      case 'medium':
        return 'Risco médio';
      case 'high':
        return 'Alto risco';
      default:
        return 'Risco desconhecido';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] transition-shadow hover:shadow-[0_22px_45px_rgba(3,8,20,0.18)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="rounded-2xl border border-border/60 bg-surface-elevated/45 p-2.5 text-purple-500">
                {getTypeIcon(opportunity.type)}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base font-semibold tracking-tight text-foreground">
                  {opportunity.title || 'Sem título'}
                </CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-xs', getRiskColor(opportunity.risk_level))}>
                    {getRiskLabel(opportunity.risk_level)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-700 dark:text-purple-300">
                    {opportunity.confidence_score}% confiança
                  </Badge>
                  {opportunity.expected_return && (
                    <Badge variant="outline" className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                      ~{opportunity.expected_return.toFixed(1)}% a.a.
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(opportunity.id)}
              className="h-9 w-9 rounded-full border border-border/60 p-0 text-muted-foreground hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          <p className="text-sm leading-6 text-muted-foreground">
            {opportunity.description || 'Sem descrição disponível'}
          </p>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium uppercase tracking-[0.14em] text-purple-500">
              {opportunity.asset_class?.replace(/_/g, ' ').toUpperCase() || 'GERAL'}
            </span>
            <span className="text-muted-foreground">
              Expira{' '}
              {formatDistanceToNow(new Date(opportunity.expires_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
