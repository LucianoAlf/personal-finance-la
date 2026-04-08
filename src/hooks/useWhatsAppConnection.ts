/**
 * Hook: useWhatsAppConnection
 * Responsabilidade: Gerenciar conexão WhatsApp do usuário
 * 
 * Features:
 * - Status de conexão em tempo real
 * - QR Code para conexão
 * - Estatísticas de uso
 * - Reconectar/Desconectar
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { WhatsAppConnectionStatus } from '@/types/whatsapp.types';

interface UseWhatsAppConnectionReturn {
  connection: WhatsAppConnectionStatus | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  qrCode: string | null;
  qrCodeExpiry: Date | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshQRCode: () => Promise<void>;
  refreshConnection: () => Promise<void>;
}

export function useWhatsAppConnection(): UseWhatsAppConnectionReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const [connection, setConnection] = useState<WhatsAppConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeExpiry, setQrCodeExpiry] = useState<Date | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch connection status
  const fetchConnection = async () => {
    if (!userId) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setConnection(data);
        
        // Verificar se QR Code ainda é válido
        if (data.qr_code && data.qr_code_expires_at) {
          const expiryDate = new Date(data.qr_code_expires_at);
          if (expiryDate > new Date()) {
            setQrCode(data.qr_code);
            setQrCodeExpiry(expiryDate);
          } else {
            setQrCode(null);
            setQrCodeExpiry(null);
          }
        }
      } else {
        // Criar registro inicial se não existir
        const { data: newConnection, error: createError } = await supabase
          .from('whatsapp_connections')
          .insert({
            user_id: userId,
            connected: false,
            status: 'disconnected',
          })
          .select()
          .single();

        if (createError) throw createError;
        setConnection(newConnection);
      }
    } catch (err) {
      console.error('Erro ao buscar status de conexão:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to WhatsApp (generate QR Code)
  const connect = async () => {
    if (!userId || !connection) return;

    try {
      setIsLoading(true);
      setError(null);

      // ✅ Chamar Edge Function para gerar QR Code real via UAZAPI
      console.log('[useWhatsAppConnection] Chamando generate-qr-code...');
      
      const { data, error: functionError } = await supabase.functions.invoke('generate-qr-code', {
        body: { user_id: userId },
      });

      if (functionError) {
        console.error('[useWhatsAppConnection] Erro na Edge Function:', functionError);
        throw functionError;
      }

      if (!data?.success || !data?.qrCode) {
        throw new Error(data?.error || 'Falha ao gerar QR Code');
      }

      console.log('[useWhatsAppConnection] ✅ QR Code gerado com sucesso');

      setQrCode(data.qrCode);
      setQrCodeExpiry(new Date(data.expiresAt));
      
      await fetchConnection();
    } catch (err) {
      console.error('Erro ao conectar WhatsApp:', err);
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from WhatsApp
  const disconnect = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { error: functionError } = await supabase.functions.invoke('disconnect-whatsapp', {
        body: {},
      });

      if (functionError) {
        console.error('[useWhatsAppConnection] Erro na Edge Function disconnect-whatsapp:', functionError);
        throw functionError;
      }

      setQrCode(null);
      setQrCodeExpiry(null);
      await fetchConnection();
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err);
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh QR Code
  const refreshQRCode = async () => {
    await connect();
  };

  // Refresh connection status
  const refreshConnection = async () => {
    await fetchConnection();
  };

  // Initial fetch
  useEffect(() => {
    fetchConnection();
  }, [userId]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`whatsapp_connection:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setConnection(payload.new as WhatsAppConnectionStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Auto-refresh QR Code expirado
  useEffect(() => {
    if (!qrCodeExpiry) return;

    const interval = setInterval(() => {
      if (new Date() > qrCodeExpiry) {
        setQrCode(null);
        setQrCodeExpiry(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrCodeExpiry]);

  return {
    connection,
    isConnected: connection?.connected || false,
    isLoading,
    error,
    qrCode,
    qrCodeExpiry,
    connect,
    disconnect,
    refreshQRCode,
    refreshConnection,
  };
}
