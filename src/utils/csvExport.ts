import { format } from 'date-fns';

interface Invoice {
  month: string;
  cardName: string;
  total: number;
  paid: number;
  status: string;
  transactions?: Transaction[];
}

interface Transaction {
  created_at: string;
  description: string;
  amount: number;
  category?: {
    name: string;
  };
}

export function generateInvoicesCSV(invoices: Invoice[]): string {
  const headers = ['Mês', 'Cartão', 'Total', 'Pago', 'Restante', 'Status'];
  const rows = invoices.map(inv => [
    inv.month,
    inv.cardName,
    inv.total.toFixed(2),
    inv.paid.toFixed(2),
    (inv.total - inv.paid).toFixed(2),
    inv.status
  ]);

  return [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');
}

export function generateDetailedCSV(invoices: Invoice[]): string {
  const headers = [
    'Mês Fatura',
    'Cartão',
    'Data Transação',
    'Descrição',
    'Categoria',
    'Valor',
    'Status Fatura'
  ];

  const rows: string[][] = [];

  invoices.forEach(invoice => {
    if (invoice.transactions && invoice.transactions.length > 0) {
      invoice.transactions.forEach(tx => {
        rows.push([
          invoice.month,
          invoice.cardName,
          format(new Date(tx.created_at), 'dd/MM/yyyy'),
          tx.description,
          tx.category?.name || 'Sem categoria',
          tx.amount.toFixed(2),
          invoice.status
        ]);
      });
    } else {
      // Se não houver transações, adicionar linha da fatura
      rows.push([
        invoice.month,
        invoice.cardName,
        '-',
        'Sem transações',
        '-',
        invoice.total.toFixed(2),
        invoice.status
      ]);
    }
  });

  return [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');
}

export function downloadCSV(csv: string, filename: string) {
  // BOM para UTF-8 (Excel compatibility)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
