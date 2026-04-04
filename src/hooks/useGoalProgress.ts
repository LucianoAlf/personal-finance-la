import { useMemo } from 'react';
import type { FinancialGoal, GoalProgress } from '@/types/database.types';

interface UseGoalProgressProps {
  goal: FinancialGoal;
}

export function useGoalProgress({ goal }: UseGoalProgressProps): GoalProgress {
  return useMemo(() => {
    const percentage = goal.target_amount > 0 
      ? Math.round((goal.current_amount / goal.target_amount) * 100)
      : 0;
    
    const remaining = goal.target_amount - goal.current_amount;
    
    // Determinar status baseado no tipo de meta
    let status: 'safe' | 'warning' | 'exceeded';
    
    if (goal.goal_type === 'savings') {
      // Para economia: quanto mais, melhor
      if (percentage >= 100) {
        status = 'exceeded'; // Completou!
      } else if (percentage >= 75) {
        status = 'warning'; // Perto de completar
      } else {
        status = 'safe';
      }
    } else {
      // Para limite de gastos: quanto menos, melhor
      if (percentage >= 100) {
        status = 'exceeded'; // Estourou o limite
      } else if (percentage >= 90) {
        status = 'warning'; // Perto do limite
      } else {
        status = 'safe';
      }
    }
    
    // Calcular dias restantes
    let days_left: number | undefined;
    if (goal.deadline) {
      const deadline = new Date(goal.deadline);
      const today = new Date();
      days_left = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else if (goal.period_end) {
      const period_end = new Date(goal.period_end);
      const today = new Date();
      days_left = Math.ceil((period_end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Calcular média diária (apenas para metas de gasto)
    let average_daily: number | undefined;
    let projected_total: number | undefined;
    
    if (goal.goal_type === 'spending_limit' && goal.period_start && goal.period_end) {
      const period_start = new Date(goal.period_start);
      const period_end = new Date(goal.period_end);
      const today = new Date();
      
      // Dias decorridos desde o início do período
      const elapsed_days = Math.max(
        1,
        Math.ceil((today.getTime() - period_start.getTime()) / (1000 * 60 * 60 * 24))
      );
      
      // Média diária de gastos
      average_daily = goal.current_amount / elapsed_days;
      
      // Total de dias no período
      const total_days = Math.ceil(
        (period_end.getTime() - period_start.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Projeção do total ao final do período
      projected_total = average_daily * total_days;
    }
    
    return {
      percentage,
      remaining,
      status,
      days_left,
      average_daily,
      projected_total,
    };
  }, [goal]);
}
