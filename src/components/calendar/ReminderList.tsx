import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Bell, Plus, Trash2 } from 'lucide-react';

export interface ReminderEntry {
  id: string;
  offsetMinutes: number;
}

const OFFSET_PRESETS: { value: string; label: string }[] = [
  { value: '0', label: 'No horário do evento' },
  { value: '5', label: '5 minutos antes' },
  { value: '15', label: '15 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '120', label: '2 horas antes' },
  { value: '1440', label: '1 dia antes' },
  { value: '2880', label: '2 dias antes' },
];

function newReminderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface ReminderListProps {
  reminders: ReminderEntry[];
  onChange: (reminders: ReminderEntry[]) => void;
  className?: string;
}

export function ReminderList({ reminders, onChange, className }: ReminderListProps) {
  const addReminder = () => {
    onChange([...reminders, { id: newReminderId(), offsetMinutes: 30 }]);
  };

  const removeReminder = (id: string) => {
    onChange(reminders.filter((r) => r.id !== id));
  };

  const updateOffset = (id: string, offsetMinutes: number) => {
    onChange(
      reminders.map((r) => (r.id === id ? { ...r, offsetMinutes } : r)),
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-surface-elevated/50 px-3 py-2.5">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p
          className="text-xs leading-relaxed text-muted-foreground"
          data-testid="reminder-parity-notice"
        >
          Nesta versão, os lembretes listados abaixo são <span className="font-medium text-foreground">sempre relativos ao início</span> do compromisso. Lembretes em{' '}
          <span className="font-medium text-foreground">horário absoluto</span> são tratados como{' '}
          <span className="font-medium text-foreground">nativos do app</span> e não replicam paridade com TickTick; na sincronização,{' '}
          <span className="font-medium text-foreground">apenas offsets relativos</span> são considerados para paridade com TickTick.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lembretes relativos
        </Label>

        <div className="space-y-2">
          {reminders.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/60 bg-surface/40 px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum lembrete. Adicione avisos antes do horário de início.
            </p>
          )}

          {reminders.map((r, idx) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface-elevated/80 px-2 py-2 sm:flex-nowrap"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-xs font-semibold tabular-nums text-muted-foreground">
                {idx + 1}
              </span>
              <Select
                value={String(r.offsetMinutes)}
                onValueChange={(v) => updateOffset(r.id, parseInt(v, 10))}
              >
                <SelectTrigger
                  aria-label={`Lembrete ${idx + 1}`}
                  className="h-10 min-w-0 flex-1 rounded-xl border-border/60 bg-surface focus:ring-primary"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-surface-overlay">
                  {OFFSET_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="rounded-lg">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                relativo
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeReminder(r.id)}
                aria-label={`Remover lembrete ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 rounded-xl border-border/60 bg-surface-elevated hover:bg-surface-overlay"
          onClick={addReminder}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar lembrete
        </Button>
      </div>
    </div>
  );
}
