// src/components/settings/AIProviderCard.tsx
// Card visual para cada provedor de IA

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Sparkles, Settings, Bot, Target, Shuffle } from 'lucide-react';
import type { AIProviderConfig, AIProviderType } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';

interface AIProviderCardProps {
  provider: AIProviderType;
  config?: AIProviderConfig;
  isDefault?: boolean;
  onClick: () => void;
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

export function AIProviderCard({ provider, config, isDefault, onClick }: AIProviderCardProps) {
  const isConfigured = !!config;
  const isValidated = config?.is_validated ?? false;
  const gradientClass = PROVIDER_COLORS[provider];
  const icon = PROVIDER_ICONS[provider];
  const label = LABELS.aiProvider[provider];

  return (
    <Card
      className="relative cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
      onClick={onClick}
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
        <div className="space-y-2 mb-4">
          {isConfigured ? (
            <>
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

              {/* Modelo configurado */}
              {config.model_name && (
                <p className="text-sm text-muted-foreground">
                  Modelo: <span className="font-medium">{config.model_name}</span>
                </p>
              )}

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

        {/* Botão de ação */}
        <Button
          variant={isConfigured ? 'outline' : 'default'}
          size="sm"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
        >
          <Settings className="h-4 w-4 mr-2" />
          {isConfigured ? 'Configurar' : 'Adicionar'}
        </Button>
      </CardContent>
    </Card>
  );
}
