import { CreditCard as CreditCardIcon, Plus } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCardSummary } from '@/types/database.types';

import { CreditCardCard } from './CreditCardCard';

interface CreditCardListProps {
  cards: CreditCardSummary[];
  loading?: boolean;
  onCardClick?: (card: CreditCardSummary) => void;
  onEdit?: (card: CreditCardSummary) => void;
  onArchive?: (card: CreditCardSummary) => void;
  onDelete?: (card: CreditCardSummary) => void;
  onViewDetails?: (card: CreditCardSummary) => void;
  onPayInvoice?: (card: CreditCardSummary) => void;
  onAddNew?: () => void;
}

export function CreditCardList({
  cards,
  loading,
  onCardClick,
  onEdit,
  onArchive,
  onDelete,
  onViewDetails,
  onPayInvoice,
  onAddNew,
}: CreditCardListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3].map((item) => (
          <Card key={item} className="overflow-hidden rounded-[28px] border border-border/70 bg-card/95">
            <Skeleton className="h-48 w-full bg-surface-elevated" />
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-3/4 bg-surface-elevated" />
              <Skeleton className="h-4 w-full bg-surface-elevated/80" />
              <Skeleton className="h-2 w-full bg-surface-elevated/80" />
              <Skeleton className="h-6 w-1/2 bg-surface-elevated" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[30px] border border-dashed border-border/70 bg-card/85 px-6 py-16 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.9rem] bg-surface-elevated ring-1 ring-border/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <CreditCardIcon size={40} className="text-primary/75" />
        </div>
        <h3 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">Nenhum cartao cadastrado</h3>
        <p className="mb-6 max-w-md text-muted-foreground">
          Adicione seu primeiro cartao de credito para comecar a controlar suas despesas e faturas
        </p>
        {onAddNew ? (
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary px-6 py-3 font-medium text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] transition-colors hover:bg-primary/90"
          >
            <Plus size={20} />
            Adicionar Cartao
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <CreditCardCard
          key={card.id}
          card={card}
          onClick={() => onCardClick?.(card)}
          onEdit={() => onEdit?.(card)}
          onArchive={() => onArchive?.(card)}
          onDelete={() => onDelete?.(card)}
          onViewDetails={() => onViewDetails?.(card)}
          onPayInvoice={() => onPayInvoice?.(card)}
        />
      ))}

      {onAddNew ? (
        <Card
          className="group cursor-pointer rounded-[28px] border-2 border-dashed border-border/70 bg-card/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/90"
          onClick={onAddNew}
        >
          <CardContent className="flex h-full min-h-[400px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.8rem] border border-border/70 bg-surface-elevated transition-colors group-hover:bg-surface-overlay">
              <Plus size={34} className="text-primary/80 transition-colors group-hover:text-primary" />
            </div>
            <h3 className="mb-1 text-xl font-semibold tracking-tight text-foreground">Adicionar Cartao</h3>
            <p className="text-sm text-muted-foreground">Cadastre um novo cartao de credito</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
