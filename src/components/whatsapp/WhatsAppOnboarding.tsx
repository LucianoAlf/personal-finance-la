/**
 * Component: WhatsAppOnboarding
 * Responsabilidade: Tutorial de primeiro uso WhatsApp
 * 
 * Features:
 * - Passo a passo da configuração
 * - Exemplos de comandos
 * - Demonstração de lançamentos
 * - Tips contextuais
 */

import { useState } from 'react';
import {
  MessageCircle,
  QrCode,
  Command,
  FileText,
  Mic,
  Image,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WhatsAppOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const STEPS = [
  {
    title: 'Conecte seu WhatsApp',
    description: 'Escaneie o QR Code para conectar sua conta',
    icon: QrCode,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Conecte seu WhatsApp e tenha acesso a todas as funcionalidades através do
          aplicativo que você já usa todos os dias!
        </p>
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold">Passos:</h4>
          <ol className="text-sm space-y-1 text-muted-foreground">
            <li>1. Clique em "Conectar WhatsApp"</li>
            <li>2. Escaneie o QR Code com seu celular</li>
            <li>3. Aguarde a confirmação de conexão</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    title: 'Comandos Rápidos',
    description: 'Acesse informações instantaneamente',
    icon: Command,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use comandos para consultar informações financeiras rapidamente:
        </p>
        <div className="grid gap-2">
          {[
            { cmd: 'saldo', desc: 'Ver saldo total' },
            { cmd: 'resumo', desc: 'Resumo financeiro' },
            { cmd: 'contas', desc: 'Contas a vencer' },
            { cmd: 'meta viagem', desc: 'Status de uma meta' },
            { cmd: 'investimentos', desc: 'Resumo do portfólio' },
            { cmd: 'ajuda', desc: 'Lista todos os comandos' },
          ].map((item) => (
            <div
              key={item.cmd}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {item.cmd}
                </Badge>
                <span className="text-sm text-muted-foreground">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Registrar Transações',
    description: 'Três formas diferentes de lançar',
    icon: FileText,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Registre seus gastos e receitas de forma natural:
        </p>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold mb-1">Por Texto</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Digite naturalmente seus lançamentos
              </p>
              <div className="space-y-1">
                <div className="text-xs font-mono bg-background p-2 rounded">
                  "Gastei R$ 45 no almoço"
                </div>
                <div className="text-xs font-mono bg-background p-2 rounded">
                  "Recebi R$ 5.000 de salário"
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
            <Mic className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold mb-1">Por Áudio</h4>
              <p className="text-xs text-muted-foreground">
                Envie um áudio falando o que gastou - transcrevemos automaticamente!
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <Image className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold mb-1">Por Foto</h4>
              <p className="text-xs text-muted-foreground">
                Tire foto da nota fiscal - extraímos todos os dados com IA!
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Pronto para Começar!',
    description: 'Tudo configurado e funcionando',
    icon: CheckCircle2,
    content: (
      <div className="space-y-4 text-center">
        <div className="rounded-full bg-green-500/10 p-4 w-fit mx-auto">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Você está pronto!</h3>
          <p className="text-sm text-muted-foreground">
            Agora você pode gerenciar suas finanças pelo WhatsApp de forma rápida e
            natural.
          </p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold">Dicas:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground text-left">
            <li>• Use comandos para consultas rápidas</li>
            <li>• Envie áudios quando estiver com pressa</li>
            <li>• Fotografe suas notas fiscais para registro automático</li>
            <li>• Digite "ajuda" sempre que precisar</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export function WhatsAppOnboarding({
  open,
  onOpenChange,
  onComplete,
}: WhatsAppOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onOpenChange(false);
      setCurrentStep(0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete?.();
    onOpenChange(false);
    setCurrentStep(0);
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Tutorial WhatsApp
              </DialogTitle>
              <DialogDescription>
                Aprenda a usar o WhatsApp para gerenciar suas finanças
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="flex gap-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all',
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px] space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>

            <div>{step.content}</div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} de {STEPS.length}
              </span>
            </div>

            <Button onClick={handleNext}>
              {isLastStep ? (
                <>
                  Começar
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
