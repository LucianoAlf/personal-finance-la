import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DividendCalendar } from './DividendCalendar';

interface DividendCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyBreakdown?: never;
  totalEstimated?: never;
  next30Days?: never;
  next90Days?: never;
}

export function DividendCalendarSheet({ open, onOpenChange }: DividendCalendarSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div
      data-testid="dividend-calendar-sheet-root"
      aria-hidden={!open}
      className={cn('fixed inset-0 z-[80] lg:hidden', !open && 'pointer-events-none')}
    >
      <button
        type="button"
        aria-label="Fechar calendário"
        onClick={() => onOpenChange(false)}
        className={cn(
          'absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Calendário de dividendos"
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.35)]',
          'transition-transform duration-300 ease-out pb-[env(safe-area-inset-bottom)]',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">Calendário de dividendos</span>
            <span className="text-xs text-muted-foreground">Próximas distribuições</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DividendCalendar monthlyBreakdown={[]} totalEstimated={0} next30Days={0} next90Days={0} />
        </div>
      </div>
    </div>
  );
}
