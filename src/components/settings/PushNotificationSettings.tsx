/**
 * Componente para gerenciar configurações de Push Notifications
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PushNotificationService } from '@/services/pushNotifications';
import { supabase } from '@/lib/supabase';

export function PushNotificationSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    checkPushStatus();
  }, []);

  async function checkPushStatus() {
    if (!PushNotificationService.isSupported()) {
      return;
    }

    // Verificar permissão do browser
    setPermission(Notification.permission);

    // Verificar se tem subscription ativa
    const subscription = await PushNotificationService.getSubscription();
    setIsEnabled(!!subscription);
  }

  async function handleEnablePush() {
    setIsLoading(true);

    try {
      // 1. Verificar suporte
      if (!PushNotificationService.isSupported()) {
        toast({
          title: '❌ Não suportado',
          description: 'Seu navegador não suporta notificações push',
          variant: 'destructive',
        });
        return;
      }

      // 2. Solicitar permissão
      const hasPermission = await PushNotificationService.requestPermission();
      if (!hasPermission) {
        toast({
          title: '❌ Permissão negada',
          description: 'Você precisa permitir notificações nas configurações do navegador',
          variant: 'destructive',
        });
        return;
      }

      // 3. Registrar Service Worker
      const registration = await PushNotificationService.registerServiceWorker();
      if (!registration) {
        throw new Error('Falha ao registrar Service Worker');
      }

      // 4. Criar subscription
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key não configurada');
      }

      const subscription = await PushNotificationService.subscribe(vapidPublicKey);
      if (!subscription) {
        throw new Error('Falha ao criar subscription');
      }

      // 5. Salvar token no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      await PushNotificationService.registerPushToken(user.id, subscription);

      // 6. Atualizar estado
      setIsEnabled(true);
      setPermission('granted');

      toast({
        title: '✅ Notificações ativadas!',
        description: 'Você receberá lembretes de contas a pagar',
      });

      console.log('[Push] ✅ Push notifications ativadas com sucesso');
    } catch (error: any) {
      console.error('[Push] ❌ Erro ao ativar:', error);
      toast({
        title: '❌ Erro ao ativar',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisablePush() {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      await PushNotificationService.unregisterPushToken(user.id);

      setIsEnabled(false);

      toast({
        title: '🔕 Notificações desativadas',
        description: 'Você não receberá mais notificações push',
      });

      console.log('[Push] 🔕 Push notifications desativadas');
    } catch (error: any) {
      console.error('[Push] ❌ Erro ao desativar:', error);
      toast({
        title: '❌ Erro ao desativar',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Se não suporta push
  if (!PushNotificationService.isSupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba lembretes de contas a pagar diretamente no navegador
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Ativado</p>
                  <p className="text-sm text-muted-foreground">
                    Você receberá notificações
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Desativado</p>
                  <p className="text-sm text-muted-foreground">
                    Ative para receber lembretes
                  </p>
                </div>
              </>
            )}
          </div>

          {isEnabled ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisablePush}
                disabled={isLoading}
              >
                {isLoading ? 'Desativando...' : 'Desativar'}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    if ('serviceWorker' in navigator && 'Notification' in window) {
                      console.log('🧪 Testando notificação...');
                      console.log('Permissão:', Notification.permission);
                      
                      if (Notification.permission !== 'granted') {
                        alert('❌ Permissão negada! Status: ' + Notification.permission);
                        return;
                      }
                      
                      const registration = await navigator.serviceWorker.ready;
                      console.log('✅ Service Worker pronto');
                      registration.showNotification('🧪 Teste Manual', {
                        body: 'Se você viu isso, as notificações estão funcionando!',
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        requireInteraction: true,
                      } as NotificationOptions);
                      
                      console.log('✅ showNotification chamado!');
                      alert('✅ Notificação disparada! Verifique o canto da tela.');
                    }
                  } catch (error) {
                    console.error('❌ Erro:', error);
                    alert('❌ Erro: ' + error.message);
                  }
                }}
                variant="outline"
                className="flex-1"
              >
                🧪 Testar Agora
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleEnablePush}
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              {isLoading ? 'Ativando...' : 'Ativar Notificações'}
            </Button>
          )}
        </div>

        {/* Informações */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            Lembretes de contas próximas ao vencimento
          </p>
          <p className="flex items-center gap-2">
            <span className="text-lg">⏰</span>
            Notificações enviadas no horário configurado
          </p>
          <p className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            Seus dados são criptografados e seguros
          </p>
        </div>

        {/* Permissão negada */}
        {permission === 'denied' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Permissão negada.</strong> Para ativar notificações, você precisa
              permitir nas configurações do navegador.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
