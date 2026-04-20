import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { AccountMultiSelect } from './AccountMultiSelect';
import { TagMultiSelect, StatusMultiSelect, TypeMultiSelect } from './FilterSelects';
import { useSavedFilters } from '@/hooks/useSavedFilters';

export interface FilterConfig {
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  categories: string[];
  accounts: string[];
  tags: string[];
  statuses: string[];
  types: string[];
  saved?: {
    name: string;
    id: string;
  };
}

function createEmptyFilterConfig(): FilterConfig {
  return {
    dateRange: { from: null, to: null },
    categories: [],
    accounts: [],
    tags: [],
    statuses: [],
    types: [],
  };
}

function cloneFilterConfig(filters?: FilterConfig): FilterConfig {
  const source = filters ?? createEmptyFilterConfig();

  return {
    ...source,
    dateRange: {
      from: source.dateRange.from ? new Date(source.dateRange.from) : null,
      to: source.dateRange.to ? new Date(source.dateRange.to) : null,
    },
    categories: [...source.categories],
    accounts: [...source.accounts],
    tags: [...source.tags],
    statuses: [...source.statuses],
    types: [...source.types],
    saved: source.saved ? { ...source.saved } : undefined,
  };
}

interface AdvancedFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: FilterConfig) => void;
  currentFilters?: FilterConfig;
}

export function AdvancedFiltersModal({
  open,
  onOpenChange,
  onApplyFilters,
  currentFilters,
}: AdvancedFiltersModalProps) {
  const primaryButtonClass =
    'rounded-xl border border-primary/25 bg-primary text-primary-foreground shadow-[0_16px_34px_rgba(139,92,246,0.24)] hover:bg-primary/90';

  const sectionLabelClass = 'text-sm font-medium text-foreground';

  // ESTADO DO FILTRO
  const [filters, setFilters] = useState<FilterConfig>(() => cloneFilterConfig(currentFilters));

  // ESTADO PARA SALVAR FILTRO
  const [saveFilter, setSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState('');

  // HOOK PARA FILTROS SALVOS (Supabase)
  const { savedFilters, createSavedFilter, deleteSavedFilter } = useSavedFilters();

  useEffect(() => {
    if (!open) return;

    setFilters(cloneFilterConfig(currentFilters));
    setSaveFilter(false);
    setFilterName('');
  }, [currentFilters, open]);

  // HANDLERS
  const handleApply = async () => {
    try {
      // Se usuário quer salvar o filtro
      if (saveFilter && filterName.trim()) {
        await createSavedFilter(filterName.trim(), filters);
        toast.success(`Filtro "${filterName}" salvo com sucesso!`);
      }

      onApplyFilters(filters);
      onOpenChange(false);
      
      // Reset estados
      setSaveFilter(false);
      setFilterName('');
    } catch (error) {
      toast.error('Erro ao salvar filtro');
      console.error(error);
    }
  };

  const handleLoadSavedFilter = (savedFilter: any) => {
    setFilters(savedFilter.filter_config);
    onApplyFilters(savedFilter.filter_config);
    toast.success(`Filtro "${savedFilter.name}" aplicado!`);
    onOpenChange(false);
  };

  const handleDeleteSavedFilter = async (filterId: string) => {
    try {
      const filterToDelete = savedFilters.find(f => f.id === filterId);
      await deleteSavedFilter(filterId);
      toast.success(`Filtro "${filterToDelete?.name}" excluído!`);
    } catch (error) {
      toast.error('Erro ao excluir filtro');
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFilters(cloneFilterConfig(currentFilters));
    setSaveFilter(false);
    setFilterName('');
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    setFilters(createEmptyFilterConfig());
    setSaveFilter(false);
    setFilterName('');
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader
        title="Filtros Avançados"
        description="Aplique critérios detalhados às suas transações"
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border/70 bg-surface-elevated/70 p-1">
            <TabsTrigger
              value="new"
              className="rounded-xl px-4 py-3 text-sm font-semibold tracking-[0.12em] text-muted-foreground transition-colors data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15"
            >
              NOVO FILTRO
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-xl px-4 py-3 text-sm font-semibold tracking-[0.12em] text-muted-foreground transition-colors data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20"
            >
              FILTROS SALVOS
            </TabsTrigger>
          </TabsList>

          {/* ABA: NOVO FILTRO */}
          <TabsContent value="new" className="space-y-6 mt-6">
            {/* PERÍODO */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Data DE */}
                <div className="space-y-2">
                  <Label className={sectionLabelClass}>De</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'h-11 w-full justify-start rounded-xl border-border/70 bg-surface/80 text-left font-normal shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/70 dark:hover:bg-surface-overlay',
                          !filters.dateRange.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                          format(filters.dateRange.from, 'dd MMMM yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecione</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from || undefined}
                        onSelect={(date) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, from: date || null },
                          }))
                        }
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data ATÉ */}
                <div className="space-y-2">
                  <Label className={sectionLabelClass}>Até</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'h-11 w-full justify-start rounded-xl border-border/70 bg-surface/80 text-left font-normal shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/70 dark:hover:bg-surface-overlay',
                          !filters.dateRange.to && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.to ? (
                          format(filters.dateRange.to, 'dd MMMM yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecione</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to || undefined}
                        onSelect={(date) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, to: date || null },
                          }))
                        }
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* CATEGORIAS */}
            <div className="space-y-2">
              <Label className={sectionLabelClass}>Categorias</Label>
              <CategoryMultiSelect
                selectedIds={filters.categories}
                onSelectionChange={(ids) =>
                  setFilters((prev) => ({ ...prev, categories: ids }))
                }
              />
            </div>

            {/* CONTAS: apenas contas em `accounts`; lançamentos de cartão não têm account_id correspondente. */}
            <div className="space-y-2">
              <Label className={sectionLabelClass}>Contas</Label>
              <p className="text-xs text-muted-foreground">
                Somente lançamentos da conta bancária. Compras no cartão não entram neste filtro.
              </p>
              <AccountMultiSelect
                selectedIds={filters.accounts}
                onSelectionChange={(ids) =>
                  setFilters((prev) => ({ ...prev, accounts: ids }))
                }
              />
            </div>

            {/* TAGS: mesmas tags canônicas em conta e em cartão */}
            <div className="space-y-2">
              <Label className={sectionLabelClass}>Tags</Label>
              <TagMultiSelect
                selectedTags={filters.tags}
                onSelectionChange={(tags) =>
                  setFilters((prev) => ({ ...prev, tags }))
                }
              />
            </div>

            {/* SITUAÇÕES */}
            <div className="space-y-2">
              <Label className={sectionLabelClass}>Situações</Label>
              <StatusMultiSelect
                selectedStatuses={filters.statuses}
                onSelectionChange={(statuses) =>
                  setFilters((prev) => ({ ...prev, statuses }))
                }
              />
            </div>

            {/* TIPOS */}
            <div className="space-y-2">
              <Label className={sectionLabelClass}>Tipos</Label>
              <TypeMultiSelect
                selectedTypes={filters.types}
                onSelectionChange={(types) =>
                  setFilters((prev) => ({ ...prev, types }))
                }
              />
            </div>

            {/* SALVAR FILTRO PERSONALIZADO */}
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface-elevated/45 px-4 py-3">
              <Label htmlFor="save-filter" className="text-sm font-medium text-foreground">
                Salvar filtro personalizado
              </Label>
              <Switch
                id="save-filter"
                checked={saveFilter}
                onCheckedChange={setSaveFilter}
              />
            </div>

            {/* CAMPO DESCRIÇÃO (quando toggle ativo) */}
            {saveFilter && (
              <div className="space-y-2">
                <Label htmlFor="filter-name" className="text-sm font-medium text-primary">
                  Descrição
                </Label>
                <Input
                  id="filter-name"
                  placeholder="Ex: Despesas de Novembro"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="h-11 rounded-xl border-border/70 bg-surface/80 focus-visible:border-primary dark:bg-surface-elevated/70"
                />
              </div>
            )}
          </TabsContent>

          {/* ABA: FILTROS SALVOS */}
          <TabsContent value="saved" className="space-y-4 mt-6">
            {savedFilters.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/40 px-6 py-12 text-center text-muted-foreground">
                <p className="text-sm font-medium text-foreground">Nenhum filtro salvo ainda</p>
                <p className="mt-2 text-xs">
                  Crie um filtro personalizado na aba "Novo Filtro"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedFilters.map((savedFilter) => (
                  <div
                    key={savedFilter.id}
                    className="rounded-[22px] border border-border/70 bg-surface-elevated/55 p-4 shadow-[0_12px_28px_rgba(2,6,23,0.14)] transition-colors hover:bg-surface-overlay/70 dark:shadow-[0_12px_26px_rgba(2,6,23,0.26)]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="mb-1 text-base font-semibold text-foreground">
                          {savedFilter.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {/* Resumo do filtro */}
                          {(savedFilter.filter_config.dateRange.from || savedFilter.filter_config.dateRange.to) && (
                            <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/12 px-2.5 py-1 font-medium text-sky-600 dark:text-sky-300">
                              📅 Período
                            </span>
                          )}
                          {savedFilter.filter_config.categories.length > 0 && (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/12 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-300">
                              🏷️ {savedFilter.filter_config.categories.length} cat.
                            </span>
                          )}
                          {savedFilter.filter_config.accounts.length > 0 && (
                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/12 px-2.5 py-1 font-medium text-amber-600 dark:text-amber-300">
                              💳 {savedFilter.filter_config.accounts.length} contas
                            </span>
                          )}
                          {savedFilter.filter_config.tags.length > 0 && (
                            <span className="inline-flex items-center rounded-full border border-pink-500/20 bg-pink-500/12 px-2.5 py-1 font-medium text-pink-600 dark:text-pink-300">
                              🔖 {savedFilter.filter_config.tags.length} tags
                            </span>
                          )}
                          {savedFilter.filter_config.statuses.length > 0 && (
                            <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/12 px-2.5 py-1 font-medium text-yellow-700 dark:text-yellow-300">
                              ⚡ {savedFilter.filter_config.statuses.length} sit.
                            </span>
                          )}
                          {savedFilter.filter_config.types.length > 0 && (
                            <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/12 px-2.5 py-1 font-medium text-indigo-600 dark:text-indigo-300">
                              📊 {savedFilter.filter_config.types.length} tipos
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSavedFilter(savedFilter.id)}
                        className="rounded-xl text-danger hover:bg-danger/10 hover:text-danger"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <Button
                      onClick={() => handleLoadSavedFilter(savedFilter)}
                      className={cn('h-11 w-full', primaryButtonClass)}
                      size="sm"
                    >
                      Aplicar este filtro
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button
          variant="outline"
          onClick={handleCancel}
          className="rounded-xl border-border/70 bg-transparent text-primary hover:bg-primary/10 hover:text-primary"
        >
          CANCELAR
        </Button>
        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="rounded-xl border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          LIMPAR
        </Button>
        <Button
          onClick={handleApply}
          className={primaryButtonClass}
        >
          APLICAR FILTROS
        </Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
}
