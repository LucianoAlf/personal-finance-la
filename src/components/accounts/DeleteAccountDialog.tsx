import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  accountName: string;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  accountName,
}: DeleteAccountDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader className="space-y-3 border-b border-border/60 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-danger-border bg-danger-subtle text-danger shadow-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl">Excluir conta?</DialogTitle>
              <DialogDescription className="text-sm">
                Tem certeza que deseja excluir a conta <strong>"{accountName}"</strong>?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-2xl border border-danger-border/70 bg-danger-subtle/70 px-4 py-3 text-sm text-muted-foreground">
          Esta ação é <strong className="text-danger">permanente</strong> e não pode ser desfeita.
          Todas as transações associadas a esta conta também serão removidas.
        </div>

        <DialogFooter className="border-t border-border/60 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Sim, Excluir Conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
