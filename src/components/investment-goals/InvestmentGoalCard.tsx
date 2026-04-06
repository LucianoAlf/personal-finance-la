import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Target,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import type { InvestmentGoal, InvestmentGoalPortfolioMetrics } from '@/types/investment-goals.types';
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

export function InvestmentGoalCard({ goal, metrics, onEdit, onContribute, onDelete, onOpenPortfolio }: InvestmentGoalCardProps) {
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-lg bg-gradient-to-br"
              style={{
                background: `linear-gradient(135deg, ${goal.color || '#8B5CF6'} 0%, ${adjustColor(goal.color || '#8B5CF6', -20)} 100%)`,
              }}
            >
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{goal.name}</h3>
              <p className="text-sm text-muted-foreground">
                {INVESTMENT_GOAL_LABELS.category[goal.category]}
              </p>
            </div>
          </div>
          
          <Badge variant={isOnTrack ? 'success' : 'warning'}>
            {isOnTrack ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                No Caminho
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Atenção
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-semibold">{formatCurrency(currentAmount)}</span>
            <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
          </div>
          <Progress 
            value={Math.min(percentage, 100)} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {percentage.toFixed(1)}% alcançado
          </p>
        </div>

        {/* Métricas Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Rentabilidade</p>
              <p className="font-semibold text-green-600">
                +{goal.expected_return_rate.toFixed(2)}% a.a.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Aporte Mensal</p>
              <p className="font-semibold">
                {formatCurrency(goal.monthly_contribution)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-purple-600 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Prazo Restante</p>
              <p className="font-semibold">
                {monthsRemaining} {monthsRemaining === 1 ? 'mês' : 'meses'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-muted-foreground">Conclusão</p>
              <p className="font-semibold">
                {format(parseDateOnly(goal.target_date), 'MMM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-muted-foreground">Distância atual</p>
            <p className="font-semibold">{formatCurrency(currentGap)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Projeção final</p>
            <p className="font-semibold">{formatCurrency(metrics?.final_projection ?? currentAmount)}</p>
          </div>
          {linkedCount > 0 && (
            <>
              <div>
                <p className="text-muted-foreground">Carteira vinculada</p>
                <p className="font-semibold">{formatCurrency(linkedAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aportes manuais</p>
                <p className="font-semibold">{formatCurrency(manualAmount)}</p>
              </div>
            </>
          )}
        </div>

        {/* Projeção Final */}
        {metrics?.final_projection && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnTrack ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                )}
                <span className="text-sm font-medium">Projeção Final:</span>
              </div>
              <span className="font-semibold">
                {formatCurrency(metrics.final_projection)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {/* Botão Principal - Aportar (Full Width, Destaque) */}
        <Button 
          onClick={() => onContribute?.(goal)}
          className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
          size="lg"
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          Registrar Aporte
        </Button>
        
        {/* Ações Secundárias - Lado a Lado */}
        <div className="flex gap-2 w-full flex-wrap">
          {linkedCount > 0 && onOpenPortfolio && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenPortfolio(goal)}
              className="flex-1"
            >
              <Target className="h-4 w-4 mr-2" />
              Ver Carteira
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit?.(goal)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Helper: Calcular meses restantes
function calculateMonthsRemaining(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  const months = (target.getFullYear() - today.getFullYear()) * 12 
                + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

// Helper: Ajustar cor (escurecer/clarear)
function adjustColor(color: string, amount: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
