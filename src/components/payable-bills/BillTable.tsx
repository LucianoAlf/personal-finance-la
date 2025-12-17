import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
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
  CheckCircle,
  Clock,
  AlertTriangle,
  Repeat,
  ArrowUpDown,
  Tv,
  Lightbulb,
  Home,
  Smartphone,
  Heart,
  CreditCard,
  Package,
  Bell,
  Undo2,
} from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { BILL_STATUS_LABELS } from '@/types/payable-bills.types';
import { useCategories } from '@/hooks/useCategories';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillTableProps {
  bills: PayableBill[];
  onPay: (bill: PayableBill) => void;
  onEdit: (bill: PayableBill) => void;
  onDelete: (bill: PayableBill) => void;
  onCopy: (bill: PayableBill) => void;
  onConfigReminders?: (bill: PayableBill) => void;
  onRevertPayment?: (bill: PayableBill) => void;
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Paga
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendente
        </Badge>
      );
    case 'overdue':
      return (
        <Badge variant="danger" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencida
        </Badge>
      );
    case 'scheduled':
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Agendada
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatDueDate = (dueDate: string, status?: string) => {
  const date = parseISO(dueDate);
  
  // Se está paga, não mostrar "X dias atrás" - apenas a data
  if (status === 'paid') {
    return format(date, "dd 'de' MMM", { locale: ptBR });
  }
  
  const today = new Date();
  const diff = differenceInDays(date, today);

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff < -1) return `${Math.abs(diff)} dias atrás`;
  if (diff <= 7) return `Em ${diff} dias`;

  return format(date, "dd 'de' MMM", { locale: ptBR });
};

const getDueDateColor = (dueDate: string, status: string) => {
  if (status === 'paid') return 'text-muted-foreground';
  
  const date = parseISO(dueDate);
  const today = new Date();
  const diff = differenceInDays(date, today);

  if (diff < 0) return 'text-red-600 font-medium';
  if (diff === 0) return 'text-orange-600 font-medium';
  if (diff <= 3) return 'text-yellow-600';
  return 'text-muted-foreground';
};

export function BillTable({
  bills,
  onPay,
  onEdit,
  onDelete,
  onCopy,
  onConfigReminders,
  onRevertPayment,
}: BillTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Ordenação local da tabela (null = usar ordenação do pai)
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Hook de categorias para exibir nome/ícone correto
  const { categories } = useCategories();
  
  // Função para buscar categoria pelo ID ou mapear bill_type
  const getCategoryInfo = (bill: PayableBill) => {
    // Se tem category_id, buscar no banco
    if (bill.category_id) {
      const cat = categories.find(c => c.id === bill.category_id);
      if (cat) {
        const IconComponent = (LucideIcons as any)[cat.icon];
        return {
          name: cat.name,
          icon: IconComponent ? <IconComponent className="h-4 w-4" style={{ color: cat.color }} /> : <Package className="h-4 w-4 text-gray-500" />,
        };
      }
    }
    
    // Fallback: mapear bill_type para categoria
    const billTypeToCategory: Record<string, string> = {
      'service': 'Contas de Consumo',
      'telecom': 'Assinaturas',
      'subscription': 'Assinaturas',
      'housing': 'Moradia',
      'education': 'Educação',
      'healthcare': 'Saúde',
      'insurance': 'Seguros',
      'loan': 'Empréstimo',
      'installment': 'Financiamento',
      'credit_card': 'Cartão de Crédito',
      'tax': 'Impostos',
      'food': 'Alimentação',
      'other': 'Outros',
    };
    
    const categoryName = billTypeToCategory[bill.bill_type] || bill.bill_type;
    const cat = categories.find(c => c.name === categoryName);
    
    if (cat) {
      const IconComponent = (LucideIcons as any)[cat.icon];
      return {
        name: cat.name,
        icon: IconComponent ? <IconComponent className="h-4 w-4" style={{ color: cat.color }} /> : <Package className="h-4 w-4 text-gray-500" />,
      };
    }
    
    // Fallback final
    return {
      name: categoryName,
      icon: getCategoryIcon(bill.bill_type),
    };
  };

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
      // Se já está ordenando por essa coluna, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nova coluna selecionada
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Se não há ordenação local, usa a ordem que veio do pai (filtro global)
  // Se há ordenação local (clicou no header da tabela), aplica ordenação local
  const sortedBills = sortColumn === null 
    ? bills  // Usa ordenação do pai (filtro global)
    : [...bills].sort((a, b) => {
        let comparison = 0;
        
        switch (sortColumn) {
          case 'description':
            comparison = a.description.localeCompare(b.description);
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'due_date':
            comparison = parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'bill_type':
            comparison = a.bill_type.localeCompare(b.bill_type);
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

  if (bills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma conta encontrada
      </div>
    );
  }

  return (
    <TooltipProvider>
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
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('due_date')}
              >
                <div className="flex items-center gap-1">
                  Vencimento
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
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
                  selectedIds.has(bill.id) && "bg-primary/5",
                  bill.status === 'overdue' && "bg-red-50 dark:bg-red-950/20"
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
                        {bill.is_recurring && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Repeat className="h-3 w-3 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>Conta recorrente</TooltipContent>
                          </Tooltip>
                        )}
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
                  {(() => {
                    const catInfo = getCategoryInfo(bill);
                    return (
                      <Badge variant="outline" className="gap-1 font-normal">
                        {catInfo.icon}
                        {catInfo.name}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-semibold tabular-nums",
                    bill.status === 'paid' ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {formatCurrency(bill.status === 'paid' && bill.paid_amount ? bill.paid_amount : bill.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className={getDueDateColor(bill.due_date, bill.status)}>
                    <div>{format(parseISO(bill.due_date), 'dd/MM/yyyy')}</div>
                    <div className="text-xs">{formatDueDate(bill.due_date, bill.status)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(bill.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {bill.status !== 'paid' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => onPay(bill)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Marcar como paga</TooltipContent>
                      </Tooltip>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {bill.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => onPay(bill)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Paga
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(bill)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCopy(bill)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        {onConfigReminders && bill.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => onConfigReminders(bill)}>
                            <Bell className="h-4 w-4 mr-2" />
                            Lembretes
                          </DropdownMenuItem>
                        )}
                        {onRevertPayment && (bill.status === 'paid' || bill.status === 'partial') && (
                          <DropdownMenuItem 
                            onClick={() => onRevertPayment(bill)}
                            className="text-orange-600 focus:text-orange-600"
                          >
                            <Undo2 className="h-4 w-4 mr-2" />
                            Reverter Pagamento
                          </DropdownMenuItem>
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
                  // TODO: Implementar exclusão em lote
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
    </TooltipProvider>
  );
}
