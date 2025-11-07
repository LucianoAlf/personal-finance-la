import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { BillFilters as BillFiltersType, BillStatus, BillType, Priority } from '@/types/payable-bills.types';
import { BILL_TYPE_LABELS, BILL_STATUS_LABELS, PRIORITY_LABELS } from '@/types/payable-bills.types';

interface BillFiltersProps {
  filters: BillFiltersType;
  onFiltersChange: (filters: BillFiltersType) => void;
}

export function BillFilters({ filters, onFiltersChange }: BillFiltersProps) {
  const [localFilters, setLocalFilters] = useState<BillFiltersType>(filters);
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleClear = () => {
    const emptyFilters: BillFiltersType = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof BillFiltersType] !== undefined && filters[key as keyof BillFiltersType] !== ''
  ).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge
              variant="danger"
              className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Refine sua busca de contas a pagar
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Busca por Texto */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Descrição ou fornecedor..."
              value={localFilters.search || ''}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, search: e.target.value })
              }
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={
                Array.isArray(localFilters.status)
                  ? undefined
                  : (localFilters.status ? (localFilters.status as string) : undefined)
              }
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  status: value === '__all__' ? undefined : (value as BillStatus),
                })
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {Object.entries(BILL_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="bill_type">Tipo de Conta</Label>
            <Select
              value={
                Array.isArray(localFilters.bill_type)
                  ? undefined
                  : (localFilters.bill_type ? (localFilters.bill_type as string) : undefined)
              }
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  bill_type: value === '__all__' ? undefined : (value as BillType),
                })
              }
            >
              <SelectTrigger id="bill_type">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {Object.entries(BILL_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={
                Array.isArray(localFilters.priority)
                  ? undefined
                  : (localFilters.priority ? (localFilters.priority as string) : undefined)
              }
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  priority: value === '__all__' ? undefined : (value as Priority),
                })
              }
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Todas as prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div className="space-y-2">
            <Label htmlFor="provider">Fornecedor</Label>
            <Input
              id="provider"
              placeholder="Ex: Cemig, Copasa..."
              value={localFilters.provider_name || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  provider_name: e.target.value,
                })
              }
            />
          </div>

          {/* Período de Vencimento */}
          <div className="space-y-2">
            <Label>Período de Vencimento</Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="due_date_from" className="text-xs text-muted-foreground">
                  De
                </Label>
                <DatePicker
                  value={localFilters.due_date_from || ''}
                  onChange={(date) =>
                    setLocalFilters({
                      ...localFilters,
                      due_date_from: date,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="due_date_to" className="text-xs text-muted-foreground">
                  Até
                </Label>
                <DatePicker
                  value={localFilters.due_date_to || ''}
                  onChange={(date) =>
                    setLocalFilters({
                      ...localFilters,
                      due_date_to: date,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Tipos Especiais */}
          <div className="space-y-2">
            <Label>Tipos Especiais</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.is_recurring || false}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      is_recurring: e.target.checked ? true : undefined,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Apenas recorrentes</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.is_installment || false}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      is_installment: e.target.checked ? true : undefined,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Apenas parcelamentos</span>
              </label>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
