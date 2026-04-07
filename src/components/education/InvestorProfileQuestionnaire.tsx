import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import type {
  InvestorDrawdownComfort,
  InvestorExperience,
  InvestorHorizon,
} from '@/utils/education/investor-suitability';

const horizonOptions: { value: InvestorHorizon; label: string }[] = [
  { value: 'short', label: 'Até 1 ano — preciso do dinheiro no curto prazo' },
  { value: 'medium', label: '1 a 5 anos — horizonte médio' },
  { value: 'long', label: 'Mais de 5 anos — posso esperar' },
];

const drawdownOptions: { value: InvestorDrawdownComfort; label: string }[] = [
  { value: 'low', label: 'Prefiro evitar quedas, mesmo com retorno menor' },
  { value: 'medium', label: 'Aceito oscilações moderadas' },
  { value: 'high', label: 'Aceito fortes oscilações em troca de potencial maior' },
];

const experienceOptions: { value: InvestorExperience; label: string }[] = [
  { value: 'none', label: 'Quase nenhuma experiência com investimentos' },
  { value: 'some', label: 'Já invisto em renda fixa e/ou poucos ativos' },
  { value: 'advanced', label: 'Experiência com renda variável e acompanho a carteira' },
];

interface InvestorProfileQuestionnaireProps {
  mode?: 'initial' | 'review';
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function InvestorProfileQuestionnaire({
  mode = 'initial',
  onSubmitted,
  onCancel,
}: InvestorProfileQuestionnaireProps) {
  const { toast } = useToast();
  const { latestAssessment, trustedAssessment, submitAssessment, isSubmitting, isLoading } = useInvestorProfile();
  const [horizon, setHorizon] = useState<InvestorHorizon | ''>('');
  const [drawdownComfort, setDrawdownComfort] = useState<InvestorDrawdownComfort | ''>('');
  const [experience, setExperience] = useState<InvestorExperience | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horizon || !drawdownComfort || !experience) {
      toast({
        title: 'Responda todas as perguntas',
        description: 'Precisamos das três respostas para calcular seu perfil.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await submitAssessment({ horizon, drawdownComfort, experience });
      toast({
        title: 'Perfil registrado',
        description:
          mode === 'review'
            ? 'Sua revisão foi salva e o histórico anterior foi preservado.'
            : 'Seu questionário foi salvo e os guardrails de adequação foram atualizados.',
      });
      setHorizon('');
      setDrawdownComfort('');
      setExperience('');
      onSubmitted?.();
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-l-4 border-violet-500">
      <CardHeader>
        <CardTitle>{mode === 'review' ? 'Revisar perfil de investidor' : 'Perfil de investidor'}</CardTitle>
        <CardDescription>
          Respostas objetivas para adequar dicas educacionais e sugestões de mentoria ao seu perfil. O cálculo é
          determinístico e cada nova avaliação entra no histórico sem apagar as anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : trustedAssessment?.profileKey ? (
          <p className="text-sm text-gray-700 mb-4">
            Último perfil confiável: <span className="font-medium">{trustedAssessment.profileKey}</span>
            {trustedAssessment.effectiveAt
              ? ` (válido em ${new Date(trustedAssessment.effectiveAt).toLocaleDateString('pt-BR')})`
              : null}
            {latestAssessment?.questionnaire_version
              ? ` • versão ${latestAssessment.questionnaire_version}`
              : ''}
            . Revise abaixo apenas se seu momento, tolerância a risco ou horizonte tiverem mudado.
          </p>
        ) : (
          <p className="text-sm text-gray-700 mb-4">
            Você ainda não tem um perfil registrado. Responda às três perguntas para ativarmos os guardrails de
            adequação.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="inv-horizon">Quando você pretende usar a maior parte desse dinheiro?</Label>
            <Select
              value={horizon || undefined}
              onValueChange={(v) => setHorizon(v as InvestorHorizon)}
            >
              <SelectTrigger id="inv-horizon">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {horizonOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-drawdown">Quedas temporárias na carteira (ex.: -20% em um ano)</Label>
            <Select
              value={drawdownComfort || undefined}
              onValueChange={(v) => setDrawdownComfort(v as InvestorDrawdownComfort)}
            >
              <SelectTrigger id="inv-drawdown">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {drawdownOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-exp">Experiência com investimentos</Label>
            <Select
              value={experience || undefined}
              onValueChange={(v) => setExperience(v as InvestorExperience)}
            >
              <SelectTrigger id="inv-exp">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {experienceOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : mode === 'review' ? 'Salvar revisão' : 'Salvar perfil'}
            </Button>
            {mode === 'review' && onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
