import { useCommittedLimit } from '@/hooks/useCommittedLimit';
import { formatCurrency } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CommittedLimitIndicatorProps {
  creditCardId: string;
  creditLimit: number;
  compact?: boolean;
}

export function CommittedLimitIndicator({ 
  creditCardId, 
  creditLimit,
  compact = false 
}: CommittedLimitIndicatorProps) {
  const { data, loading } = useCommittedLimit(creditCardId, creditLimit);

  if (loading) {
    return <Skeleton className={compact ? "h-4 w-24" : "h-16 w-full"} />;
  }

  if (!data) {
    return null;
  }

  const usagePercentage = (data.totalCommitted / creditLimit) * 100;
  const hasSignificantFutureInstallments = data.futureInstallments > 0;

  // Determinar cor baseado no uso
  const getUsageColor = () => {
    if (usagePercentage >= 95) return 'text-red-600 bg-red-50';
    if (usagePercentage >= 80) return 'text-orange-600 bg-orange-50';
    if (usagePercentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = () => {
    if (usagePercentage >= 95) return 'bg-red-500';
    if (usagePercentage >= 80) return 'bg-orange-500';
    if (usagePercentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-help",
              getUsageColor()
            )}>
              {hasSignificantFutureInstallments && (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>Livre: {formatCurrency(data.realAvailableLimit)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Detalhamento do Limite</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Limite total:</span>
                  <span>{formatCurrency(creditLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fatura atual:</span>
                  <span className="text-orange-600">-{formatCurrency(data.currentInvoice)}</span>
                </div>
                {hasSignificantFutureInstallments && (
                  <div className="flex justify-between">
                    <span>Parcelas futuras:</span>
                    <span className="text-amber-600">-{formatCurrency(data.futureInstallments)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Livre de verdade:</span>
                  <span className="text-green-600">{formatCurrency(data.realAvailableLimit)}</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Limite Comprometido
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  Inclui a fatura atual e todas as parcelas futuras já comprometidas
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h4>
        <span className={cn("text-sm font-medium", getUsageColor().split(' ')[0])}>
          {usagePercentage.toFixed(0)}% usado
        </span>
      </div>

      {/* Barra de Progresso Segmentada */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          {/* Fatura Atual */}
          <div 
            className="bg-purple-500 transition-all"
            style={{ width: `${(data.currentInvoice / creditLimit) * 100}%` }}
          />
          {/* Parcelas Futuras */}
          {hasSignificantFutureInstallments && (
            <div 
              className="bg-amber-400 transition-all"
              style={{ width: `${(data.futureInstallments / creditLimit) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-gray-600">Fatura atual</span>
          <span className="font-medium ml-auto">{formatCurrency(data.currentInvoice)}</span>
        </div>
        {hasSignificantFutureInstallments && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-gray-600">Parcelas futuras</span>
            <span className="font-medium ml-auto">{formatCurrency(data.futureInstallments)}</span>
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="pt-2 border-t border-gray-100 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Limite total</span>
          <span className="font-medium">{formatCurrency(creditLimit)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total comprometido</span>
          <span className="font-medium text-orange-600">{formatCurrency(data.totalCommitted)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span className="text-green-700">Livre de verdade</span>
          <span className="text-green-600">{formatCurrency(data.realAvailableLimit)}</span>
        </div>
      </div>
    </div>
  );
}
