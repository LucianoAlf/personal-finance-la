import { Card, CardContent } from '@/components/ui/card';
import { CreditCardCard } from './CreditCardCard';
import { CreditCardSummary } from '@/types/database.types';
import { Plus, CreditCard as CreditCardIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditCardListProps {
  cards: CreditCardSummary[];
  loading?: boolean;
  onCardClick?: (card: CreditCardSummary) => void;
  onEdit?: (card: CreditCardSummary) => void;
  onArchive?: (card: CreditCardSummary) => void;
  onDelete?: (card: CreditCardSummary) => void;
  onViewDetails?: (card: CreditCardSummary) => void;
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
  onAddNew,
}: CreditCardListProps) {
  // Loading State
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-6 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty State
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <CreditCardIcon size={48} className="text-gray-400" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Nenhum cartão cadastrado
        </h3>
        <p className="text-gray-600 text-center max-w-md mb-6">
          Adicione seu primeiro cartão de crédito para começar a controlar suas despesas e faturas
        </p>
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Adicionar Cartão
          </button>
        )}
      </div>
    );
  }

  // Lista de Cartões
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <CreditCardCard
          key={card.id}
          card={card}
          onClick={() => onCardClick?.(card)}
          onEdit={() => onEdit?.(card)}
          onArchive={() => onArchive?.(card)}
          onDelete={() => onDelete?.(card)}
          onViewDetails={() => onViewDetails?.(card)}
        />
      ))}

      {/* Card "Adicionar Novo" */}
      {onAddNew && (
        <Card 
          className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group"
          onClick={onAddNew}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center mb-4 transition-colors">
              <Plus size={32} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Adicionar Cartão</h3>
            <p className="text-sm text-gray-600 text-center">
              Cadastre um novo cartão de crédito
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
