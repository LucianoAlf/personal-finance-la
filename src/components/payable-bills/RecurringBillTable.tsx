import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Repeat,
  ArrowUpDown,
  Tv,
  Lightbulb,
  Home,
  Smartphone,
  Heart,
  CreditCard,
  Package,
  Calendar,
  TrendingUp,
  Pause,
  Play,
} from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { getBillCategoryName } from '@/utils/billCalculations';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface RecurringBillTableProps {
  bills: PayableBill[];
  onEdit: (bill: PayableBill) => void;
  onDelete: (bill: PayableBill) => void;
  onCopy: (bill: PayableBill) => void;
  onViewHistory?: (bill: PayableBill) => void;
  onTogglePause?: (bill: PayableBill) => void;
}

const getCategoryIcon = (billType: string) => {
  switch (billType) {
    case 'subscription':
      return <Tv className="h-4 w-4 text-purple-500" />;
    case 'service':
      return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    case 'housing':
      return <Home className="h-4 w-4 text-blue-500" />;
    case 'telecom':
      return <Smartphone className="h-4 w-4 text-cyan-500" />;
    case 'healthcare':
      return <Heart className="h-4 w-4 text-red-500" />;
    case 'credit_card':
      return <CreditCard className="h-4 w-4 text-orange-500" />;
    default:
      return <Package className="h-4 w-4 text-gray-500" />;
  }
};

const getRecurrenceLabel = (config: any) => {
  if (!config) return 'Mensal';
  
  switch (config.frequency) {
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quinzenal';
    case 'monthly':
      return 'Mensal';
    case 'quarterly':
      return 'Trimestral';
    case 'semiannual':
      return 'Semestral';
    case 'annual':
      return 'Anual';
    default:
      return 'Mensal';
  }
};

export function RecurringBillTable({
  bills,
  onEdit,
  onDelete,
  onCopy,
  onViewHistory,
  onTogglePause,
}: RecurringBillTableProps) {
  const { categories } = useCategories();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Buscar categoria pelo ID ou usar fallback
  const getCategoryName = (bill: PayableBill) => {
    if (bill.category_id) {
      const cat = categories.find(c => c.id === bill.category_id);
      if (cat) return cat.name;
    }
    return getBillCategoryName(bill.bill_type);
  };
  const [sortColumn, setSortColumn] = useState<string>('description');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === bills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bills.map((b) => b.id)));
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedBills = [...bills].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'bill_type':
        comparison = a.bill_type.localeCompare(b.bill_type);
        break;
      case 'due_date':
        comparison = parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calcular total mensal
  const totalMonthly = bills.reduce((sum, bill) => sum + bill.amount, 0);

  if (bills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma conta recorrente encontrada
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Mini resumo */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Total Mensal Recorrente:</span>
          </div>
          <span className="text-xl font-bold text-blue-600">
            {formatCurrency(totalMonthly)}
          </span>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === bills.length && bills.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-1">
                    Descrição
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('bill_type')}
                >
                  <div className="flex items-center gap-1">
                    Categoria
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors text-right"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Valor
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Próx. Vencimento
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-24 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBills.map((bill, index) => (
                <motion.tr
                  key={bill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    selectedIds.has(bill.id) && "bg-primary/5"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(bill.id)}
                      onCheckedChange={() => toggleSelect(bill.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {getCategoryIcon(bill.bill_type)}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {bill.description}
                          <Repeat className="h-3 w-3 text-blue-500" />
                        </div>
                        {bill.provider_name && (
                          <div className="text-sm text-muted-foreground">
                            {bill.provider_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 font-normal">
                      {getCategoryIcon(bill.bill_type)}
                      {getCategoryName(bill)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCurrency(bill.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <Repeat className="h-3 w-3" />
                      {getRecurrenceLabel(bill.recurrence_config)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(bill.due_date), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(bill)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onCopy(bill)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {onViewHistory && (
                            <DropdownMenuItem onClick={() => onViewHistory(bill)}>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Ver Histórico
                            </DropdownMenuItem>
                          )}
                          {onTogglePause && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onTogglePause(bill)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pausar Recorrência
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(bill)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>

          {/* Footer com seleção */}
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t"
            >
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} conta{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Limpar seleção
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    alert('Excluir em lote: ' + Array.from(selectedIds).join(', '));
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir selecionadas
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
