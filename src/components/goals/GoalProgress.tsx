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
      <div className="relative h-3 overflow-hidden rounded-full bg-surface-overlay">
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
          <span className="font-medium text-muted-foreground">
            {percentage.toFixed(0)}%
          </span>
          <span
            className={cn(
              'font-semibold',
              status === 'exceeded' && (inverse ? 'text-danger' : 'text-success'),
              status === 'warning' && (inverse ? 'text-warning' : 'text-warning'),
              status === 'safe' && (inverse ? 'text-success' : 'text-primary')
            )}
          >
            {inverse ? (
              percentage >= 100 ? 'Limite excedido' :
              percentage >= 90 ? 'Perto do limite' :
              'Dentro do limite'
            ) : (
              percentage >= 100 ? 'Meta alcançada' :
              percentage >= 75 ? 'Quase lá' :
              'Continue assim'
            )}
          </span>
        </div>
      )}
    </div>
  );
}
