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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency } from '@/utils/formatters';

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
  invoices: any[];
}

export function InvoiceHistoryFilters({ filters, cards, onFiltersChange, invoices }: Props) {
  const [debouncedSearch, setSearch] = useDebouncedSearch(500);
  const { exportToCSV, exporting } = useExportInvoices();
  const [dateOpen, setDateOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.searchQuery || '');
  const [minVal, setMinVal] = useState<number>(filters.valueRange.min);
  const [maxVal, setMaxVal] = useState<number>(filters.valueRange.max);

  const selectedCardsLabel = useMemo(() => {
    if (!filters.cardIds.length) return 'Todos os cartões';
    if (filters.cardIds.length === 1) {
      const found = cards.find(c => c.id === filters.cardIds[0]);
      return found ? found.name : '1 selecionado';
    }
    return `${filters.cardIds.length} selecionados`;
  }, [filters.cardIds, cards]);

  useEffect(() => {
    onFiltersChange({ searchQuery: debouncedSearch });
  }, [debouncedSearch]);

  // Aplicar debounce para faixa de valores (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      onFiltersChange({ valueRange: { min: minVal, max: maxVal } });
    }, 300);
    return () => clearTimeout(t);
  }, [minVal, maxVal]);

  const handleClearFilters = () => {
    setSearch('');
    setSearchText('');
    setMinVal(0);
    setMaxVal(10000);
    onFiltersChange({
      dateRange: {
        start: subMonths(new Date(), 6),
        end: new Date(),
      },
      cardIds: [],
      valueRange: { min: 0, max: 10000 },
      searchQuery: '',
      status: [],
    });
  };

  const handleExport = async () => {
    await exportToCSV(invoices);
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Date Range */}
        <div className="lg:col-span-3">
          <Label className="mb-1 block text-xs text-gray-600">Período</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.start && filters.dateRange.end ? (
                  <span>
                    {format(filters.dateRange.start, 'LLL yyyy', { locale: ptBR })} - {format(filters.dateRange.end, 'LLL yyyy', { locale: ptBR })}
                  </span>
                ) : (
                  <span>Selecionar período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 bg-white border shadow-lg overflow-hidden rounded-md"
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

        {/* Cartões */}
        <div className="lg:col-span-3">
          <Label className="mb-1 block text-xs text-gray-600">Cartões</Label>
          <Popover open={cardsOpen} onOpenChange={setCardsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {selectedCardsLabel}
                </span>
                <Filter className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={filters.cardIds.length === 0}
                    onCheckedChange={() => onFiltersChange({ cardIds: [] })}
                    id="all-cards"
                  />
                  <Label htmlFor="all-cards" className="text-sm">Todos os cartões</Label>
                </div>
                {cards.map((card) => {
                  const checked = filters.cardIds.includes(card.id);
                  return (
                    <div key={card.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => {
                          const next = new Set(filters.cardIds);
                          if (val) next.add(card.id); else next.delete(card.id);
                          onFiltersChange({ cardIds: Array.from(next) });
                        }}
                        id={`card-${card.id}`}
                      />
                      <Label htmlFor={`card-${card.id}`} className="text-sm">
                        {card.name} — {card.brand}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Valores (pt-BR) */}
        <div className="lg:col-span-3">
          <Label className="mb-1 block text-xs text-gray-600">Faixa de valores</Label>
          <div className="flex items-center gap-2">
            <CurrencyInput
              value={minVal}
              onValueChange={(v) => setMinVal(v)}
              aria-label="Valor mínimo"
            />
            <span className="text-gray-500 text-sm">até</span>
            <CurrencyInput
              value={maxVal}
              onValueChange={(v) => setMaxVal(v)}
              aria-label="Valor máximo"
            />
          </div>
        </div>

        {/* Status */}
        <div className="lg:col-span-3">
          <Label className="mb-1 block text-xs text-gray-600">Status</Label>
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {filters.status.length === 0 ? 'Todos' : `${filters.status.length} selecionados`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              {['open','paid','overdue','partial','closed'].map((st) => {
                const checked = filters.status.includes(st);
                const label = st === 'paid' ? 'Pago' : st === 'open' ? 'Pendente' : st === 'overdue' ? 'Atrasado' : st === 'partial' ? 'Parcial' : 'Fechada';
                return (
                  <div key={st} className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const next = new Set(filters.status);
                        if (val) next.add(st); else next.delete(st);
                        onFiltersChange({ status: Array.from(next) });
                      }}
                      id={`status-${st}`}
                    />
                    <Label htmlFor={`status-${st}`} className="text-sm">{label}</Label>
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>

        {/* Busca por descrição (fluida) */}
        <div className="lg:col-span-12">
          <Label className="mb-1 block text-xs text-gray-600">
            Buscar transações por descrição
            <span className="text-gray-400 ml-1">(ex: Netflix, Uber, Mercado)</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Digite o nome do estabelecimento ou descrição..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSearch(e.target.value);
              }}
              className="pl-10"
            />
          </div>
        </div>

      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
        >
          <X className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleExport}
          disabled={exporting || invoices.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </Button>

        <div className="sm:ml-auto text-sm text-gray-600">
          {invoices.length} {invoices.length === 1 ? 'fatura encontrada' : 'faturas encontradas'}
        </div>
      </div>
    </Card>
  );
}
