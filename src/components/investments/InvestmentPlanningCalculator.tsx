import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBenchmark } from '@/hooks/useBenchmarks';
import { formatCurrency } from '@/utils/formatters';
import { calculateInvestmentPlan, type PlanningStatus } from '@/utils/investmentPlanning';

interface InvestmentPlanningCalculatorProps {
  title?: string;
  description?: string;
  initialCurrentAmount?: number;
  initialMonthlyContribution?: number;
  initialTargetAmount?: number;
  initialYearsToGoal?: number;
  initialAnnualReturnRate?: number;
  initialDesiredMonthlyIncome?: number;
  editableBaseInputs?: boolean;
  compact?: boolean;
}

export function InvestmentPlanningCalculator({
  title = 'Calculadora de Planejamento',
  description = 'Projete patrimônio, renda futura e aporte necessário com inflação e cenários.',
  initialCurrentAmount = 0,
  initialMonthlyContribution = 0,
  initialTargetAmount = 1000000,
  initialYearsToGoal = 15,
  initialAnnualReturnRate = 8,
  initialDesiredMonthlyIncome = 30000,
  editableBaseInputs = true,
  compact = false,
}: InvestmentPlanningCalculatorProps) {
  const ipcaBenchmark = useBenchmark('IPCA', '1Y');

  const [currentAmount, setCurrentAmount] = useState(initialCurrentAmount);
  const [monthlyContribution, setMonthlyContribution] = useState(initialMonthlyContribution);
  const [targetAmountToday, setTargetAmountToday] = useState(initialTargetAmount);
  const [yearsToGoal, setYearsToGoal] = useState(initialYearsToGoal);
  const [annualReturnRate, setAnnualReturnRate] = useState(initialAnnualReturnRate);
  const [desiredMonthlyIncome, setDesiredMonthlyIncome] = useState(initialDesiredMonthlyIncome);
  const [inflationRate, setInflationRate] = useState(4.5);
  const [annualTaxRate, setAnnualTaxRate] = useState(1.5);
  const [annualFeeRate, setAnnualFeeRate] = useState(0.5);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [inflationTouched, setInflationTouched] = useState(false);

  useEffect(() => {
    setCurrentAmount(initialCurrentAmount);
  }, [initialCurrentAmount]);

  useEffect(() => {
    setMonthlyContribution(initialMonthlyContribution);
  }, [initialMonthlyContribution]);

  useEffect(() => {
    setTargetAmountToday(initialTargetAmount);
  }, [initialTargetAmount]);

  useEffect(() => {
    setYearsToGoal(initialYearsToGoal);
  }, [initialYearsToGoal]);

  useEffect(() => {
    setAnnualReturnRate(initialAnnualReturnRate);
  }, [initialAnnualReturnRate]);

  useEffect(() => {
    setDesiredMonthlyIncome(initialDesiredMonthlyIncome);
  }, [initialDesiredMonthlyIncome]);

  useEffect(() => {
    if (!inflationTouched && ipcaBenchmark > 0) {
      setInflationRate(Number(ipcaBenchmark.toFixed(2)));
    }
  }, [inflationTouched, ipcaBenchmark]);

  const plan = useMemo(() => calculateInvestmentPlan({
    currentAmount,
    monthlyContribution,
    annualReturnRate,
    inflationRate,
    annualTaxRate,
    annualFeeRate,
    yearsToGoal,
    targetAmountToday,
    desiredMonthlyIncomeToday: desiredMonthlyIncome,
    withdrawalRate,
  }), [
    annualFeeRate,
    annualReturnRate,
    annualTaxRate,
    currentAmount,
    desiredMonthlyIncome,
    inflationRate,
    monthlyContribution,
    targetAmountToday,
    withdrawalRate,
    yearsToGoal,
  ]);

  const statusVariant = getStatusVariant(plan.status);

  return (
    <Card className={compact ? 'border-dashed' : undefined}>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Badge variant={statusVariant}>{plan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editableBaseInputs && (
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
            <NumberField label="Patrimônio atual" value={currentAmount} onChange={setCurrentAmount} prefix="R$" />
            <NumberField label="Aporte mensal atual" value={monthlyContribution} onChange={setMonthlyContribution} prefix="R$" />
            <NumberField label="Prazo (anos)" value={yearsToGoal} onChange={setYearsToGoal} min={1} />
            <NumberField label="Objetivo em dinheiro de hoje" value={targetAmountToday} onChange={setTargetAmountToday} prefix="R$" />
            <NumberField label="Renda mensal desejada hoje" value={desiredMonthlyIncome} onChange={setDesiredMonthlyIncome} prefix="R$" />
            <NumberField label="Retorno nominal anual" value={annualReturnRate} onChange={setAnnualReturnRate} suffix="%" />
          </div>
        )}

        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'md:grid-cols-4'}`}>
          {!editableBaseInputs && (
            <>
              <Metric label="Patrimônio atual" value={formatCurrency(currentAmount)} />
              <Metric label="Aporte atual" value={formatCurrency(monthlyContribution)} />
              <Metric label="Prazo" value={`${yearsToGoal} anos`} />
              <Metric label="Retorno nominal" value={`${annualReturnRate.toFixed(2)}%`} />
            </>
          )}
          <NumberField
            label="Inflação anual"
            value={inflationRate}
            onChange={(value) => {
              setInflationTouched(true);
              setInflationRate(value);
            }}
            suffix="%"
          />
          <NumberField label="Impostos anuais" value={annualTaxRate} onChange={setAnnualTaxRate} suffix="%" />
          <NumberField label="Custos anuais" value={annualFeeRate} onChange={setAnnualFeeRate} suffix="%" />
          <NumberField label="Taxa de retirada" value={withdrawalRate} onChange={setWithdrawalRate} suffix="%" />
        </div>

        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'md:grid-cols-4'}`}>
          <Metric label="Meta nominal futura" value={formatCurrency(plan.targetAmountFuture)} />
          <Metric label="Renda futura necessária" value={formatCurrency(plan.desiredMonthlyIncomeFuture)} />
          <Metric label="Capital necessário" value={formatCurrency(plan.requiredCapital)} />
          <Metric label="Aporte mensal necessário" value={formatCurrency(plan.requiredMonthlyContribution)} highlight />
        </div>

        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'md:grid-cols-4'}`}>
          <Metric label="Projeção nominal" value={formatCurrency(plan.projectedAmount)} />
          <Metric label="Projeção em valor de hoje" value={formatCurrency(plan.projectedRealAmount)} />
          <Metric label="Gap atual" value={formatCurrency(plan.currentGap)} />
          <Metric label="Gap projetado" value={formatCurrency(plan.projectedGap)} />
        </div>

        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
          {plan.scenarios.map((scenario) => (
            <div key={scenario.label} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-medium capitalize">{scenario.label}</p>
                <Badge variant={getStatusVariant(scenario.status)}>{scenario.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Patrimônio projetado</p>
              <p className="text-lg font-semibold">{formatCurrency(scenario.projectedAmount)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>Retorno real estimado: <span className="font-semibold text-foreground">{plan.realAnnualReturnRate.toFixed(2)}% ao ano</span>.</p>
          <p>Retorno líquido após impostos e custos: <span className="font-semibold text-foreground">{plan.netAnnualReturnRate.toFixed(2)}% ao ano</span>.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          min={min}
          step="0.01"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value || 0))}
          className={prefix ? 'pl-10' : suffix ? 'pr-10' : undefined}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-purple-200 bg-purple-50/50' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function getStatusVariant(status: PlanningStatus): 'default' | 'secondary' | 'warning' {
  if (status === 'realista') return 'default';
  if (status === 'insuficiente') return 'secondary';
  return 'warning';
}
