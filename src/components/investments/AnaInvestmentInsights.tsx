// SPRINT 4 DIA 3: Ana Clara Insights Widget
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, Shield, Droplets, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnaInsights } from '@/hooks/useAnaInsights';
import { getHealthLevelColor } from '@/utils/portfolioHealthScore';
import type { Investment } from '@/types/database.types';

interface AnaInvestmentInsightsProps {
  investments: Investment[];
}

export function AnaInvestmentInsights({ investments }: AnaInvestmentInsightsProps) {
  const { healthScore, breakdown, insight, isLoading } = useAnaInsights(investments);

  if (isLoading) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Ana Clara diz:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Analisando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getLevelBadge = (level: typeof insight.level) => {
    const variants = {
      excellent: { bg: 'bg-green-100', text: 'text-green-700', label: 'Excelente' },
      good: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bom' },
      warning: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Atenção' },
      critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítico' },
    };

    const variant = variants[level];
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0`}>{variant.label}</Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-blue-500 to-blue-600';
    if (score >= 40) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Ana Clara diz:</CardTitle>
              <p className="text-sm text-muted-foreground">Sua consultora financeira IA</p>
            </div>
            {getLevelBadge(insight.level)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Health Score Principal */}
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Saúde do Portfólio</span>
              <span className={`text-4xl font-bold ${getScoreColor(healthScore)}`}>
                {healthScore}
                <span className="text-lg text-muted-foreground">/100</span>
              </span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${getScoreGradient(healthScore)} rounded-full`}
              />
            </div>
          </div>

          {/* Breakdown por Critério */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Diversificação</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.diversification / 30) * 100} className="h-2" />
                <span className="text-xs font-medium text-muted-foreground">
                  {breakdown.diversification}/30
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Alocação</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.allocation / 25) * 100} className="h-2" />
                <span className="text-xs font-medium text-muted-foreground">
                  {breakdown.allocation}/25
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.performance / 25) * 100} className="h-2" />
                <span className="text-xs font-medium text-muted-foreground">
                  {breakdown.performance}/25
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Liquidez</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.liquidity / 20) * 100} className="h-2" />
                <span className="text-xs font-medium text-muted-foreground">
                  {breakdown.liquidity}/20
                </span>
              </div>
            </div>
          </div>

          {/* Insight Principal */}
          <div className="p-4 bg-purple-100 rounded-lg border border-purple-200">
            <p className={`font-medium mb-2 ${getHealthLevelColor(insight.level)}`}>
              {insight.message}
            </p>
          </div>

          {/* Sugestões de Ações */}
          {insight.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Ações Recomendadas:</h4>
              <div className="space-y-2">
                {insight.suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span className="text-gray-700">{suggestion}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pt-4 border-t border-purple-100">
            <p className="text-xs text-center text-muted-foreground">
              💜 Powered by Ana Clara IA - Sua consultora financeira pessoal
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
