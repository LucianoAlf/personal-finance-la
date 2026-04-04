import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, X } from 'lucide-react';
import { TIER_CONFIG } from '@/config/achievements';

interface AchievementUnlockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementName: string;
  achievementDescription: string;
  tier: 'bronze' | 'silver' | 'gold';
  xpReward: number;
  icon: React.ComponentType<{ className?: string }>;
}

export function AchievementUnlockedModal({
  open,
  onOpenChange,
  achievementName,
  achievementDescription,
  tier,
  xpReward,
  icon: Icon,
}: AchievementUnlockedModalProps) {
  const tierConfig = TIER_CONFIG[tier];

  // Disparar confete quando abrir
  useEffect(() => {
    if (open) {
      // Confete inicial
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });

      // Confete adicional após 200ms
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
      }, 200);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
      }, 400);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-4 border-yellow-400">
        {/* Botão fechar */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 rounded-full p-2 bg-white/80 hover:bg-white transition-colors"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative"
            >
              {/* Background com gradiente */}
              <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 p-8 text-center">
                {/* Ícone da conquista */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="mx-auto mb-4"
                >
                  <div className="w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center mx-auto">
                    <Icon className="h-12 w-12 text-yellow-600" />
                  </div>
                </motion.div>

                {/* Título */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="h-6 w-6 text-white" />
                    <h2 className="text-3xl font-bold text-white">
                      Conquista Desbloqueada!
                    </h2>
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                </motion.div>

                {/* Nome da conquista */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl">{tierConfig.emoji}</span>
                    <h3 className="text-2xl font-bold text-white">
                      {achievementName}
                    </h3>
                  </div>
                  <p className="text-sm text-white/90 mt-1">
                    {tierConfig.label}
                  </p>
                </motion.div>

                {/* Descrição */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white/90 mb-4"
                >
                  {achievementDescription}
                </motion.p>

                {/* XP Reward */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 mb-4"
                >
                  <p className="text-white font-bold text-lg">
                    +{xpReward} XP
                  </p>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="bg-white p-6 text-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <p className="text-gray-600 mb-4">
                    Continue progredindo para desbloquear mais conquistas!
                  </p>
                  <Button
                    onClick={() => onOpenChange(false)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold px-8"
                  >
                    Incrível! 🎉
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
