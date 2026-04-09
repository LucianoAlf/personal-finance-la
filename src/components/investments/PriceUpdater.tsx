import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PriceUpdaterProps {
  onRefresh: () => Promise<void>;
  lastUpdate: Date | null;
  loading?: boolean;
  className?: string;
}

export function PriceUpdater({
  onRefresh,
  lastUpdate,
  loading = false,
  className,
}: PriceUpdaterProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await onRefresh();
      toast({
        title: 'Cotações atualizadas',
        description: 'Preços atualizados com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'agora há pouco';

    try {
      return formatDistanceToNow(lastUpdate, {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'agora há pouco';
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}>
      <span className="text-sm text-muted-foreground">Atualizado {formatLastUpdate()}</span>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={loading || isRefreshing}
        className="gap-2 rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Atualizando...' : 'Atualizar Cotações'}
      </Button>
    </div>
  );
}
