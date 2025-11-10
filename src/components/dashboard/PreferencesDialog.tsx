// WIDGET ANA CLARA DASHBOARD - Preferências do Usuário
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPreferences, savePreferences, type AnaPreferences, defaultPreferences } from '@/hooks/useAnaPreferences';

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreferencesDialog({ open, onOpenChange }: PreferencesDialogProps) {
  const [prefs, setPrefs] = useState<AnaPreferences>(defaultPreferences);

  useEffect(() => {
    if (open) setPrefs(getPreferences());
  }, [open]);

  const handleSave = () => {
    savePreferences(prefs);
    onOpenChange(false);
    // Disparar reload leve opcional
    try { location.reload(); } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferências da Ana Clara</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tom da comunicação</label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={prefs.tone}
                onChange={(e) => setPrefs({ ...prefs, tone: e.target.value as any })}
              >
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="motivacional">Motivacional</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Quantidade de insights</label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={prefs.insightCount}
                  onChange={(e) => setPrefs({ ...prefs, insightCount: Number(e.target.value) as any })}
                >
                  <option value={3}>3</option>
                  <option value={2}>2</option>
                  <option value={1}>1</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={prefs.disableCharts}
                  onChange={(e) => setPrefs({ ...prefs, disableCharts: e.target.checked })}
                />
                Desativar mini-gráficos
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Foco de conteúdo</label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={prefs.focus.bills} onChange={(e) => setPrefs({ ...prefs, focus: { ...prefs.focus, bills: e.target.checked } })} />
                  Contas
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={prefs.focus.investments} onChange={(e) => setPrefs({ ...prefs, focus: { ...prefs.focus, investments: e.target.checked } })} />
                  Investimentos
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={prefs.focus.goals} onChange={(e) => setPrefs({ ...prefs, focus: { ...prefs.focus, goals: e.target.checked } })} />
                  Metas
                </label>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
