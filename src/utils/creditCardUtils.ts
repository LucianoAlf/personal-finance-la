import { CreditCardInvoice, InstallmentPlan } from '@/types/database.types';

/**
 * Calcular limite disponível do cartão
 */
export function calculateAvailableLimit(
  creditLimit: number,
  openInvoices: CreditCardInvoice[]
): number {
  const totalUsed = openInvoices
    .filter(inv => inv.status === 'open' || inv.status === 'closed')
    .reduce((sum, inv) => sum + inv.total_amount, 0);
  
  return Math.max(0, creditLimit - totalUsed);
}

/**
 * Determinar em qual fatura uma compra deve ser lançada
 * baseado na data da compra e no dia de fechamento
 */
export function getInvoiceForPurchase(
  purchaseDate: Date,
  closingDay: number
): Date {
  const purchase = new Date(purchaseDate);
  const year = purchase.getFullYear();
  const month = purchase.getMonth();
  const day = purchase.getDate();
  
  // Se a compra foi antes do fechamento, vai para a fatura do mês atual
  if (day <= closingDay) {
    return new Date(year, month, 1);
  }
  
  // Se a compra foi depois do fechamento, vai para a fatura do próximo mês
  return new Date(year, month + 1, 1);
}

/**
 * Gerar plano de parcelas
 */
export function generateInstallments(
  totalAmount: number,
  totalInstallments: number,
  purchaseDate: Date,
  closingDay: number
): InstallmentPlan[] {
  const installmentAmount = totalAmount / totalInstallments;
  const installments: InstallmentPlan[] = [];
  
  // Primeira parcela vai para a fatura correta baseada na data da compra
  const firstInvoiceMonth = getInvoiceForPurchase(purchaseDate, closingDay);
  
  for (let i = 0; i < totalInstallments; i++) {
    const invoiceMonth = new Date(firstInvoiceMonth);
    invoiceMonth.setMonth(invoiceMonth.getMonth() + i);
    
    // Calcular data de vencimento (dia de vencimento do próximo mês)
    const dueDate = new Date(invoiceMonth);
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    installments.push({
      installment_number: i + 1,
      amount: installmentAmount,
      due_date: dueDate,
      invoice_month: invoiceMonth,
    });
  }
  
  return installments;
}

/**
 * Formatar número do cartão (últimos 4 dígitos)
 */
export function formatCardNumber(lastFour: string): string {
  return `•••• •••• •••• ${lastFour}`;
}

/**
 * Verificar se fatura está vencida
 */
export function isInvoiceOverdue(dueDate: Date, status: string): boolean {
  if (status === 'paid') return false;
  return new Date() > new Date(dueDate);
}

/**
 * Calcular dias até vencimento
 */
export function daysUntilDue(dueDate: Date): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcular percentual de uso do limite
 */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.round((used / limit) * 100);
}

/**
 * Determinar cor baseada no percentual de uso
 */
export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'red';
  if (percentage >= 70) return 'orange';
  if (percentage >= 50) return 'yellow';
  return 'green';
}

/**
 * Interface para dados de parcela
 */
export interface InstallmentData {
  amount: number;
  installment_number: number;
  total_installments: number;
  due_month: string; // YYYY-MM format
}

/**
 * Calcular valor de cada parcela
 */
export function calculateInstallmentValue(totalAmount: number, installments: number): number {
  return totalAmount / installments;
}

/**
 * Criar array de parcelas para distribuir nas faturas
 */
export function createInstallments(
  totalAmount: number,
  installments: number,
  purchaseDate: Date
): InstallmentData[] {
  const installmentAmount = calculateInstallmentValue(totalAmount, installments);
  const result: InstallmentData[] = [];

  for (let i = 1; i <= installments; i++) {
    // Calcular mês da parcela (compra + i-1 meses)
    const dueDate = new Date(purchaseDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    
    const dueMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

    result.push({
      amount: installmentAmount,
      installment_number: i,
      total_installments: installments,
      due_month: dueMonth,
    });
  }

  return result;
}

/**
 * Validar se valor da parcela é aceitável
 */
export function validateInstallmentValue(
  totalAmount: number,
  installments: number,
  minValue: number = 5.0
): { valid: boolean; message?: string } {
  const installmentValue = calculateInstallmentValue(totalAmount, installments);
  
  if (installmentValue < minValue) {
    return {
      valid: false,
      message: `Valor da parcela (R$ ${installmentValue.toFixed(2)}) é menor que o mínimo permitido (R$ ${minValue.toFixed(2)})`,
    };
  }

  return { valid: true };
}

/**
 * Formatar descrição de parcela
 */
export function formatInstallmentDescription(
  current: number,
  total: number,
  description: string
): string {
  return `${description} (${current}/${total})`;
}

/**
 * Calcular data de fechamento da fatura
 */
export function calculateClosingDate(referenceMonth: Date, closingDay: number): Date {
  const closing = new Date(referenceMonth);
  closing.setDate(closingDay);
  return closing;
}

/**
 * Calcular data de vencimento da fatura
 */
export function calculateDueDate(referenceMonth: Date, dueDay: number): Date {
  const due = new Date(referenceMonth);
  due.setMonth(due.getMonth() + 1);
  due.setDate(dueDay);
  return due;
}

/**
 * Tipo de status dinâmico da fatura
 */
export type DynamicInvoiceStatus = 'open' | 'closed' | 'due_soon' | 'overdue' | 'paid' | 'partial';

/**
 * Calcular status dinâmico da fatura baseado nas datas e valores
 * 
 * Lógica:
 * - open: Antes da data de fechamento (período de compras)
 * - closed: Após fechamento, antes do vencimento (aguardando pagamento)
 * - due_soon: Fatura fechada que vence em até 3 dias
 * - overdue: Passou do vencimento sem pagamento total
 * - paid: Fatura quitada
 * - partial: Pagamento parcial realizado
 */
export function calculateDynamicInvoiceStatus(
  closingDate: Date | string,
  dueDate: Date | string,
  totalAmount: number,
  paidAmount: number,
  currentStatus: string
): DynamicInvoiceStatus {
  const now = new Date();
  const closing = new Date(closingDate);
  const due = new Date(dueDate);
  
  // Se já está paga, mantém
  if (currentStatus === 'paid' || paidAmount >= totalAmount) {
    return 'paid';
  }
  
  // Se tem pagamento parcial
  if (paidAmount > 0 && paidAmount < totalAmount) {
    // Verificar se está vencida
    if (now > due) {
      return 'overdue';
    }
    return 'partial';
  }
  
  // Sem pagamento
  // Verificar se está vencida
  if (now > due) {
    return 'overdue';
  }
  
  // Verificar se ainda está aberta (antes do fechamento)
  if (now < closing) {
    return 'open';
  }
  
  // Após fechamento, verificar se vence em breve (3 dias)
  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 3) {
    return 'due_soon';
  }
  
  // Fechada, aguardando pagamento
  return 'closed';
}

/**
 * Obter informações detalhadas do status da fatura
 */
export function getInvoiceStatusInfo(
  closingDate: Date | string,
  dueDate: Date | string,
  totalAmount: number,
  paidAmount: number,
  currentStatus: string
): {
  status: DynamicInvoiceStatus;
  label: string;
  description: string;
  daysUntilDue: number;
  daysOverdue: number;
  isUrgent: boolean;
  canAddPurchases: boolean;
} {
  const status = calculateDynamicInvoiceStatus(closingDate, dueDate, totalAmount, paidAmount, currentStatus);
  const now = new Date();
  const due = new Date(dueDate);
  const closing = new Date(closingDate);
  
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
  
  const statusLabels: Record<DynamicInvoiceStatus, { label: string; description: string }> = {
    open: { 
      label: 'Aberta', 
      description: 'Período de compras em andamento' 
    },
    closed: { 
      label: 'Fechada', 
      description: `Vence em ${daysUntilDue} dias` 
    },
    due_soon: { 
      label: 'Vence em breve', 
      description: daysUntilDue === 0 ? 'Vence hoje!' : `Vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}` 
    },
    overdue: { 
      label: 'Vencida', 
      description: `Atrasada há ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}` 
    },
    paid: { 
      label: 'Paga', 
      description: 'Fatura quitada' 
    },
    partial: { 
      label: 'Parcial', 
      description: `Falta pagar R$ ${(totalAmount - paidAmount).toFixed(2)}` 
    },
  };
  
  return {
    status,
    label: statusLabels[status].label,
    description: statusLabels[status].description,
    daysUntilDue,
    daysOverdue,
    isUrgent: status === 'overdue' || status === 'due_soon',
    canAddPurchases: status === 'open',
  };
}

/**
 * Calcular limite comprometido com parcelas futuras
 */
export interface LimitBreakdown {
  totalLimit: number;
  currentInvoice: number;
  futureInstallments: number;
  availableReal: number;
  usagePercentage: number;
}

export function calculateLimitBreakdown(
  creditLimit: number,
  currentInvoiceAmount: number,
  futureInstallmentsTotal: number
): LimitBreakdown {
  const totalUsed = currentInvoiceAmount + futureInstallmentsTotal;
  const availableReal = Math.max(0, creditLimit - totalUsed);
  const usagePercentage = creditLimit > 0 ? Math.round((totalUsed / creditLimit) * 100) : 0;
  
  return {
    totalLimit: creditLimit,
    currentInvoice: currentInvoiceAmount,
    futureInstallments: futureInstallmentsTotal,
    availableReal,
    usagePercentage,
  };
}
