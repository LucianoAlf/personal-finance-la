import { supabase } from '@/lib/supabase';

export type GamificationEvent =
  | 'create_transaction'
  | 'create_goal'
  | 'add_goal_contribution'
  | 'pay_bill'
  | 'create_investment'
  | 'investment_activity'
  | 'sync_only';

export async function bootstrapGamificationState(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('bootstrap_gamification_state', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao inicializar gamificação canônica:', error);
    return false;
  }
}

export async function processGamificationEvent(event: GamificationEvent): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('process_gamification_event', {
      p_user_id: user.id,
      p_event: event,
      p_activity_date: new Date().toISOString().slice(0, 10),
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Erro ao processar evento de gamificação "${event}":`, error);
    return false;
  }
}
