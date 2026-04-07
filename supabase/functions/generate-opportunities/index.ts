// SPRINT 4 DIA 1: Investment Radar - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildInvestmentIntelligenceContext } from '../_shared/investment-intelligence.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Opportunity {
  user_id: string;
  opportunity_type: string;
  ticker: string;
  title: string;
  description: string;
  confidence_score: number;
  expected_return?: number;
  current_price?: number;
  target_price?: number;
  ana_clara_insight?: string;
  expires_at: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação ou aceitar userId do corpo para chamadas server-side
    let userId: string | undefined;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    try {
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user?.id) userId = user.id;
    } catch (_) {}

    if (!userId) {
      try {
        const body = await req.json();
        if (body?.userId && typeof body.userId === 'string') {
          userId = body.userId;
        }
      } catch (_) {}
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const context = await buildInvestmentIntelligenceContext({
      supabase: supabaseClient,
      userId,
      supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    });

    if (context.portfolio.investmentCount === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum investimento encontrado',
          opportunities: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const opportunities: Opportunity[] = context.opportunities.items.map((item) => ({
      user_id: userId,
      opportunity_type: item.type,
      ticker: item.ticker,
      title: item.title,
      description: item.description,
      confidence_score: item.confidenceScore,
      expected_return: item.expectedReturn ?? undefined,
      ana_clara_insight: item.anaSummary ?? undefined,
      expires_at: item.expiresAt,
    }));

    // 4. Remover oportunidades ativas anteriores para evitar recomendações stale/duplicadas
    const { error: cleanupError } = await supabaseClient
      .from('market_opportunities')
      .delete()
      .eq('user_id', userId)
      .is('dismissed_at', null);

    if (cleanupError) {
      console.error('Erro ao limpar oportunidades antigas:', cleanupError);
      throw cleanupError;
    }

    // 5. Salvar oportunidades no banco (somente se houver)
    if (opportunities.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('market_opportunities')
        .insert(opportunities);

      if (insertError) {
        console.error('Erro ao salvar oportunidades:', insertError);
        throw insertError;
      }
    }

    // 6. Retornar resultado
    return new Response(
      JSON.stringify({
        message: `${opportunities.length} oportunidades geradas`,
        opportunities,
          context,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

