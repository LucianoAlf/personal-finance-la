import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AgendaItem, AgendaWindowParams } from '@/types/calendar.types';

const fetchAgendaWindow = async (params: AgendaWindowParams): Promise<AgendaItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc('get_agenda_window', {
    p_user_id: user.id,
    p_from: params.from,
    p_to: params.to,
  });

  if (error) throw error;
  return (data ?? []) as AgendaItem[];
};

export function useCalendarAgenda(params: AgendaWindowParams) {
  return useQuery<AgendaItem[]>({
    queryKey: ['calendar', 'agenda', params.from, params.to],
    queryFn: () => fetchAgendaWindow(params),
    staleTime: 60_000,
    enabled: !!params.from && !!params.to,
  });
}
