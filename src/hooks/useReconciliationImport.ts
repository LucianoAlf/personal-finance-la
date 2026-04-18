import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  countNonEmptyLines,
  prepareCsvImport,
  prepareManualImport,
  preparePasteImport,
} from '@/lib/reconciliation-import';
import type {
  ReconciliationImportPreview,
  ReconciliationImportMode,
  ReconciliationImportRequest,
} from '@/types/reconciliation';

import { useReconciliationMutations } from './useReconciliationMutations';

export interface ManualDraft {
  description: string;
  amount: string;
  date: string;
  accountName: string;
}

export function useReconciliationImport() {
  const { importTransactions } = useReconciliationMutations();
  const [mode, setMode] = useState<ReconciliationImportMode>('paste');
  const [pasteText, setPasteText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReconciliationImportPreview | null>(null);
  const [preparedImport, setPreparedImport] = useState<ReconciliationImportRequest | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualDraft>({
    description: '',
    amount: '',
    date: '',
    accountName: '',
  });

  const pasteCount = useMemo(() => countNonEmptyLines(pasteText), [pasteText]);

  const handlePasteAnalyze = () => {
    const prepared = preparePasteImport(pasteText);
    setPreparedImport(prepared.request);
    setPreview(prepared.preview);
  };

  const handleCsvSelected = async (file: File | null) => {
    setSelectedFileName(file?.name ?? null);
    if (!file) {
      setPreparedImport(null);
      setPreview(null);
      return;
    }

    const contents = await file.text();
    const prepared = prepareCsvImport(file.name, contents);
    setPreparedImport(prepared.request);
    setPreview(prepared.preview);
  };

  const handleManualPreview = () => {
    const prepared = prepareManualImport(manualDraft);
    setPreparedImport(prepared.request);
    setPreview(prepared.preview);
  };

  const resetState = () => {
    setPasteText('');
    setSelectedFileName(null);
    setPreview(null);
    setPreparedImport(null);
    setManualDraft({
      description: '',
      amount: '',
      date: '',
      accountName: '',
    });
  };

  const handleImport = async () => {
    if (!preparedImport?.rows.length) {
      toast.error('Prepare um preview valido antes de importar.');
      return;
    }

    try {
      const result = await importTransactions.mutateAsync(preparedImport);
      const importedCount =
        typeof result?.importedCount === 'number' ? result.importedCount : preparedImport.rows.length;

      toast.success(
        importedCount === 1
          ? '1 movimento enviado para a conciliacao.'
          : `${importedCount} movimentos enviados para a conciliacao.`,
      );

      resetState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao importar movimentos.');
    }
  };

  return {
    mode,
    setMode,
    pasteText,
    setPasteText,
    pasteCount,
    selectedFileName,
    preview,
    manualDraft,
    setManualDraft,
    handlePasteAnalyze,
    handleCsvSelected,
    handleManualPreview,
    handleImport,
    importPending: importTransactions.isPending,
    canImport: Boolean(preparedImport?.rows.length),
  };
}
