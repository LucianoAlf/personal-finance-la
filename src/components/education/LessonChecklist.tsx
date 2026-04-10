import { useCallback, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/cn';
import { educationBodyClassName, educationShellClassName, educationSubtlePanelClassName } from './education-shell';

interface ChecklistItem {
  id: string;
  label: string;
  help?: string;
}

interface LessonChecklistProps {
  title: string;
  items: ChecklistItem[];
}

export function LessonChecklist({ title, items }: LessonChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const progress = items.length > 0 ? Math.round((checked.size / items.length) * 100) : 0;
  const allDone = checked.size === items.length && items.length > 0;

  return (
    <Card className={cn(educationShellClassName, 'transition-colors', allDone && 'border-emerald-400/50 dark:border-emerald-500/50')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-3 pt-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {allDone ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tudo concluído
              </span>
            ) : (
              `${checked.size} de ${items.length} concluídos`
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((item) => (
          <label
            key={item.id}
            className={cn(educationSubtlePanelClassName, 'flex cursor-pointer items-start gap-3 border-border/50 px-4 py-3')}
          >
            <Checkbox checked={checked.has(item.id)} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
            <div className="space-y-0.5">
              <span
                className={cn(
                  'text-sm leading-snug text-foreground transition-colors',
                  checked.has(item.id) && 'line-through text-muted-foreground',
                )}
              >
                {item.label}
              </span>
              {item.help ? <p className={cn(educationBodyClassName, 'text-xs')}>{item.help}</p> : null}
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
