import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OpportunityCard } from './OpportunityCard';
import { useMarketOpportunities } from '@/hooks/useMarketOpportunities';
import { Sparkles, RefreshCw, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const shellClassName =
  'rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]';

export function OpportunityFeed() {
  const {
    opportunities,
    loading,
    generating,
    generateOpportunities,
    dismissOpportunity,
  } = useMarketOpportunities();

  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_VISIBLE_COUNT = 3;

  if (loading) {
    return (
      <Card className={shellClassName}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Radar de Oportunidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={shellClassName}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Radar de Oportunidades
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ana Clara identifica oportunidades baseadas no seu portfólio
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateOpportunities()}
            disabled={generating}
            className="gap-2 rounded-full border-border/70 bg-surface/80 hover:bg-surface-elevated/55"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-elevated/35 px-4 py-12 text-center">
            <div className="mb-4 rounded-full border border-border/60 bg-surface/80 p-4">
              <Lightbulb className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
              Nenhuma oportunidade no momento
            </h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Seu portfólio está bem estruturado! Clique em "Atualizar" para gerar novas análises.
            </p>
            <Button
              onClick={() => generateOpportunities()}
              disabled={generating}
              className="rounded-full bg-purple-500 hover:bg-purple-600"
            >
              {generating ? 'Analisando...' : 'Gerar Oportunidades'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {opportunities.length} oportunidade{opportunities.length !== 1 ? 's' : ''} encontrada
                {opportunities.length !== 1 ? 's' : ''}
              </span>
              <span className="font-medium text-purple-500">Powered by Ana Clara IA</span>
            </div>

            <AnimatePresence mode="popLayout">
              {(isExpanded ? opportunities : opportunities.slice(0, INITIAL_VISIBLE_COUNT)).map((opportunity, index) => (
                <motion.div
                  key={opportunity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <OpportunityCard opportunity={opportunity} onDismiss={dismissOpportunity} />
                </motion.div>
              ))}
            </AnimatePresence>

            {opportunities.length > INITIAL_VISIBLE_COUNT && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="gap-2 rounded-full border border-border/60 bg-surface/70 text-muted-foreground hover:border-border/80 hover:bg-surface-elevated/55 hover:text-foreground"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ver todas ({opportunities.length - INITIAL_VISIBLE_COUNT} restantes)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
