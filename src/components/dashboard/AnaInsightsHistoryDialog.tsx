// WIDGET ANA CLARA DASHBOARD - Histórico de Insights (últimos 7 dias)
import { useMemo } from 'react';
import { getInsightsHistory, clearInsightsHistory } from '@/hooks/useAnaInsightsHistory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Trash2 } from 'lucide-react';

interface AnaInsightsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnaInsightsHistoryDialog({ open, onOpenChange }: AnaInsightsHistoryDialogProps) {
  const items = useMemo(() => getInsightsHistory(7), [open]);

  const priorityVariant: Record<string, string> = {
    celebration: 'success',
    warning: 'warning',
    critical: 'destructive',
    info: 'secondary',
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Histórico de Insights (7 dias)
          </DialogTitle>
          <DialogDescription>
            Registros locais dos últimos insights principais exibidos pela Ana Clara.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Nenhum insight registrado ainda.
            </Card>
          ) : (
            items.map((it) => (
              <Card key={it.timestamp} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityVariant[it.priority] as any}>{it.priority}</Badge>
                      <Badge variant="outline">{it.type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(it.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="font-medium text-gray-900">{it.headline}</div>
                    <div className="text-sm text-gray-700 line-clamp-2">{it.description}</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {items.length > 0 && (
            <Button variant="ghost" onClick={() => { clearInsightsHistory(); onOpenChange(false); }}>
              <Trash2 className="mr-2 h-4 w-4" /> Limpar histórico
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
