/**
 * EDGE FUNCTION: send-ana-tips
 * Envia dicas financeiras da Ana Clara (geradas por IA)
 * Respeita: ana_tips_enabled, ana_tips_frequency, ana_tips_time, ana_tips_day_of_week, ana_tips_day_of_month
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
    console.log('[send-ana-tips] 🚀 Iniciando...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const now = new Date();
    const currentDay = now.getDay();
    const dayOfMonth = now.getDate();
    const currentTime = now.toTimeString().slice(0, 5);

    // Buscar usuários com dicas Ana ativadas
    const { data: users, error: usersError } = await supabase
      .from('notification_preferences')
      .select('user_id, ana_tips_frequency, ana_tips_time, ana_tips_day_of_week, ana_tips_day_of_month, whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
      .eq('ana_tips_enabled', true)
      .eq('whatsapp_enabled', true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.log('[send-ana-tips] ⚠️ Nenhum usuário com dicas Ana ativas');
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-ana-tips] 📱 ${users.length} usuários com dicas Ana ativas`);

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
            console.log(`[send-ana-tips] ⏸️ Usuário ${user.user_id} em DND`);
            continue;
          }
        }
      }

      const frequency = user.ana_tips_frequency || 'daily';
      const tipsTime = user.ana_tips_time || '10:00';

      // Verificar frequência
      let shouldSend = false;

      if (frequency === 'daily') {
        shouldSend = currentTime >= tipsTime;
      } else if (frequency === 'weekly') {
        const dayOfWeek = user.ana_tips_day_of_week || 1; // Segunda padrão
        shouldSend = currentDay === dayOfWeek && currentTime >= tipsTime;
      } else if (frequency === 'monthly') {
        const configuredDay = user.ana_tips_day_of_month || 1;
        shouldSend = dayOfMonth === configuredDay && currentTime >= tipsTime;
      }

      if (!shouldSend) {
        continue;
      }

      // Buscar contexto financeiro do usuário (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, category, description')
        .eq('user_id', user.user_id)
        .gte('date', thirtyDaysAgo.toISOString())
        .order('date', { ascending: false })
        .limit(50);

      const { data: goals } = await supabase
        .from('financial_goals')
        .select('name, target_amount, current_amount, status')
        .eq('user_id', user.user_id)
        .eq('status', 'active')
        .limit(3);

      // Buscar telefone
      const { data: userdata } = await supabase
        .from('users')
        .select('phone, full_name')
        .eq('id', user.user_id)
        .single();

      if (!userdata?.phone) continue;

      // Gerar dica personalizada com IA
      const tip = await generatePersonalizedTip(
        userdata.full_name,
        transactions || [],
        goals || []
      );

      if (!tip) {
        console.log(`[send-ana-tips] ⚠️ Não foi possível gerar dica para ${user.user_id}`);
        continue;
      }

      // Enviar dica
      const sent = await sendWhatsAppNotification(
        supabase,
        user.user_id,
        userdata.phone,
        tip
      );

      if (sent) totalSent++;
    }

    console.log(`[send-ana-tips] ✅ Total enviado: ${totalSent} dicas`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_users: users.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-ana-tips] ❌ Erro:', error);
    
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

async function generatePersonalizedTip(
  fullName: string,
  transactions: any[],
  goals: any[]
): Promise<string | null> {
  try {
    // Calcular estatísticas
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

    const categorySpending: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Outros';
        categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(parseFloat(t.amount));
      });

    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0];

    // Contexto para IA
    const context = {
      fullName,
      totalExpenses: expenses.toFixed(2),
      topCategory: topCategory ? `${topCategory[0]}: R$ ${topCategory[1].toFixed(2)}` : 'Nenhuma',
      activeGoals: goals.length,
      goalNames: goals.map(g => g.name).join(', '),
    };

    // Chamar OpenAI
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_KEY) {
      console.warn('[generatePersonalizedTip] OpenAI API Key não configurada, usando dica genérica');
      return generateGenericTip(fullName, context);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é Ana Clara, uma assistente financeira amigável e prestativa. Gere uma dica financeira prática, curta (máximo 3 linhas) e personalizada baseada nos dados do usuário. Use emojis moderadamente e seja gentil. Sempre termine com "💚 Ana Clara - Sua assistente financeira".`
          },
          {
            role: 'user',
            content: `Gere uma dica para ${context.fullName}:
- Total gasto (30 dias): R$ ${context.totalExpenses}
- Categoria que mais gasta: ${context.topCategory}
- Metas ativas: ${context.activeGoals} (${context.goalNames || 'nenhuma'})

Dica:`
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('[generatePersonalizedTip] Erro OpenAI:', response.status);
      return generateGenericTip(fullName, context);
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content?.trim();

    if (!tip) {
      return generateGenericTip(fullName, context);
    }

    return `💡 *DICA DA ANA CLARA*\n\n${tip}`;

  } catch (error) {
    console.error('[generatePersonalizedTip] Erro:', error);
    return generateGenericTip(fullName, { fullName });
  }
}

function generateGenericTip(fullName: string, context?: any): string {
  const tips = [
    `Olá ${fullName}! 👋 Que tal reservar 10% da sua renda mensal para uma reserva de emergência? Pequenos passos levam a grandes conquistas! 💪`,
    `Oi ${fullName}! 💰 Revisar seus gastos semanalmente ajuda a manter o controle financeiro. Reserve 15 minutos no domingo para isso!`,
    `${fullName}, uma dica valiosa: antes de comprar algo, espere 24 horas. Isso evita compras por impulso e economiza dinheiro! 🛍️`,
    `Olá ${fullName}! 📊 Acompanhar suas metas financeiras diariamente aumenta em 40% as chances de alcançá-las. Você está no caminho certo!`,
    `Oi ${fullName}! 💡 Que tal automatizar uma transferência mensal para investimentos? Assim você poupa sem esforço!`,
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
  return `💡 *DICA DA ANA CLARA*\n\n${randomTip}\n\n💚 _Ana Clara - Sua assistente financeira_`;
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
