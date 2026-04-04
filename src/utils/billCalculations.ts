import { PayableBill } from '@/types/payable-bills.types';
import { differenceInDays, parseISO, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// CÁLCULOS DE DATAS
// ============================================

/**
 * Retorna a data atual no fuso horário local (Brasil)
 * Usa startOfDay para comparações consistentes
 */
function getHojeLocal(): Date {
  return startOfDay(new Date());
}

/**
 * Calcula quantos dias faltam para o vencimento
 * Retorna negativo se já venceu
 * IMPORTANTE: Compara apenas as datas (sem horas) para evitar problemas de timezone
 */
export function getDaysUntilDue(dueDate: string): number {
  const today = getHojeLocal();
  // Parse a data como meia-noite local
  const due = startOfDay(parseISO(dueDate));
  return differenceInDays(due, today);
}

/**
 * Verifica se a conta está vencida
 * IMPORTANTE: Usa comparação de datas sem horas para consistência
 */
export function isBillOverdue(dueDate: string): boolean {
  const daysUntil = getDaysUntilDue(dueDate);
  return daysUntil < 0;
}

/**
 * Verifica se vence hoje
 * IMPORTANTE: Usa comparação de datas sem horas para consistência
 */
export function isDueToday(dueDate: string): boolean {
  const daysUntil = getDaysUntilDue(dueDate);
  return daysUntil === 0;
}

/**
 * Verifica se vence nos próximos X dias
 */
export function isDueInDays(dueDate: string, days: number): boolean {
  const daysUntil = getDaysUntilDue(dueDate);
  return daysUntil >= 0 && daysUntil <= days;
}

/**
 * Formata data de vencimento com contexto
 * Ex: "Hoje", "Amanhã", "Venceu há 3 dias", "Vence em 5 dias"
 * Se a conta está paga, mostra a data formatada sem alarmismo
 */
export function formatDueDateWithContext(dueDate: string, status?: string): string {
  const daysUntil = getDaysUntilDue(dueDate);
  
  // Se está paga, mostrar data simples sem "Venceu há X dias"
  if (status === 'paid') {
    return format(parseISO(dueDate), 'dd/MM/yyyy');
  }
  
  if (daysUntil === 0) return 'Hoje';
  if (daysUntil === 1) return 'Amanhã';
  if (daysUntil === -1) return 'Ontem';
  if (daysUntil > 1) return `Vence em ${daysUntil} dias`;
  if (daysUntil < -1) return `Venceu há ${Math.abs(daysUntil)} dias`;
  
  return format(parseISO(dueDate), 'dd/MM/yyyy');
}

// ============================================
// CÁLCULOS DE VALORES
// ============================================

/**
 * Calcula valor total de um grupo de contas
 */
export function getTotalAmount(bills: PayableBill[]): number {
  return bills.reduce((sum, bill) => sum + bill.amount, 0);
}

/**
 * Calcula valor total já pago
 */
export function getTotalPaid(bills: PayableBill[]): number {
  return bills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0);
}

/**
 * Calcula valor restante a pagar
 */
export function getRemainingAmount(bill: PayableBill): number {
  return bill.amount - (bill.paid_amount || 0);
}

/**
 * Calcula percentual pago
 */
export function getPaymentPercentage(bill: PayableBill): number {
  if (bill.amount === 0) return 0;
  const paidAmount = bill.paid_amount || 0;
  return Math.round((paidAmount / bill.amount) * 100);
}

// ============================================
// CORES E BADGES
// ============================================

/**
 * Retorna cor baseado no status
 */
export function getStatusColor(
  status: PayableBill['status']
): 'success' | 'warning' | 'danger' | 'secondary' | 'primary' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'overdue':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'partial':
      return 'primary';
    case 'scheduled':
      return 'secondary';
    case 'cancelled':
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Retorna cor baseado em dias até vencimento
 * Se a conta está paga, sempre retorna 'success' (verde/neutro)
 */
export function getDueDateColor(dueDate: string, status?: string): 'success' | 'warning' | 'danger' {
  // Se está paga, não precisa de alerta - mostrar neutro
  if (status === 'paid') {
    return 'success';
  }
  
  const days = getDaysUntilDue(dueDate);
  
  if (days < 0) return 'danger'; // Vencida
  if (days <= 3) return 'danger'; // Vence em até 3 dias
  if (days <= 7) return 'warning'; // Vence em até 7 dias
  return 'success'; // Mais de 7 dias
}

/**
 * Retorna cor baseado na prioridade
 */
export function getPriorityColor(
  priority: PayableBill['priority']
): 'success' | 'warning' | 'danger' | 'secondary' {
  switch (priority) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'success';
    default:
      return 'secondary';
  }
}

// ============================================
// PARCELAMENTOS
// ============================================

/**
 * Calcula progresso de parcelamento
 */
export function getInstallmentProgress(
  installmentNumber: number,
  installmentTotal: number
): number {
  return Math.round((installmentNumber / installmentTotal) * 100);
}

/**
 * Formata descrição de parcela
 * Ex: "3/12" ou "Parcela 3 de 12"
 */
export function formatInstallment(
  installmentNumber: number,
  installmentTotal: number,
  short: boolean = true
): string {
  if (short) {
    return `${installmentNumber}/${installmentTotal}`;
  }
  return `Parcela ${installmentNumber} de ${installmentTotal}`;
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Valida se conta pode ser marcada como paga
 */
export function canMarkAsPaid(bill: PayableBill): boolean {
  return bill.status === 'pending' || bill.status === 'overdue' || bill.status === 'partial';
}

/**
 * Valida se conta pode ser editada
 */
export function canEditBill(bill: PayableBill): boolean {
  // Não pode editar se for gerada automaticamente (tem parent)
  // E não está paga
  return !bill.parent_bill_id || bill.status !== 'paid';
}

/**
 * Valida se conta pode ser deletada
 */
export function canDeleteBill(bill: PayableBill): boolean {
  // Não pode deletar se estiver paga
  return bill.status !== 'paid';
}

// ============================================
// AGRUPAMENTOS
// ============================================

/**
 * Agrupa contas por provedor
 */
export function groupByProvider(bills: PayableBill[]): Map<string, PayableBill[]> {
  const groups = new Map<string, PayableBill[]>();
  
  bills.forEach((bill) => {
    const provider = bill.provider_name || 'Sem fornecedor';
    if (!groups.has(provider)) {
      groups.set(provider, []);
    }
    groups.get(provider)!.push(bill);
  });
  
  return groups;
}

/**
 * Agrupa contas por tipo
 */
export function groupByType(bills: PayableBill[]): Map<string, PayableBill[]> {
  const groups = new Map<string, PayableBill[]>();
  
  bills.forEach((bill) => {
    if (!groups.has(bill.bill_type)) {
      groups.set(bill.bill_type, []);
    }
    groups.get(bill.bill_type)!.push(bill);
  });
  
  return groups;
}

/**
 * Agrupa contas por mês de vencimento
 */
export function groupByMonth(bills: PayableBill[]): Map<string, PayableBill[]> {
  const groups = new Map<string, PayableBill[]>();
  
  bills.forEach((bill) => {
    const monthKey = format(parseISO(bill.due_date), 'yyyy-MM');
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)!.push(bill);
  });
  
  return groups;
}

// ============================================
// FORMATAÇÃO
// ============================================

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number): string {
  // Validar valor antes de formatar
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data padrão BR
 */
export function formatDate(date: string): string {
  return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: string): string {
  return format(parseISO(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

// ============================================
// MAPEAMENTO BILL_TYPE → CATEGORIA PADRÃO (FALLBACK)
// ============================================

/**
 * Mapeia bill_type (enum do banco) para nome de categoria do master-categories.ts
 * NOTA: Este é apenas um fallback. O sistema agora usa category_id diretamente.
 * Todas as contas existentes já foram migradas para usar category_id.
 */
export const BILL_TYPE_TO_CATEGORY: Record<string, string> = {
  'service': 'Contas de Consumo',
  'telecom': 'Assinaturas',
  'subscription': 'Assinaturas',
  'housing': 'Moradia',
  'education': 'Educação',
  'healthcare': 'Saúde',
  'insurance': 'Seguros',
  'loan': 'Empréstimo',
  'installment': 'Financiamento',
  'credit_card': 'Compras',
  'tax': 'Impostos',
  'food': 'Alimentação',
  'other': 'Outros',
};

/**
 * Retorna o nome da categoria para exibição (fallback quando não há category_id)
 * NOTA: Prefira usar getCategoryFromBill() que prioriza category_id
 */
export function getBillCategoryName(billType: string): string {
  return BILL_TYPE_TO_CATEGORY[billType] || billType;
}
