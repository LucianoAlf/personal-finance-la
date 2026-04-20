import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { quickCreateItems, type QuickCreateAction } from '@/config/navigation';
import { useUIStore } from '@/store/uiStore';

export function QuickCreateFab() {
  const { anaCoachOpen, moreSheetOpen, openQuickCreate } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (anaCoachOpen || moreSheetOpen) return null;

  const select = (action: QuickCreateAction) => {
    openQuickCreate(action);
    setMenuOpen(false);
  };

  return (
    <div
      ref={rootRef}
      data-testid="fab-root"
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-30 lg:hidden"
    >
      {menuOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="mb-3 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2 shadow-xl"
        >
          {quickCreateItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                role="menuitem"
                type="button"
                onClick={() => select(item.action)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated"
              >
                <Icon size={18} className="text-emerald-500" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Fechar menu de criar' : 'Criar'}
        aria-expanded={menuOpen}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform',
          menuOpen ? 'rotate-45 bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600',
        )}
      >
        {menuOpen ? <X size={24} aria-hidden="true" /> : <Plus size={26} aria-hidden="true" />}
      </button>
    </div>
  );
}
