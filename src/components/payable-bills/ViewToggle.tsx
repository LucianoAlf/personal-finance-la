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
    <div className="flex items-center rounded-lg border bg-muted p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 rounded-md transition-all",
          value === 'cards' && "bg-background shadow-sm"
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
          "h-8 px-3 rounded-md transition-all",
          value === 'table' && "bg-background shadow-sm"
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
          "h-8 px-3 rounded-md transition-all",
          value === 'calendar' && "bg-background shadow-sm"
        )}
        onClick={() => onChange('calendar')}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Calendário
      </Button>
    </div>
  );
}
