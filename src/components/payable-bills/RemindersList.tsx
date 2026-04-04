import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Mail, MessageCircle, CheckCircle2, Clock, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  reminder_date: string;
  reminder_time: string;
  days_before: number;
  channel: 'push' | 'email' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  error_message: string | null;
  retry_count: number;
}

interface RemindersListProps {
  billId: string;
  userId: string;
}

export function RemindersList({ billId, userId }: RemindersListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('bill_reminders')
        .select('*')
        .eq('bill_id', billId)
        .eq('user_id', userId)
        .order('reminder_date', { ascending: true })
        .order('channel', { ascending: true });

      if (error) throw error;

      setReminders(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar lembretes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchReminders, 30000);

    return () => clearInterval(interval);
  }, [billId, userId]);

  const handleRetry = async (reminderId: string) => {
    try {
      setRetrying(reminderId);

      // Resetar o lembrete para ser reenviado
      const { error } = await supabase
        .from('bill_reminders')
        .update({
          status: 'pending',
          retry_count: 0,
          error_message: null
        })
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Lembrete reenviado para fila de envio');
      fetchReminders();
    } catch (error: any) {
      console.error('Erro ao reenviar:', error);
      toast.error('Erro ao reenviar lembrete');
    } finally {
      setRetrying(null);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'push':
        return <Bell className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'push':
        return 'Push';
      case 'email':
        return 'Email';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return channel;
    }
  };

  const getStatusBadge = (reminder: Reminder) => {
    switch (reminder.status) {
      case 'sent':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Enviado {reminder.sent_at && format(new Date(reminder.sent_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falhou{reminder.retry_count > 0 && ` (${reminder.retry_count} tentativas)`}
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum lembrete configurado para esta conta</p>
        </div>
      </Card>
    );
  }

  // Agrupar por data
  const groupedReminders = reminders.reduce((acc, reminder) => {
    const key = `${reminder.reminder_date}-${reminder.days_before}`;
    if (!acc[key]) {
      acc[key] = {
        date: reminder.reminder_date,
        time: reminder.reminder_time,
        days_before: reminder.days_before,
        reminders: []
      };
    }
    acc[key].reminders.push(reminder);
    return acc;
  }, {} as Record<string, { date: string; time: string; days_before: number; reminders: Reminder[] }>);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Lembretes Agendados ({reminders.length})
        </h3>
      </div>

      <div className="space-y-4">
        {Object.values(groupedReminders).map((group, index) => {
          const reminderDate = new Date(group.date + 'T' + group.time);
          const daysLabel = group.days_before === 0 
            ? 'No dia do vencimento'
            : `${group.days_before} dia${group.days_before !== 1 ? 's' : ''} antes`;

          return (
            <div
              key={index}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              {/* Cabeçalho do grupo */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    📅 {format(reminderDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {daysLabel}
                  </div>
                </div>
              </div>

              {/* Lista de canais */}
              <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                {group.reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md",
                      reminder.status === 'failed' && "bg-red-50 dark:bg-red-950/20"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getChannelIcon(reminder.channel)}
                      <span className="text-sm font-medium">
                        {getChannelLabel(reminder.channel)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(reminder)}
                      
                      {reminder.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(reminder.id)}
                          disabled={retrying === reminder.id}
                          className="h-7 text-xs"
                        >
                          {retrying === reminder.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Reenviar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Erro details */}
              {group.reminders.some(r => r.error_message) && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-700 dark:text-red-400">
                  {group.reminders.find(r => r.error_message)?.error_message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 Os lembretes são verificados a cada hora. Status atualizado automaticamente a cada 30 segundos.
        </p>
      </div>
    </Card>
  );
}
