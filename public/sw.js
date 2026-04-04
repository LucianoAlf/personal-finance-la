// Service Worker para Push Notifications
// Personal Finance LA - Ana Clara

const CACHE_NAME = 'personal-finance-v1';

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(clients.claim());
});

// Listener para Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push recebido!', event);
  
  // Dados padrão da notificação
  let title = '🔔 Lembrete Ana Clara';
  let options = {
    body: 'Alf, você tem uma conta a pagar!',
    icon: '/icon-512.png',
    badge: '/icon-192.png',
    image: '/icon-512.png', // Imagem grande na notificação
    tag: 'bill-reminder',
    requireInteraction: true, // Não desaparece automaticamente
    silent: false, // Com som
    vibrate: [300, 200, 300, 200, 300], // Vibração mais longa
    renotify: true, // Renotifica se já existir
    timestamp: Date.now(),
    data: { url: '/contas-pagar' },
    // Ações na notificação (Android)
    actions: [
      {
        action: 'view',
        title: '👁️ Ver Conta',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: '✖️ Dispensar',
        icon: '/icon-192.png'
      }
    ]
  };

  // Tentar ler payload se existir
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] ✅ Payload recebido:', payload);
      
      if (payload.title) title = payload.title;
      if (payload.body) options.body = payload.body;
      if (payload.icon) options.icon = payload.icon;
      if (payload.image) options.image = payload.image;
      if (payload.data) options.data = payload.data;
      if (payload.actions) options.actions = payload.actions;
    } catch (error) {
      console.log('[SW] ⚠️ Sem payload, usando padrão');
    }
  }

  console.log('[SW] 📢 Mostrando notificação:', title, options);

  // SEMPRE mostrar a notificação
  const promiseChain = self.registration.showNotification(title, options);

  event.waitUntil(promiseChain);
});

// Listener para cliques na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  console.log('[SW] Ação:', event.action);

  event.notification.close();

  // Se clicou em "Dispensar", apenas fecha
  if (event.action === 'dismiss') {
    return;
  }

  // Para "Ver Conta" ou clique na notificação
  const urlToOpen = event.notification.data?.url || '/contas-pagar';

  // Abrir ou focar na aba do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma aba aberta, focar nela e navegar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      // Senão, abrir nova aba
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listener para fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event);
});
