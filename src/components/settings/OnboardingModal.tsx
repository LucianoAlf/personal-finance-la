// src/components/settings/OnboardingModal.tsx
// Modal de onboarding para primeira configuração do usuário

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  DollarSign,
  Target,
  Sparkles,
} from 'lucide-react';
import { UpdateUserSettingsInput } from '@/types/settings.types';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (settings: UpdateUserSettingsInput) => Promise<void>;
  initialName?: string;
  initialEmail?: string;
}

export function OnboardingModal({
  open,
  onClose,
  onComplete,
  initialName = '',
  initialEmail = '',
}: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [language, setLanguage] = useState('pt-BR');
  const [currency, setCurrency] = useState('BRL');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [savingsGoal, setSavingsGoal] = useState(20);
  const [closingDay, setClosingDay] = useState(1);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete({
        display_name: displayName,
        avatar_url: avatarUrl || undefined,
        language,
        currency,
        timezone,
        date_format: dateFormat,
        number_format: language,
        monthly_savings_goal_percentage: savingsGoal,
        monthly_closing_day: closingDay,
      });
      onClose();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return displayName.length >= 2;
      case 2:
        return true; // Preferências gerais são opcionais
      case 3:
        return true; // Preferências financeiras têm valores padrão
      case 4:
        return true; // Revisão final
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Configuração Inicial</DialogTitle>
          </div>
          <DialogDescription>
            Vamos configurar sua conta em {totalSteps} passos simples
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Passo {step} de {totalSteps}</span>
            <span>{Math.round(progress)}% completo</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="py-6">
          {/* STEP 1: Perfil Básico */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Vamos começar com seu perfil</h3>
                <p className="text-sm text-muted-foreground">
                  Como você gostaria de ser chamado?
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-3xl">
                    {displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-name">Nome de Exibição *</Label>
                  <Input
                    id="onboarding-name"
                    placeholder="Seu nome"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Este nome aparecerá em toda a aplicação
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-email">E-mail</Label>
                  <Input
                    id="onboarding-email"
                    value={initialEmail}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preferências Gerais */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Globe className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Preferências Regionais</h3>
                <p className="text-sm text-muted-foreground">
                  Configure idioma, moeda e formatos
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-language">Idioma</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="onboarding-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onboarding-currency">Moeda</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="onboarding-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                        <SelectItem value="USD">Dólar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-timezone">Fuso Horário</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="onboarding-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                        <SelectItem value="America/Rio_Branco">Acre (GMT-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onboarding-dateFormat">Formato de Data</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="onboarding-dateFormat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                        <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preferências Financeiras */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Target className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Metas Financeiras</h3>
                <p className="text-sm text-muted-foreground">
                  Configure suas preferências de controle financeiro
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-savingsGoal">
                    Meta de Economia Mensal (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="onboarding-savingsGoal"
                      type="number"
                      min={0}
                      max={100}
                      value={savingsGoal}
                      onChange={(e) => setSavingsGoal(Number(e.target.value))}
                    />
                    <span className="text-sm text-muted-foreground min-w-[30px]">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quanto da sua renda você quer economizar?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboarding-closingDay">
                    Dia de Fechamento do Mês
                  </Label>
                  <Input
                    id="onboarding-closingDay"
                    type="number"
                    min={1}
                    max={28}
                    value={closingDay}
                    onChange={(e) => setClosingDay(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dia do mês para fechar o período financeiro (1-28)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Revisão */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Check className="h-12 w-12 mx-auto text-green-500" />
                <h3 className="text-lg font-semibold">Tudo pronto!</h3>
                <p className="text-sm text-muted-foreground">
                  Revise suas configurações antes de finalizar
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-semibold mb-3">Perfil</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span className="font-medium">{initialEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-semibold mb-3">Preferências</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Idioma:</span>
                      <Badge variant="secondary">{language}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Moeda:</span>
                      <Badge variant="secondary">{currency}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Formato:</span>
                      <Badge variant="secondary">{dateFormat}</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-semibold mb-3">Metas Financeiras</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meta de Economia:</span>
                      <span className="font-medium text-green-600">{savingsGoal}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dia de Fechamento:</span>
                      <span className="font-medium text-blue-600">{closingDay}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={loading || !canProceed()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Finalizar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
