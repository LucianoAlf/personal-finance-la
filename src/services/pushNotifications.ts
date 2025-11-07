/**
 * Service para gerenciamento de Push Notifications
 *
 * NOTA: Esta versão é um stub temporário.
 * A implementação completa de Web Push Notifications será feita posteriormente
 * usando Web Push API + Service Workers + VAPID keys (conforme FASE 2 do planejamento).
 *
 * Para implementação futura, consulte:
 * - supabase/functions/send-bill-reminders/push.ts
 * - Documentação em docs/whatsapp-setup.md
 */

/**
 * Interface para token de push notification
 */
export interface PushToken {
  token: string;
  type: 'web' | 'fcm' | 'apns';
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
   * Registra o token de push notification no Supabase
   */
  static async registerPushToken(userId: string, token: PushToken): Promise<void> {
    // TODO: Implementar quando Web Push API estiver configurada
    console.log('Push token registration (stub):', { userId, token });
  }

  /**
   * Remove o registro do token de push notification
   */
  static async unregisterPushToken(userId: string): Promise<void> {
    // TODO: Implementar quando Web Push API estiver configurada
    console.log('Push token unregistration (stub):', { userId });
  }

  /**
   * Configura listeners para notificações recebidas
   */
  static async setupListeners(): Promise<void> {
    // TODO: Implementar quando Web Push API estiver configurada
    console.log('Push notification listeners setup (stub)');
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
