import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';
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

const panelClassName =
  'border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

export function DividendHistoryTable({
  transactions,
  totalReceived,
  yearlyTotals,
  count,
}: DividendHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <Card className={panelClassName}>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-2xl">Histórico de dividendos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-surface shadow-sm">
            <DollarSign className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">Nenhum dividendo recebido</h3>
          <p className="text-sm text-muted-foreground">
            Registre transações de dividendos para acompanhar o histórico aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={panelClassName}>
          <CardContent className="flex items-start justify-between p-6">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Total recebido</p>
              <h2 className="text-[1.7rem] font-semibold tracking-tight text-emerald-500">
                {formatCurrency(totalReceived)}
              </h2>
            </div>
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 shadow-sm text-emerald-600 dark:text-emerald-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={panelClassName}>
          <CardContent className="flex items-start justify-between p-6">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Pagamentos</p>
              <h2 className="text-[1.7rem] font-semibold tracking-tight text-sky-500">{count}</h2>
            </div>
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3 shadow-sm text-sky-600 dark:text-sky-300">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={panelClassName}>
          <CardContent className="flex items-start justify-between p-6">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Média por pagamento</p>
              <h2 className="text-[1.7rem] font-semibold tracking-tight text-violet-500">
                {formatCurrency(count > 0 ? totalReceived / count : 0)}
              </h2>
            </div>
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3 shadow-sm text-violet-600 dark:text-violet-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {yearlyTotals.length > 0 ? (
        <Card className={panelClassName}>
          <CardHeader className="border-b border-border/60 pb-5">
            <CardTitle className="text-2xl">Por ano</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-4">
            {yearlyTotals.map((year) => (
              <div
                key={year.year}
                className="rounded-2xl border border-border/70 bg-surface/55 p-4 text-center"
              >
                <p className="mb-1 text-sm text-muted-foreground">{year.year}</p>
                <p className="text-lg font-semibold text-emerald-500">{formatCurrency(year.total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {year.count} {year.count > 1 ? 'pagamentos' : 'pagamento'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className={panelClassName}>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="text-2xl">Histórico detalhado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-surface/65 text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em]">
                    Data
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em]">
                    Valor
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em]">
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
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    className="border-b border-border/60 transition-colors hover:bg-surface/65"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-500">
                      {formatCurrency(transaction.total_value)}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {transaction.notes || '-'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length > 10 ? (
            <div className="border-t border-border/60 px-5 py-4 text-sm text-muted-foreground">
              Mostrando {transactions.length} {transactions.length > 1 ? 'pagamentos' : 'pagamento'}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
