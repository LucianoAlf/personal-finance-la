import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBenchmark } from '@/hooks/useBenchmarks';
import { cn } from '@/lib/utils';
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

const shellClassName =
  'overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]';

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

  const plan = useMemo(
    () =>
      calculateInvestmentPlan({
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
      }),
    [
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
    ],
  );

  const statusVariant = getStatusVariant(plan.status);

  return (
    <Card className={shellClassName}>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-2xl">
            <CardTitle className="text-xl font-semibold tracking-tight">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant={statusVariant} className="rounded-full px-3 py-1.5 text-xs font-semibold">
            {plan.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        {editableBaseInputs && (
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
            <NumberField
              label="Patrimônio atual"
              value={currentAmount}
              onChange={setCurrentAmount}
              prefix="R$"
            />
            <NumberField
              label="Aporte mensal atual"
              value={monthlyContribution}
              onChange={setMonthlyContribution}
              prefix="R$"
            />
            <NumberField label="Prazo (anos)" value={yearsToGoal} onChange={setYearsToGoal} min={1} />
            <NumberField
              label="Objetivo em dinheiro de hoje"
              value={targetAmountToday}
              onChange={setTargetAmountToday}
              prefix="R$"
            />
            <NumberField
              label="Renda mensal desejada hoje"
              value={desiredMonthlyIncome}
              onChange={setDesiredMonthlyIncome}
              prefix="R$"
            />
            <NumberField
              label="Retorno nominal anual"
              value={annualReturnRate}
              onChange={setAnnualReturnRate}
              suffix="%"
            />
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
            <div
              key={scenario.label}
              className="rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium capitalize text-foreground">{scenario.label}</p>
                <Badge variant={getStatusVariant(scenario.status)} className="rounded-full px-3 py-1 text-xs">
                  {scenario.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Patrimônio projetado</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(scenario.projectedAmount)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 text-sm text-muted-foreground">
          <p>
            Retorno real estimado:{' '}
            <span className="font-semibold text-foreground">{plan.realAnnualReturnRate.toFixed(2)}% ao ano</span>.
          </p>
          <p>
            Retorno líquido após impostos e custos:{' '}
            <span className="font-semibold text-foreground">{plan.netAnnualReturnRate.toFixed(2)}% ao ano</span>.
          </p>
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
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          min={min}
          step="0.01"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value || 0))}
          className={cn(
            'h-11 rounded-xl border-border/70 bg-surface/85 text-foreground shadow-sm dark:bg-surface-elevated/70',
            prefix ? 'pl-10' : suffix ? 'pr-10' : undefined,
          )}
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
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-surface-elevated/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        highlight && 'border-purple-500/20 bg-purple-500/10',
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold text-foreground', highlight && 'text-purple-500')}>{value}</p>
    </div>
  );
}

function getStatusVariant(status: PlanningStatus): 'default' | 'secondary' | 'warning' {
  if (status === 'realista') return 'default';
  if (status === 'insuficiente') return 'secondary';
  return 'warning';
}
