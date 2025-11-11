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
        .from('whatsapp_connection_status')
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
          .from('whatsapp_connection_status')
          .insert({
            user_id: userId,
            is_connected: false,
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

      // TODO: Chamar Edge Function ou N8N para gerar QR Code UAZAPI
      // Por ora, simular QR Code
      const mockQrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const expiryDate = new Date(Date.now() + 2 * 60 * 1000); // 2 minutos

      const { error: updateError } = await supabase
        .from('whatsapp_connection_status')
        .update({
          qr_code: mockQrCode,
          qr_code_expires_at: expiryDate.toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setQrCode(mockQrCode);
      setQrCodeExpiry(expiryDate);
      
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

      const { error: updateError } = await supabase
        .from('whatsapp_connection_status')
        .update({
          is_connected: false,
          phone_number: null,
          session_id: null,
          disconnected_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

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
          table: 'whatsapp_connection_status',
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
    isConnected: connection?.is_connected || false,
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
