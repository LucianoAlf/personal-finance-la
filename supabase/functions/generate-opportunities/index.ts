// SPRINT 4 DIA 1: Investment Radar - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Investment {
  id: string;
  user_id: string;
  category: string;
  current_value: number;
  total_invested: number;
  dividend_yield?: number;
}

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

    // 1. Buscar portfólio do usuário
    const { data: investments, error: investmentsError } = await supabaseClient
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (investmentsError) {
      throw investmentsError;
    }

    if (!investments || investments.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum investimento encontrado',
          opportunities: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calcular alocação atual
    const totalValue = investments.reduce((sum: number, inv: Investment) => 
      sum + (inv.current_value || 0), 0
    );

    const allocation = calculateAllocation(investments as Investment[], totalValue);

    // 3. Gerar oportunidades baseadas na análise
    const opportunities: Opportunity[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Válido por 7 dias

    // Oportunidade 1: Renda Fixa baixa (<30%)
    if (allocation.renda_fixa < 30) {
      opportunities.push({
        user_id: userId,
        opportunity_type: 'buy_opportunity',
        ticker: 'TESOURO_SELIC',
        title: 'Renda fixa abaixo do recomendado',
        description: `Sua alocação em renda fixa está em ${allocation.renda_fixa.toFixed(1)}%. Considere aumentar para pelo menos 30% com Tesouro Direto ou CDBs de bancos sólidos.`,
        confidence_score: 85,
        expected_return: 13.5,
        ana_clara_insight: 'Diversificação: Aumentar renda fixa reduz volatilidade do portfólio.',
        expires_at: expiresAt.toISOString(),
      });
    }

    // Oportunidade 2: Sem FIIs (diversificação)
    if (allocation.fiis === 0) {
      opportunities.push({
        user_id: userId,
        opportunity_type: 'buy_opportunity',
        ticker: 'FII',
        title: 'Diversifique com Fundos Imobiliários',
        description: 'Você não possui FIIs no portfólio. FIIs oferecem renda passiva mensal e diversificação. Busque fundos com dividend yield acima de 8% a.a.',
        confidence_score: 75,
        expected_return: 9.5,
        ana_clara_insight: 'Renda passiva: FIIs distribuem pelo menos 95% dos lucros mensalmente.',
        expires_at: expiresAt.toISOString(),
      });
    }

    // Oportunidade 3: Concentração alta (>30% em um ativo)
    const maxConcentration = Math.max(
      ...investments.map((inv: Investment) => 
        ((inv.current_value || 0) / totalValue) * 100
      )
    );

    if (maxConcentration > 30) {
      opportunities.push({
        user_id: userId,
        opportunity_type: 'sell_signal',
        ticker: 'PORTFOLIO',
        title: 'Atenção: Concentração alta em um ativo',
        description: `Você tem ${maxConcentration.toFixed(1)}% do portfólio em um único ativo. Isso aumenta o risco. Considere diversificar mais.`,
        confidence_score: 90,
        ana_clara_insight: 'Risco: Concentração acima de 30% em um ativo aumenta volatilidade significativamente.',
        expires_at: expiresAt.toISOString(),
      });
    }

    // Oportunidade 4: Sem exposição internacional
    if (allocation.internacional === 0 && totalValue > 10000) {
      opportunities.push({
        user_id: userId,
        opportunity_type: 'buy_opportunity',
        ticker: 'IVVB11',
        title: 'Considere exposição internacional',
        description: 'Diversifique geograficamente com ETFs internacionais ou BDRs. Recomendado: 10-20% do portfólio em ativos no exterior.',
        confidence_score: 70,
        expected_return: 12.0,
        ana_clara_insight: 'Proteção cambial: Exposição internacional protege contra desvalorização do real.',
        expires_at: expiresAt.toISOString(),
      });
    }

    // Oportunidade 5: Baixo yield de dividendos
    const avgDividendYield = investments
      .filter((inv: Investment) => inv.dividend_yield && inv.dividend_yield > 0)
      .reduce((sum: number, inv: Investment) => sum + (inv.dividend_yield || 0), 0) 
      / investments.filter((inv: Investment) => inv.dividend_yield).length;

    if (avgDividendYield < 5 && allocation.acoes_nacionais > 0) {
      opportunities.push({
        user_id: userId,
        opportunity_type: 'dividend_alert',
        ticker: 'DIVIDENDOS',
        title: 'Aumente sua renda passiva com dividendos',
        description: `Seu dividend yield médio está em ${avgDividendYield.toFixed(1)}%. Busque ações de empresas pagadoras de dividendos consistentes com yield acima de 6%.`,
        confidence_score: 80,
        expected_return: 7.5,
        ana_clara_insight: 'Renda passiva: Empresas com histórico de dividendos oferecem mais previsibilidade.',
        expires_at: expiresAt.toISOString(),
      });
    }

    // 4. Salvar oportunidades no banco (somente se houver)
    if (opportunities.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('market_opportunities')
        .insert(opportunities);

      if (insertError) {
        console.error('Erro ao salvar oportunidades:', insertError);
        throw insertError;
      }
    }

    // 5. Retornar resultado
    return new Response(
      JSON.stringify({
        message: `${opportunities.length} oportunidades geradas`,
        opportunities,
        portfolio_summary: {
          total_value: totalValue,
          num_investments: investments.length,
          allocation,
        },
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

// Helper: Calcular alocação por categoria
function calculateAllocation(investments: Investment[], totalValue: number) {
  const allocation: Record<string, number> = {
    renda_fixa: 0,
    acoes_nacionais: 0,
    fiis: 0,
    internacional: 0,
    cripto: 0,
    previdencia: 0,
    outros: 0,
  };

  investments.forEach((inv) => {
    const category = inv.category || 'outros';
    const value = inv.current_value || 0;
    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
    allocation[category] = (allocation[category] || 0) + percentage;
  });

  return allocation;
}
