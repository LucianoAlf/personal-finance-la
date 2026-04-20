import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

type Mode = 'desktop' | 'mobile';
const ModeContext = createContext<Mode>('desktop');

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function ResponsiveDialog({ open, onOpenChange, children, className }: ResponsiveDialogProps) {
  return (
    <>
      {/* Desktop: Radix Dialog with portal, focus trap, ESC, overlay click */}
      <div data-testid="responsive-dialog-desktop" className="hidden lg:block">
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={cn('max-w-2xl', className)}>
            <ModeContext.Provider value="desktop">
              {children}
            </ModeContext.Provider>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: full-screen overlay */}
      {open && (
        <div
          data-testid="responsive-dialog-mobile"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex flex-col bg-background text-foreground lg:hidden"
        >
          <ModeContext.Provider value="mobile">
            {children}
          </ModeContext.Provider>
        </div>
      )}
    </>
  );
}

interface ResponsiveDialogHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
}

export function ResponsiveDialogHeader({ title, description, onClose }: ResponsiveDialogHeaderProps) {
  const mode = useContext(ModeContext);

  if (mode === 'desktop') {
    return (
      <div data-testid="responsive-dialog-header-desktop" className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    );
  }

  return (
    <header
      data-testid="responsive-dialog-header-mobile"
      className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
      >
        <X size={20} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </header>
  );
}

export function ResponsiveDialogBody({ children }: { children: ReactNode }) {
  const mode = useContext(ModeContext);

  if (mode === 'desktop') {
    return <div data-testid="responsive-dialog-body-desktop">{children}</div>;
  }

  return (
    <div
      data-testid="responsive-dialog-body-mobile"
      className="flex-1 overflow-y-auto px-4 py-4"
    >
      {children}
    </div>
  );
}

export function ResponsiveDialogFooter({ children }: { children: ReactNode }) {
  const mode = useContext(ModeContext);

  if (mode === 'desktop') {
    return (
      <div data-testid="responsive-dialog-footer-desktop" className="flex justify-end gap-2 pt-4">
        {children}
      </div>
    );
  }

  return (
    <footer
      data-testid="responsive-dialog-footer-mobile"
      className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      {children}
    </footer>
  );
}
