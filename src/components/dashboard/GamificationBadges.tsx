// WIDGET ANA CLARA DASHBOARD - Gamificação (Streaks + Badges)
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';

interface GamificationBadgesProps {
  meta?: {
    bills?: { onTimeRate: number; overdueCount: number };
    weekly?: { income: number[]; expenses: number[] };
    dailyOverdue?: number[];
  };
}

export function GamificationBadges({ meta }: GamificationBadgesProps) {
  // Calcular streak de dias sem contas vencidas (últimos 14 dias)
  const billsStreak = useMemo(() => {
    if (!meta?.dailyOverdue) return 0;
    let streak = 0;
    for (let i = 0; i < meta.dailyOverdue.length; i++) {
      if (meta.dailyOverdue[i] === 0) streak++;
      else break;
    }
    return streak;
  }, [meta?.dailyOverdue]);

  // Badge "Poupador Ninja": 3/3 semanas com saldo positivo
  const isPoupadorNinja = useMemo(() => {
    if (!meta?.weekly) return false;
    const { income, expenses } = meta.weekly;
    return income.every((inc, i) => inc > expenses[i]);
  }, [meta?.weekly]);

  // Badge "Investidor Disciplinado": retorno positivo
  const isInvestidorDisciplinado = useMemo(() => {
    const rate = meta?.bills?.onTimeRate ?? 0;
    console.log('[GamificationBadges] onTimeRate:', rate, 'meta.bills:', meta?.bills);
    return rate >= 80;
  }, [meta?.bills]);

  if (!meta) return null;

  // Contar badges desbloqueados
  const unlockedCount = [
    billsStreak > 0,
    isPoupadorNinja,
    isInvestidorDisciplinado
  ].filter(Boolean).length;

  // Se nenhum badge desbloqueado, não renderizar nada
  if (unlockedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Streak de dias sem atraso - só se > 0 */}
      {billsStreak > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Badge variant="outline" className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300">
            <Flame className="h-3 w-3" />
            {billsStreak} {billsStreak === 1 ? 'dia' : 'dias'} sem atraso
          </Badge>
        </motion.div>
      )}

      {/* Badge Poupador Ninja - só se desbloqueado */}
      {isPoupadorNinja && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
        >
          <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-700 border-green-300">
            <PiggyBank className="h-3 w-3" />
            Poupador Ninja
          </Badge>
        </motion.div>
      )}

      {/* Badge Investidor Disciplinado - só se desbloqueado */}
      {isInvestidorDisciplinado && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
        >
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-100 text-blue-700 border-blue-300">
            <TrendingUp className="h-3 w-3" />
            Investidor Disciplinado
          </Badge>
        </motion.div>
      )}
    </div>
  );
}
