import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { InvestmentTransaction } from '@/types/database.types';

interface DividendHistoryTableProps {
  transactions: InvestmentTransaction[];
  totalReceived: number;
  yearlyTotals: Array<{ year: number; total: number; count: number }>;
  count: number;
}

export function DividendHistoryTable({
  transactions,
  totalReceived,
  yearlyTotals,
  count,
}: DividendHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Dividendos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhum dividendo recebido</h3>
            <p className="text-sm text-muted-foreground">
              Registre transações de dividendos para ver o histórico aqui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Recebido</p>
                  <h2 className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalReceived)}
                  </h2>
                </div>
                <div className="rounded-lg p-3 bg-green-50">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pagamentos</p>
                  <h2 className="text-2xl font-bold text-blue-600">{count}</h2>
                </div>
                <div className="rounded-lg p-3 bg-blue-50">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Média por Pagamento</p>
                  <h2 className="text-2xl font-bold text-purple-600">
                    {formatCurrency(count > 0 ? totalReceived / count : 0)}
                  </h2>
                </div>
                <div className="rounded-lg p-3 bg-purple-50">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Yearly Breakdown */}
      {yearlyTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Por Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {yearlyTotals.map((year) => (
                <div
                  key={year.year}
                  className="p-4 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors"
                >
                  <p className="text-sm text-muted-foreground mb-1">{year.year}</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(year.total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {year.count} pagamento{year.count > 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                    Valor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                    Observações
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(transaction.total_value)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {transaction.notes || '-'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length > 10 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Mostrando {transactions.length} pagamento{transactions.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
