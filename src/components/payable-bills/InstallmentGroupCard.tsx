import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  CreditCard,
  Clock,
  Hash,
  Undo2,
} from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import type { Category } from '@/types/categories';
import type { Account } from '@/types/accounts';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatDueDateWithContext,
  getStatusColor,
  getBillCategoryName,
} from '@/utils/billCalculations';
import { PAYMENT_METHOD_LABELS } from '@/types/payable-bills.types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface InstallmentGroup {
  groupId: string;
  description: string;
  billType: string;
  amountPerInstallment: number;
  totalAmount: number;
  totalInstallments: number;
  paidCount: number;  // Total de pagas (sistema + antes de cadastrar)
  pendingCount: number;
  overdueCount: number;
  nextInstallment: PayableBill | null;
  installments: PayableBill[];
  // Campos extras para cálculos detalhados
  paidBeforeSystem?: number;  // Parcelas pagas antes de cadastrar no sistema
  paidInSystem?: number;      // Valor pago no sistema
  paidBeforeSystemAmount?: number;  // Valor pago antes de cadastrar
  // Método de pagamento
  paymentMethod?: string;  // 'credit_card', 'boleto', etc
  creditCardId?: string;   // ID do cartão (se for no cartão)
  creditCardName?: string; // Nome do cartão (para exibição)
}

interface InstallmentGroupCardProps {
  group: InstallmentGroup;
  categories: Category[];
  accounts: Account[];
  categoriesLoading: boolean;
  onPayInstallment?: (bill: PayableBill) => void;
  onEditInstallment?: (bill: PayableBill) => void;
  onDeleteGroup?: (groupId: string) => void;
  onRevertInstallmentPayment?: (bill: PayableBill) => void;
}

export function InstallmentGroupCard({
  group,
  categories,
  accounts,
  categoriesLoading,
  onPayInstallment,
  onEditInstallment,
  onDeleteGroup,
  onRevertInstallmentPayment,
}: InstallmentGroupCardProps) {
  const summarySourceInstallment =
    group.installments.find((installment) => installment.payment_method || installment.payment_account_id) ||
    group.nextInstallment ||
    group.installments[0];
  const paymentAccount = summarySourceInstallment?.payment_account_id
    ? accounts.find((account) => account.id === summarySourceInstallment.payment_account_id)
    : null;
  const paymentSummary = [
    summarySourceInstallment?.payment_method
      ? summarySourceInstallment.payment_method === 'credit_card'
        ? group.creditCardName || 'Cartão'
        : PAYMENT_METHOD_LABELS[summarySourceInstallment.payment_method as keyof typeof PAYMENT_METHOD_LABELS] || summarySourceInstallment.payment_method
      : 'PIX',
    paymentAccount?.name || null,
  ].filter(Boolean).join(' • ');

  const [isExpanded, setIsExpanded] = useState(false);
  
  // Buscar categoria pelo ID ou usar fallback
  const getCategoryName = () => {
    // Tentar buscar pelo category_id da primeira parcela
    const firstInstallment = group.installments[0];
    if (firstInstallment?.category_id && categories.length > 0) {
      const cat = categories.find(c => c.id === firstInstallment.category_id);
      if (cat) return cat.name;
    }
    // Se categorias ainda estão carregando, não mostrar fallback errado
    if (categoriesLoading && firstInstallment?.category_id) {
      return 'Carregando...';
    }
    return getBillCategoryName(group.billType);
  };

  const progressPercent = (group.paidCount / group.totalInstallments) * 100;
  
  // Valor total pago = parcelas pagas × valor por parcela
  const paidAmount = group.paidCount * group.amountPerInstallment;
  
  // Restante = apenas as parcelas pendentes no sistema (não inclui as pagas antes)
  // Ex: 32 pendentes × 500 = R$ 16.000
  const remainingAmount = group.pendingCount * group.amountPerInstallment;

  // Determinar cor do progresso
  const getProgressColor = () => {
    if (group.overdueCount > 0) return 'bg-red-500';
    if (progressPercent >= 100) return 'bg-emerald-500';
    if (progressPercent >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden rounded-[1.7rem] border-border/70 bg-card/95 shadow-[0_20px_48px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-card hover:shadow-[0_24px_56px_rgba(2,6,23,0.2)]">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/80 to-transparent opacity-85" />
        <div className="absolute -right-10 top-4 h-24 w-24 rounded-full bg-orange-400/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-lg truncate">
                  {group.description}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {getCategoryName()}
                </p>
                {group.paymentMethod === 'credit_card' && (
                  <Badge variant="outline" className="text-xs border-border/70 bg-surface/70 text-foreground">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {group.creditCardName || 'Cartão'}
                  </Badge>
                )}
                {group.paymentMethod === 'boleto' && (
                  <Badge variant="outline" className="text-xs border-border/70 bg-surface/70 text-foreground">
                    📄 Boleto
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl border border-border/70 bg-surface/75 text-muted-foreground hover:bg-surface">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {group.nextInstallment && (
                  <DropdownMenuItem onClick={() => onPayInstallment?.(group.nextInstallment!)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Pagar {group.nextInstallment.installment_number}/{group.totalInstallments}
                  </DropdownMenuItem>
                )}
                {group.installments.some((installment) => installment.status === 'paid' || installment.status === 'partial') && (
                  <DropdownMenuItem
                    onClick={() => {
                      const lastPaidInstallment = [...group.installments]
                        .filter((installment) => installment.status === 'paid' || installment.status === 'partial')
                        .sort((a, b) => (b.installment_number || 0) - (a.installment_number || 0))[0];

                      if (lastPaidInstallment) {
                        onRevertInstallmentPayment?.(lastPaidInstallment);
                      }
                    }}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Reverter último pagamento
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteGroup?.(group.groupId)}
                  className="text-destructive"
                >
                  Excluir parcelamento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Valores */}
          <div className="mb-4 grid grid-cols-2 gap-4 rounded-[1.35rem] border border-border/60 bg-surface/55 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor por parcela</p>
              <p className="text-2xl font-bold">
                {formatCurrency(group.amountPerInstallment)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-semibold text-muted-foreground">
                {formatCurrency(group.totalAmount)}
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {group.paidCount}/{group.totalInstallments} pagas
              </span>
              <span className="text-sm text-muted-foreground">
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${getProgressColor()} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {group.paidCount > 0 && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {group.paidCount} pagas
              </Badge>
            )}
            {group.pendingCount > 0 && (
              <Badge variant="warning" className="gap-1">
                <Clock className="h-3 w-3" />
                {group.pendingCount} pendentes
              </Badge>
            )}
            {group.overdueCount > 0 && (
              <Badge variant="danger" className="gap-1">
                {group.overdueCount} vencidas
              </Badge>
            )}
            {summarySourceInstallment?.payment_method && (
              <Badge variant="outline" className="text-xs">
                {summarySourceInstallment.payment_method === 'credit_card'
                  ? group.creditCardName || 'Cartão'
                  : PAYMENT_METHOD_LABELS[summarySourceInstallment.payment_method as keyof typeof PAYMENT_METHOD_LABELS] || summarySourceInstallment.payment_method}
              </Badge>
            )}
          </div>

          {/* Próxima Parcela */}
          {group.nextInstallment && (
            <div className="mb-4 rounded-xl border border-border/60 bg-surface/55 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Próxima:</strong> Parcela {group.nextInstallment.installment_number}/{group.totalInstallments}
                  </span>
                </div>
                <span className={`text-sm font-medium ${
                  group.nextInstallment.status === 'overdue' ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {formatDueDateWithContext(group.nextInstallment.due_date)}
                </span>
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Já pago:</span>
              <span className="font-medium text-emerald-600">
                {formatCurrency(paidAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restante:</span>
              <span className="font-medium">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-border/60 bg-surface/55 px-3 py-3 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground/80">Pagamento rápido</span>
            <div className="mt-1 text-sm text-foreground">{paymentSummary}</div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ocultar parcelas
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver parcelas
                </>
              )}
            </Button>
            {group.nextInstallment && group.nextInstallment.status !== 'paid' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onPayInstallment?.(group.nextInstallment!)}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Pagar {group.nextInstallment.installment_number}/{group.totalInstallments}
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Parcelas Expandida */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border/60"
            >
              <div className="max-h-80 overflow-y-auto bg-surface/35 p-4">
                <div className="space-y-2">
                  {group.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className={cn(
                        'flex items-center justify-between rounded-xl border border-border/60 bg-card/90 p-3',
                        installment.status === 'paid' && 'bg-emerald-500/8',
                        installment.status === 'overdue' && 'bg-red-500/8'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {installment.status === 'paid' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : installment.status === 'overdue' ? (
                          <Clock className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">
                            Parcela {installment.installment_number}/{group.totalInstallments}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(installment.due_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCurrency(installment.amount)}
                        </span>
                        {installment.status !== 'paid' && (
                          <Button size="sm" variant="ghost" onClick={() => onPayInstallment?.(installment)}>
                            Pagar
                          </Button>
                        )}
                        {(installment.status === 'paid' || installment.status === 'partial') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() => onRevertInstallmentPayment?.(installment)}
                          >
                            Reverter
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// Função utilitária para agrupar parcelas
export function groupInstallments(bills: PayableBill[]): InstallmentGroup[] {
  const groups = new Map<string, PayableBill[]>();

  // Agrupar por installment_group_id
  bills.forEach((bill) => {
    if (bill.is_installment && bill.installment_group_id) {
      const existing = groups.get(bill.installment_group_id) || [];
      existing.push(bill);
      groups.set(bill.installment_group_id, existing);
    }
  });

  // Converter para InstallmentGroup
  const result: InstallmentGroup[] = [];

  groups.forEach((installments, groupId) => {
    // Ordenar por número da parcela
    installments.sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));

    const firstInstallment = installments[0];
    const paidInstallments = installments.filter((i) => i.status === 'paid');
    const overdueInstallments = installments.filter((i) => i.status === 'overdue');
    const pendingInstallments = installments.filter((i) => i.status === 'pending');

    // Próxima parcela a pagar (primeira não paga)
    const nextInstallment = installments.find((i) => i.status !== 'paid') || null;

    // Total de parcelas original (do contrato)
    const totalInstallments = firstInstallment.installment_total || installments.length;
    
    // Primeira parcela cadastrada (ex: 5 significa que 4 já foram pagas antes)
    const firstInstallmentNumber = firstInstallment.installment_number || 1;
    
    // Parcelas pagas ANTES de cadastrar no sistema (ex: parcela 5 = 4 pagas antes)
    const paidBeforeSystem = firstInstallmentNumber - 1;
    
    // Total de pagas = pagas no sistema + pagas antes de cadastrar
    const totalPaidCount = paidInstallments.length + paidBeforeSystem;
    
    // Valor pago = parcelas pagas no sistema × valor
    const paidInSystem = paidInstallments.length * firstInstallment.amount;
    
    // Valor pago antes = parcelas anteriores × valor
    const paidBeforeSystemAmount = paidBeforeSystem * firstInstallment.amount;

    result.push({
      groupId,
      description: firstInstallment.description,
      billType: firstInstallment.bill_type,
      amountPerInstallment: firstInstallment.amount,
      // Total original do contrato (36 × 500 = 18.000)
      totalAmount: firstInstallment.amount * totalInstallments,
      totalInstallments,
      // Pagas = pagas no sistema + pagas antes de cadastrar
      paidCount: totalPaidCount,
      pendingCount: pendingInstallments.length,
      overdueCount: overdueInstallments.length,
      nextInstallment,
      installments,
      // Campos extras para cálculos no card
      paidBeforeSystem,
      paidInSystem,
      paidBeforeSystemAmount,
      // Método de pagamento
      paymentMethod: firstInstallment.payment_method || undefined,
      creditCardId: firstInstallment.credit_card_id || undefined,
    } as InstallmentGroup);
  });

  // Ordenar por próxima parcela a vencer
  result.sort((a, b) => {
    if (!a.nextInstallment) return 1;
    if (!b.nextInstallment) return -1;
    return new Date(a.nextInstallment.due_date).getTime() - new Date(b.nextInstallment.due_date).getTime();
  });

  return result;
}
