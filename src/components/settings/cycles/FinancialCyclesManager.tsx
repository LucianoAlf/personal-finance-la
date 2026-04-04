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
      <Card>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
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
        <CardContent>
          {/* Summary */}
          {activeCycles.length > 0 && nextCycle && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
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

          {/* Cycles List */}
          {cyclesWithStats.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
            <div className="grid gap-4 md:grid-cols-2">
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
