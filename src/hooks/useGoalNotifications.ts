import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FinancialGoalWithCategory } from '@/types/database.types';

interface UseGoalNotificationsProps {
  goals: FinancialGoalWithCategory[];
}

export function useGoalNotifications({ goals }: UseGoalNotificationsProps) {
  const { toast } = useToast();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    goals.forEach(goal => {
      if (goal.goal_type === 'spending_limit') {
        const percentage = goal.percentage;
        
        // Criar chave única para cada notificação
        const getNotificationKey = (threshold: number) => 
          `${goal.id}_${threshold}_${new Date().getMonth()}`;

        // Notificação: 100% (Meta excedida)
        if (percentage >= 100) {
          const key = getNotificationKey(100);
          if (!notifiedRef.current.has(key)) {
            toast({
              title: '🔴 Meta excedida!',
              description: `${goal.category_name}: Você gastou ${goal.current_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${goal.target_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
              variant: 'destructive',
            });
            notifiedRef.current.add(key);
          }
        }
        // Notificação: 90% (Atenção)
        else if (percentage >= 90) {
          const key = getNotificationKey(90);
          if (!notifiedRef.current.has(key)) {
            const remaining = goal.target_amount - goal.current_amount;
            toast({
              title: '🚨 Atenção! 90% da meta',
              description: `${goal.category_name}: Faltam apenas ${remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para o limite`,
            });
            notifiedRef.current.add(key);
          }
        }
        // Notificação: 80% (Alerta)
        else if (percentage >= 80) {
          const key = getNotificationKey(80);
          if (!notifiedRef.current.has(key)) {
            toast({
              title: '⚠️ 80% da meta atingidos',
              description: `${goal.category_name}: Controle seus gastos!`,
            });
            notifiedRef.current.add(key);
          }
        }
      } else if (goal.goal_type === 'savings') {
        const percentage = goal.percentage;
        
        const getNotificationKey = (threshold: number) => 
          `${goal.id}_${threshold}`;

        // Celebrações de economia
        if (percentage >= 100) {
          const key = getNotificationKey(100);
          if (!notifiedRef.current.has(key)) {
            toast({
              title: '🏆 META ALCANÇADA!',
              description: `${goal.name}: Parabéns! Você conquistou seu objetivo!`,
              variant: 'default',
            });
            notifiedRef.current.add(key);
          }
        } else if (percentage >= 75) {
          const key = getNotificationKey(75);
          if (!notifiedRef.current.has(key)) {
            toast({
              title: '🔥 Quase lá! 75% completos',
              description: `${goal.name}: Continue assim!`,
            });
            notifiedRef.current.add(key);
          }
        } else if (percentage >= 50) {
          const key = getNotificationKey(50);
          if (!notifiedRef.current.has(key)) {
            toast({
              title: '🎊 Você está na metade do caminho!',
              description: `${goal.name}: 50% da meta alcançados`,
            });
            notifiedRef.current.add(key);
          }
        } else if (percentage >= 25) {
          const key = getNotificationKey(25);
          if (!notifiedRef.current.has(key)) {
            toast({
              title: '🎉 Parabéns! 25% da meta',
              description: `${goal.name}: Bom começo!`,
            });
            notifiedRef.current.add(key);
          }
        }
      }
    });

    // Notificação de streak
    const bestStreak = Math.max(...goals.map(g => g.best_streak), 0);
    if (bestStreak >= 3) {
      const key = `streak_${bestStreak}`;
      if (!notifiedRef.current.has(key)) {
        toast({
          title: `🔥 Novo recorde! ${bestStreak} meses consecutivos`,
          description: 'Continue mantendo suas metas em dia!',
        });
        notifiedRef.current.add(key);
      }
    }
  }, [goals, toast]);

  // Limpar notificações antigas a cada mês
  useEffect(() => {
    const currentMonth = new Date().getMonth();
    const cleanup = setInterval(() => {
      const newMonth = new Date().getMonth();
      if (newMonth !== currentMonth) {
        notifiedRef.current.clear();
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(cleanup);
  }, []);
}
