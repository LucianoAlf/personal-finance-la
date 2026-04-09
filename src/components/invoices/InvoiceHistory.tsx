import { useState, useEffect } from 'react';
import { subMonths, endOfMonth, startOfMonth, format } from 'date-fns';
import { InvoiceHistoryFilters } from './InvoiceHistoryFilters';
import { InvoiceHistoryTable } from './InvoiceHistoryTable';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Filters {
  dateRange: { start: Date; end: Date };
  cardIds: string[];
  valueRange: { min: number; max: number };
  searchQuery: string;
  status: string[];
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
}

interface Sorting {
  column: string;
  direction: 'asc' | 'desc';
}

interface InvoiceHistoryProps {
  onEditInvoice?: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

const DEFAULT_MAX_VALUE = 10000;

function getDefaultFilters(): Filters {
  return {
    dateRange: {
      start: startOfMonth(subMonths(new Date(), 6)),
      end: endOfMonth(new Date()),
    },
    cardIds: [],
    valueRange: { min: 0, max: DEFAULT_MAX_VALUE },
    searchQuery: '',
    status: [],
  };
}

function hasFiltersApplied(filters: Filters): boolean {
  const defaults = getDefaultFilters();

  return (
    format(filters.dateRange.start, 'yyyy-MM-dd') !== format(defaults.dateRange.start, 'yyyy-MM-dd') ||
    format(filters.dateRange.end, 'yyyy-MM-dd') !== format(defaults.dateRange.end, 'yyyy-MM-dd') ||
    filters.cardIds.length > 0 ||
    filters.valueRange.min !== defaults.valueRange.min ||
    filters.valueRange.max !== defaults.valueRange.max ||
    filters.searchQuery.trim() !== '' ||
    filters.status.length > 0
  );
}

export function InvoiceHistory({ onEditInvoice, onDeleteInvoice }: InvoiceHistoryProps = {}) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(() => getDefaultFilters());

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
  });

  const [sorting, setSorting] = useState<Sorting>({
    column: 'reference_month',
    direction: 'desc',
  });

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchCards = async () => {
      const { data } = await supabase
        .from('credit_cards')
        .select('id, name, brand')
        .eq('user_id', user.id);

      setCards(data || []);
    };

    fetchCards();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchInvoices();
  }, [user, filters, pagination.page, pagination.pageSize, sorting]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      let invoiceIds: string[] | null = null;
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim();
        const startStr = format(filters.dateRange.start, 'yyyy-MM-dd');
        const endStr = format(filters.dateRange.end, 'yyyy-MM-dd');
        let txQuery = supabase
          .from('credit_card_transactions')
          .select('invoice_id, purchase_date, credit_card_id')
          .eq('user_id', user.id)
          .or(`description.ilike.%${q}%,establishment.ilike.%${q}%`)
          .gte('purchase_date', startStr)
          .lte('purchase_date', endStr);

        if (filters.cardIds.length > 0) {
          txQuery = txQuery.in('credit_card_id', filters.cardIds);
        }

        const { data: txData } = await txQuery;

        if (txData && txData.length > 0) {
          invoiceIds = [...new Set(txData.map((tx) => tx.invoice_id).filter(Boolean))];
        } else {
          setInvoices([]);
          setPagination((prev) => ({ ...prev, totalItems: 0 }));
          setLoading(false);
          return;
        }
      }

      let query = supabase
        .from('credit_card_invoices')
        .select(
          `
          *,
          credit_cards (
            name,
            brand
          )
        `,
          { count: 'exact' },
        )
        .eq('user_id', user.id);

      if (invoiceIds) {
        query = query.in('id', invoiceIds);
      }

      if (filters.dateRange.start) {
        query = query.gte('reference_month', format(filters.dateRange.start, 'yyyy-MM-dd'));
      }
      if (filters.dateRange.end) {
        query = query.lte('reference_month', format(filters.dateRange.end, 'yyyy-MM-dd'));
      }
      if (filters.cardIds.length > 0) {
        query = query.in('credit_card_id', filters.cardIds);
      }
      if (filters.valueRange.min > 0) {
        query = query.gte('total_amount', filters.valueRange.min);
      }
      if (filters.valueRange.max < 10000) {
        query = query.lte('total_amount', filters.valueRange.max);
      }
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      query = query.order(sorting.column, { ascending: sorting.direction === 'asc' });

      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setInvoices(data || []);
      setPagination((prev) => ({ ...prev, totalItems: count || 0 }));
    } catch (err) {
      console.error('Erro ao buscar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters(getDefaultFilters());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  };

  const handleSortChange = (column: string) => {
    setSorting((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div data-testid="invoice-history-shell" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-[1.9rem] font-semibold tracking-tight text-foreground">
          Histórico de Faturas
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Consulte e exporte faturas de períodos anteriores
        </p>
      </div>

      <InvoiceHistoryFilters
        filters={filters}
        cards={cards}
        onFiltersChange={handleFiltersChange}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasFiltersApplied(filters)}
        invoices={invoices}
      />

      <InvoiceHistoryTable
        invoices={invoices}
        loading={loading}
        pagination={pagination}
        sorting={sorting}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
        onEditInvoice={onEditInvoice}
        onDeleteInvoice={onDeleteInvoice}
      />
    </div>
  );
}
