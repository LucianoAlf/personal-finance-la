import { useId } from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays, Wallet } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';

export type EventOwnershipChoice = 'agenda' | 'financial';

export interface OwnershipChooserProps {
  value: EventOwnershipChoice;
  onChange: (next: EventOwnershipChoice) => void;
  className?: string;
}

export function OwnershipChooser({ value, onChange, className }: OwnershipChooserProps) {
  const name = useId();

  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        O que você está criando?
      </legend>
      <div
        role="radiogroup"
        aria-label="Tipo de item"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <label className="block cursor-pointer">
          <input
            type="radio"
            name={name}
            value="agenda"
            checked={value === 'agenda'}
            onChange={() => onChange('agenda')}
            className="peer sr-only"
          />
          <span
            className={cn(
              'group relative flex flex-col gap-2 rounded-2xl border p-4 text-left shadow-sm transition-all',
              'border-border/60 bg-surface-elevated/80 hover:border-primary/35 hover:bg-surface-overlay',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
              'peer-checked:border-primary/55 peer-checked:bg-surface-overlay peer-checked:ring-2 peer-checked:ring-primary/25',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  value === 'agenda' && 'bg-primary/15 text-primary',
                )}
              >
                <CalendarDays className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold leading-tight text-foreground">
                Compromisso de agenda
              </span>
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Reuniões, foco pessoal, mentoria e tudo que entra na sua agenda — sem misturar com contas ou
              faturas.
            </span>
          </span>
        </label>

        <label className="block cursor-pointer">
          <input
            type="radio"
            name={name}
            value="financial"
            checked={value === 'financial'}
            onChange={() => onChange('financial')}
            className="peer sr-only"
          />
          <span
            className={cn(
              'group relative flex flex-col gap-2 rounded-2xl border p-4 text-left shadow-sm transition-all',
              'border-border/60 bg-surface-elevated/80 hover:border-amber-500/35 hover:bg-surface-overlay',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500/35 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
              'peer-checked:border-amber-500/50 peer-checked:bg-amber-500/5 peer-checked:ring-2 peer-checked:ring-amber-500/20',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  value === 'financial' && 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
                )}
              >
                <Wallet className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold leading-tight text-foreground">
                Obrigação financeira
              </span>
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              Contas a pagar, faturas de cartão ou ciclos financeiros — mantidos no módulo financeiro, com
              rota e regras próprias.
            </span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}

export interface OwnershipPageChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (choice: EventOwnershipChoice) => void;
}

/**
 * Modal first step on CalendarPage: agenda vs financial before opening create flows.
 * CreateEventDialog keeps the inline {@link OwnershipChooser} for other entry points.
 */
export function OwnershipPageChooserDialog({
  open,
  onOpenChange,
  onChoose,
}: OwnershipPageChooserDialogProps) {
  const pick = (choice: EventOwnershipChoice) => {
    onChoose(choice);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
      <ResponsiveDialogHeader
        title="O que você está criando?"
        description="Compromissos de agenda ficam nesta tela. Contas, faturas e ciclos têm o módulo Contas, com regras próprias."
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            data-testid="ownership-choice-agenda"
            className="h-auto min-h-32 w-full whitespace-normal flex-col items-stretch justify-start gap-3 rounded-2xl border-border/60 bg-surface-elevated/80 p-4 text-left shadow-sm hover:border-primary/40 hover:bg-surface-overlay"
            onClick={() => pick('agenda')}
          >
            <span className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden />
              </span>
              <span className="whitespace-normal text-sm font-semibold text-foreground">
                Compromisso de agenda
              </span>
            </span>
            <span className="block whitespace-normal text-xs leading-relaxed text-muted-foreground">
              Reuniões, foco e mentoria — sem misturar com lançamentos financeiros.
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="ownership-choice-financial"
            className="h-auto min-h-32 w-full whitespace-normal flex-col items-stretch justify-start gap-3 rounded-2xl border-amber-500/35 bg-amber-500/[0.06] p-4 text-left shadow-sm hover:border-amber-500/50 hover:bg-amber-500/10"
            onClick={() => pick('financial')}
          >
            <span className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Wallet className="h-5 w-5" aria-hidden />
              </span>
              <span className="whitespace-normal text-sm font-semibold text-foreground">
                Obrigação financeira
              </span>
            </span>
            <span className="block whitespace-normal text-xs leading-relaxed text-muted-foreground">
              Abre o módulo Contas para contas a pagar, faturas ou ciclos.
            </span>
          </Button>
        </div>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
