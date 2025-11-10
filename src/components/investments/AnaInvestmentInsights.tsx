// FASE 1: Ana Clara com GPT-4 Real - Componente atualizado
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, Shield, CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnaInsights } from '@/hooks/useAnaInsights';
import type { Investment } from '@/types/database.types';

interface AnaInvestmentInsightsProps {
  investments: Investment[];
}

export function AnaInvestmentInsights({ investments }: AnaInvestmentInsightsProps) {
  const { healthScore, breakdown, insight, gptInsights, isLoading, error } = useAnaInsights(investments);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            Ana Clara está analisando seu portfólio...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <div className="animate-pulse text-muted-foreground">
                Ana Clara está analisando seu portfólio...
              </div>
              <Progress value={undefined} className="w-48 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Erro ao carregar insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Tente novamente mais tarde ou verifique sua conexão.
          </p>
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
              <span className={`text-5xl font-bold ${getScoreColor(healthScore)}`}>
                {healthScore}
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

          {/* Breakdown por Critério - Sempre visível */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Diversificação</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.diversification / 30) * 100} className="h-2 flex-1" />
                <span className="text-xs font-semibold text-purple-600 min-w-[3rem] text-right">
                  {((breakdown.diversification / 30) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Concentração</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.concentration / 25) * 100} className="h-2 flex-1" />
                <span className="text-xs font-semibold text-purple-600 min-w-[3rem] text-right">
                  {((breakdown.concentration / 25) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Retornos</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.returns / 25) * 100} className="h-2 flex-1" />
                <span className="text-xs font-semibold text-purple-600 min-w-[3rem] text-right">
                  {((breakdown.returns / 25) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Risco</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(breakdown.risk / 20) * 100} className="h-2 flex-1" />
                <span className="text-xs font-semibold text-purple-600 min-w-[3rem] text-right">
                  {((breakdown.risk / 20) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Botão Expandir/Recolher */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Recolher análise detalhada
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Ver análise detalhada
                </>
              )}
            </Button>
          </div>

          {/* Análise Detalhada GPT-4 - Colapsável */}
          <AnimatePresence>
          {isExpanded && gptInsights?.mainInsight && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="prose prose-sm max-w-none">
                  {gptInsights.mainInsight.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-gray-700 leading-relaxed mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Pontos Fortes */}
              {gptInsights.strengths && gptInsights.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Pontos Fortes do seu Portfólio:
                  </h4>
                  <div className="space-y-2">
                    {gptInsights.strengths.map((strength, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.1 }}
                        className="flex items-start gap-2 text-sm p-2 bg-green-50 rounded"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{strength}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos de Atenção */}
              {gptInsights.warnings && gptInsights.warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Pontos de Atenção:
                  </h4>
                  <div className="space-y-2">
                    {gptInsights.warnings.map((warning, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.1 }}
                        className="flex items-start gap-2 text-sm p-2 bg-amber-50 rounded"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{warning}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendações */}
              {gptInsights.recommendations && gptInsights.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-purple-600" />
                    Recomendações da Ana Clara:
                  </h4>
                  <div className="space-y-3">
                    {gptInsights.recommendations.map((rec, index) => {
                      const priorityColors = {
                        high: 'border-red-200 bg-red-50',
                        medium: 'border-amber-200 bg-amber-50',
                        low: 'border-blue-200 bg-blue-50',
                      };
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`p-3 rounded-lg border ${priorityColors[rec.priority]}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowRight className="h-4 w-4 text-purple-600" />
                            <h5 className="font-medium text-sm text-gray-900">{rec.title}</h5>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed pl-6">
                            {rec.description}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Próximos Passos */}
              {gptInsights.nextSteps && gptInsights.nextSteps.length > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-semibold mb-3">Próximos Passos Sugeridos:</h4>
                  <ol className="space-y-2 list-decimal list-inside">
                    {gptInsights.nextSteps.map((step, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.div>
          )}
          </AnimatePresence>

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
