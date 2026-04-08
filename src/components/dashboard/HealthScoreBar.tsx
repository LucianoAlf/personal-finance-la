// WIDGET ANA CLARA DASHBOARD - Health Score Bar Detalhado
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Receipt, 
  TrendingUp, 
  Wallet, 
  PieChart,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface HealthScoreBreakdown {
  bills: number;        // 0-30
  investments: number;  // 0-30
  budget: number;       // 0-20
  planning: number; // 0-20
}

interface HealthScoreBarProps {
  score: number; // 0-100
  breakdown?: HealthScoreBreakdown;
  label?: string;
  showBreakdown?: boolean;
  defaultExpanded?: boolean;
  hasSufficientData?: boolean;
}

export function HealthScoreBar({ 
  score, 
  breakdown,
  label = 'Saúde Financeira',
  showBreakdown = true,
  defaultExpanded = false,
  hasSufficientData = true,
}: HealthScoreBarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Determinar cor e gradiente baseado no score
  const getScoreColor = (value: number): string => {
    if (!hasSufficientData) return 'text-foreground/70';
    if (value >= 80) return 'text-emerald-300';
    if (value >= 60) return 'text-sky-300';
    if (value >= 40) return 'text-amber-300';
    return 'text-danger';
  };

  const getScoreGradient = (value: number): string => {
    if (!hasSufficientData) return 'from-slate-500 to-slate-400';
    if (value >= 80) return 'from-emerald-400 to-teal-300';
    if (value >= 60) return 'from-sky-400 to-violet-400';
    if (value >= 40) return 'from-amber-300 to-orange-400';
    return 'from-rose-400 to-red-500';
  };

  const getScoreLabel = (value: number): string => {
    if (!hasSufficientData) return 'Dados insuficientes';
    if (value >= 80) return 'Excelente';
    if (value >= 60) return 'Bom';
    if (value >= 40) return 'Regular';
    return 'Precisa Atenção';
  };

  // Breakdown items
  const breakdownItems = breakdown ? [
    {
      icon: Receipt,
      label: 'Contas em Dia',
      value: breakdown.bills,
      max: 30,
      color: 'text-violet-200',
      iconSurface: 'bg-violet-500/12 ring-violet-400/20',
      gradient: 'from-violet-400 to-fuchsia-300',
    },
    {
      icon: TrendingUp,
      label: 'Investimentos',
      value: breakdown.investments,
      max: 30,
      color: 'text-emerald-200',
      iconSurface: 'bg-emerald-500/12 ring-emerald-400/20',
      gradient: 'from-emerald-400 to-teal-300',
    },
    {
      icon: Wallet,
      label: 'Metas de Gasto',
      value: breakdown.budget,
      max: 20,
      color: 'text-sky-200',
      iconSurface: 'bg-sky-500/12 ring-sky-400/20',
      gradient: 'from-sky-400 to-blue-300',
    },
    {
      icon: PieChart,
      label: 'Planejamento',
      value: breakdown.planning,
      max: 20,
      color: 'text-amber-200',
      iconSurface: 'bg-amber-500/12 ring-amber-400/20',
      gradient: 'from-amber-300 to-orange-400',
    },
  ] : [];

  return (
    <Card className="border border-border/70 bg-surface/95 shadow-[0_20px_48px_rgba(3,8,20,0.24)]">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground/80">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-sm text-foreground/70">/100</span>
          </div>
        </div>

        {/* Progress Bar Principal */}
        <div className="space-y-1">
          <div className="h-3 rounded-full overflow-hidden bg-surface-overlay/80">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${getScoreGradient(score)}`}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </span>
            {showBreakdown && breakdown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 rounded-lg border border-border/60 bg-surface-elevated/70 px-2 text-xs text-foreground/75 hover:bg-surface-overlay hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    Ocultar <ChevronUp className="ml-1 h-3 w-3" />
                  </>
                ) : (
                  <>
                    Detalhes <ChevronDown className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Breakdown Detalhado */}
        {showBreakdown && breakdown && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 border-t border-border/60 pt-2"
          >
            {breakdownItems.map((item, index) => {
              const Icon = item.icon;
              const percentage = (item.value / item.max) * 100;

              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 ring-1 ${item.iconSurface}`}>
                        <Icon className={`h-3 w-3 ${item.color}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground/80">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {item.value}/{item.max}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-surface-overlay/80">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full bg-gradient-to-r ${item.gradient}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
