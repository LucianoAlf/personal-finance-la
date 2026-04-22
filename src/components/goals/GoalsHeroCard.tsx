import { Flame, PiggyBank, Shield, TrendingUp, Trophy } from 'lucide-react';

interface GoalsHeroCardProps {
  monthLabel: string;
  savingsCurrent: number;
  savingsTarget: number;
  spendingLimitsOk: number;
  spendingLimitsTotal: number;
  investmentsCurrent: number;
  investmentsTarget: number;
  streakDays: number;
  formatCurrency: (value: number) => string;
}

export function GoalsHeroCard({
  monthLabel,
  savingsCurrent,
  savingsTarget,
  spendingLimitsOk,
  spendingLimitsTotal,
  investmentsCurrent,
  investmentsTarget,
  streakDays,
  formatCurrency,
}: GoalsHeroCardProps) {
  return (
    <section
      aria-label="Resumo de metas"
      className="relative lg:hidden mx-2 mt-4 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#1a1a2e] via-[#1a1f3a] to-[#16213e] p-5 text-foreground shadow-[0_18px_44px_rgba(15,23,42,0.45)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/25 to-transparent blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">Suas Metas</h2>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_10px_24px_rgba(79,70,229,0.4)]">
          <Trophy className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
      </div>

      <dl className="relative mt-4 space-y-2 border-t border-white/[0.08] pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><PiggyBank className="h-3.5 w-3.5" aria-hidden="true" /> Economia</dt>
          <dd className="font-bold text-foreground [font-variant-numeric:tabular-nums]">
            {formatCurrency(savingsCurrent)} / {formatCurrency(savingsTarget)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Shield className="h-3.5 w-3.5" aria-hidden="true" /> Limites</dt>
          <dd className="font-bold text-foreground">
            {spendingLimitsOk} / {spendingLimitsTotal} OK
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Investimentos</dt>
          <dd className="font-bold text-foreground [font-variant-numeric:tabular-nums]">
            {formatCurrency(investmentsCurrent)} / {formatCurrency(investmentsTarget)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="inline-flex items-center gap-1.5 text-muted-foreground"><Flame className="h-3.5 w-3.5" aria-hidden="true" /> Streak</dt>
          <dd className="font-bold text-foreground">{streakDays} dias</dd>
        </div>
      </dl>
    </section>
  );
}
