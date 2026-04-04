import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  formatCurrency, 
  TopIncrease,
  getBillTypeLabel
} from '@/hooks/useBillReports';

interface TopIncreasesProps {
  increases: TopIncrease[];
}

export function TopIncreases({ increases }: TopIncreasesProps) {
  if (increases.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Contas que Mais Subiram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma variação significativa detectada</p>
            <p className="text-xs mt-1">Suas contas estão estáveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Encontrar o maior aumento para calcular a largura das barras
  const maxIncrease = Math.max(...increases.map(i => i.difference));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Contas que Mais Subiram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {increases.map((increase, index) => {
          const barWidth = (increase.difference / maxIncrease) * 100;
          const isHighVariation = increase.variation_percent > 30;
          
          return (
            <motion.div
              key={`${increase.description}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">
                    {increase.description}
                  </span>
                  {increase.provider && (
                    <span className="text-xs text-muted-foreground truncate">
                      ({increase.provider})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={cn(
                    'text-sm font-bold',
                    isHighVariation ? 'text-red-600' : 'text-orange-600'
                  )}>
                    +{increase.variation_percent.toFixed(0)}%
                  </span>
                  <ArrowUpRight className={cn(
                    'h-4 w-4',
                    isHighVariation ? 'text-red-500' : 'text-orange-500'
                  )} />
                </div>
              </div>
              
              {/* Barra de progresso */}
              <div className="relative h-6 bg-muted rounded-md overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-md',
                    isHighVariation 
                      ? 'bg-gradient-to-r from-red-400 to-red-500' 
                      : 'bg-gradient-to-r from-orange-400 to-orange-500'
                  )}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
                  <span className="text-white font-medium drop-shadow-sm">
                    {formatCurrency(increase.previous_amount)} → {formatCurrency(increase.current_amount)}
                  </span>
                  <span className={cn(
                    'font-bold',
                    barWidth > 50 ? 'text-white drop-shadow-sm' : 'text-foreground'
                  )}>
                    +{formatCurrency(increase.difference)}
                  </span>
                </div>
              </div>
              
              {/* Badge de categoria */}
              <div className="mt-1">
                <span className="text-xs text-muted-foreground">
                  {getBillTypeLabel(increase.bill_type)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
