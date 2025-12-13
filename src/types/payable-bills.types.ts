// ============================================
// TIPOS: Contas a Pagar
// ============================================

export type BillStatus = 'pending' | 'overdue' | 'paid' | 'partial' | 'cancelled' | 'scheduled';

export type BillType = 
  | 'service'      // Água, luz, gás
  | 'telecom'      // Internet, telefone
  | 'subscription' // Netflix, Spotify
  | 'housing'      // Aluguel, condomínio
  | 'education'    // Escola, curso
  | 'healthcare'   // Plano de saúde
  | 'insurance'    // Seguros
  | 'loan'         // Empréstimos pessoais (dinheiro emprestado)
  | 'installment'  // Parcelamentos/Financiamentos (compras parceladas)
  | 'credit_card'  // Cartão terceiros
  | 'tax'          // IPTU, IPVA
  | 'food'         // Alimentação
  | 'other';

export type PaymentMethod = 
  | 'pix'
  | 'bank_transfer'
  | 'debit_card'
  | 'credit_card'
  | 'cash'
  | 'automatic_debit'
  | 'bank_slip'
  | 'other';

export type RecurrenceFrequency = 
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type ReminderType = 'app' | 'email' | 'whatsapp' | 'push' | 'sms';

export type ReminderChannel = 'push' | 'email' | 'whatsapp';

export type ReminderDeliveryStatus = 'pending' | 'sent' | 'failed' | 'read' | 'clicked';

// ============================================
// INTERFACES
// ============================================

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  day: number; // 1-31
  end_date?: string; // ISO date ou null
  auto_adjust_amount?: boolean;
  last_generated?: string; // ISO date
}

export interface BillReminderConfig {
  id?: string;
  days_before: number;
  time: string; // "HH:MM" formato 24h
  channels: ReminderChannel[];
  enabled: boolean;
}

export interface PayableBill {
  id: string;
  user_id: string;
  
  // Dados Básicos
  description: string;
  amount: number;
  due_date: string; // ISO date
  
  // Classificação
  bill_type: BillType;
  provider_name?: string;
  category_id?: string;
  
  // Status
  status: BillStatus;
  paid_at?: string; // ISO timestamp
  paid_amount?: number;
  
  // Pagamento
  payment_account_id?: string;
  payment_method?: PaymentMethod;
  barcode?: string;
  qr_code_pix?: string;
  reference_number?: string;
  bill_document_url?: string;
  payment_proof_url?: string;
  
  // Recorrência
  is_recurring: boolean;
  recurrence_config?: RecurrenceConfig;
  parent_bill_id?: string;
  next_occurrence_date?: string; // ISO date
  
  // Parcelamento
  is_installment: boolean;
  installment_number?: number;
  installment_total?: number;
  installment_group_id?: string;
  original_purchase_amount?: number;
  credit_card_id?: string; // ID do cartão (para parcelamentos no cartão)
  
  // Lembretes
  reminder_enabled: boolean;
  reminder_days_before: number;
  reminder_channels: string[];
  reminders?: BillReminderConfig[]; // Lembretes avançados
  last_reminder_sent_at?: string; // ISO timestamp
  
  // Outros
  priority: Priority;
  tags?: string[];
  notes?: string;
  
  // Auditoria
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface BillPaymentHistory {
  id: string;
  bill_id: string;
  user_id: string;
  payment_date: string; // ISO timestamp
  amount_paid: number;
  payment_method: PaymentMethod;
  account_from_id?: string;
  confirmation_number?: string;
  payment_proof_url?: string;
  notes?: string;
  created_at: string; // ISO timestamp
}

export interface BillReminder {
  id: string;
  bill_id: string;
  user_id: string;
  reminder_date: string; // ISO date
  reminder_time: string; // HH:MM:SS
  reminder_type: ReminderType;
  sent_at?: string; // ISO timestamp
  delivery_status: ReminderDeliveryStatus;
  error_message?: string;
  created_at: string; // ISO timestamp
}

// ============================================
// INPUTS (para criação/edição)
// ============================================

export interface CreateBillInput {
  description: string;
  amount: number;
  due_date: string; // ISO date
  bill_type: BillType;
  provider_name?: string;
  category_id?: string;
  payment_account_id?: string;
  payment_method?: PaymentMethod;
  barcode?: string;
  qr_code_pix?: string;
  reference_number?: string;
  is_recurring?: boolean;
  recurrence_config?: RecurrenceConfig;
  is_installment?: boolean;
  installment_total?: number;
  installment_group_id?: string;
  original_purchase_amount?: number;
  reminder_enabled?: boolean;
  reminder_days_before?: number;
  reminder_channels?: string[];
  reminders?: BillReminderConfig[]; // Lembretes avançados
  priority?: Priority;
  tags?: string[];
  notes?: string;
}

export interface UpdateBillInput extends Partial<CreateBillInput> {
  status?: BillStatus;
}

export interface MarkBillAsPaidInput {
  bill_id: string;
  paid_amount: number;
  payment_method: PaymentMethod;
  account_from_id?: string;
  confirmation_number?: string;
  payment_proof_url?: string;
  notes?: string;
}

// ============================================
// FILTROS
// ============================================

export interface BillFilters {
  status?: BillStatus | BillStatus[];
  bill_type?: BillType | BillType[];
  provider_name?: string;
  priority?: Priority | Priority[];
  is_recurring?: boolean;
  is_installment?: boolean;
  due_date_from?: string; // ISO date
  due_date_to?: string; // ISO date
  search?: string; // Busca em description/provider
}

// ============================================
// RESUMOS E ANALYTICS
// ============================================

export interface BillsSummary {
  month_date: string;
  total_bills: number;
  pending_count: number;
  overdue_count: number;
  paid_count: number;
  partial_count: number;
  total_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  remaining_amount: number;
  critical_pending: number;
  high_pending: number;
  next_due_date?: string;
  last_payment_date?: string;
}

export interface BillAnalytics {
  period: {
    start_date: string;
    end_date: string;
  };
  totals: {
    total_bills: number;
    paid_count: number;
    overdue_count: number;
    total_amount: number;
    paid_amount: number;
    overdue_amount: number;
  };
  performance: {
    on_time_payment_rate: number; // Percentual 0-100
    avg_delay_days: number;
  };
  by_type: Record<BillType, { count: number; total: number }>;
}

// ============================================
// HELPERS
// ============================================

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  service: 'Serviços (Água, Luz, Gás)',
  telecom: 'Telecomunicações',
  subscription: 'Assinaturas',
  housing: 'Moradia',
  education: 'Educação',
  healthcare: 'Saúde',
  insurance: 'Seguros',
  loan: 'Empréstimos',
  installment: 'Parcelamentos',
  credit_card: 'Cartão de Crédito',
  tax: 'Impostos e Taxas',
  food: 'Alimentação',
  other: 'Outros',
};

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  pending: 'Pendente',
  overdue: 'Vencida',
  paid: 'Paga',
  partial: 'Paga Parcialmente',
  cancelled: 'Cancelada',
  scheduled: 'Agendada',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  bank_transfer: 'Transferência Bancária',
  debit_card: 'Cartão de Débito',
  credit_card: 'Cartão de Crédito',
  cash: 'Dinheiro',
  automatic_debit: 'Débito Automático',
  bank_slip: 'Boleto Bancário',
  other: 'Outro',
};
