import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
} from 'lucide-react';
import { CreditCardTransaction } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BankLogo } from '@/components/ui/bank-logo';
import { detectBankFromCardName } from '@/constants/banks';

interface InstallmentTransactionCardProps {
  transaction: CreditCardTransaction;
  cardName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Gerar parcelas virtuais baseado na data de compra
function generateVirtualInstallments(
  transaction: CreditCardTransaction
): Array<{
  number: number;
  amount: number;
  dueDate: Date;
  status: 'paid' | 'current' | 'future';
}> {
  const installments = [];
  const purchaseDate = new Date(transaction.purchase_date);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  for (let i = 1; i <= (transaction.total_installments || 1); i++) {
    const dueDate = addMonths(purchaseDate, i - 1);
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
      number: i,
      amount: transaction.amount,
      dueDate,
      status,
    });
  }

  return installments;
}

export function InstallmentTransactionCard({
  transaction,
  cardName,
  onEdit,
  onDelete,
}: InstallmentTransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Gerar parcelas virtuais
  const installments = generateVirtualInstallments(transaction);
  
  // Calcular progresso
  const paidCount = installments.filter((i) => i.status === 'paid').length;
  const currentInstallment = installments.find((i) => i.status === 'current');
  const progressPercent = (paidCount / installments.length) * 100;

  // Detectar banco pelo nome do cartão
  const bankCode = cardName ? detectBankFromCardName(cardName) : null;

  // Valor total
  const totalAmount = transaction.total_amount || transaction.amount * (transaction.total_installments || 1);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo do banco ou ícone */}
            {bankCode ? (
              <BankLogo bankCode={bankCode} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {transaction.description}
              </h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{transaction.category_name || 'Sem categoria'}</span>
                <span>•</span>
                <span>{cardName || 'Cartão'}</span>
              </div>
            </div>
          </div>

          {/* Valor e parcela atual */}
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              {formatCurrency(transaction.amount)}
            </p>
            <Badge variant="outline" className="text-xs">
              {currentInstallment 
                ? `${currentInstallment.number}/${transaction.total_installments}`
                : `${paidCount}/${transaction.total_installments} pagas`
              }
            </Badge>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">
              {paidCount} de {transaction.total_installments} parcelas pagas
            </span>
            <span className="text-xs text-gray-500">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Resumo */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">
              Total: <strong className="text-gray-700">{formatCurrency(totalAmount)}</strong>
            </span>
            {currentInstallment && (
              <span className="text-gray-500">
                Próxima: <strong className="text-amber-600">
                  {format(currentInstallment.dueDate, "MMM/yy", { locale: ptBR })}
                </strong>
              </span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver parcelas
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Lista de parcelas expandida */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t bg-gray-50"
          >
            <div className="p-3 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {installments.map((installment) => (
                  <div
                    key={installment.number}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      installment.status === 'paid'
                        ? 'bg-emerald-50'
                        : installment.status === 'current'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {installment.status === 'paid' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : installment.status === 'current' ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Calendar className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">
                        Parcela {installment.number}/{transaction.total_installments}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {format(installment.dueDate, "MMM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(installment.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
