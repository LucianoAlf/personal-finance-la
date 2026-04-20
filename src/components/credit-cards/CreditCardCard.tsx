import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBankLogoClassForCard, getBankLogoPath } from '@/constants/banks';
import { CARD_BRANDS } from '@/constants/creditCards';
import { useAuth } from '@/hooks/useAuth';
import { CreditCardSummary } from '@/types/database.types';
import { calculateUsagePercentage } from '@/utils/creditCardUtils';
import { formatCurrency } from '@/utils/formatters';

import { CreditCardMenu } from './CreditCardMenu';

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

interface CreditCardCardProps {
  card: CreditCardSummary;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  onPayInvoice?: () => void;
}

export function CreditCardCard({
  card,
  onClick,
  onEdit,
  onArchive,
  onDelete,
  onViewDetails,
  onPayInvoice,
}: CreditCardCardProps) {
  const { profile } = useAuth();
  const usagePercentage = calculateUsagePercentage(card.used_limit, card.credit_limit);
  const bankLogo = getBankLogoPath(card.name);
  const bankLogoClass = getBankLogoClassForCard(card.name);
  const brandLogo = BRAND_LOGOS[card.brand];
  const cardholderName = profile?.full_name || card.name;

  const availableLimitClass =
    usagePercentage >= 90 ? 'text-danger' : usagePercentage >= 70 ? 'text-warning' : 'text-success';
  const progressClass =
    usagePercentage >= 90
      ? 'from-danger to-danger/80'
      : usagePercentage >= 70
        ? 'from-warning to-warning/80'
        : 'from-success to-success/80';

  return (
    <Card className="group overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)]">
      <div
        className="relative cursor-pointer overflow-hidden border-b border-black/10 px-4 pb-4 pt-4 text-white dark:border-white/5"
        style={{
          minHeight: '192px',
          background: card.color || '#8A05BE',
        }}
        onClick={onClick}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_35%,rgba(0,0,0,0.14)_100%)]" />

        <div className="relative flex h-full min-h-[172px] flex-col">
          <div className="flex items-start justify-between">
            {bankLogo ? (
              <img src={bankLogo} alt="Logo do banco" className={bankLogoClass} />
            ) : (
              <div className="text-xl font-semibold tracking-tight">{card.name}</div>
            )}

            <CreditCardMenu
              card={card}
              onEdit={onEdit || (() => {})}
              onArchive={onArchive || (() => {})}
              onDelete={onDelete || (() => {})}
              onViewInvoices={() => {}}
            />
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-white/94">
              <span className="block truncate">{cardholderName}</span>
            </div>

            {brandLogo ? (
              <img src={brandLogo} alt={CARD_BRANDS[card.brand].name} className="h-6 w-auto shrink-0" />
            ) : (
              <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-white/78">
                {CARD_BRANDS[card.brand].name}
              </span>
            )}
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.82rem] text-white/84">
              <span className="tracking-[0.16em]">****</span>
              <span className="tracking-[0.16em]">****</span>
              <span className="tracking-[0.16em]">****</span>
              <span className="tracking-[0.16em]">{card.last_four_digits}</span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/82 backdrop-blur-sm">
                  Credito
                </span>
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/82 backdrop-blur-sm">
                  Fecha {card.closing_day}
                </span>
                <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/82 backdrop-blur-sm">
                  Vence {card.due_day}
                </span>
              </div>

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <ContactlessIcon className="h-3.5 w-3.5 text-white/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 p-5">
        <div className="rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4">
          {card.current_invoice_amount !== undefined && card.current_invoice_amount > 0 ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">Fatura Atual</p>
              <h3 className="mt-1 text-[1.52rem] font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
                {formatCurrency(card.current_invoice_amount)}
              </h3>
              {card.current_due_date ? (
                <p className="mt-1 text-xs text-muted-foreground">Vence dia {card.due_day}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">Limite Utilizado</p>
              <h3 className="mt-1 text-[1.52rem] font-semibold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
                {formatCurrency(card.used_limit)}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{usagePercentage.toFixed(1)}% do limite</p>
            </>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Uso do limite</span>
            <span className="font-semibold text-foreground">{usagePercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-elevated">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${progressClass} transition-all`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(card.used_limit)} usado</span>
            <span>Limite: {formatCurrency(card.credit_limit)}</span>
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-muted-foreground">Limite Disponivel</p>
          <p
            className={`mt-1 text-[1.52rem] font-semibold tracking-tight [font-variant-numeric:tabular-nums] ${availableLimitClass}`}
          >
            {formatCurrency(card.available_limit)}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-border/70 bg-surface/75 hover:bg-surface-elevated"
            onClick={(event) => {
              event.stopPropagation();
              onViewDetails?.();
            }}
          >
            Ver Detalhes
          </Button>

          {card.current_invoice_amount && card.current_invoice_amount > 0 && onPayInvoice ? (
            <Button
              className="flex-1 rounded-xl border border-primary/25 bg-primary text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.22)] hover:bg-primary/90"
              onClick={(event) => {
                event.stopPropagation();
                onPayInvoice();
              }}
            >
              Pagar Fatura
            </Button>
          ) : null}
        </div>

        {/* Mobile-only: Editar + Arquivar (lg:hidden) */}
        <div className="flex gap-2 lg:hidden">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-border/70 bg-surface/75 text-sm hover:bg-surface-elevated"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.();
            }}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-destructive/30 bg-destructive/5 text-sm text-destructive hover:bg-destructive/10"
            onClick={(event) => {
              event.stopPropagation();
              onArchive?.();
            }}
          >
            Arquivar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
