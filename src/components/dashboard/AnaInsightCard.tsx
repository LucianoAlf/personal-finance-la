// WIDGET ANA CLARA DASHBOARD - Card de Insight
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Trophy, 
  Receipt,
  Rocket,
  Wallet,
  Activity,
  Sparkles,
  PartyPopper,
  TriangleAlert,
  Siren,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INSIGHT_COLORS, INSIGHT_TYPE_LABELS, INSIGHT_PRIORITY_ICONS } from '@/types/ana-insights.types';
import type { AnaInsight } from '@/types/ana-insights.types';

interface AnaInsightCardProps {
  insight: AnaInsight;
  size: 'large' | 'small';
  onActionClick?: () => void;
}

// Mapeamento de ícones (diversificados e criativos)
const iconMap: Record<string, LucideIcon> = {
  Trophy,
  Receipt,
  Rocket,
  Wallet,
  Activity,
  Sparkles,
  PartyPopper,
  TriangleAlert,
  Siren,
};

export function AnaInsightCard({ insight, size, onActionClick }: AnaInsightCardProps) {
  const navigate = useNavigate();
  const priority = insight.priority in INSIGHT_COLORS ? insight.priority : 'info';
  const typeLabel = INSIGHT_TYPE_LABELS[insight.type] ?? 'Insight';
  const colors = INSIGHT_COLORS[priority];
  const isLarge = size === 'large';
  
  // Selecionar ícone baseado na prioridade
  const iconName = INSIGHT_PRIORITY_ICONS[priority];
  const Icon = iconMap[iconName] || Sparkles;

  const handleAction = () => {
    if (insight.action) {
      navigate(insight.action.route);
    }
    onActionClick?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className={`h-full overflow-hidden ${colors.bg} border ${colors.border}`}>
        <CardContent className={isLarge ? 'p-4 space-y-3' : 'p-4 space-y-2'}>
          {/* Header com ícone, headline e tipo */}
          <div className={isLarge ? 'flex items-start justify-between gap-3' : 'space-y-3'}>
            <div className="flex items-start gap-2 min-w-0">
              <motion.div
                className={`${colors.text} ${colors.iconSurface} ${isLarge ? 'p-3' : 'p-2'} shrink-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: 0 }}
              >
                <Icon className={isLarge ? 'h-6 w-6' : 'h-5 w-5'} />
              </motion.div>
              <h3 className={`min-w-0 font-semibold leading-snug break-words ${colors.text} ${isLarge ? 'text-lg' : 'text-sm'}`}>
                {insight.headline}
              </h3>
            </div>
            <Badge
              variant="outline"
              className={`${colors.badge} text-xs shrink-0 self-start whitespace-normal text-left`}
            >
              {typeLabel}
            </Badge>
          </div>

          {/* Description (apenas para cards grandes) */}
          {isLarge && (
            <p className={`text-sm leading-relaxed ${colors.mutedText}`}>
              {insight.description}
            </p>
          )}

          {/* Visualization (progress bar) */}
          {isLarge && insight.visualization?.type === 'progress' && (
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs ${colors.mutedText}`}>
                <span>Progresso</span>
                <span className="font-semibold text-foreground">
                  {insight.visualization.data.percentage}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${colors.progressTrack}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${insight.visualization.data.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full bg-gradient-to-r ${colors.gradient}`}
                />
              </div>
            </div>
          )}


          {/* Action Button + Feedback */}
          {isLarge && (
            <div className="space-y-2">
              {insight.action && (
                <Button
                  onClick={handleAction}
                  size="sm"
                  variant="outline"
                  className="w-auto rounded-xl border-border/70 bg-surface-elevated/70 text-foreground hover:bg-surface-overlay"
                >
                  {insight.action.label}
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              )}
              
                          </div>
          )}

          {/* Small card: mostrar apenas descrição curta */}
          {!isLarge && (
            <p className={`line-clamp-2 text-xs ${colors.mutedText}`}>
              {insight.description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
