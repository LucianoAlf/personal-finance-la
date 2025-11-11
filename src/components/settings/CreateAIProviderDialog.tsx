// src/components/settings/CreateAIProviderDialog.tsx
// Dialog multi-step para configurar provedor de IA

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAIProviders } from '@/hooks/useAIProviders';
import type { AIProviderType, AIModel } from '@/types/settings.types';
import { AI_MODELS, LABELS } from '@/types/settings.types';

interface CreateAIProviderDialogProps {
  provider: AIProviderType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAIProviderDialog({ provider, open, onOpenChange }: CreateAIProviderDialogProps) {
  const { createProvider, validateApiKey, validating } = useAIProviders();
  
  // Steps state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Form state
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [responseStyle, setResponseStyle] = useState<'short' | 'medium' | 'long'>('medium');
  const [responseTone, setResponseTone] = useState<'formal' | 'friendly' | 'casual'>('friendly');
  const [systemPrompt, setSystemPrompt] = useState('Você é Ana Clara, uma assistente financeira especializada em educação financeira pessoal. Seu objetivo é ajudar os usuários a entenderem melhor suas finanças, oferecendo dicas práticas e acessíveis.');
  const [isDefault, setIsDefault] = useState(false);

  const models = AI_MODELS[provider];
  const selectedModelData = models.find((m) => m.id === selectedModel);

  // Handlers
  const handleValidateApiKey = async () => {
    if (!apiKey || !selectedModel) return;

    setIsKeyValid(null);
    setValidationError('');

    const result = await validateApiKey(provider, apiKey, selectedModel);

    if (result.valid) {
      setIsKeyValid(true);
    } else {
      setIsKeyValid(false);
      setValidationError(result.error || 'API Key inválida');
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!selectedModel || !apiKey) return;

    try {
      await createProvider({
        provider,
        api_key: apiKey,
        model_name: selectedModel,
        temperature,
        max_tokens: maxTokens,
        response_style: responseStyle,
        response_tone: responseTone,
        system_prompt: systemPrompt,
        is_default: isDefault,
      });

      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating provider:', error);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedModel('');
    setApiKey('');
    setShowApiKey(false);
    setIsKeyValid(null);
    setValidationError('');
    setTemperature(0.7);
    setMaxTokens(1000);
    setResponseStyle('medium');
    setResponseTone('friendly');
    setSystemPrompt('Você é Ana Clara...');
    setIsDefault(false);
  };

  // Validations
  const canProceedStep1 = selectedModel !== '';
  const canProceedStep2 = isKeyValid === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configurar {LABELS.aiProvider[provider]}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* STEP 1: Provedor e Modelo */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Escolha o modelo</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.isFree && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Gratuito
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModelData && (
              <Alert>
                <AlertDescription className="space-y-1 text-sm">
                  <p><strong>Descrição:</strong> {selectedModelData.description}</p>
                  <p><strong>Context Window:</strong> {selectedModelData.contextWindow.toLocaleString()} tokens</p>
                  <p><strong>Custo:</strong> {selectedModelData.isFree ? 'Gratuito' : `$${selectedModelData.costPer1kTokens}/1k tokens`}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* STEP 2: API Key e Teste */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setIsKeyValid(null);
                    }}
                    placeholder="sk-..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  onClick={handleValidateApiKey}
                  disabled={!apiKey || validating}
                >
                  {validating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validando...</>
                  ) : (
                    'Validar'
                  )}
                </Button>
              </div>
            </div>

            {/* Feedback de validação */}
            {isKeyValid === true && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  API Key validada com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {isKeyValid === false && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {validationError || 'Falha na validação da API Key'}
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              A API Key é armazenada de forma segura e criptografada. Apenas os últimos 4 dígitos serão exibidos.
            </p>
          </div>
        )}

        {/* STEP 3: Configurações Avançadas */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Temperatura */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperatura: {temperature.toFixed(1)}</Label>
                <span className="text-xs text-muted-foreground">
                  {temperature < 0.3 ? 'Mais preciso' : temperature > 1.2 ? 'Mais criativo' : 'Balanceado'}
                </span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(val) => setTemperature(val[0])}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Máximo de Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min={500}
                max={4000}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>

            {/* Estilo de Resposta */}
            <div className="space-y-2">
              <Label>Estilo de Resposta</Label>
              <Select value={responseStyle} onValueChange={(val: any) => setResponseStyle(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Curta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="long">Longa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tom de Resposta */}
            <div className="space-y-2">
              <Label>Tom de Resposta</Label>
              <Select value={responseTone} onValueChange={(val: any) => setResponseTone(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema (Personalizar Ana Clara)</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="resize-none font-mono text-sm"
              />
            </div>

            {/* Marcar como padrão */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault">Marcar como padrão</Label>
                <p className="text-sm text-muted-foreground">
                  Este será o provedor usado por padrão pela Ana Clara
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <span className="text-sm text-muted-foreground">
            Passo {currentStep} de {totalSteps}
          </span>

          {currentStep < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2)
              }
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave}>
              Salvar Configuração
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
