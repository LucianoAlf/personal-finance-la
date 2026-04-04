import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, TopProvider } from '@/hooks/useBillReports';

interface TopProvidersProps {
  providers: TopProvider[];
  totalAmount: number;
}

export function TopProviders({ providers, totalAmount }: TopProvidersProps) {
  if (providers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Top 5 Maiores Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sem dados para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cores para ranking
  const rankColors = [
    'bg-gradient-to-r from-yellow-400 to-amber-500', // 1º
    'bg-gradient-to-r from-gray-300 to-gray-400',    // 2º
    'bg-gradient-to-r from-orange-400 to-orange-500', // 3º
    'bg-gradient-to-r from-indigo-400 to-indigo-500', // 4º
    'bg-gradient-to-r from-purple-400 to-purple-500'  // 5º
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5" />
          Top 5 Maiores Gastos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider, index) => {
          const percentage = totalAmount > 0 
            ? (provider.total / totalAmount * 100) 
            : 0;
          
          return (
            <motion.div
              key={provider.provider}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-center gap-3">
                {/* Posição */}
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0',
                  rankColors[index] || 'bg-gray-400'
                )}>
                  {index + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {provider.provider}
                    </span>
                    <span className="text-sm font-bold ml-2">
                      {formatCurrency(provider.total)}
                    </span>
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                      className={cn(
                        'h-full rounded-full',
                        rankColors[index] || 'bg-gray-400'
                      )}
                    />
                  </div>
                  
                  {/* Detalhes */}
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{provider.count} conta{provider.count > 1 ? 's' : ''}</span>
                    <span>{percentage.toFixed(1)}% do total</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
