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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Excluir Conta?</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Tem certeza que deseja excluir a conta <strong>"{accountName}"</strong>?
            <br />
            <br />
            Esta ação é <strong>permanente</strong> e não pode ser desfeita. Todas as transações
            associadas a esta conta também serão removidas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Sim, Excluir Conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
