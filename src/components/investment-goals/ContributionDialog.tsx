import { useState, useEffect } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { InvestmentGoal, CreateContributionInput } from '@/types/investment-goals.types';

interface ContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: InvestmentGoal | null;
  onSave: (input: CreateContributionInput) => Promise<boolean>;
}

export function ContributionDialog({ open, onOpenChange, goal, onSave }: ContributionDialogProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form quando abrir
  useEffect(() => {
    if (open) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [open]);

  if (!goal) return null;

  // Calcular preview
  const amountNumber = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const newTotal = goal.current_amount + amountNumber;
  const newPercentage = (newTotal / goal.target_amount) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNumber <= 0) return;

    setIsSaving(true);
    
    const success = await onSave({
      goal_id: goal.id,
      amount: amountNumber,
      date,
      note: note || undefined,
    });

    if (success) {
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  const dialogTitle = 'Registrar Aporte';

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
      <ResponsiveDialogBody>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Aporte (R$) *</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 3.500,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data do Aporte</Label>
            <DatePickerInput
              value={date}
              onChange={setDate}
              placeholder="Selecione a data"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Input
              id="note"
              placeholder="Ex: Aporte mensal de novembro"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Preview do novo total */}
          {amountNumber > 0 && (
            <div className="rounded-[1.35rem] border border-success-border/60 bg-success-subtle/45 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="font-semibold text-success">Novo Progresso</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atual:</span>
                  <span className="font-medium text-foreground">
                    R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-medium text-success">
                  <span>Aporte:</span>
                  <span>+R$ {amountNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-success-border/60 pt-2 font-semibold text-foreground">
                  <span>Novo Total:</span>
                  <span>R$ {newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({newPercentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border/60 px-0 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-xl border-border/70 bg-surface/80 px-5 shadow-sm hover:bg-surface-elevated"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || amountNumber <= 0}
              className="rounded-xl bg-success px-5 text-success-foreground shadow-[0_16px_28px_rgba(34,197,94,0.24)] hover:bg-success/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Registrar Aporte
                </>
              )}
            </Button>
          </div>
        </form>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
