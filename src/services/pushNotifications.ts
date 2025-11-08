/**
 * Service para gerenciamento de Push Notifications
 * Implementação completa usando Web Push API + Service Workers + VAPID keys
 */

import { supabase } from '@/lib/supabase';

/**
 * Interface para token de push notification
 */
export interface PushToken {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Service de Push Notifications (stub)
 */
export class PushNotificationService {
  /**
   * Verifica se o ambiente suporta notificações
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Solicita permissão para enviar notificações
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications não suportadas neste ambiente');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }

  /**
   * Registra o Service Worker
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push] Service Worker registrado:', registration);
      return registration;
    } catch (error) {
      console.error('[Push] Erro ao registrar Service Worker:', error);
      return null;
    }
  }

  /**
   * Obtém a subscription do push
   */
  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('[Push] Erro ao obter subscription:', error);
      return null;
    }
  }

  /**
   * Cria uma nova subscription
   */
  static async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      console.log('[Push] Subscription criada:', subscription);
      return subscription;
    } catch (error) {
      console.error('[Push] Erro ao criar subscription:', error);
      return null;
    }
  }

  /**
   * Converte VAPID key de base64 para Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Registra o token de push notification no Supabase
   */
  static async registerPushToken(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      const token: PushToken = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          endpoint: token.endpoint,
          p256dh: token.keys.p256dh,
          auth: token.keys.auth,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      console.log('[Push] Token registrado no Supabase');
    } catch (error) {
      console.error('[Push] Erro ao registrar token:', error);
      throw error;
    }
  }

  /**
   * Remove o registro do token de push notification
   */
  static async unregisterPushToken(userId: string): Promise<void> {
    try {
      const subscription = await this.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      console.log('[Push] Token removido do Supabase');
    } catch (error) {
      console.error('[Push] Erro ao remover token:', error);
      throw error;
    }
  }

  /**
   * Converte ArrayBuffer para Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Configura listeners para notificações recebidas
   */
  static async setupListeners(): Promise<void> {
    if (!this.isSupported()) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[Push] Mensagem recebida do SW:', event.data);
    });
  }

  /**
   * Envia uma notificação local
   */
  static async sendLocalNotification(title: string, body: string): Promise<void> {
    if (!this.isSupported()) return;

    const permission = await this.requestPermission();
    if (!permission) return;

    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    } catch (error) {
      console.error('Erro ao enviar notificação local:', error);
    }
  }

  /**
   * Limpa todas as notificações
   */
  static async clearAllNotifications(): Promise<void> {
    // TODO: Implementar quando Web Push API estiver configurada
    console.log('Clear all notifications (stub)');
  }
}

// Export default para compatibilidade
export default PushNotificationService;
