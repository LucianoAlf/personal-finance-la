// src/components/settings/AIProviderSettings.tsx
// Tab principal de configuração de Provedores de IA

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AIProviderCard } from './AIProviderCard';
import { CreateAIProviderDialog } from './CreateAIProviderDialog';
import type { AIProviderType } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';

export function AIProviderSettings() {
  const { providers, defaultProvider, validatedProviders, loading, updateProvider, setDefaultProvider, validateApiKey, refresh } = useAIProviders();
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);

  const providersList: AIProviderType[] = ['openai', 'gemini', 'claude', 'openrouter'];

  const handleCardClick = (provider: AIProviderType) => {
    setSelectedProvider(provider);
  };

  const getProviderConfig = (provider: AIProviderType) => {
    return providers.find((p) => p.provider === provider);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Configuração de IA - Ana Clara</CardTitle>
          </div>
          <CardDescription>
            Configure os provedores de IA que a Ana Clara usará para te ajudar com suas finanças.
            Você pode ter múltiplos provedores configurados e escolher qual será o padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultProvider ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>Provedor Padrão:</strong> {LABELS.aiProvider[defaultProvider.provider]} ({defaultProvider.model_name})
                {defaultProvider.is_validated && (
                  <span className="ml-2">✓ Validado</span>
                )}
              </AlertDescription>
            </Alert>
          ) : providers.length > 0 ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Nenhum provedor padrão definido. Selecione um provedor para ser usado por padrão.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Nenhum provedor de IA configurado. Configure pelo menos um provedor para usar a Ana Clara.
              </AlertDescription>
            </Alert>
          )}

          {/* Resumo */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{providers.length}</p>
              <p className="text-xs text-muted-foreground">Provedores configurados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{validatedProviders.length}</p>
              <p className="text-xs text-muted-foreground">API Keys validadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{defaultProvider ? 1 : 0}</p>
              <p className="text-xs text-muted-foreground">Provedor padrão</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Provedores */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Provedores Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providersList.map((provider) => {
            const config = getProviderConfig(provider);
            const isDefault = defaultProvider?.provider === provider;

            return (
              <AIProviderCard
                key={provider}
                provider={provider}
                config={config}
                isDefault={isDefault}
                onClick={() => handleCardClick(provider)}
                onUpdateModel={(prov, newModel) => updateProvider(prov, { model_name: newModel })}
                onSetDefault={(id) => setDefaultProvider(id)}
                onTestConnection={(prov, apiKey, modelName) => validateApiKey(prov, apiKey, modelName)}
              />
            );
          })}
        </div>
      </div>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1.</strong> Escolha um provedor de IA clicando em um dos cards acima
          </p>
          <p>
            <strong>2.</strong> Configure sua API Key e selecione o modelo desejado
          </p>
          <p>
            <strong>3.</strong> Ajuste os parâmetros de temperatura e personalize o prompt da Ana Clara
          </p>
          <p>
            <strong>4.</strong> Marque um provedor como padrão para ser usado automaticamente
          </p>
          <p className="pt-2 border-t">
            <strong>Dica:</strong> Provedores com modelos gratuitos (Gemini Pro, Open Router) são ótimos para começar!
          </p>
        </CardContent>
      </Card>

      {/* Dialog de Configuração */}
      {selectedProvider && (
        <CreateAIProviderDialog
          provider={selectedProvider}
          open={!!selectedProvider}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProvider(null);
              // Forçar refresh para atualizar UI imediatamente
              refresh();
            }
          }}
          existingConfig={getProviderConfig(selectedProvider)}
        />
      )}
    </div>
  );
}
