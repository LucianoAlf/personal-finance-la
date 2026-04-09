import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Copy, Trash2, Calendar, DollarSign, Home, FileText, TrendingUp, RefreshCw, CreditCard, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CycleWithStats } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';
import { useState, useEffect } from 'react';

interface CycleCardProps {
  cycle: CycleWithStats;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleActive: (active: boolean) => void;
  onUpdateDay: (day: number) => void;
}

export function CycleCard({
  cycle,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onUpdateDay,
}: CycleCardProps) {
  const [draftDay, setDraftDay] = useState(String(cycle.day));

  useEffect(() => {
    setDraftDay(String(cycle.day));
  }, [cycle.day]);

  // Mapeamento de ícones
  const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    'Salário': DollarSign,
    'Aluguel': Home,
    'Contas': FileText,
    'Investimento': TrendingUp,
    'Recorrente': RefreshCw,
    'Cartão': CreditCard,
    'Meta': Target,
    'Análise': BarChart3,
  };

  const getIconComponent = (iconName: string | undefined) => {
    return ICON_MAP[iconName || 'Salário'] || DollarSign;
  };

  const getTypeColorClass = (type: string) => {
    switch (type) {
      case 'salary':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'credit_card':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      case 'rent':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'custom':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

  const formatNextCycleDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const commitDay = () => {
    const parsed = parseInt(draftDay, 10);

    if (!Number.isFinite(parsed)) {
      setDraftDay(String(cycle.day));
      return;
    }

    const normalizedDay = Math.min(28, Math.max(1, parsed));
    setDraftDay(String(normalizedDay));

    if (normalizedDay !== cycle.day) {
      onUpdateDay(normalizedDay);
    }
  };

  return (
    <Card
      className={cn(
        'rounded-[28px] border transition-all shadow-[0_16px_34px_rgba(8,15,32,0.1)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.26)]',
        cycle.active
          ? 'border-border/70 bg-surface hover:-translate-y-0.5 hover:border-primary/20'
          : 'border-border/70 bg-surface/75 opacity-75'
      )}
      style={cycle.color ? { boxShadow: `inset 3px 0 0 ${cycle.color}` } : undefined}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-xl border p-2.5 shadow-sm', getTypeColorClass(cycle.type))}>
              {(() => {
                const IconComponent = getIconComponent(cycle.icon);
                return <IconComponent className="h-6 w-6" />;
              })()}
            </div>
            <div>
              <h3 className="font-semibold">{cycle.name}</h3>
              <p className="text-sm text-muted-foreground">{LABELS.cycleType[cycle.type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={cycle.active} onCheckedChange={onToggleActive} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="rounded-[22px] border border-border/70 bg-surface-elevated/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dia do Ciclo</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={draftDay}
                  onChange={(e) => setDraftDay(e.target.value)}
                  onBlur={commitDay}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitDay();
                    }
                  }}
                  className="w-16 text-center"
                />
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {cycle.description && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">{cycle.description}</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-border/70 bg-surface-elevated/65 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/90">Próximo Ciclo</p>
              <p className="mt-2 text-base font-semibold text-foreground">{formatNextCycleDate(cycle.nextCycleDate)}</p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-surface-elevated/65 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/90">Faltam</p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {cycle.daysUntilNext} {cycle.daysUntilNext === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </div>

          {cycle.notify_start && (
            <div className="flex items-center gap-2 rounded-2xl border border-info/20 bg-info/8 px-3 py-2 text-xs text-info">
              <span>🔔</span>
              <span>
                Notificar {cycle.notify_days_before}{' '}
                {cycle.notify_days_before === 1 ? 'dia' : 'dias'} antes
              </span>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-3 border-t border-border/60">
            Criado em {new Date(cycle.created_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
