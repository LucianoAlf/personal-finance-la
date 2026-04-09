import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayableBill } from '@/types/payable-bills.types';
import type { Category } from '@/types/categories';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/utils/billCalculations';
import { PAYMENT_METHOD_LABELS } from '@/types/payable-bills.types';
import { getBillCategoryName } from '@/utils/billCalculations';
import { HistoryDateFilter, DateRange } from './HistoryDateFilter';
import { HistorySummaryCards } from './HistorySummaryCards';
import { BillCategoryFilter, CategoryFilter } from './BillCategoryFilter';

interface BillHistoryTableProps {
  bills: PayableBill[];
  categories: Category[];
  onDelete?: (bill: PayableBill) => void;
}

export function BillHistoryTable({ bills, categories, onDelete }: BillHistoryTableProps) {
  const [search, setSearch] = useState('');
  
  // Buscar categoria pelo ID ou usar fallback
  const getCategoryName = (bill: PayableBill) => {
    if (bill.category_id) {
      const cat = categories.find(c => c.id === bill.category_id);
      if (cat) return cat.name;
    }
    return getBillCategoryName(bill.bill_type);
  };
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      from: startOfMonth(today),
      to: endOfMonth(today),
    };
  });

  // Filtrar apenas contas pagas
  const paidBills = useMemo(() => {
    return bills.filter((b) => b.status === 'paid');
  }, [bills]);

  // Filtrar bills
  const filteredBills = useMemo(() => {
    let filtered = paidBills;

    // Filtro de busca
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.description.toLowerCase().includes(searchLower) ||
          b.provider_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((b) => b.bill_type === categoryFilter);
    }

    // Filtro de data
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((b) => {
        if (!b.paid_at) return false;
        const paidDate = parseISO(b.paid_at);
        return isWithinInterval(paidDate, { start: dateRange.from!, end: dateRange.to! });
      });
    }

    // Ordenar por data de pagamento (mais recente primeiro)
    return filtered.sort((a, b) => {
      if (!a.paid_at || !b.paid_at) return 0;
      return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
    });
  }, [paidBills, search, categoryFilter, dateRange]);

  if (paidBills.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.8rem] border border-border/70 bg-card/95 px-6 py-20 text-center shadow-[0_20px_48px_rgba(15,23,42,0.08)]"
      >
        <div className="mx-auto mb-4 rounded-full border border-border/70 bg-surface/70 p-6">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum histórico ainda</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Contas pagas aparecerão aqui no histórico
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <HistoryDateFilter value={dateRange} onChange={setDateRange} />

      {/* Summary Cards */}
      <HistorySummaryCards bills={filteredBills} />

      {/* Filtros adicionais */}
      <div className="rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-border/70 bg-surface/80 pl-9 shadow-none"
            />
          </div>
          <BillCategoryFilter
            categories={categories}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/70 bg-surface/75 hover:bg-surface/75">
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{bill.description}</p>
                    {bill.provider_name && (
                      <p className="text-sm text-muted-foreground">
                        {bill.provider_name}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                      <Badge variant="outline" className="rounded-full border-border/70 bg-surface/70">
                        {getCategoryName(bill)}
                      </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(bill.due_date)}
                </TableCell>
                <TableCell className="text-sm">
                  {bill.paid_at ? formatDateTime(bill.paid_at) : '-'}
                </TableCell>
                <TableCell>
                  {bill.payment_method && (
                    <Badge variant="outline" className="rounded-full border-border/70 bg-surface/70">
                      {PAYMENT_METHOD_LABELS[bill.payment_method]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(bill.paid_amount || bill.amount)}
                </TableCell>
                <TableCell>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600"
                      onClick={() => onDelete(bill)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma conta encontrada com os filtros aplicados
        </div>
      )}
    </div>
  );
}
