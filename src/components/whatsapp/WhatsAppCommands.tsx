import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppCommands } from '@/hooks/useWhatsAppCommands';
import { Loader2, MessageCircleMore } from 'lucide-react';

export function WhatsAppCommands() {
  const { commands, isLoading, error } = useWhatsAppCommands();

  if (isLoading) {
    return (
      <div className="bg-muted/50 p-6 rounded-lg flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
        <span>Carregando comandos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="text-sm">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="bg-muted/50 p-6 rounded-lg space-y-4">
      <h4 className="font-semibold">Comandos Disponíveis</h4>

      {commands.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum comando ativo cadastrado no momento.
        </p>
      ) : (
        <div className="grid gap-3">
          {commands.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 min-w-0">
                <Badge variant="outline" className="font-mono text-xs w-fit shrink-0">
                  {item.command}
                </Badge>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-sm text-muted-foreground block">{item.description}</span>
                  {item.example ? (
                    <span className="text-xs text-muted-foreground block">
                      Ex.: {item.example}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Alert>
        <MessageCircleMore className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Você também pode enviar lançamentos por <strong>texto</strong>, <strong>áudio</strong> ou{' '}
          <strong>foto de nota fiscal</strong> - processamos automaticamente!
        </AlertDescription>
      </Alert>
    </div>
  );
}
