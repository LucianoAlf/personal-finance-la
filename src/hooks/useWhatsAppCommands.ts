import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WhatsAppQuickCommand } from '@/types/whatsapp.types';

interface UseWhatsAppCommandsReturn {
  commands: WhatsAppQuickCommand[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWhatsAppCommands(): UseWhatsAppCommandsReturn {
  const [commands, setCommands] = useState<WhatsAppQuickCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommands = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('whatsapp_quick_commands')
        .select('*')
        .eq('is_active', true)
        .order('command');

      if (queryError) throw queryError;

      setCommands((data as WhatsAppQuickCommand[]) ?? []);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Não foi possível carregar os comandos';
      setError(message);
      setCommands([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCommands();
  }, [fetchCommands]);

  return { commands, isLoading, error, refetch: fetchCommands };
}
