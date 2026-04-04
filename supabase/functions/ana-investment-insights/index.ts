// FASE 1: Ana Clara com GPT-4 Real - Investment Insights (COM CACHE 24H)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getDefaultAIConfig, callChat } from './_shared/ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface Portfolio {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  allocation: Record<string, { percentage: number; value: number }>;
  investments: Array<{
    ticker: string;
    type: string;
    quantity: number;
    returnPercentage: number;
    dividendYield?: number;
    currentPrice?: number;
    purchasePrice?: number;
  }>;
  targets?: Array<{ assetClass: string; targetPercentage: number }>;
}

interface GPTInsightsResponse {
  healthScore: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  mainInsight: string;
  strengths: string[];
  warnings: string[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  nextSteps: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { portfolio, forceRefresh }: { portfolio: Portfolio; forceRefresh?: boolean } = await req.json();
    
    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter user_id do JWT (preferir X-Supabase-Authorization)
    const rawUserAuth = req.headers.get('x-supabase-authorization') || req.headers.get('authorization');
    if (!rawUserAuth) {
      throw new Error('Authorization token missing');
    }

    const userToken = rawUserAuth.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    console.log('[ana-investment-insights] User ID:', userId);

    // 🔥 VERIFICAR CACHE (se não for forceRefresh)
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('ana_insights_cache')
        .select('insights, expires_at')
        .eq('user_id', userId)
        .eq('insight_type', 'investment')
        .single();

      if (!cacheError && cachedData) {
        const expiresAt = new Date(cachedData.expires_at);
        const now = new Date();

        if (expiresAt > now) {
          console.log('[ana-investment-insights] ✅ Retornando do CACHE (válido até', expiresAt.toISOString(), ')');
          return new Response(JSON.stringify(cachedData.insights), {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache-Hit': 'true',
              'X-Cache-Expires': expiresAt.toISOString(),
            },
          });
        } else {
          console.log('[ana-investment-insights] ⏰ Cache expirado, regenerando...');
        }
      }
    } else {
      console.log('[ana-investment-insights] 🔄 forceRefresh=true, ignorando cache');
    }

    // 🚀 GERAR NOVOS INSIGHTS (cache miss ou expirado)

    // Validar dados do portfólio
    if (!portfolio || typeof portfolio.totalInvested !== 'number') {
      throw new Error('Dados do portfólio inválidos');
    }

    // Construir contexto detalhado para o GPT-4
    const allocationText = Object.entries(portfolio.allocation)
      .filter(([_, data]) => data.percentage > 0)
      .map(([asset, data]) => {
        const assetLabels: Record<string, string> = {
          renda_fixa: 'Renda Fixa',
          acoes_nacionais: 'Ações Nacionais',
          fiis: 'Fundos Imobiliários',
          internacional: 'Internacional',
          cripto: 'Criptomoedas',
          previdencia: 'Previdência',
          outros: 'Outros',
        };
        return `- ${assetLabels[asset] || asset}: ${data.percentage.toFixed(1)}% (R$ ${data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
      })
      .join('\n');

    const investmentsText = portfolio.investments
      .slice(0, 10) // Limitar a 10 investimentos principais
      .map(inv => {
        const parts = [
          `- ${inv.ticker} (${inv.type})`,
          `${inv.quantity}x`,
          `Retorno: ${inv.returnPercentage?.toFixed(2) || '0.00'}%`,
        ];
        if (inv.dividendYield) parts.push(`Yield: ${inv.dividendYield.toFixed(2)}%`);
        if (inv.currentPrice) parts.push(`Preço: R$ ${inv.currentPrice.toFixed(2)}`);
        return parts.join(' | ');
      })
      .join('\n');

    const targetsText = portfolio.targets
      ?.map(t => {
        const assetLabels: Record<string, string> = {
          renda_fixa: 'Renda Fixa',
          acoes_nacionais: 'Ações Nacionais',
          fiis: 'Fundos Imobiliários',
          internacional: 'Internacional',
          cripto: 'Criptomoedas',
          previdencia: 'Previdência',
        };
        return `- ${assetLabels[t.assetClass] || t.assetClass}: ${t.targetPercentage}%`;
      })
      .join('\n') || 'Nenhuma meta definida';

    const context = `
ANÁLISE DE PORTFÓLIO DE INVESTIMENTOS BRASILEIRO

📊 MÉTRICAS GERAIS:
- Total Investido: R$ ${portfolio.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Valor Atual: R$ ${portfolio.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Retorno Total: R$ ${portfolio.totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${portfolio.returnPercentage.toFixed(2)}%)

🎯 ALOCAÇÃO ATUAL:
${allocationText}

📈 PRINCIPAIS INVESTIMENTOS:
${investmentsText}

🎯 METAS DE ALOCAÇÃO:
${targetsText}

📅 CONTEXTO ECONÔMICO BRASIL (2025):
- Selic: ~11.25% a.a.
- IPCA (inflação): ~4.5% a.a.
- CDI: ~11.15% a.a.
- Dólar: ~R$ 5.90
`;

    const systemPrompt = `Você é Ana Clara, uma consultora financeira IA especializada em investimentos brasileiros com 15 anos de experiência em wealth management.

Seu papel:
- Analisar portfólios de investimentos de forma técnica e objetiva
- Fornecer insights PRÁTICOS e ACIONÁVEIS
- Considerar o contexto econômico brasileiro atual
- Priorizar diversificação, segurança e rentabilidade sustentável
- Usar linguagem clara e profissional, mas acessível

Princípios que você segue:
1. Diversificação é fundamental (não concentrar >20% em um ativo)
2. Ter reserva em renda fixa (mínimo 20-30%)
3. Risco deve ser proporcional ao perfil e horizonte temporal
4. Dividendos são importantes para renda passiva
5. Custos e impostos impactam retornos

IMPORTANTE: Seja honesta sobre riscos. Não faça promessas irreais. Base suas recomendações em fundamentos sólidos.`;

    const userPrompt = `Analise este portfólio real e forneça insights personalizados:

${context}

Forneça uma resposta ESTRITAMENTE em formato JSON (sem markdown, sem \`\`\`json) com esta estrutura:

{
  "healthScore": <número de 0 a 100>,
  "level": "<excellent|good|warning|critical>",
  "mainInsight": "<3-4 parágrafos de análise detalhada e personalizada>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "warnings": ["<ponto de atenção 1>", "<ponto de atenção 2>"],
  "recommendations": [
    {
      "title": "<título da recomendação>",
      "description": "<descrição detalhada>",
      "priority": "<high|medium|low>"
    }
  ],
  "nextSteps": ["<ação 1>", "<ação 2>", "<ação 3>"]
}

Critérios para healthScore:
- 90-100: Excelente (diversificado, balanceado, bom retorno)
- 70-89: Bom (algumas melhorias necessárias)
- 50-69: Atenção (desequilíbrios significativos)
- 0-49: Crítico (problemas graves de diversificação/risco)

Seja específica e use os dados reais fornecidos. Não use placeholders genéricos.`;

    // Buscar configuração do provedor do usuário
    const aiConfig = await getDefaultAIConfig(supabase, userId);
    let insightsText: string | undefined;

    if (aiConfig) {
      console.log('[ana-insights] 🔧 Usando provider do usuário:', aiConfig.provider, aiConfig.model);
      const combinedSystem = (aiConfig.systemPrompt ? aiConfig.systemPrompt + '\n\n' : '') + systemPrompt;
      const messages = [
        { role: 'system', content: combinedSystem },
        { role: 'user', content: userPrompt },
      ] as any;
      insightsText = await callChat(
        {
          provider: aiConfig.provider,
          model: aiConfig.model,
          apiKey: aiConfig.apiKey,
          temperature: Math.min(1.5, Math.max(0, aiConfig.temperature || 0.7)),
          maxTokens: Math.min(2500, aiConfig.maxTokens || 2000),
          systemPrompt: aiConfig.systemPrompt,
        },
        messages,
      );
    } else {
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY não configurada e nenhum provedor de IA definido');
      }
      console.log('[ana-insights] ⚠️ Usando fallback OpenAI');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ana-insights] OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      insightsText = data.choices?.[0]?.message?.content;
    }

    if (!insightsText) {
      throw new Error('Resposta vazia do provedor de IA');
    }

    console.log('[ana-insights] Resposta recebida:', insightsText.substring(0, 200));

    let insights: GPTInsightsResponse;
    try {
      insights = JSON.parse(insightsText);
    } catch (parseError) {
      console.error('[ana-insights] Erro ao parsear JSON:', parseError);
      throw new Error('Erro ao processar resposta do GPT-4');
    }

    // Validar estrutura da resposta
    if (
      typeof insights.healthScore !== 'number' ||
      !insights.level ||
      !insights.mainInsight ||
      !Array.isArray(insights.strengths) ||
      !Array.isArray(insights.warnings) ||
      !Array.isArray(insights.recommendations) ||
      !Array.isArray(insights.nextSteps)
    ) {
      console.error('[ana-insights] Resposta com estrutura inválida:', insights);
      throw new Error('Estrutura de resposta inválida do GPT-4');
    }

    console.log('[ana-insights] Insights gerados com sucesso. Score:', insights.healthScore);

    // 💾 SALVAR NO CACHE (8 horas)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // +8h

    const { error: upsertError } = await supabase
      .from('ana_insights_cache')
      .upsert({
        user_id: userId,
        insight_type: 'investment',
        insights: insights,
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'user_id,insight_type'
      });

    if (upsertError) {
      console.error('[ana-insights] Erro ao salvar cache:', upsertError);
      // Não falhar a requisição por erro de cache
    } else {
      console.log('[ana-insights] ✅ Cache salvo (expira em 8h)');
    }

    return new Response(JSON.stringify(insights), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false',
        'X-Cache-Expires': expiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('[ana-insights] Erro:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao gerar insights',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
