import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FileText } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/utils/billCalculations';
import { BILL_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/types/payable-bills.types';

interface BillHistoryTableProps {
  bills: PayableBill[];
}

export function BillHistoryTable({ bills }: BillHistoryTableProps) {
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Filtrar apenas contas pagas
  const paidBills = useMemo(() => {
    return bills.filter((b) => b.status === 'paid');
  }, [bills]);

  // Extrair meses únicos
  const months = useMemo(() => {
    const uniqueMonths = new Set(
      paidBills.map((b) => b.paid_at?.substring(0, 7) || '')
    );
    return Array.from(uniqueMonths).sort().reverse();
  }, [paidBills]);

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

    // Filtro de mês
    if (monthFilter !== 'all') {
      filtered = filtered.filter(
        (b) => b.paid_at?.startsWith(monthFilter)
      );
    }

    // Ordenar por data de pagamento (mais recente primeiro)
    return filtered.sort((a, b) => {
      if (!a.paid_at || !b.paid_at) return 0;
      return new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime();
    });
  }, [paidBills, search, monthFilter]);

  // Totais
  const totalPaid = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + (b.paid_amount || b.amount), 0);
  }, [filteredBills]);

  if (paidBills.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="rounded-full bg-muted p-6 mb-4">
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
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contas pagas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((month) => (
              <SelectItem key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <div>
          <p className="text-sm text-muted-foreground">Total Pago</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Contas Pagas</p>
          <p className="text-2xl font-bold">{filteredBills.length}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
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
                  <Badge variant="outline">
                    {BILL_TYPE_LABELS[bill.bill_type]}
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
                    <Badge variant="outline">
                      {PAYMENT_METHOD_LABELS[bill.payment_method]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(bill.paid_amount || bill.amount)}
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
