import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CARD_BRANDS } from '@/constants/creditCards';
import { getBankLogoClassForDetails, getBankLogoPath } from '@/constants/banks';
import { CreditCardSummary } from '@/types/database.types';
import { calculateUsagePercentage, getUsageColor } from '@/utils/creditCardUtils';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  CreditCard as CreditCardIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const BRAND_LOGOS: Record<string, string> = {
  mastercard: '/logos/banks/mastercard.svg',
};

function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8.5 14.5c2-2 5-2 7 0" />
      <path d="M5.5 11.5c4-4 9-4 13 0" />
      <path d="M2.5 8.5c6-6 13-6 19 0" />
    </svg>
  );
}

function ChipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 36" className={className}>
      <rect x="2" y="2" width="44" height="32" rx="4" fill="#D4AF37" stroke="#B8960C" strokeWidth="1" />
      <rect x="8" y="8" width="12" height="8" fill="#C5A028" />
      <rect x="8" y="20" width="12" height="8" fill="#C5A028" />
      <rect x="24" y="8" width="16" height="20" fill="#E8C547" opacity="0.6" />
      <line x1="8" y1="18" x2="40" y2="18" stroke="#B8960C" strokeWidth="1" />
    </svg>
  );
}

interface CreditCardDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCardSummary;
}

const usageToneClasses = {
  green: {
    panel: 'border-success/20 bg-success/10',
    icon: 'text-success',
    value: 'text-success',
    track: 'bg-success/15',
    bar: 'from-success to-emerald-400',
  },
  yellow: {
    panel: 'border-warning/25 bg-warning/10',
    icon: 'text-warning',
    value: 'text-warning',
    track: 'bg-warning/15',
    bar: 'from-warning to-amber-400',
  },
  orange: {
    panel: 'border-warning/25 bg-warning/10',
    icon: 'text-warning',
    value: 'text-warning',
    track: 'bg-warning/15',
    bar: 'from-warning to-orange-400',
  },
  red: {
    panel: 'border-danger/20 bg-danger/10',
    icon: 'text-danger',
    value: 'text-danger',
    track: 'bg-danger/15',
    bar: 'from-danger to-rose-400',
  },
} as const;

export function CreditCardDetailsDialog({
  open,
  onOpenChange,
  card,
}: CreditCardDetailsDialogProps) {
  const usagePercentage =
    typeof card.usage_percentage === 'number'
      ? card.usage_percentage
      : calculateUsagePercentage(card.used_limit, card.credit_limit);
  const usageColor = getUsageColor(usagePercentage);
  const brand = CARD_BRANDS[card.brand];
  const usageTone = usageToneClasses[usageColor];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="flex items-center gap-3 text-[1.65rem] font-semibold tracking-tight text-foreground">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <CreditCardIcon size={20} />
            </span>
            Detalhes do Cartao
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div
            className="relative overflow-hidden rounded-[28px] border border-white/10 p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.34)]"
            style={{
              background: `linear-gradient(145deg, ${card.color || '#8A05BE'} 0%, ${card.color || '#8A05BE'}dd 55%, rgba(15,23,42,0.92) 140%)`,
              aspectRatio: '1.586 / 1',
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_40%)]" />

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                {getBankLogoPath(card.name) ? (
                  <img
                    src={getBankLogoPath(card.name)!}
                    alt="Logo do banco"
                    className={getBankLogoClassForDetails(card.name)}
                  />
                ) : (
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
                    {card.issuing_bank || 'Credito'}
                  </span>
                )}

                {BRAND_LOGOS[card.brand] ? (
                  <img src={BRAND_LOGOS[card.brand]} alt={brand?.name} className="h-8 w-auto" />
                ) : (
                  <span className="text-sm font-medium uppercase tracking-[0.12em] text-white/75">
                    {brand?.name}
                  </span>
                )}
              </div>

              <div className="relative ml-auto mr-2 w-fit rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-sm">
                <ChipIcon className="h-10 w-14" />
              </div>

              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="mb-2 text-lg font-semibold text-white">{card.name}</p>
                  <p className="mb-4 text-sm font-mono tracking-[0.32em] text-white/80">
                    **** **** **** {card.last_four_digits}
                  </p>
                  <div className="flex gap-6 text-xs text-white/68">
                    <div>
                      <p className="mb-1 uppercase tracking-[0.16em]">Vencimento</p>
                      <p className="text-sm font-semibold text-white">Dia {card.due_day}</p>
                    </div>
                    <div>
                      <p className="mb-1 uppercase tracking-[0.16em]">Fechamento</p>
                      <p className="text-sm font-semibold text-white">Dia {card.closing_day}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="uppercase tracking-[0.14em]">Credito</span>
                  <ContactlessIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-surface-elevated/55 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet size={16} className="text-primary" />
                Limite Total
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">
                {formatCurrency(card.credit_limit)}
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-surface-elevated/55 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp size={16} className="text-primary" />
                Limite Usado
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">
                {formatCurrency(card.used_limit)}
              </div>
            </div>
          </div>

          <div className={`rounded-[26px] border p-5 shadow-sm ${usageTone.panel}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertCircle size={16} className={usageTone.icon} />
                Limite Disponivel
              </div>
              <Badge
                variant={usageColor === 'red' ? 'danger' : usageColor === 'orange' ? 'warning' : 'success'}
                className="rounded-full"
              >
                {usagePercentage}% usado
              </Badge>
            </div>

            <div className={`mb-4 text-3xl font-semibold tracking-tight ${usageTone.value}`}>
              {formatCurrency(card.available_limit)}
            </div>

            <div className={`h-2.5 overflow-hidden rounded-full ${usageTone.track}`}>
              <div
                className={`h-full rounded-full bg-gradient-to-r ${usageTone.bar} transition-all`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>

          <div className="rounded-[26px] border border-info/20 bg-info/10 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar size={16} className="text-info" />
              Datas Importantes
            </div>

            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-[20px] border border-info/15 bg-card/60 p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.16em] text-info">Melhor dia para compras</p>
                <p className="font-semibold text-foreground">Logo apos o dia {card.closing_day}</p>
              </div>

              <div className="rounded-[20px] border border-info/15 bg-card/60 p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.16em] text-info">Proximo vencimento</p>
                <p className="font-semibold text-foreground">Dia {card.due_day} do mes</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-surface-elevated/45 p-5 text-sm shadow-sm">
            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Criado em:</span>{' '}
                {format(new Date(card.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              {card.updated_at && (
                <p>
                  <span className="font-medium text-foreground">Ultima atualizacao:</span>{' '}
                  {format(new Date(card.updated_at), "dd 'de' MMMM 'de' yyyy 'as' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
