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
