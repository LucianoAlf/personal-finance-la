import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'table' | 'calendar';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-[1.15rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 rounded-[0.9rem] px-4 text-sm font-semibold text-muted-foreground transition-all",
          value === 'cards' && "bg-surface text-foreground shadow-sm ring-1 ring-primary/15"
        )}
        onClick={() => onChange('cards')}
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Cards
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 rounded-[0.9rem] px-4 text-sm font-semibold text-muted-foreground transition-all",
          value === 'table' && "bg-surface text-foreground shadow-sm ring-1 ring-primary/15"
        )}
        onClick={() => onChange('table')}
      >
        <List className="h-4 w-4 mr-2" />
        Tabela
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 rounded-[0.9rem] px-4 text-sm font-semibold text-muted-foreground transition-all",
          value === 'calendar' && "bg-surface text-foreground shadow-sm ring-1 ring-primary/15"
        )}
        onClick={() => onChange('calendar')}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Calendário
      </Button>
    </div>
  );
}
