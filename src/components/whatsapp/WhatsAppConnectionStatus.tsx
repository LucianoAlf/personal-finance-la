/**
 * Component: WhatsAppConnectionStatus
 * Responsabilidade: Badge de status WhatsApp no header
 * 
 * Features:
 * - Badge visual (conectado/desconectado)
 * - Tooltip com informações
 * - Click para abrir configurações
 */

import { MessageCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function WhatsAppConnectionStatus() {
  const { connection, isConnected, isLoading } = useWhatsAppConnection();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/settings?tab=integrations');
  };

  if (isLoading) {
    return (
      <Badge variant="outline" className="cursor-pointer gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Carregando...</span>
      </Badge>
    );
  }

  if (!connection) return null;

  const statusConfig = isConnected
    ? {
        icon: CheckCircle,
        text: 'Conectado',
        variant: 'default' as const,
        className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
        tooltip: `WhatsApp conectado\nNúmero: ${connection.phone_number || 'Não configurado'}`,
      }
    : {
        icon: XCircle,
        text: 'Desconectado',
        variant: 'outline' as const,
        className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
        tooltip: 'WhatsApp desconectado\nClique para configurar',
      };

  const Icon = statusConfig.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={statusConfig.variant}
            className={cn(
              'cursor-pointer gap-1.5 transition-all hover:scale-105',
              statusConfig.className
            )}
            onClick={handleClick}
          >
            <MessageCircle className="h-3 w-3" />
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">{statusConfig.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center whitespace-pre-line text-xs">
            {statusConfig.tooltip}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
