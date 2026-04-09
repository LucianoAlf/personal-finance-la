import { Calendar as CalendarIcon, CreditCard, Search, Download, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MonthRangePicker } from '@/components/ui/month-range-picker';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useExportInvoices } from '@/hooks/useExportInvoices';
import { useEffect, useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CurrencyInput } from '@/components/ui/currency-input';

interface Filters {
  dateRange: { start: Date; end: Date };
  cardIds: string[];
  valueRange: { min: number; max: number };
  searchQuery: string;
  status: string[];
}

interface Props {
  filters: Filters;
  cards: any[];
  onFiltersChange: (filters: Partial<Filters>) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  invoices: any[];
}

const fieldLabelClassName =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';

const triggerClassName =
  'h-11 w-full rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm hover:bg-surface-elevated/80';

const popoverClassName =
  'rounded-[22px] border border-border/70 bg-card/95 p-3 shadow-[0_20px_50px_rgba(3,8,20,0.24)]';

export function InvoiceHistoryFilters({
  filters,
  cards,
  onFiltersChange,
  onResetFilters,
  hasActiveFilters,
  invoices,
}: Props) {
  const [debouncedSearch, setSearch] = useDebouncedSearch(500);
  const { exportToCSV, exporting } = useExportInvoices();
  const [dateOpen, setDateOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.searchQuery || '');
  const [minVal, setMinVal] = useState<number>(filters.valueRange.min);
  const [maxVal, setMaxVal] = useState<number>(filters.valueRange.max);

  const selectedCardsLabel = useMemo(() => {
    if (!filters.cardIds.length) return 'Todos os cartoes';
    if (filters.cardIds.length === 1) {
      const found = cards.find((c) => c.id === filters.cardIds[0]);
      return found ? found.name : '1 selecionado';
    }
    return `${filters.cardIds.length} selecionados`;
  }, [filters.cardIds, cards]);

  useEffect(() => {
    onFiltersChange({ searchQuery: debouncedSearch });
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchText(filters.searchQuery || '');
  }, [filters.searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      onFiltersChange({ valueRange: { min: minVal, max: maxVal } });
    }, 300);

    return () => clearTimeout(t);
  }, [minVal, maxVal]);

  useEffect(() => {
    setMinVal(filters.valueRange.min);
    setMaxVal(filters.valueRange.max);
  }, [filters.valueRange.min, filters.valueRange.max]);

  const handleClearFilters = () => {
    setSearch('');
    setSearchText('');
    setMinVal(0);
    setMaxVal(10000);
    onResetFilters();
  };

  const handleExport = async () => {
    await exportToCSV(invoices);
  };

  return (
    <Card
      data-testid="invoice-history-filters"
      className="rounded-[28px] border-border/70 bg-card/95 p-5 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Label className={fieldLabelClassName}>Periodo</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`${triggerClassName} justify-start`}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.start && filters.dateRange.end ? (
                  <span>
                    {format(filters.dateRange.start, 'LLL yyyy', { locale: ptBR })} -{' '}
                    {format(filters.dateRange.end, 'LLL yyyy', { locale: ptBR })}
                  </span>
                ) : (
                  <span>Selecionar periodo</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={`w-auto overflow-hidden p-0 ${popoverClassName}`}
              align="start"
              sideOffset={5}
            >
              <MonthRangePicker
                start={filters.dateRange.start}
                end={filters.dateRange.end}
                onChange={(start, end) => {
                  onFiltersChange({ dateRange: { start, end } });
                  setDateOpen(false);
                }}
                minDate={subMonths(new Date(), 24)}
                maxDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="lg:col-span-3">
          <Label className={fieldLabelClassName}>Cartoes</Label>
          <Popover open={cardsOpen} onOpenChange={setCardsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`${triggerClassName} justify-between`}>
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {selectedCardsLabel}
                </span>
                <Filter className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className={`w-72 ${popoverClassName}`} align="start">
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Checkbox
                    checked={filters.cardIds.length === 0}
                    onCheckedChange={() => onFiltersChange({ cardIds: [] })}
                    id="all-cards"
                  />
                  <Label htmlFor="all-cards" className="text-sm text-foreground">
                    Todos os cartoes
                  </Label>
                </div>
                {cards.map((card) => {
                  const checked = filters.cardIds.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface/70"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          const next = new Set(filters.cardIds);
                          if (val) next.add(card.id);
                          else next.delete(card.id);
                          onFiltersChange({ cardIds: Array.from(next) });
                        }}
                        id={`card-${card.id}`}
                      />
                      <Label htmlFor={`card-${card.id}`} className="text-sm text-foreground">
                        {card.name} - {card.brand}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="lg:col-span-3">
          <Label className={fieldLabelClassName}>Faixa de valores</Label>
          <div className="flex items-center gap-2">
            <CurrencyInput
              value={minVal}
              onValueChange={(v) => setMinVal(v)}
              aria-label="Valor minimo"
              className="h-11 rounded-xl border-border/70 bg-surface/80 text-foreground"
            />
            <span className="text-sm text-muted-foreground">ate</span>
            <CurrencyInput
              value={maxVal}
              onValueChange={(v) => setMaxVal(v)}
              aria-label="Valor maximo"
              className="h-11 rounded-xl border-border/70 bg-surface/80 text-foreground"
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <Label className={fieldLabelClassName}>Status</Label>
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`${triggerClassName} justify-start`}>
                {filters.status.length === 0 ? 'Todos' : `${filters.status.length} selecionados`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className={`w-64 ${popoverClassName}`} align="start">
              {['open', 'paid', 'overdue', 'partial', 'closed'].map((st) => {
                const checked = filters.status.includes(st);
                const label =
                  st === 'paid'
                    ? 'Pago'
                    : st === 'open'
                      ? 'Pendente'
                      : st === 'overdue'
                        ? 'Atrasado'
                        : st === 'partial'
                          ? 'Parcial'
                          : 'Fechada';

                return (
                  <div
                    key={st}
                    className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface/70"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const next = new Set(filters.status);
                        if (val) next.add(st);
                        else next.delete(st);
                        onFiltersChange({ status: Array.from(next) });
                      }}
                      id={`status-${st}`}
                    />
                    <Label htmlFor={`status-${st}`} className="text-sm text-foreground">
                      {label}
                    </Label>
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>

        <div className="lg:col-span-12">
          <Label className={fieldLabelClassName}>
            Buscar transacoes por descricao
            <span className="ml-1 normal-case tracking-normal text-muted-foreground/80">
              (ex: Netflix, Uber, Mercado)
            </span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="invoice-history-search"
              placeholder="Digite o nome do estabelecimento ou descricao..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSearch(e.target.value);
              }}
              className="h-11 rounded-xl border-border/70 bg-surface/80 pl-10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-start gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
        {hasActiveFilters ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="rounded-xl border-border/70 bg-surface/75 text-foreground hover:bg-surface-elevated"
          >
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        ) : null}

        <Button
          data-testid="invoice-history-export"
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || invoices.length === 0}
          className="rounded-xl border-primary/25 bg-primary/12 text-primary hover:bg-primary/18 hover:text-primary"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </Button>

        <div className="text-sm text-muted-foreground sm:ml-auto">
          {invoices.length} {invoices.length === 1 ? 'fatura encontrada' : 'faturas encontradas'}
        </div>
      </div>
    </Card>
  );
}
