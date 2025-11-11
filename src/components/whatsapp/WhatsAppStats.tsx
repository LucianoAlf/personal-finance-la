/**
 * Component: WhatsAppStats
 * Responsabilidade: Dashboard de estatísticas WhatsApp
 * 
 * Features:
 * - Cards de métricas
 * - Taxa de sucesso
 * - Comando mais usado
 * - Última mensagem
 */

import { TrendingUp, MessageCircle, CheckCircle2, Command } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WhatsAppStats() {
  const { stats, isLoading } = useWhatsAppMessages();

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total de Mensagens',
      value: stats.totalMessages.toString(),
      description: `${stats.totalSent} enviadas, ${stats.totalReceived} recebidas`,
      icon: MessageCircle,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Taxa de Sucesso',
      value: `${stats.successRate.toFixed(1)}%`,
      description: `${stats.failedCount} falhas, ${stats.pendingCount} pendentes`,
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Comando Mais Usado',
      value: stats.mostUsedCommand || 'Nenhum',
      description: 'Comando mais popular',
      icon: Command,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Última Mensagem',
      value: stats.lastMessageAt
        ? formatDistanceToNow(stats.lastMessageAt, {
            addSuffix: true,
            locale: ptBR,
          })
        : 'Nunca',
      description: 'Última atividade',
      icon: TrendingUp,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
