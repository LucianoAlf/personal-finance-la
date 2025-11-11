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
import { MoreVertical, Edit, Copy, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CycleWithStats } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';

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
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'salary':
        return '💰';
      case 'rent':
        return '🏠';
      case 'bills':
        return '📄';
      case 'investment':
        return '📈';
      default:
        return '🔄';
    }
  };

  const getTypeColorClass = (type: string) => {
    switch (type) {
      case 'salary':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'rent':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'bills':
        return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300';
      case 'investment':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

  const formatNextCycleDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Card
      className={cn(
        'border-l-4 transition-all',
        cycle.active ? 'border-l-green-500' : 'border-l-gray-300 opacity-60'
      )}
      style={cycle.color ? { borderLeftColor: cycle.color } : undefined}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getTypeColorClass(cycle.type))}>
              <span className="text-2xl">{cycle.icon || getTypeIcon(cycle.type)}</span>
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
      <CardContent>
        <div className="space-y-3">
          {/* Dia do Ciclo */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Dia do Ciclo</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={28}
                value={cycle.day}
                onChange={(e) => {
                  const day = parseInt(e.target.value);
                  if (day >= 1 && day <= 28) {
                    onUpdateDay(day);
                  }
                }}
                className="w-16 text-center"
              />
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Descrição */}
          {cycle.description && (
            <div>
              <p className="text-sm text-muted-foreground">{cycle.description}</p>
            </div>
          )}

          {/* Próximo Ciclo */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Próximo Ciclo</span>
            <span className="font-medium">{formatNextCycleDate(cycle.nextCycleDate)}</span>
          </div>

          {/* Dias até próximo */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Faltam</span>
            <span className="font-medium">
              {cycle.daysUntilNext} {cycle.daysUntilNext === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          {/* Notificações */}
          {cycle.notify_start && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <span>🔔</span>
              <span>
                Notificar {cycle.notify_days_before}{' '}
                {cycle.notify_days_before === 1 ? 'dia' : 'dias'} antes
              </span>
            </div>
          )}

          {/* Data de criação */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Criado em {new Date(cycle.created_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
