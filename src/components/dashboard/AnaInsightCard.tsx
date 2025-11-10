// WIDGET ANA CLARA DASHBOARD - Card de Insight
import { useState } from 'react';
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
  ThumbsUp,
  ThumbsDown,
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
  const colors = INSIGHT_COLORS[insight.priority];
  const isLarge = size === 'large';
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  
  // Selecionar ícone baseado na prioridade
  const iconName = INSIGHT_PRIORITY_ICONS[insight.priority];
  const Icon = iconMap[iconName] || Sparkles;

  const handleAction = () => {
    if (insight.action) {
      navigate(insight.action.route);
    }
    onActionClick?.();
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    // TODO: Salvar feedback no backend (FASE 3)
    console.log(`Feedback ${type} para insight:`, insight.headline);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className={`h-full ${colors.bg} border-2 ${colors.border} overflow-hidden`}>
        <CardContent className={isLarge ? 'p-4 space-y-3' : 'p-4 space-y-2'}>
          {/* Header com ícone, headline e tipo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                className={`${colors.text} ${isLarge ? 'p-3' : 'p-2'} bg-white/50 rounded-full`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: 0 }}
              >
                <Icon className={isLarge ? 'h-6 w-6' : 'h-5 w-5'} />
              </motion.div>
              <h3 className={`font-semibold ${colors.text} ${isLarge ? 'text-lg' : 'text-sm'}`}>
                {insight.headline}
              </h3>
            </div>
            <Badge variant="outline" className={`${colors.text} text-xs`}>
              {INSIGHT_TYPE_LABELS[insight.type]}
            </Badge>
          </div>

          {/* Description (apenas para cards grandes) */}
          {isLarge && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {insight.description}
            </p>
          )}

          {/* Visualization (progress bar) */}
          {isLarge && insight.visualization?.type === 'progress' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Progresso</span>
                <span className="font-semibold">
                  {insight.visualization.data.percentage}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
                  variant="default"
                  className="w-auto"
                >
                  {insight.action.label}
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              )}
              
                          </div>
          )}

          {/* Small card: mostrar apenas descrição curta */}
          {!isLarge && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {insight.description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
