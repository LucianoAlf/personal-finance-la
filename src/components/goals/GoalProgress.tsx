import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GoalProgressProps {
  current: number;
  target: number;
  status?: 'safe' | 'warning' | 'exceeded';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
  inverse?: boolean; // true para metas de gasto (quanto menos, melhor)
}

export function GoalProgress({
  current,
  target,
  status = 'safe',
  showLabel = true,
  animated = true,
  className,
  inverse = false,
}: GoalProgressProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  // Cores baseadas no status e tipo de meta
  const getColorClasses = () => {
    if (inverse) {
      // Metas de gasto: quanto menos, melhor (cores invertidas)
      if (status === 'exceeded') return 'bg-red-500';
      if (status === 'warning') return 'bg-orange-500';
      return 'bg-green-500';
    } else {
      // Metas de economia: quanto mais, melhor
      if (status === 'exceeded') return 'bg-green-500';
      if (status === 'warning') return 'bg-yellow-500';
      return 'bg-blue-500';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Barra de progresso */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', getColorClasses())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Label com percentual */}
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">
            {percentage.toFixed(0)}%
          </span>
          <span className={cn(
            'font-semibold',
            status === 'exceeded' && (inverse ? 'text-red-600' : 'text-green-600'),
            status === 'warning' && (inverse ? 'text-orange-600' : 'text-yellow-600'),
            status === 'safe' && (inverse ? 'text-green-600' : 'text-blue-600')
          )}>
            {inverse ? (
              percentage >= 100 ? '🚨 Limite excedido' : 
              percentage >= 90 ? '⚠️ Perto do limite' : 
              '✅ Dentro do limite'
            ) : (
              percentage >= 100 ? '🎉 Meta alcançada!' : 
              percentage >= 75 ? '🔥 Quase lá!' : 
              '💪 Continue assim'
            )}
          </span>
        </div>
      )}
    </div>
  );
}
