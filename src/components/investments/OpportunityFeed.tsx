// SPRINT 4 DIA 1: Feed de oportunidades de mercado
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OpportunityCard } from './OpportunityCard';
import { useMarketOpportunities } from '@/hooks/useMarketOpportunities';
import { Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OpportunityFeed() {
  const { 
    opportunities, 
    loading, 
    generating, 
    generateOpportunities, 
    dismissOpportunity 
  } = useMarketOpportunities();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Radar de Oportunidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Radar de Oportunidades
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateOpportunities}
            disabled={generating}
            className="gap-2"
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
        <p className="text-sm text-muted-foreground mt-1">
          Ana Clara identifica oportunidades baseadas no seu portfólio
        </p>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-4 bg-purple-100 rounded-full mb-4">
              <Lightbulb className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma oportunidade no momento
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Seu portfólio está bem estruturado! Clique em "Atualizar" para gerar novas análises.
            </p>
            <Button onClick={generateOpportunities} disabled={generating}>
              {generating ? 'Analisando...' : 'Gerar Oportunidades'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {opportunities.length} oportunidade{opportunities.length !== 1 ? 's' : ''} encontrada{opportunities.length !== 1 ? 's' : ''}
              </span>
              <span className="text-purple-600 font-medium">
                Powered by Ana Clara IA
              </span>
            </div>
            
            <AnimatePresence mode="popLayout">
              {opportunities.map((opportunity, index) => (
                <motion.div
                  key={opportunity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <OpportunityCard
                    opportunity={opportunity}
                    onDismiss={dismissOpportunity}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
