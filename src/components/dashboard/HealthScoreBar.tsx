// WIDGET ANA CLARA DASHBOARD - Health Score Bar Detalhado
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
    if (!hasSufficientData) return 'text-gray-500';
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-blue-600';
    if (value >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreGradient = (value: number): string => {
    if (!hasSufficientData) return 'from-gray-300 to-gray-400';
    if (value >= 80) return 'from-green-500 to-green-600';
    if (value >= 60) return 'from-blue-500 to-blue-600';
    if (value >= 40) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const getScoreLabel = (value: number): string => {
    if (!hasSufficientData) return 'Dados insuficientes';
    if (value >= 80) return 'Excelente';
    if (value >= 60) return 'Bom';
    if (value >= 40) return 'Regular';
    return 'Precisa Atenção';
  };

  const getBgColor = (value: number): string => {
    if (!hasSufficientData) return 'bg-gray-50';
    if (value >= 80) return 'bg-green-50';
    if (value >= 60) return 'bg-blue-50';
    if (value >= 40) return 'bg-amber-50';
    return 'bg-red-50';
  };

  // Breakdown items
  const breakdownItems = breakdown ? [
    {
      icon: Receipt,
      label: 'Contas em Dia',
      value: breakdown.bills,
      max: 30,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: TrendingUp,
      label: 'Investimentos',
      value: breakdown.investments,
      max: 30,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Wallet,
      label: 'Metas de Gasto',
      value: breakdown.budget,
      max: 20,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: PieChart,
      label: 'Planejamento',
      value: breakdown.planning,
      max: 20,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ] : [];

  return (
    <Card className={`border-2 ${getBgColor(score)}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Progress Bar Principal */}
        <div className="space-y-1">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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
                className="h-6 px-2 text-xs"
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
            className="space-y-2 pt-2 border-t"
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
                      <div className={`p-1 rounded ${item.bgColor}`}>
                        <Icon className={`h-3 w-3 ${item.color}`} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">
                      {item.value}/{item.max}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full ${item.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-100', '-400 to-' + item.color.replace('text-', '') + '-600')}`}
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
