// SPRINT 4 DIA 1: Card individual de oportunidade
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, AlertTriangle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { MarketOpportunity } from '@/hooks/useMarketOpportunities';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OpportunityCardProps {
  opportunity: MarketOpportunity;
  onDismiss: (id: string) => void;
}

export function OpportunityCard({ opportunity, onDismiss }: OpportunityCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
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
        return 'Baixo Risco';
      case 'medium':
        return 'Risco Médio';
      case 'high':
        return 'Alto Risco';
      default:
        return 'Risco Desconhecido';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-purple-100 rounded-lg">
                {getTypeIcon(opportunity.type)}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base mb-1 text-gray-900">
                  {opportunity.title || 'Sem título'}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getRiskColor(opportunity.risk_level)}>
                    {getRiskLabel(opportunity.risk_level)}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                    {opportunity.confidence_score}% confiança
                  </Badge>
                  {opportunity.expected_return && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
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
              className="h-8 w-8 p-0 hover:bg-red-50"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-red-600" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-3">
            {opportunity.description || 'Sem descrição disponível'}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-purple-600">
              {opportunity.asset_class?.replace(/_/g, ' ').toUpperCase() || 'GERAL'}
            </span>
            <span className="text-gray-500">
              Expira {formatDistanceToNow(new Date(opportunity.expires_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
