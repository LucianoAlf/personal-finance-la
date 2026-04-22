import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ConfigSection {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

interface GoalsConfigMobileLayoutProps {
  sections: ConfigSection[];
}

export function GoalsConfigMobileLayout({ sections }: GoalsConfigMobileLayoutProps) {
  if (sections.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhuma configuração disponível.
      </div>
    );
  }

  return (
    <div className="lg:hidden space-y-2 px-2 pb-4 pt-2">
      {sections.map((section) => (
        <details
          key={section.id}
          open={section.defaultOpen}
          className="group rounded-xl border border-border/60 bg-surface-elevated/60"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold text-foreground">
            <span>{section.title}</span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-border/60 p-3">{section.children}</div>
        </details>
      ))}
    </div>
  );
}
