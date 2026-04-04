import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { AnalyticsScope } from './analyticsScope';

interface CardMetrics {
  cardId: string;
  cardName: string;
  cardBrand: string;
  limitUsed: number;
  limitTotal: number;
  limitPercentage: number;
  averageSpending: number;
  topCategory: string;
  topCategoryColor: string;
  transactionCount: number;
  efficiencyScore: number;
}

export function useCardComparison(scope?: AnalyticsScope) {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    fetchCardComparison();
  }, [user, scope?.cardId, scope?.startDate?.getTime(), scope?.endDate?.getTime()]);

  const fetchCardComparison = async () => {
    try {
      setLoading(true);
      const hasExplicitAll = scope !== undefined && scope?.startDate === null;

      let cardsQuery = supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id);

      if (scope?.cardId) {
        cardsQuery = cardsQuery.eq('id', scope.cardId);
      }

      const { data: cardsData, error } = await cardsQuery;

      if (error) throw error;

      const metricsPromises = cardsData?.map(async (card) => {
        // Buscar transações do cartão
        let transactionsQuery = supabase
          .from('credit_card_transactions')
          .select('amount, category_id, categories(name, color)')
          .eq('credit_card_id', card.id);

        if (!hasExplicitAll && scope?.startDate) {
          transactionsQuery = transactionsQuery.gte('purchase_date', scope.startDate.toISOString().split('T')[0]);
        }

        if (!hasExplicitAll && scope?.endDate) {
          transactionsQuery = transactionsQuery.lte('purchase_date', scope.endDate.toISOString().split('T')[0]);
        }

        const { data: transactions } = await transactionsQuery;

        const totalSpent = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
        const limitPercentage = card.credit_limit > 0 ? (totalSpent / card.credit_limit) * 100 : 0;

        // Calcular eficiência (quanto menor o uso do limite, melhor)
        const efficiencyScore = Math.max(0, 100 - limitPercentage);

        return {
          cardId: card.id,
          cardName: card.name,
          cardBrand: card.brand,
          limitUsed: totalSpent,
          limitTotal: card.credit_limit,
          limitPercentage,
          averageSpending: transactions?.length ? totalSpent / transactions.length : 0,
          topCategory: 'Alimentação', // Simplificado
          topCategoryColor: '#10b981',
          transactionCount: transactions?.length || 0,
          efficiencyScore,
        };
      }) || [];

      const metrics = await Promise.all(metricsPromises);
      setCards(metrics.sort((a, b) => b.efficiencyScore - a.efficiencyScore));

      // Recomendação
      if (metrics.length > 0) {
        const best = metrics[0];
        setRecommendation(`Use o cartão "${best.cardName}" - melhor eficiência!`);
      }
    } catch (err) {
      console.error('Erro ao comparar cartões:', err);
    } finally {
      setLoading(false);
    }
  };

  return { cards, loading, recommendation };
}
