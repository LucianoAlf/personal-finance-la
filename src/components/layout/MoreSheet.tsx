import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moreSheetItems } from '@/config/navigation';
import { useUIStore } from '@/store/uiStore';

export function MoreSheet() {
  const { moreSheetOpen, setMoreSheetOpen } = useUIStore();

  useEffect(() => {
    if (!moreSheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreSheetOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moreSheetOpen, setMoreSheetOpen]);

  if (!moreSheetOpen) return null;

  return (
    <div data-testid="more-sheet-root" className="lg:hidden">
      <div
        data-testid="more-sheet-backdrop"
        onClick={() => setMoreSheetOpen(false)}
        className="fixed inset-0 z-40 bg-background/55 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mais opções"
        className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-50 max-h-[56dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-6 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between pb-3">
          <div className="text-sm font-semibold text-foreground">Mais</div>
          <button
            type="button"
            onClick={() => setMoreSheetOpen(false)}
            aria-label="Fechar"
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-elevated"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {moreSheetItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreSheetOpen(false)}
                className={cn(
                  'flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated px-2 py-3 text-center text-[11px] leading-tight text-foreground transition-colors',
                  'hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                <Icon size={22} className="text-primary" aria-hidden="true" />
                <span className="line-clamp-2">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
