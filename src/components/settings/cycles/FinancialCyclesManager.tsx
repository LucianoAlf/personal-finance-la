import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { useCyclesManager } from '@/hooks/useCyclesManager';
import { CycleDialog } from './CycleDialog';
import { CycleCard } from './CycleCard';
import type { FinancialCycle, CreateCycleInput, UpdateCycleInput } from '@/types/settings.types';

export function FinancialCyclesManager() {
  const {
    cyclesWithStats,
    activeCycles,
    nextCycle,
    loading,
    createCycle,
    updateCycle,
    deleteCycle,
    toggleActive,
    duplicateCycle,
  } = useCyclesManager();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<FinancialCycle | null>(null);

  const handleOpenDialog = (cycle?: FinancialCycle) => {
    setSelectedCycle(cycle || null);
    setDialogOpen(true);
  };

  const handleSave = async (input: CreateCycleInput | UpdateCycleInput) => {
    if (selectedCycle) {
      return await updateCycle(selectedCycle.id, input as UpdateCycleInput);
    } else {
      const result = await createCycle(input as CreateCycleInput);
      return result !== null;
    }
  };

  const handleDelete = async (id: string) => {
    return await deleteCycle(id);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    return await toggleActive(id, active);
  };

  const handleUpdateDay = async (id: string, day: number) => {
    return await updateCycle(id, { day });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateCycle(id);
  };

  if (loading) {
    return (
      <Card
        data-testid="goals-settings-cycles-shell"
        className="rounded-[28px] border border-border/70 bg-surface shadow-[0_18px_46px_rgba(8,15,32,0.14)] dark:shadow-[0_24px_56px_rgba(2,6,23,0.32)]"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ciclos Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        data-testid="goals-settings-cycles-shell"
        className="rounded-[28px] border border-border/70 bg-surface shadow-[0_18px_46px_rgba(8,15,32,0.14)] dark:shadow-[0_24px_56px_rgba(2,6,23,0.32)]"
      >
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                  <Calendar className="h-5 w-5" />
                </span>
                Ciclos Financeiros
              </CardTitle>
              <CardDescription>
                Controle de períodos (salário, cartão, aluguel)
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar Ciclo Rápido
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeCycles.length > 0 && nextCycle && (
            <div className="mb-6 rounded-[24px] border border-border/70 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.16),rgba(15,23,42,0))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Ciclos Ativos</p>
                  <p className="text-2xl font-bold">{activeCycles.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Próximo Ciclo</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {nextCycle.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dia {nextCycle.day} de cada mês
                  </p>
                </div>
              </div>
            </div>
          )}

          {cyclesWithStats.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/60 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-primary shadow-sm">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum ciclo criado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro ciclo financeiro
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Ciclo
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {cyclesWithStats.map((cycle) => (
                <CycleCard
                  key={cycle.id}
                  cycle={cycle}
                  onEdit={() => handleOpenDialog(cycle)}
                  onDelete={() => handleDelete(cycle.id)}
                  onDuplicate={() => handleDuplicate(cycle.id)}
                  onToggleActive={(active) => handleToggleActive(cycle.id, active)}
                  onUpdateDay={(day) => handleUpdateDay(cycle.id, day)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CycleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cycle={selectedCycle}
        onSave={handleSave}
        onDelete={selectedCycle ? () => handleDelete(selectedCycle.id) : undefined}
      />
    </>
  );
}
