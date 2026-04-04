// src/pages/Settings.tsx
// Página principal de configurações com 5 tabs

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Sparkles, Link, Webhook, Bell } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

// Settings tabs components
import { AIProviderSettings } from '@/components/settings/AIProviderSettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { WebhooksSettings } from '@/components/settings/WebhooksSettings';

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { loading } = useSettings();

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Configurações"
        subtitle="Personalize sua experiência e configure integrações"
        icon={<SettingsIcon size={24} />}
      />

      <div className="container mx-auto max-w-7xl p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="gap-2">
              <User className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Link className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <AIProviderSettings />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <IntegrationsSettings />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhooksSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationsSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
