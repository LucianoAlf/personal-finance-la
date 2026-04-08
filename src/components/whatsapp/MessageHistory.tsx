/**
 * Component: MessageHistory
 * Responsabilidade: Histórico de mensagens WhatsApp
 * 
 * Features:
 * - Lista de mensagens (últimas 50)
 * - Filtros (tipo, direção, status)
 * - Scroll infinito
 * - Busca
 */

import { useState } from 'react';
import { MessageCircle, ArrowRight, ArrowLeft, Clock, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import {
  MESSAGE_TYPE_LABELS,
  DIRECTION_LABELS,
  PROCESSING_STATUS_LABELS,
  INTENT_LABELS,
} from '@/types/whatsapp.types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function MessageHistory() {
  const { messages, isLoading, hasMore, loadMore, setFilters } = useWhatsAppMessages();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredMessages = messages.filter((msg) =>
    msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? (
      <ArrowLeft className="h-4 w-4 text-blue-500" />
    ) : (
      <ArrowRight className="h-4 w-4 text-purple-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Histórico de Mensagens
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Select onValueChange={(value) => setFilters({ direction: value as any })}>
              <SelectTrigger>
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">Recebidas</SelectItem>
                <SelectItem value="outbound">Enviadas</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setFilters({ status: value as any })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => setFilters({ intent: value as any })}>
              <SelectTrigger>
                <SelectValue placeholder="Intenção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transaction">Transação</SelectItem>
                <SelectItem value="quick_command">Comando</SelectItem>
                <SelectItem value="conversation">Conversa</SelectItem>
                <SelectItem value="help">Ajuda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading && messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem ainda'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 p-3 rounded-lg border',
                  message.direction === 'inbound'
                    ? 'bg-blue-500/5 border-blue-500/20'
                    : 'bg-purple-500/5 border-purple-500/20'
                )}
              >
                {/* Direction Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getDirectionIcon(message.direction)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {MESSAGE_TYPE_LABELS[message.message_type]}
                      </Badge>
                      {message.intent && (
                        <Badge variant="secondary" className="text-xs">
                          {INTENT_LABELS[message.intent]}
                        </Badge>
                      )}
                      {message.intent === 'quick_command' &&
                        typeof message.metadata?.command === 'string' &&
                        message.metadata.command.trim() !== '' && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {message.metadata.command}
                          </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(message.received_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  {message.content && (
                    <p className="text-sm text-foreground line-clamp-2 mb-2">
                      {message.content}
                    </p>
                  )}

                  {message.response_text && (
                    <p className="text-sm text-muted-foreground italic line-clamp-2 mb-2">
                      → {message.response_text}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    {getStatusIcon(message.processing_status)}
                    <span className="text-xs text-muted-foreground">
                      {PROCESSING_STATUS_LABELS[message.processing_status]}
                    </span>
                    {message.error_message && (
                      <Badge variant="destructive" className="text-xs">
                        Erro
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                  {isLoading ? 'Carregando...' : 'Carregar Mais'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
