import { useState } from 'react';
import { format } from 'date-fns';
import { generateDetailedCSV, downloadCSV } from '@/utils/csvExport';
import { supabase } from '@/lib/supabase';

interface Invoice {
  id: string;
  month: string;
  cardName: string;
  total: number;
  paid: number;
  status: string;
}

export function useExportInvoices() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToCSV = async (invoices: Invoice[]) => {
    try {
      setExporting(true);
      setError(null);

      // Buscar transações para cada fatura
      const invoicesWithTransactions = await Promise.all(
        invoices.map(async (invoice) => {
          const { data: transactions } = await supabase
            .from('credit_card_transactions')
            .select(`
              created_at,
              description,
              amount,
              categories (
                name
              )
            `)
            .eq('invoice_id', invoice.id);

          return {
            ...invoice,
            transactions: transactions || [],
          };
        })
      );

      // Gerar CSV com transações detalhadas
      const csv = generateDetailedCSV(invoicesWithTransactions);
      const filename = `historico-faturas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      
      downloadCSV(csv, filename);

      return true;
    } catch (err) {
      console.error('Erro ao exportar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao exportar');
      return false;
    } finally {
      setExporting(false);
    }
  };

  return {
    exportToCSV,
    exporting,
    error,
  };
}
