import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { PayableBill } from '@/types/payable-bills.types';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

export interface ReminderConfig {
  days_before: number[];
  channels: ('push' | 'email' | 'whatsapp')[];
}

interface ReminderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: PayableBill | null;
  onSuccess?: () => void;
}

const DAYS_OPTIONS = [
  { value: 7, label: '7 dias antes' },
  { value: 3, label: '3 dias antes' },
  { value: 1, label: '1 dia antes' },
  { value: 0, label: 'No dia do vencimento' },
];

export function ReminderConfigDialog({ open, onOpenChange, bill, onSuccess }: ReminderConfigDialogProps) {
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = useState<number[]>([3, 1, 0]);
  const [selectedChannels, setSelectedChannels] = useState<('push' | 'email' | 'whatsapp')[]>(['email']);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => b - a)
    );
  };

  const toggleChannel = (channel: 'push' | 'email' | 'whatsapp') => {
    setSelectedChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSave = async () => {
    if (!bill || !user) return;

    if (selectedDays.length === 0) {
      toast.error('Selecione pelo menos um dia para o lembrete');
      return;
    }

    if (selectedChannels.length === 0) {
      toast.error('Selecione pelo menos um canal de envio');
      return;
    }

    try {
      setLoading(true);

      // Chamar function SQL para agendar lembretes
      const { data, error } = await supabase.rpc('schedule_bill_reminders', {
        p_bill_id: bill.id,
        p_user_id: user.id,
        p_days_before: selectedDays,
        p_channels: selectedChannels
      });

      if (error) throw error;

      const reminderCount = data || 0;
      
      toast.success(`${reminderCount} lembrete${reminderCount !== 1 ? 's' : ''} agendado${reminderCount !== 1 ? 's' : ''} com sucesso!`, {
        description: `Você receberá notificações via ${selectedChannels.join(', ')}`,
        icon: <CheckCircle2 className="h-5 w-5" />
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset
      setSelectedDays([3, 1, 0]);
      setSelectedChannels(['email']);
      
    } catch (error: any) {
      console.error('Erro ao agendar lembretes:', error);
      toast.error('Erro ao agendar lembretes', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!bill) return null;

  const dueDate = new Date(bill.due_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurar Lembretes
          </DialogTitle>
          <DialogDescription>
            Configure quando e como deseja ser lembrado sobre esta conta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info da Conta */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-sm mb-2">{bill.description}</h4>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Vencimento:</span>
              <span className="font-medium text-foreground">
                {format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
              <span>Valor:</span>
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(bill.amount)}
              </span>
            </div>
          </div>

          {/* Quando lembrar */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              📅 Quando lembrar?
            </Label>
            <div className="space-y-3">
              {DAYS_OPTIONS.map((option) => {
                const reminderDate = addDays(dueDate, -option.value);
                const isChecked = selectedDays.includes(option.value);
                
                return (
                  <motion.div
                    key={option.value}
                    whileHover={{ x: 4 }}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => toggleDay(option.value)}
                  >
                    <Checkbox
                      id={`day-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleDay(option.value)}
                    />
                    <Label
                      htmlFor={`day-${option.value}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(reminderDate, "dd/MM/yyyy", { locale: ptBR })} às 09:00
                      </div>
                    </Label>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Como enviar */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              📬 Como enviar?
            </Label>
            <div className="space-y-3">
              {/* Push Notification */}
              <motion.div
                whileHover={{ x: 4 }}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => toggleChannel('push')}
              >
                <Checkbox
                  id="channel-push"
                  checked={selectedChannels.includes('push')}
                  onCheckedChange={() => toggleChannel('push')}
                />
                <Label htmlFor="channel-push" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Bell className="h-4 w-4" />
                    Notificação Push (Celular)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Receba alertas direto no seu smartphone
                  </div>
                </Label>
              </motion.div>

              {/* Email */}
              <motion.div
                whileHover={{ x: 4 }}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => toggleChannel('email')}
              >
                <Checkbox
                  id="channel-email"
                  checked={selectedChannels.includes('email')}
                  onCheckedChange={() => toggleChannel('email')}
                />
                <Label htmlFor="channel-email" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4" />
                    E-mail ({user?.email || 'Não configurado'})
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Enviaremos um e-mail detalhado
                  </div>
                </Label>
              </motion.div>

              {/* WhatsApp */}
              <motion.div
                whileHover={{ x: 4 }}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 cursor-not-allowed opacity-60"
              >
                <Checkbox
                  id="channel-whatsapp"
                  disabled
                  checked={false}
                />
                <Label htmlFor="channel-whatsapp" className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Em breve! Disponível na Fase 3
                  </div>
                </Label>
              </motion.div>
            </div>
          </div>

          {/* Dica */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              💡 <span className="font-medium">Dica:</span> Recomendamos ativar múltiplos canais e lembretes em diferentes dias para não esquecer nenhuma conta!
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={loading || selectedDays.length === 0 || selectedChannels.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar Lembretes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
