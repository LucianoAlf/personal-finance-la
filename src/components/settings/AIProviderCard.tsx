// src/components/settings/AIProviderCard.tsx
// Card visual para cada provedor de IA

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Sparkles, Settings, Bot, Target, Shuffle, Star, RefreshCw, Loader2 } from 'lucide-react';
import type { AIProviderConfig, AIProviderType } from '@/types/settings.types';
import { LABELS, AI_MODELS } from '@/types/settings.types';
import { toast } from 'sonner';
import { useState } from 'react';

interface AIProviderCardProps {
  provider: AIProviderType;
  config?: AIProviderConfig;
  isDefault?: boolean;
  onClick: () => void;
  onUpdateModel: (provider: AIProviderType, newModel: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onTestConnection: (
    provider: AIProviderType,
    apiKey: string,
    modelName?: string,
  ) => Promise<{ valid: boolean; error?: string; tested_model?: string; responded_model?: string } | any>;
}

const PROVIDER_COLORS = {
  openai: 'from-green-500 to-emerald-600',
  gemini: 'from-blue-500 to-indigo-600',
  claude: 'from-orange-500 to-amber-600',
  openrouter: 'from-purple-500 to-violet-600',
} as const;

const PROVIDER_ICONS = {
  openai: Bot,
  gemini: Sparkles,
  claude: Target,
  openrouter: Shuffle,
} as const;

export function AIProviderCard({ provider, config, isDefault, onClick, onUpdateModel, onSetDefault, onTestConnection }: AIProviderCardProps) {
  const [changingModel, setChangingModel] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const isConfigured = !!config;
  const isValidated = config?.is_validated ?? false;
  const gradientClass = PROVIDER_COLORS[provider];
  const icon = PROVIDER_ICONS[provider];
  const label = LABELS.aiProvider[provider];
  const models = AI_MODELS[provider];
  const modelOptions = config?.model_name && !models.some((model) => model.id === config.model_name)
    ? [
        {
          id: config.model_name,
          name: `Atual (legado): ${config.model_name}`,
          description: 'Modelo salvo antes da atualização do catálogo. Troque para um modelo oficial suportado.',
          contextWindow: 0,
          costPer1kTokens: 0,
          isFree: false,
        },
        ...models,
      ]
    : models;

  const handleModelChange = async (newModel: string) => {
    if (!config || !config.api_key_encrypted) return;
    
    const modelName = modelOptions.find(m => m.id === newModel)?.name || newModel;
    
    try {
      setChangingModel(true);
      await onUpdateModel(provider, newModel);
      toast.success(`Modelo alterado para ${modelName}`);
    } catch (error) {
      toast.error('Erro ao alterar modelo');
    } finally {
      setChangingModel(false);
    }
  };

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!config?.api_key_encrypted || !config?.model_name) return;
    
    try {
      setTesting(true);
      const result = await onTestConnection(provider, config.api_key_encrypted, config.model_name);
      
      if (result.valid) {
        const respondedModel = result.responded_model || result.tested_model || config.model_name;
        toast.success(`Conexão real validada com ${respondedModel}`);
      } else {
        toast.error(result.error || 'Falha ao testar conexão');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const handleSetDefault = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!config?.id) return;
    try {
      await onSetDefault(config.id);
    } catch (error) {
      toast.error('Erro ao definir como padrão');
    }
  };

  return (
    <Card
      className="relative transition-all hover:shadow-lg hover:-translate-y-1 group"
    >
      {/* Badge Default */}
      {isDefault && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            Padrão
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        {/* Header com gradiente */}
        <div className={`h-20 -mx-6 -mt-6 mb-4 rounded-t-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
          {React.createElement(icon, { className: "h-12 w-12 text-white" })}
        </div>

        {/* Nome do Provedor */}
        <h3 className="text-lg font-semibold mb-2">{label}</h3>

        {/* Status */}
        <div className="space-y-3 mb-4">
          {isConfigured ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {isValidated ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">Validado</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-600 font-medium">Não validado</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="h-7 px-2 text-xs"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Testando
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Testar
                      </>
                    )}
                  </Button>
                </div>
                
                {config.last_validated_at && (
                  <p className="text-xs text-muted-foreground">
                    Testado {new Date(config.last_validated_at).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>

              {/* Seletor de Modelo */}
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                <label className="text-xs font-medium text-muted-foreground">
                  Modelo {changingModel && <span className="text-blue-600">(salvando...)</span>}
                </label>
                <Select value={config.model_name} onValueChange={handleModelChange} disabled={changingModel}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Alterações são salvas automaticamente
                </p>
              </div>

              {/* Últimos 4 da API Key */}
              {config.api_key_last_4 && (
                <p className="text-xs text-muted-foreground">
                  API Key: ****{config.api_key_last_4}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Não configurado</span>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          {isConfigured && !isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetDefault}
              className="flex-1"
            >
              <Star className="h-4 w-4 mr-1" />
              Padrão
            </Button>
          )}
          <Button
            variant={isConfigured ? 'outline' : 'default'}
            size="sm"
            onClick={onClick}
            className={isConfigured && !isDefault ? 'flex-1' : 'w-full'}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isConfigured ? 'Configurar' : 'Adicionar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
