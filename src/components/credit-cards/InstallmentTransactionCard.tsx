import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, CreditCard } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { BankLogo } from '@/components/ui/bank-logo';
import { Card } from '@/components/ui/card';
import { detectBankFromCardName } from '@/constants/banks';
import { cn } from '@/lib/utils';
import { CreditCardTransaction } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';

interface InstallmentTransactionCardProps {
  transaction: CreditCardTransaction;
  cardName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

function generateVirtualInstallments(transaction: CreditCardTransaction) {
  const installments = [];
  const purchaseDate = new Date(transaction.purchase_date);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  for (let number = 1; number <= (transaction.total_installments || 1); number += 1) {
    const dueDate = addMonths(purchaseDate, number - 1);
    const dueMonth = dueDate.getMonth();
    const dueYear = dueDate.getFullYear();

    let status: 'paid' | 'current' | 'future';
    if (dueYear < currentYear || (dueYear === currentYear && dueMonth < currentMonth)) {
      status = 'paid';
    } else if (dueYear === currentYear && dueMonth === currentMonth) {
      status = 'current';
    } else {
      status = 'future';
    }

    installments.push({
      number,
      amount: transaction.amount,
      dueDate,
      status,
    });
  }

  return installments;
}

export function InstallmentTransactionCard({ transaction, cardName }: InstallmentTransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const installments = generateVirtualInstallments(transaction);
  const paidCount = installments.filter((installment) => installment.status === 'paid').length;
  const currentInstallment = installments.find((installment) => installment.status === 'current');
  const progressPercent = installments.length > 0 ? (paidCount / installments.length) * 100 : 0;
  const bankCode = cardName ? detectBankFromCardName(cardName) : null;
  const totalAmount =
    transaction.total_amount || transaction.amount * (transaction.total_installments || 1);

  return (
    <Card className="overflow-hidden rounded-[24px] border border-border/70 bg-card/95 shadow-[0_12px_30px_rgba(2,6,23,0.12)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {bankCode ? (
              <BankLogo bankCode={bankCode} size="sm" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                <CreditCard className="h-4 w-4" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="truncate text-base font-semibold tracking-tight text-foreground">
                  {transaction.description}
                </h4>
                <Badge className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {currentInstallment
                    ? `${currentInstallment.number}/${transaction.total_installments}`
                    : `${paidCount}/${transaction.total_installments}`}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{transaction.category_name || 'Sem categoria'}</span>
                <span>•</span>
                <span>{cardName || 'Cartao'}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {formatCurrency(transaction.amount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">por parcela</p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Uso do parcelamento</span>
            <span className="font-semibold text-foreground">{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-surface-overlay/80">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.88),rgba(139,92,246,0.92))]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{paidCount} de {transaction.total_installments} parcelas pagas</span>
            <span>Total {formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {currentInstallment ? (
              <span>
                Proxima {format(currentInstallment.dueDate, 'MMM/yy', { locale: ptBR })}
              </span>
            ) : null}
            <span>Restam {(transaction.total_installments || 1) - paidCount} parcelas</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((previous) => !previous)}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-surface/75 px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isExpanded ? 'Ocultar' : 'Ver parcelas'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/60 bg-surface-elevated/35"
          >
            <div className="space-y-2 p-4">
              {installments.map((installment) => {
                const installmentTone =
                  installment.status === 'paid'
                    ? 'border-success/20 bg-success/10'
                    : installment.status === 'current'
                      ? 'border-warning/20 bg-warning/10'
                      : 'border-border/60 bg-background/60';

                return (
                  <div
                    key={installment.number}
                    className={cn('flex items-center justify-between rounded-[18px] border px-3 py-2.5', installmentTone)}
                  >
                    <div className="flex items-center gap-2">
                      {installment.status === 'paid' ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : installment.status === 'current' ? (
                        <Clock className="h-4 w-4 text-warning" />
                      ) : (
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Parcela {installment.number}/{transaction.total_installments}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(installment.dueDate, 'MMM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(installment.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
