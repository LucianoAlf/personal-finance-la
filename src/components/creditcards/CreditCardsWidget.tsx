import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { useCreditCards } from '@/hooks/useCreditCards';
import { formatCurrency } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function CreditCardsWidget() {
  const navigate = useNavigate();
  const { cardsSummary, loading } = useCreditCards();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cartões de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
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
      <Card>
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
          <CreditCard size={48} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 text-center mb-4">
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cartões de Crédito
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/cartoes')}
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
              <p className="text-xs text-gray-500">Limite Total</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(totalLimit)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Disponível</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(totalAvailable)}
              </p>
            </div>
          </div>

          {/* Barra de Uso */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Uso Total</span>
              <span className="font-semibold text-gray-900">
                {usagePercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-2 rounded-full ${
                  usagePercentage > 80
                    ? 'bg-red-500'
                    : usagePercentage > 60
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, usagePercentage)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(totalUsed)} de {formatCurrency(totalLimit)}
            </p>
          </div>

          {/* Alertas de Faturas */}
          {upcomingInvoices.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    {upcomingInvoices.length} fatura{upcomingInvoices.length > 1 ? 's' : ''} próxima
                    {upcomingInvoices.length > 1 ? 's' : ''} do vencimento
                  </p>
                  <div className="mt-2 space-y-1">
                    {upcomingInvoices.slice(0, 2).map((card) => (
                      <div key={card.id} className="flex items-center justify-between text-xs">
                        <span className="text-yellow-700">{card.name}</span>
                        <span className="font-medium text-yellow-800">
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
            <p className="text-xs font-medium text-gray-500 uppercase">
              {cardsSummary.length} Cartão{cardsSummary.length > 1 ? 'es' : ''}
            </p>
            {cardsSummary.slice(0, 3).map((card) => {
              const cardUsage = card.usage_percentage || 0;

              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/cartoes')}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCard
                        className="h-5 w-5"
                        style={{ color: card.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {card.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
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
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {cardUsage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(card.used_limit || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
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
