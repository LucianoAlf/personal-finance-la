import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  Edit,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  InvestmentGoal,
  InvestmentGoalPortfolioMetrics,
} from '@/types/investment-goals.types';
import { INVESTMENT_GOAL_LABELS } from '@/types/investment-goals.types';
import { formatCurrency, parseDateOnly } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvestmentGoalCardProps {
  goal: InvestmentGoal;
  metrics?: InvestmentGoalPortfolioMetrics;
  onEdit?: (goal: InvestmentGoal) => void;
  onContribute?: (goal: InvestmentGoal) => void;
  onDelete?: (id: string) => void;
  onOpenPortfolio?: (goal: InvestmentGoal) => void;
}

export function InvestmentGoalCard({
  goal,
  metrics,
  onEdit,
  onContribute,
  onDelete,
  onOpenPortfolio,
}: InvestmentGoalCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const currentAmount = metrics?.effective_current_amount ?? goal.current_amount;
  const percentage = metrics?.percentage || (currentAmount / goal.target_amount) * 100;
  const isOnTrack = metrics?.is_on_track ?? true;
  const monthsRemaining = metrics?.months_remaining || calculateMonthsRemaining(goal.target_date);
  const currentGap = metrics?.current_gap ?? Math.max(0, goal.target_amount - currentAmount);
  const linkedAmount = metrics?.linked_current_amount ?? 0;
  const manualAmount = metrics?.manual_current_amount ?? goal.current_amount;
  const linkedCount = metrics?.linked_investments_count ?? 0;

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar esta meta de investimento?')) return;
    setIsDeleting(true);
    await onDelete?.(goal.id);
    setIsDeleting(false);
  };

  return (
    <Card className="overflow-hidden rounded-[1.9rem] border border-border/70 bg-surface/92 shadow-[0_18px_38px_rgba(8,15,32,0.14)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-surface-elevated/88 hover:shadow-[0_24px_50px_rgba(8,15,32,0.22)]">
      <CardHeader className="border-b border-border/60 bg-surface-elevated/45 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_14px_28px_rgba(10,20,40,0.22)]"
              style={{
                background: `linear-gradient(135deg, ${goal.color || '#8B5CF6'} 0%, ${adjustColor(
                  goal.color || '#8B5CF6',
                  -20
                )} 100%)`,
              }}
            >
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
              <p className="text-sm text-muted-foreground">
                {INVESTMENT_GOAL_LABELS.category[goal.category]}
              </p>
            </div>
          </div>

          <Badge variant={isOnTrack ? 'success' : 'warning'}>
            {isOnTrack ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                No Caminho
              </>
            ) : (
              <>
                <AlertTriangle className="mr-1 h-3 w-3" />
                Atenção
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="rounded-[1.5rem] border border-border/60 bg-surface-elevated/45 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold text-foreground">{formatCurrency(currentAmount)}</span>
            <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
          </div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {percentage.toFixed(1)}% alcançado
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-[1.5rem] border border-border/60 bg-surface-elevated/35 p-4 text-sm">
          <div className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-4 w-4 text-success" />
            <div>
              <p className="text-muted-foreground">Rentabilidade</p>
              <p className="font-semibold text-success">+{goal.expected_return_rate.toFixed(2)}% a.a.</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Aporte Mensal</p>
              <p className="font-semibold text-foreground">{formatCurrency(goal.monthly_contribution)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-violet-400" />
            <div>
              <p className="text-muted-foreground">Prazo Restante</p>
              <p className="font-semibold text-foreground">
                {monthsRemaining} {monthsRemaining === 1 ? 'mês' : 'meses'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 text-warning" />
            <div>
              <p className="text-muted-foreground">Conclusão</p>
              <p className="font-semibold text-foreground">
                {format(parseDateOnly(goal.target_date), 'MMM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-[1.5rem] border border-border/60 bg-surface-elevated/55 p-4 text-sm">
          <div>
            <p className="text-muted-foreground">Distância atual</p>
            <p className="font-semibold text-foreground">{formatCurrency(currentGap)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Projeção final</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(metrics?.final_projection ?? currentAmount)}
            </p>
          </div>
          {linkedCount > 0 ? (
            <>
              <div>
                <p className="text-muted-foreground">Carteira vinculada</p>
                <p className="font-semibold text-foreground">{formatCurrency(linkedAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aportes manuais</p>
                <p className="font-semibold text-foreground">{formatCurrency(manualAmount)}</p>
              </div>
            </>
          ) : null}
        </div>

        {metrics?.final_projection ? (
          <div className="rounded-[1.25rem] border border-border/60 bg-surface-elevated/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnTrack ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-warning" />
                )}
                <span className="text-sm font-medium text-foreground">Projeção Final</span>
              </div>
              <span className="font-semibold text-foreground">
                {formatCurrency(metrics.final_projection)}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-surface-elevated/30 pt-6">
        <Button
          onClick={() => onContribute?.(goal)}
          className="w-full bg-success text-success-foreground shadow-[0_16px_28px_rgba(34,197,94,0.22)] hover:bg-success/90"
          size="lg"
        >
          <TrendingUp className="mr-2 h-5 w-5" />
          Registrar Aporte
        </Button>

        <div className={`grid w-full gap-2 ${linkedCount > 0 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {linkedCount > 0 && onOpenPortfolio ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenPortfolio(goal)}
              className="col-span-2 rounded-xl border-border/70 bg-surface/80 px-3 shadow-sm hover:bg-surface-elevated"
            >
              <Target className="mr-2 h-4 w-4" />
              Ver Carteira
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(goal)}
            className="rounded-xl border-border/70 bg-surface/80 px-3 shadow-sm hover:bg-surface-elevated"
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl border-danger-border/60 bg-danger-subtle/45 px-3 text-danger hover:bg-danger-subtle"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function calculateMonthsRemaining(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  const months =
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

function adjustColor(color: string, amount: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
