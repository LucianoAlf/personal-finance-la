import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  // ESTADO DO FILTRO
  const [filters, setFilters] = useState<FilterConfig>(
    currentFilters || {
      dateRange: { from: null, to: null },
      categories: [],
      accounts: [],
      tags: [],
      statuses: [],
      types: [],
    }
  );

  // ESTADO PARA SALVAR FILTRO
  const [saveFilter, setSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState('');

  // HOOK PARA FILTROS SALVOS (Supabase)
  const { savedFilters, createSavedFilter, deleteSavedFilter } = useSavedFilters();

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
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: { from: null, to: null },
      categories: [],
      accounts: [],
      tags: [],
      statuses: [],
      types: [],
    });
    setSaveFilter(false);
    setFilterName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Filtro de transações</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="data-[state=active]:text-purple-600">
              NOVO FILTRO
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:text-purple-600">
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
                  <Label className="text-sm text-gray-600">De</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
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
                  <Label className="text-sm text-gray-600">Até</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
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
              <Label className="text-sm text-gray-600">Categorias</Label>
              <CategoryMultiSelect
                selectedIds={filters.categories}
                onSelectionChange={(ids) =>
                  setFilters((prev) => ({ ...prev, categories: ids }))
                }
              />
            </div>

            {/* CONTAS */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Contas</Label>
              <AccountMultiSelect
                selectedIds={filters.accounts}
                onSelectionChange={(ids) =>
                  setFilters((prev) => ({ ...prev, accounts: ids }))
                }
              />
            </div>

            {/* TAGS */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Tags</Label>
              <TagMultiSelect
                selectedTags={filters.tags}
                onSelectionChange={(tags) =>
                  setFilters((prev) => ({ ...prev, tags }))
                }
              />
            </div>

            {/* SITUAÇÕES */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Situações</Label>
              <StatusMultiSelect
                selectedStatuses={filters.statuses}
                onSelectionChange={(statuses) =>
                  setFilters((prev) => ({ ...prev, statuses }))
                }
              />
            </div>

            {/* TIPOS */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Tipos</Label>
              <TypeMultiSelect
                selectedTypes={filters.types}
                onSelectionChange={(types) =>
                  setFilters((prev) => ({ ...prev, types }))
                }
              />
            </div>

            {/* SALVAR FILTRO PERSONALIZADO */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Label htmlFor="save-filter" className="text-sm font-normal text-gray-700">
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
                <Label htmlFor="filter-name" className="text-sm text-purple-600">
                  Descrição
                </Label>
                <Input
                  id="filter-name"
                  placeholder="Ex: Despesas de Novembro"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="border-purple-200 focus:border-purple-500"
                />
              </div>
            )}
          </TabsContent>

          {/* ABA: FILTROS SALVOS */}
          <TabsContent value="saved" className="space-y-4 mt-6">
            {savedFilters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Nenhum filtro salvo ainda</p>
                <p className="text-xs mt-2">
                  Crie um filtro personalizado na aba "Novo Filtro"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedFilters.map((savedFilter) => (
                  <div
                    key={savedFilter.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {savedFilter.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {/* Resumo do filtro */}
                          {(savedFilter.filter_config.dateRange.from || savedFilter.filter_config.dateRange.to) && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              📅 Período
                            </span>
                          )}
                          {savedFilter.filter_config.categories.length > 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                              🏷️ {savedFilter.filter_config.categories.length} cat.
                            </span>
                          )}
                          {savedFilter.filter_config.accounts.length > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                              💳 {savedFilter.filter_config.accounts.length} contas
                            </span>
                          )}
                          {savedFilter.filter_config.tags.length > 0 && (
                            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">
                              🔖 {savedFilter.filter_config.tags.length} tags
                            </span>
                          )}
                          {savedFilter.filter_config.statuses.length > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                              ⚡ {savedFilter.filter_config.statuses.length} sit.
                            </span>
                          )}
                          {savedFilter.filter_config.types.length > 0 && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                              📊 {savedFilter.filter_config.types.length} tipos
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSavedFilter(savedFilter.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <Button
                      onClick={() => handleLoadSavedFilter(savedFilter)}
                      className="w-full bg-purple-500 hover:bg-purple-600"
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

        {/* BOTÕES */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            CANCELAR
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="text-gray-600"
            >
              LIMPAR
            </Button>
            <Button
              onClick={handleApply}
              className="bg-purple-500 hover:bg-purple-600"
            >
              APLICAR FILTROS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
