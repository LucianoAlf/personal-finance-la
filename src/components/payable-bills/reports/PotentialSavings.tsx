import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PiggyBank, AlertTriangle, DollarSign, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, PotentialSavings as PotentialSavingsType } from '@/hooks/useBillReports';

interface PotentialSavingsProps {
  savings: PotentialSavingsType;
}

export function PotentialSavings({ savings }: PotentialSavingsProps) {
  const hasOverdue = savings.overdue_bills_count > 0;

  return (
    <Card className={cn(
      'relative overflow-hidden',
      hasOverdue 
        ? 'border-red-200 dark:border-red-900' 
        : 'border-green-200 dark:border-green-900'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-5 w-5" />
          Economia Potencial
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasOverdue ? (
          <div className="space-y-4">
            {/* Valor total de economia */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-4 bg-red-50 dark:bg-red-950/20 rounded-lg"
            >
              <p className="text-sm text-muted-foreground mb-1">
                Se pagar tudo em dia, você economiza:
              </p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(savings.total_potential_savings)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </motion.div>

            {/* Detalhamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Multas estimadas</span>
                </div>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(savings.estimated_fines)}
                </p>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Juros estimados</span>
                </div>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(savings.estimated_interest)}
                </p>
              </div>
            </div>

            {/* Contas vencidas */}
            <div className="flex items-center justify-between p-3 bg-red-100 dark:bg-red-950/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {savings.overdue_bills_count}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  conta{savings.overdue_bills_count > 1 ? 's' : ''} vencida{savings.overdue_bills_count > 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-red-600 font-medium">
                Pague agora!
              </span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-600 mb-1">
              Parabéns!
            </h3>
            <p className="text-sm text-muted-foreground">
              Você está em dia com todas as contas!
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Continue assim para evitar juros e multas
            </p>
          </motion.div>
        )}
      </CardContent>
      
      {/* Gradiente decorativo */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-1',
        hasOverdue ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-green-400 to-emerald-400'
      )} />
    </Card>
  );
}
