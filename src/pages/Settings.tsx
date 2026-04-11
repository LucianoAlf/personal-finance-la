// src/pages/Settings.tsx
// Página principal de configurações com 5 tabs

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/layout/PageContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Sparkles, Link, Webhook, Bell } from 'lucide-react';

// Settings tabs components
import { AIProviderSettings } from '@/components/settings/AIProviderSettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { WebhooksSettings } from '@/components/settings/WebhooksSettings';
import {
  settingsTabsListClassName,
  settingsTabsTriggerClassName,
} from '@/components/settings/settingsSemantics';

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Configurações"
        subtitle="Personalize sua experiência e configure integrações"
        icon={<SettingsIcon size={24} />}
      />

      <PageContent className="py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`${settingsTabsListClassName} grid-cols-5`}>
            <TabsTrigger value="general" className={settingsTabsTriggerClassName}>
              <User className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="ai" className={settingsTabsTriggerClassName}>
              <Sparkles className="h-4 w-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="integrations" className={settingsTabsTriggerClassName}>
              <Link className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="webhooks" className={settingsTabsTriggerClassName}>
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="notifications" className={settingsTabsTriggerClassName}>
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
      </PageContent>
    </div>
  );
}
