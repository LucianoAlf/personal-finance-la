import { ChangeEvent } from 'react';
import { ClipboardPaste, FileSpreadsheet, PenSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { useReconciliationImport } from '@/hooks/useReconciliationImport';

interface ReconciliationImportPanelProps {
  state: ReturnType<typeof useReconciliationImport>;
}

const tabsListClassName =
  'grid h-auto w-full grid-cols-3 rounded-[1.2rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]';

const tabsTriggerClassName =
  'flex items-center justify-center gap-2 rounded-[0.9rem] px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15';

export function ReconciliationImportPanel({ state }: ReconciliationImportPanelProps) {
  const handleCsvChange = (event: ChangeEvent<HTMLInputElement>) => {
    state.handleCsvSelected(event.target.files?.[0] ?? null);
  };

  return (
    <Card className="rounded-[1.4rem] border-border/70 bg-surface/92 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
      <CardContent className="space-y-4 px-4 py-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Ingestão manual</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Colar extrato, subir CSV ou registrar um movimento isolado para entrar no mesmo pipeline da reconciliação.
          </p>
        </div>

        <Tabs value={state.mode} onValueChange={(value) => state.setMode(value as typeof state.mode)}>
          <TabsList className={tabsListClassName}>
            <TabsTrigger value="paste" className={tabsTriggerClassName}>
              <ClipboardPaste className="h-4 w-4" />
              Colar extrato
            </TabsTrigger>
            <TabsTrigger value="csv" className={tabsTriggerClassName}>
              <FileSpreadsheet className="h-4 w-4" />
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="manual" className={tabsTriggerClassName}>
              <PenSquare className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4 space-y-3">
            <Textarea
              value={state.pasteText}
              onChange={(event) => state.setPasteText(event.target.value)}
              placeholder="Cole aqui as linhas do extrato bancário..."
              className="min-h-[140px] rounded-xl border-border/70 bg-background/70"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">{state.pasteCount} linhas detectadas</div>
              <Button type="button" size="sm" className="rounded-xl" onClick={state.handlePasteAnalyze}>
                Gerar preview
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="mt-4 space-y-3">
            <Input type="file" accept=".csv,text/csv" onChange={handleCsvChange} className="rounded-xl border-border/70 bg-background/70" />
            <div className="text-xs text-muted-foreground">
              {state.selectedFileName ? `Arquivo selecionado: ${state.selectedFileName}` : 'Selecione um CSV de banco para mapear colunas.'}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-3">
            <Input
              value={state.manualDraft.description}
              onChange={(event) => state.setManualDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Descrição do movimento"
              className="rounded-xl border-border/70 bg-background/70"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                value={state.manualDraft.amount}
                onChange={(event) => state.setManualDraft((current) => ({ ...current, amount: event.target.value }))}
                placeholder="Valor"
                className="rounded-xl border-border/70 bg-background/70"
              />
              <DatePickerInput
                value={state.manualDraft.date}
                onChange={(value) => state.setManualDraft((current) => ({ ...current, date: value }))}
                placeholder="Selecione uma data"
                className="rounded-xl border-border/70 bg-background/70 justify-start"
                enableMonthYearNavigation
                disableFuture={false}
              />
            </div>
            <Input
              value={state.manualDraft.accountName}
              onChange={(event) => state.setManualDraft((current) => ({ ...current, accountName: event.target.value }))}
              placeholder="Conta / banco"
              className="rounded-xl border-border/70 bg-background/70"
            />
            <div className="flex justify-end">
              <Button type="button" size="sm" className="rounded-xl" onClick={state.handleManualPreview}>
                Preparar preview
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {state.preview ? (
          <div className="rounded-xl border border-border/50 bg-surface-elevated/30 px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</div>
            <div className="mt-1 text-sm text-foreground">{state.preview.itemCount} item(ns) • origem: {state.preview.source}</div>
            <div className="mt-1 text-xs text-muted-foreground">{state.preview.note}</div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={state.handleImport}
                disabled={!state.canImport || state.importPending}
              >
                {state.importPending ? 'Importando...' : 'Importar para conciliacao'}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
