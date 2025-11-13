/**
 * EDGE FUNCTION: send-low-balance-alerts
 * Envia alertas quando saldo < threshold configurado
 * Cooldown de 24h para evitar spam
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-cron-secret',
      },
    });
  }

  try {
    console.log('[send-low-balance-alerts] 🚀 Iniciando...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Buscar usuários com alertas de saldo baixo ativados
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, low_balance_threshold, whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
      .eq('low_balance_alerts_enabled', true)
      .eq('whatsapp_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('[send-low-balance-alerts] ⚠️ Nenhum usuário com alertas ativos');
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-low-balance-alerts] 📱 ${users.length} usuários com alertas ativos`);

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    let totalSent = 0;

    for (const user of users) {
      // Verificar DND
      if (user.do_not_disturb_enabled) {
        const dndDays = user.do_not_disturb_days_of_week || [];
        const isDNDDay = dndDays.length === 0 || dndDays.includes(currentDay);
        
        if (isDNDDay) {
          const dndStart = user.do_not_disturb_start_time || '22:00';
          const dndEnd = user.do_not_disturb_end_time || '08:00';
          
          let isInDNDTime = false;
          if (dndStart < dndEnd) {
            isInDNDTime = currentTime >= dndStart || currentTime < dndEnd;
          } else {
            isInDNDTime = currentTime >= dndStart && currentTime < dndEnd;
          }

          if (isInDNDTime) {
            console.log(`[send-low-balance-alerts] ⏸️ Usuário ${user.user_id} em DND`);
            continue;
          }
        }
      }

      const threshold = user.low_balance_threshold || 100;
      
      // Buscar saldos das contas bancárias
      const { data: accounts, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('id, name, balance')
        .eq('user_id', user.user_id)
        .eq('is_active', true);

      if (accountsError || !accounts || accounts.length === 0) continue;

      // Contas abaixo do threshold
      const lowBalanceAccounts = accounts.filter((acc: any) => 
        parseFloat(acc.balance) < threshold
      );

      if (lowBalanceAccounts.length === 0) continue;

      // Verificar cooldown (última notificação há mais de 24h)
      const { data: lastNotif } = await supabase
        .from('notifications_log')
        .select('created_at')
        .eq('user_id', user.user_id)
        .eq('type', 'low_balance_alert')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastNotif) {
        const lastTime = new Date(lastNotif.created_at).getTime();
        const now = new Date().getTime();
        const hoursSince = (now - lastTime) / (1000 * 60 * 60);
        
        if (hoursSince < 24) {
          console.log(`[send-low-balance-alerts] ⏳ Cooldown ativo para ${user.user_id}`);
          continue;
        }
      }

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone')
        .eq('id', user.user_id)
        .single();

      if (!userdata?.phone) continue;

      // Enviar alerta
      const message = formatLowBalanceMessage(lowBalanceAccounts, threshold);
      
      const sent = await sendWhatsAppNotification(
        supabase,
        user.user_id,
        userdata.phone,
        message
      );

      if (sent) {
        // Registrar log
        await supabase
          .from('notifications_log')
          .insert({
            user_id: user.user_id,
            type: 'low_balance_alert',
            channel: 'whatsapp',
            status: 'sent',
          });
        
        totalSent++;
      }
    }

    console.log(`[send-low-balance-alerts] ✅ Total enviado: ${totalSent} alertas`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-low-balance-alerts] ❌ Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

function formatLowBalanceMessage(accounts: any[], threshold: number): string {
  let message = `⚠️ *ALERTA DE SALDO BAIXO*\n\n`;
  message += `${accounts.length} conta(s) abaixo de R$ ${threshold.toFixed(2)}:\n\n`;
  
  accounts.forEach((acc: any) => {
    message += `• ${acc.name}\n`;
    message += `  💰 Saldo: R$ ${parseFloat(acc.balance).toFixed(2)}\n\n`;
  });

  message += `💡 _Considere transferir fundos para evitar problemas!_`;

  return message;
}

async function sendWhatsAppNotification(
  supabase: any,
  userId: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://api.uazapi.com';
    const UAZAPI_TOKEN = Deno.env.get('UAZAPI_INSTANCE_TOKEN');

    const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN!,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    if (!response.ok) {
      console.error('[sendWhatsAppNotification] Erro UAZAPI:', response.status);
      return false;
    }

    console.log(`[sendWhatsAppNotification] ✅ Enviado para ${phone}`);
    return true;
  } catch (error) {
    console.error('[sendWhatsAppNotification] ❌ Falha:', error);
    return false;
  }
}
