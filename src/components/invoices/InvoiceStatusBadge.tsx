import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MinusCircle,
  ShoppingCart,
  XCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { getInvoiceStatusInfo, type DynamicInvoiceStatus } from '@/utils/creditCardUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  open: 'border-info/25 bg-info/12 text-info',
  closed: 'border-warning/25 bg-warning/12 text-warning',
  due_soon: 'border-warning/30 bg-warning/14 text-warning',
  paid: 'border-success/25 bg-success/12 text-success',
  overdue: 'border-danger/30 bg-danger/12 text-danger',
  partial: 'border-primary/25 bg-primary/12 text-primary',
};

const SIZE_STYLES = {
  sm: 'gap-1 px-2.5 py-1 text-[11px]',
  md: 'gap-1.5 px-3 py-1.5 text-xs',
  lg: 'gap-2 px-3.5 py-2 text-sm',
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
    currentStatus,
  );

  const Icon = STATUS_ICONS[statusInfo.status];

  const badge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold tracking-[0.02em] backdrop-blur-sm',
        STATUS_STYLES[statusInfo.status],
        SIZE_STYLES[size],
        statusInfo.isUrgent && 'shadow-[0_0_0_1px_rgba(239,68,68,0.1)]',
        className,
      )}
    >
      <Icon size={ICON_SIZES[size]} />
      <span>{statusInfo.label}</span>
    </span>
  );

  if (showDescription) {
    return (
      <div className="flex flex-col gap-1.5">
        {badge}
        <span className="text-xs leading-5 text-muted-foreground">{statusInfo.description}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="border border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur-xl">
          <p className="font-semibold">{statusInfo.label}</p>
          <p className="text-xs text-muted-foreground">{statusInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
        'inline-flex items-center rounded-full border font-semibold tracking-[0.02em] backdrop-blur-sm',
        STATUS_STYLES[normalizedStatus] || STATUS_STYLES.open,
        SIZE_STYLES[size],
        className,
      )}
    >
      <Icon size={ICON_SIZES[size]} />
      <span>{labels[normalizedStatus] || status}</span>
    </span>
  );
}
