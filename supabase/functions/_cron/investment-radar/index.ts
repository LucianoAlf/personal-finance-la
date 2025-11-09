// SPRINT 4: CRON JOB - Investment Radar (1x/dia às 09:00)
// Analisa automaticamente TODOS os portfólios e gera oportunidades

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    console.log('🚀 Investment Radar Cron Job started');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos os usuários ativos
    const { data: users, error: usersError } = await supabase.rpc('get_active_users');

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`📊 Found ${users?.length || 0} active users`);

    let totalOpportunities = 0;
    let processedUsers = 0;
    let errors = 0;

    // 2. Para cada usuário, gerar oportunidades
    for (const user of users || []) {
      try {
        // Chamar a Edge Function generate-opportunities para cada usuário
        const { data, error } = await supabase.functions.invoke('generate-opportunities', {
          body: { userId: user.id },
        });

        if (error) {
          console.error(`❌ Error for user ${user.id}:`, error);
          errors++;
          continue;
        }

        const opportunitiesCount = data?.opportunities?.length || 0;
        totalOpportunities += opportunitiesCount;
        processedUsers++;

        console.log(`✅ User ${user.id}: ${opportunitiesCount} opportunities generated`);
      } catch (error) {
        console.error(`❌ Exception for user ${user.id}:`, error);
        errors++;
      }
    }

    // 3. Expirar oportunidades antigas (>7 dias)
    const { error: expireError } = await supabase.rpc('expire_old_opportunities');

    if (expireError) {
      console.error('❌ Error expiring old opportunities:', expireError);
    } else {
      console.log('✅ Old opportunities expired');
    }

    // 4. Resultado final
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalUsers: users?.length || 0,
        processedUsers,
        errors,
        totalOpportunities,
      },
    };

    console.log('🎉 Investment Radar Cron Job completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
