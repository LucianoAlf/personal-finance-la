import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertCircle, ChevronRight } from 'lucide-react';
import { useCreditCardsQuery } from '@/hooks/useCreditCardsQuery';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function CreditCardsWidget() {
  const navigate = useNavigate();
  const { cards, loading } = useCreditCardsQuery();

  const cardsSummary = (cards || []).map((card: any) => {
    const credit_limit = Number(card.credit_limit || 0);
    const available_limit = Number(card.available_limit || 0);
    const used_limit = Math.max(0, credit_limit - available_limit);
    const usage_percentage = credit_limit > 0 ? (used_limit / credit_limit) * 100 : 0;
    return {
      id: card.id,
      name: card.name,
      color: card.color || '#6366f1',
      credit_limit,
      available_limit,
      used_limit,
      usage_percentage,
      current_due_date: card.current_due_date,
      current_invoice_amount: Number(card.current_invoice_amount || 0),
    };
  });

  const showSkeleton = loading && cardsSummary.length === 0;

  if (showSkeleton) {
    return (
      <Card className="border-border/70 bg-surface/95 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Cartões de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-surface-elevated" />
            <div className="h-4 w-1/2 rounded bg-surface-elevated" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular totais
  const totalLimit = cardsSummary.reduce((sum, card) => sum + Number(card.credit_limit || 0), 0);
  const totalUsed = cardsSummary.reduce((sum, card) => sum + Number(card.used_limit || 0), 0);
  const totalAvailable = cardsSummary.reduce((sum, card) => sum + Number(card.available_limit || 0), 0);
  const usagePercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  // Faturas próximas do vencimento (próximos 7 dias)
  const upcomingInvoices = cardsSummary.filter(card => {
    if (!card.current_due_date) return false;
    const dueDate = new Date(card.current_due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Se não houver cartões
  if (cardsSummary.length === 0) {
    return (
      <Card className="border-border/70 bg-surface/95 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cartões de Crédito</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/cartoes')}
            >
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated/80">
            <CreditCard size={32} className="text-primary/80" />
          </div>
          <p className="mb-4 text-center text-sm text-foreground/80">
            Nenhum cartão cadastrado
          </p>
          <Button onClick={() => navigate('/cartoes')}>
            Cadastrar Cartão
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/70 bg-surface/95 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Cartões de Crédito
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/cartoes')}
              className="rounded-xl border border-border/70 bg-surface-elevated/70 text-foreground/80 hover:bg-surface-overlay hover:text-foreground"
            >
              Ver Todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo Geral */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-foreground/80">Limite Total</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(totalLimit)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-foreground/80">Disponível</p>
              <p className="text-lg font-bold text-emerald-300">
                {formatCurrency(totalAvailable)}
              </p>
            </div>
          </div>

          {/* Barra de Uso */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-foreground/80">Uso Total</span>
              <span className="font-semibold text-foreground">
                {usagePercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden bg-surface-overlay/80">
              <motion.div
                className={`h-2 rounded-full ${
                  usagePercentage > 80
                    ? 'bg-[linear-gradient(90deg,rgba(248,113,113,0.95),rgba(251,146,60,0.9))]'
                    : usagePercentage > 60
                    ? 'bg-[linear-gradient(90deg,rgba(250,204,21,0.95),rgba(251,146,60,0.88))]'
                    : 'bg-[linear-gradient(90deg,rgba(96,165,250,0.95),rgba(139,92,246,0.88))]'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, usagePercentage)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1 text-xs text-foreground/75">
              {formatCurrency(totalUsed)} de {formatCurrency(totalLimit)}
            </p>
          </div>

          {/* Alertas de Faturas */}
          {upcomingInvoices.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-surface-elevated/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {upcomingInvoices.length} fatura{upcomingInvoices.length > 1 ? 's' : ''} próxima
                    {upcomingInvoices.length > 1 ? 's' : ''} do vencimento
                  </p>
                  <div className="mt-2 space-y-1">
                    {upcomingInvoices.slice(0, 2).map((card) => (
                      <div key={card.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground/80">{card.name}</span>
                        <span className="font-medium text-amber-200">
                          {formatCurrency(card.current_invoice_amount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Cartões */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/70">
              {cardsSummary.length} Cartão{cardsSummary.length > 1 ? 'es' : ''}
            </p>
            {cardsSummary.slice(0, 3).map((card) => {
              const cardUsage = card.usage_percentage || 0;

              return (
                <div
                  key={card.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-transparent bg-surface-elevated/60 p-3 transition-colors hover:border-border/70 hover:bg-surface-elevated/85"
                  onClick={() => navigate('/cartoes')}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/5"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCard
                        className="h-5 w-5"
                        style={{ color: card.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {card.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 rounded-full h-1 bg-surface-overlay/80">
                          <div
                            className={`h-1 rounded-full ${
                              cardUsage > 80
                                ? 'bg-red-500'
                                : cardUsage > 60
                                ? 'bg-yellow-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, cardUsage)}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-xs text-foreground/70">
                          {cardUsage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(card.used_limit || 0)}
                    </p>
                    <p className="text-xs text-foreground/75">
                      de {formatCurrency(card.credit_limit || 0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Ver Mais */}
          {cardsSummary.length > 3 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/cartoes')}
            >
              Ver mais {cardsSummary.length - 3} cartão
              {cardsSummary.length - 3 > 1 ? 'es' : ''}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
