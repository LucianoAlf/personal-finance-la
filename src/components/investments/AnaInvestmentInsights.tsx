import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAnaInsights } from '@/hooks/useAnaInsights';
import type { Investment } from '@/types/database.types';

interface AnaInvestmentInsightsProps {
  investments: Investment[];
}

const shellClassName =
  'overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]';

export function AnaInvestmentInsights({ investments }: AnaInvestmentInsightsProps) {
  const { healthScore, breakdown, insight, gptInsights, isLoading, error } = useAnaInsights(investments);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500 shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            Ana Clara está analisando seu portfólio...
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center justify-center py-10">
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="text-sm text-muted-foreground">
                Ana Clara está analisando seu portfólio...
              </div>
              <div className="mx-auto h-3 w-56 overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </span>
            Erro ao carregar insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-muted-foreground">
            Tente novamente mais tarde ou verifique sua conexão.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getLevelBadge = (level: typeof insight.level) => {
    const variants = {
      excellent: {
        shell: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        label: 'Excelente',
      },
      good: {
        shell: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
        label: 'Bom',
      },
      warning: {
        shell: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        label: 'Atenção',
      },
      critical: {
        shell: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
        label: 'Crítico',
      },
    };

    const variant = variants[level];
    return (
      <Badge className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${variant.shell}`}>
        {variant.label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-sky-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-400';
    if (score >= 60) return 'from-sky-500 to-sky-400';
    if (score >= 40) return 'from-amber-500 to-amber-400';
    return 'from-rose-500 to-rose-400';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={shellClassName}>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl font-semibold tracking-tight">Ana Clara diz:</CardTitle>
              <p className="text-sm text-muted-foreground">Sua consultora financeira IA</p>
            </div>
            {getLevelBadge(insight.level)}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <span className="text-sm font-medium text-muted-foreground">Saúde do Portfólio</span>
              <span className={`text-4xl font-semibold tracking-tight md:text-5xl ${getScoreColor(healthScore)}`}>
                {healthScore}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-elevated/80">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(healthScore)}`}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: TrendingUp,
                label: 'Diversificação',
                value: (breakdown.diversification / 30) * 100,
              },
              {
                icon: Shield,
                label: 'Concentração',
                value: (breakdown.concentration / 25) * 100,
              },
              {
                icon: TrendingUp,
                label: 'Retornos',
                value: (breakdown.returns / 25) * 100,
              },
              {
                icon: Shield,
                label: 'Risco',
                value: (breakdown.risk / 20) * 100,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="space-y-3 rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.value} className="h-2 flex-1" />
                    <span className="min-w-[3rem] text-right text-xs font-semibold text-muted-foreground">
                      {item.value.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((current) => !current)}
              className="gap-2 rounded-full border border-border/70 bg-surface/80 px-4 text-purple-600 hover:bg-surface-elevated hover:text-purple-700"
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

          <AnimatePresence>
            {isExpanded && gptInsights?.mainInsight && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-border/60 bg-surface-elevated/45 p-4">
                  <div className="space-y-3">
                    {gptInsights.mainInsight.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="leading-relaxed text-foreground/85 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {gptInsights.strengths && gptInsights.strengths.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Pontos Fortes do seu Portfólio
                    </h4>
                    <div className="space-y-2">
                      {gptInsights.strengths.map((strength, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.1 }}
                          className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span className="text-foreground/85">{strength}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {gptInsights.warnings && gptInsights.warnings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Pontos de Atenção
                    </h4>
                    <div className="space-y-2">
                      {gptInsights.warnings.map((warning, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.1 }}
                          className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                          <span className="text-foreground/85">{warning}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {gptInsights.recommendations && gptInsights.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb className="h-4 w-4 text-purple-500" />
                      Recomendações da Ana Clara
                    </h4>
                    <div className="space-y-3">
                      {gptInsights.recommendations.map((rec, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`rounded-2xl border p-4 ${
                            rec.priority === 'high'
                              ? 'border-rose-500/20 bg-rose-500/10'
                              : rec.priority === 'medium'
                              ? 'border-amber-500/20 bg-amber-500/10'
                              : 'border-sky-500/20 bg-sky-500/10'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-purple-500" />
                            <h5 className="text-sm font-medium text-foreground">{rec.title}</h5>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>
                          </div>
                          <p className="pl-6 text-sm leading-relaxed text-foreground/80">{rec.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {gptInsights.nextSteps && gptInsights.nextSteps.length > 0 && (
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-foreground">Próximos passos sugeridos</h4>
                    <ol className="list-inside list-decimal space-y-2">
                      {gptInsights.nextSteps.map((step, index) => (
                        <li key={index} className="text-sm text-foreground/85">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-t border-border/60 pt-4">
            <p className="text-center text-xs text-muted-foreground">
              Powered by Ana Clara IA - Sua consultora financeira pessoal
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
