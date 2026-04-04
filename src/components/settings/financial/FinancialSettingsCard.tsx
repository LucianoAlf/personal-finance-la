import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { DollarSign, Info, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BudgetAllocation } from '@/types/settings.types';

interface FinancialSettingsCardProps {
  savingsGoal: number;
  closingDay: number;
  budgetAllocation?: BudgetAllocation | null;
  budgetAlertThreshold?: number | null;
  onSavingsGoalChange: (value: number) => void;
  onClosingDayChange: (value: number) => void;
  onBudgetAllocationChange: (allocation: BudgetAllocation) => void;
  onBudgetAlertThresholdChange: (threshold: number) => void;
}

export function FinancialSettingsCard({
  savingsGoal,
  closingDay,
  budgetAllocation,
  budgetAlertThreshold,
  onSavingsGoalChange,
  onClosingDayChange,
  onBudgetAllocationChange,
  onBudgetAlertThresholdChange,
}: FinancialSettingsCardProps) {
  const [allocation, setAllocation] = useState<BudgetAllocation>(
    budgetAllocation || {
      essentials: 50,
      investments: 20,
      leisure: 20,
      others: 10,
    }
  );

  const [threshold, setThreshold] = useState(budgetAlertThreshold || 80);

  // Atualizar allocation quando prop mudar
  useEffect(() => {
    if (budgetAllocation) {
      setAllocation(budgetAllocation);
    }
  }, [budgetAllocation]);

  useEffect(() => {
    if (budgetAlertThreshold) {
      setThreshold(budgetAlertThreshold);
    }
  }, [budgetAlertThreshold]);

  // Calcular total da alocação
  const allocationTotal =
    allocation.essentials + allocation.investments + allocation.leisure + allocation.others;

  const isAllocationValid = allocationTotal === 100;

  // Atualizar alocação individual
  const handleAllocationChange = (key: keyof BudgetAllocation, value: number) => {
    const newAllocation = { ...allocation, [key]: value };
    setAllocation(newAllocation);
    onBudgetAllocationChange(newAllocation);
  };

  // Calcular próximo fechamento
  const getNextClosingDate = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    let nextDate = new Date(currentYear, currentMonth, closingDay);

    if (currentDay >= closingDay) {
      nextDate = new Date(currentYear, currentMonth + 1, closingDay);
    }

    return nextDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Configurações Financeiras
        </CardTitle>
        <CardDescription>
          Defina suas metas e preferências financeiras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meta de Economia Mensal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Meta de Economia Mensal (%)</Label>
            <span className="text-sm font-medium">{savingsGoal}%</span>
          </div>
          <Slider
            value={[savingsGoal]}
            onValueChange={(values) => onSavingsGoalChange(values[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              value={savingsGoal}
              onChange={(e) => onSavingsGoalChange(parseInt(e.target.value) || 0)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              % da sua renda mensal
            </span>
          </div>
        </div>

        {/* Dia de Fechamento */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Dia de Fechamento do Mês</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dia que seu ciclo financeiro reinicia</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            type="number"
            min={1}
            max={28}
            value={closingDay}
            onChange={(e) => onClosingDayChange(parseInt(e.target.value) || 1)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Próximo fechamento: {getNextClosingDate()}
          </p>
        </div>

        {/* Alocação de Orçamento */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Alocação de Orçamento</Label>
            <span
              className={`text-sm font-medium ${
                isAllocationValid ? 'text-green-600' : 'text-red-600'
              }`}
            >
              Total: {allocationTotal}%
            </span>
          </div>

          {/* Essenciais */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Essenciais (50-70%)</Label>
              <span className="text-sm font-medium">{allocation.essentials}%</span>
            </div>
            <Slider
              value={[allocation.essentials]}
              onValueChange={(values) => handleAllocationChange('essentials', values[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Moradia, alimentação, transporte
            </p>
          </div>

          {/* Investimentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Investimentos (10-30%)</Label>
              <span className="text-sm font-medium">{allocation.investments}%</span>
            </div>
            <Slider
              value={[allocation.investments]}
              onValueChange={(values) => handleAllocationChange('investments', values[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Poupança, investimentos
            </p>
          </div>

          {/* Lazer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Lazer (10-30%)</Label>
              <span className="text-sm font-medium">{allocation.leisure}%</span>
            </div>
            <Slider
              value={[allocation.leisure]}
              onValueChange={(values) => handleAllocationChange('leisure', values[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Entretenimento, hobbies
            </p>
          </div>

          {/* Outros */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Outros (0-20%)</Label>
              <span className="text-sm font-medium">{allocation.others}%</span>
            </div>
            <Slider
              value={[allocation.others]}
              onValueChange={(values) => handleAllocationChange('others', values[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Despesas diversas
            </p>
          </div>

          {!isAllocationValid && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <p>A soma das alocações deve ser exatamente 100%</p>
            </div>
          )}
        </div>

        {/* Alertas Financeiros */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-base font-semibold">Alertas Financeiros</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Notificar quando gastar mais de</Label>
              <span className="text-sm font-medium">{threshold}%</span>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={(values) => {
                setThreshold(values[0]);
                onBudgetAlertThresholdChange(values[0]);
              }}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              do orçamento mensal
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
