import { 
  ShoppingCart, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MinusCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getInvoiceStatusInfo, 
  type DynamicInvoiceStatus 
} from '@/utils/creditCardUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InvoiceStatusBadgeProps {
  closingDate: Date | string;
  dueDate: Date | string;
  totalAmount: number;
  paidAmount: number;
  currentStatus: string;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

const STATUS_ICONS: Record<DynamicInvoiceStatus, React.ElementType> = {
  open: ShoppingCart,
  closed: Clock,
  due_soon: AlertTriangle,
  paid: CheckCircle,
  overdue: XCircle,
  partial: MinusCircle,
};

const STATUS_STYLES: Record<DynamicInvoiceStatus, string> = {
  open: 'bg-blue-100 text-blue-800 border-blue-300',
  closed: 'bg-orange-100 text-orange-800 border-orange-300',
  due_soon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  paid: 'bg-green-100 text-green-800 border-green-300',
  overdue: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-purple-100 text-purple-800 border-purple-300',
};

const SIZE_STYLES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const ICON_SIZES = {
  sm: 12,
  md: 14,
  lg: 16,
};

export function InvoiceStatusBadge({
  closingDate,
  dueDate,
  totalAmount,
  paidAmount,
  currentStatus,
  size = 'md',
  showDescription = false,
  className,
}: InvoiceStatusBadgeProps) {
  const statusInfo = getInvoiceStatusInfo(
    closingDate,
    dueDate,
    totalAmount,
    paidAmount,
    currentStatus
  );

  const Icon = STATUS_ICONS[statusInfo.status];

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        STATUS_STYLES[statusInfo.status],
        SIZE_STYLES[size],
        statusInfo.isUrgent && 'animate-pulse',
        className
      )}
    >
      <Icon size={ICON_SIZES[size]} />
      <span>{statusInfo.label}</span>
    </span>
  );

  if (showDescription) {
    return (
      <div className="flex flex-col gap-1">
        {badge}
        <span className="text-xs text-gray-500">{statusInfo.description}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{statusInfo.label}</p>
          <p className="text-xs text-gray-400">{statusInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Versão simplificada que aceita status diretamente (para compatibilidade)
interface SimpleStatusBadgeProps {
  status: DynamicInvoiceStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SimpleInvoiceStatusBadge({
  status,
  size = 'md',
  className,
}: SimpleStatusBadgeProps) {
  const normalizedStatus = (status as DynamicInvoiceStatus) || 'open';
  const Icon = STATUS_ICONS[normalizedStatus] || Clock;

  const labels: Record<string, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    due_soon: 'Vence em breve',
    paid: 'Paga',
    overdue: 'Vencida',
    partial: 'Parcial',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        STATUS_STYLES[normalizedStatus] || STATUS_STYLES.open,
        SIZE_STYLES[size],
        className
      )}
    >
      <Icon size={ICON_SIZES[size]} />
      <span>{labels[normalizedStatus] || status}</span>
    </span>
  );
}
