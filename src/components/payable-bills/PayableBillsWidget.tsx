import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, ChevronRight, Receipt } from 'lucide-react';
import { usePayableBillsQuery } from '@/hooks/usePayableBillsQuery';
import { formatCurrency, formatDueDateWithContext } from '@/utils/billCalculations';
import { Link } from 'react-router-dom';

export function PayableBillsWidget() {
  const { upcomingBills, overdueBills, summary, loading } = usePayableBillsQuery();

  const showSkeleton = loading && upcomingBills.length === 0 && overdueBills.length === 0;

  if (showSkeleton) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <h3 className="font-semibold">Contas a Pagar</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-16 bg-muted animate-pulse rounded-lg"></div>
            <div className="h-16 bg-muted animate-pulse rounded-lg"></div>
            <div className="h-16 bg-muted animate-pulse rounded-lg"></div>
          </div>
        </div>
      </Card>
    );
  }

  const nextBills = [...upcomingBills, ...overdueBills]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Card>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <h3 className="font-semibold">Contas a Pagar</h3>
            </div>
            <Link to="/contas-pagar">
              <Button variant="ghost" size="sm">
                Ver Todas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Resumo de Alertas */}
          {(summary.overdue_count > 0 || summary.pending_count > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Vencidas */}
              {summary.overdue_count > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-500">Vencidas</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(summary.overdue_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.overdue_count}{' '}
                    {summary.overdue_count === 1 ? 'conta' : 'contas'}
                  </p>
                </div>
              )}

              {/* Próximas */}
              {summary.pending_count > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-500">A Vencer</span>
                  </div>
                  <p className="text-lg font-bold text-yellow-600">
                    {formatCurrency(summary.pending_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.pending_count}{' '}
                    {summary.pending_count === 1 ? 'conta' : 'contas'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lista de Próximas Contas */}
          {nextBills.length > 0 ? (
            <div className="space-y-2">
              <Separator className="mb-3" />
              <p className="text-xs font-medium text-muted-foreground mb-3">
                PRÓXIMAS CONTAS
              </p>
              {nextBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {bill.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-medium ${
                          bill.status === 'overdue'
                            ? 'text-red-500'
                            : 'text-yellow-500'
                        }`}
                      >
                        {formatDueDateWithContext(bill.due_date)}
                      </span>
                      {bill.status === 'overdue' && (
                        <Badge variant="danger" className="text-xs py-0">
                          Vencida
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold text-sm ml-2 shrink-0">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="rounded-full bg-green-500/10 p-4 w-fit mx-auto mb-3">
                <Receipt className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-medium text-green-600">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhuma conta vencida ou próxima ao vencimento
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
