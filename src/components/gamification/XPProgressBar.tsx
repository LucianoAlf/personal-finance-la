import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface XPProgressBarProps {
  level: number;
  xp: number;
  xpForNextLevel: number;
  levelTitle: string;
  totalXP: number;
}

export function XPProgressBar({
  level,
  xp,
  xpForNextLevel,
  levelTitle,
  totalXP,
}: XPProgressBarProps) {
  const progress = xpForNextLevel > 0 ? (xp / xpForNextLevel) * 100 : 0;
  const xpRemaining = xpForNextLevel - xp;

  // Cor do gradiente baseada no progresso
  const getGradientColor = () => {
    if (progress < 33) return 'from-blue-500 to-blue-600';
    if (progress < 66) return 'from-purple-500 to-purple-600';
    return 'from-yellow-500 to-yellow-600';
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {level}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Nível {level}
            </h3>
            <p className="text-sm text-indigo-600 font-semibold">{levelTitle}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-indigo-600">
            <Zap className="h-4 w-4 fill-current" />
            <span className="text-sm font-semibold">{totalXP.toLocaleString('pt-BR')} XP Total</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {xp.toLocaleString('pt-BR')} / {xpForNextLevel.toLocaleString('pt-BR')} XP
          </span>
          <span className="font-bold text-indigo-600">{Math.round(progress)}%</span>
        </div>

        {/* Barra de progresso */}
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getGradientColor()} rounded-full shadow-lg`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 1,
              ease: 'easeOut',
              type: 'spring',
              stiffness: 50,
            }}
          >
            {/* Brilho animado */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>

          {/* Marcadores de milestone (25%, 50%, 75%) */}
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
              style={{ left: `${milestone}%` }}
            />
          ))}
        </div>

        {/* Texto de incentivo */}
        <p className="text-xs text-gray-600 text-center">
          {xpRemaining > 0 ? (
            <>
              Faltam <span className="font-bold text-indigo-600">{xpRemaining.toLocaleString('pt-BR')} XP</span> para o próximo nível! 🚀
            </>
          ) : (
            <>Parabéns! Você atingiu o nível máximo! 👑</>
          )}
        </p>
      </div>

      {/* Micro-animação de pulso quando próximo de completar */}
      {progress >= 90 && progress < 100 && (
        <motion.div
          className="mt-3 text-center text-xs font-semibold text-yellow-600"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          🔥 Quase lá! Continue assim!
        </motion.div>
      )}
    </Card>
  );
}
