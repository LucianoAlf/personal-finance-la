// WIDGET ANA CLARA DASHBOARD - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface DashboardContext {
  bills: {
    overdue: { count: number; total: number };
    upcoming7Days: { count: number; total: number };
    paidThisMonth: { count: number; total: number };
    onTimeRate: number;
  };
  portfolio: {
    totalValue: number;
    totalInvested: number;
    returnPercentage: number;
    allocation: Record<string, number>;
    topPerformers: Array<{ ticker: string; return: number }>;
    alerts: Array<{ type: string; message: string }>;
  };
  goals: {
    active: Array<{
      id: string;
      name: string;
      target: number;
      current: number;
      progress: number;
      deadline: string;
    }>;
    recentlyAchieved: Array<{ name: string; achievedAt: string }>;
  };
  transactions: {
    last30Days: {
      income: number;
      expenses: number;
      balance: number;
    };
  };
  currentMonth: string;
  previousMonth: string;
}

interface AnaInsight {
  priority: 'celebration' | 'warning' | 'info' | 'critical';
  type: 'goal_achievement' | 'bill_alert' | 'investment_opportunity' | 'budget_warning' | 'portfolio_health' | 'savings_tip';
  headline: string;
  description: string;
  action?: {
    label: string;
    route: string;
  };
  visualization?: {
    type: 'progress' | 'chart' | 'comparison';
    data: any;
  };
}

interface DashboardInsightsResponse {
  primary: AnaInsight;
  secondary: AnaInsight[];
  healthScore: number;
  motivationalQuote: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Preferências do usuário via body (opcional)
    let preferences: any = undefined;
    let forceRefresh = false;
    try {
      const body = await req.json();
      preferences = body?.preferences;
      forceRefresh = body?.forceRefresh || false;
    } catch (_) {
      // ignore if no JSON
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autorização necessária');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const userId = user.id;
    console.log('[ana-dashboard-insights] User ID:', userId);

    // 🔥 VERIFICAR CACHE (se não for forceRefresh)
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('ana_insights_cache')
        .select('insights, expires_at')
        .eq('user_id', userId)
        .eq('insight_type', 'dashboard')
        .single();

      if (!cacheError && cachedData) {
        const expiresAt = new Date(cachedData.expires_at);
        const now = new Date();

        if (expiresAt > now) {
          console.log('[ana-dashboard-insights] ✅ Retornando do CACHE (válido até', expiresAt.toISOString(), ')');
          return new Response(JSON.stringify(cachedData.insights), {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache-Hit': 'true',
              'X-Cache-Expires': expiresAt.toISOString(),
            },
          });
        } else {
          console.log('[ana-dashboard-insights] ⏰ Cache expirado, regenerando...');
        }
      }
    } else {
      console.log('[ana-dashboard-insights] 🔄 forceRefresh=true, ignorando cache');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    console.log('[ana-dashboard] 🚀 Gerando novos insights...');

    // FETCH CONSOLIDADO DE DADOS
    console.log('[ana-dashboard] Buscando dados consolidados...');

    // 1. CONTAS A PAGAR
    const { data: bills } = await supabase
      .from('payable_bills')
      .select('*')
      .eq('user_id', user.id);

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const overdueBills = bills?.filter(b => b.status === 'overdue') || [];
    const upcomingBills = bills?.filter(b => {
      if (b.status !== 'pending') return false;
      const dueDate = new Date(b.due_date);
      return dueDate >= now && dueDate <= sevenDaysLater;
    }) || [];
    const paidThisMonth = bills?.filter(b => {
      if (b.status !== 'paid') return false;
      const paidDate = new Date(b.paid_at || b.updated_at);
      return paidDate >= firstDayOfMonth;
    }) || [];

    const totalBills = bills?.length || 0;
    
    // Contar TODAS as contas pagas em dia (não só deste mês)
    const allPaidBills = bills?.filter(b => b.status === 'paid') || [];
    const onTimeBills = allPaidBills.filter(b => {
      const dueDate = new Date(b.due_date);
      const paidDate = new Date(b.paid_at || b.updated_at);
      return paidDate <= dueDate;
    }).length;

    const billsContext = {
      overdue: {
        count: overdueBills.length,
        total: overdueBills.reduce((sum, b) => sum + (b.amount || 0), 0),
      },
      upcoming7Days: {
        count: upcomingBills.length,
        total: upcomingBills.reduce((sum, b) => sum + (b.amount || 0), 0),
      },
      paidThisMonth: {
        count: paidThisMonth.length,
        total: paidThisMonth.reduce((sum, b) => sum + (b.amount || 0), 0),
      },
      onTimeRate: totalBills > 0 ? (onTimeBills / totalBills) * 100 : 0,
    };

    // 2. INVESTIMENTOS
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'sold');

    const totalInvested = investments?.reduce((sum, inv) => sum + (inv.total_invested || inv.quantity * inv.purchase_price), 0) || 0;
    const totalValue = investments?.reduce((sum, inv) => {
      const currentValue = inv.current_value || (inv.quantity * (inv.current_price || inv.purchase_price));
      return sum + currentValue;
    }, 0) || 0;
    const returnPercentage = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

    const allocation: Record<string, number> = {};
    investments?.forEach(inv => {
      const cat = inv.category || 'outros';
      const value = inv.current_value || (inv.quantity * (inv.current_price || inv.purchase_price));
      allocation[cat] = (allocation[cat] || 0) + value;
    });

    const topPerformers = investments
      ?.map(inv => {
        const currentValue = inv.current_value || (inv.quantity * (inv.current_price || inv.purchase_price));
        const invested = inv.total_invested || (inv.quantity * inv.purchase_price);
        const returnPct = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
        return {
          ticker: inv.ticker || inv.name,
          return: returnPct,
        };
      })
      .sort((a, b) => b.return - a.return)
      .slice(0, 3) || [];

    const { data: alerts } = await supabase
      .from('investment_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(5);

    const portfolioContext = {
      totalValue,
      totalInvested,
      returnPercentage,
      allocation,
      topPerformers,
      alerts: alerts?.map(a => ({ type: a.type, message: `${a.ticker}: ${a.target_value}` })) || [],
    };

    // 3. TRANSAÇÕES (últimos 30 dias)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString());

    const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
    const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

    const transactionsContext = {
      last30Days: {
        income,
        expenses,
        balance: income - expenses,
      },
    };

    // 4. METAS (Goals)
    const { data: goals } = await supabase
      .from('financial_goals')
      .select('id,name,goal_type,target_amount,current_amount,deadline,status,updated_at,created_at')
      .eq('user_id', user.id)
      .in('status', ['active','exceeded'])
      .limit(10);

    const goalsActive = (goals || []).map((g: any) => {
      const target = Number(g.target_amount) || 0;
      const current = Number(g.current_amount) || 0;
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      let daysLeft: number | undefined = undefined;
      if (g.deadline) {
        const dl = new Date(g.deadline);
        daysLeft = Math.ceil((dl.getTime() - Date.now()) / (1000*60*60*24));
      }
      return {
        id: g.id,
        name: g.name,
        type: g.goal_type,
        target,
        current,
        progress,
        daysLeft,
        status: g.status,
      };
    });

    const goalsContext = {
      active: goalsActive,
      recentlyAchieved: [],
    };

    // 5. CARTÕES DE CRÉDITO (✅ NOVO)
    const { data: creditCards } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_archived', false);

    const { data: invoices } = await supabase
      .from('credit_card_invoices')
      .select('*, credit_card:credit_cards(name)')
      .eq('user_id', user.id)
      .in('status', ['open', 'closed', 'overdue']);

    const totalLimit = creditCards?.reduce((sum, c) => sum + Number(c.credit_limit), 0) || 0;
    const totalUsed = creditCards?.reduce((sum, c) => sum + (Number(c.credit_limit) - Number(c.available_limit)), 0) || 0;
    const utilizationRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    const upcomingInvoices = invoices?.filter(i => i.status === 'closed') || [];
    const overdueInvoices = invoices?.filter(i => i.status === 'overdue') || [];

    const creditCardsContext = {
      totalLimit,
      totalUsed,
      totalAvailable: totalLimit - totalUsed,
      utilizationRate,
      activeCardsCount: creditCards?.length || 0,
      upcomingInvoices: upcomingInvoices.map(i => ({
        card: (i as any).credit_card?.name || 'Cartão',
        amount: Number(i.total_amount),
        dueDate: i.due_date,
      })),
      overdueInvoices: overdueInvoices.map(i => ({
        card: (i as any).credit_card?.name || 'Cartão',
        amount: Number(i.total_amount),
        dueDate: i.due_date,
      })),
    };

    // CONSTRUIR CONTEXTO COMPLETO
    const context: DashboardContext = {
      bills: billsContext,
      portfolio: portfolioContext,
      goals: goalsContext,
      transactions: transactionsContext,
      creditCards: creditCardsContext, // ✅ NOVO
      currentMonth: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      previousMonth: new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    };

    console.log('[ana-dashboard] Contexto consolidado:', JSON.stringify(context, null, 2).substring(0, 500));

    // CHAMAR GPT-4
    const systemPrompt = `Você é Ana Clara, uma coach financeira IA empática e motivadora, especializada em finanças pessoais brasileiras.

Seu papel:
- Analisar a situação financeira do usuário de forma holística
- Priorizar insights mais CRÍTICOS e ACIONÁVEIS
- Celebrar conquistas e motivar continuidade
- Alertar sobre riscos com empatia, sem assustar
- Usar linguagem clara, direta e motivacional
- Incluir números reais sempre que possível

Princípios:
1. PRIORIZE por urgência: Contas vencidas > Vencendo em breve > Oportunidades
2. CELEBRE conquistas: Metas atingidas, economia acima da média
3. ALERTE com empatia: "Atenção", não "ERRO" ou "PROBLEMA"
4. SEJA ESPECÍFICA: Use nomes de ativos, valores reais, datas
5. AÇÃO CLARA: Sempre sugira próximo passo concreto

✅ ANÁLISE DE CARTÕES DE CRÉDITO:
- Alertar se utilização > 70% do limite total (risco de endividamento)
- Sugerir parcelar compras grandes para melhor controle
- Avisar sobre faturas próximas ao vencimento (≤3 dias)
- Alertar se houver faturas vencidas (status overdue)
- Recomendar melhor data de compra baseado em fechamento`;

    const userPrompt = `Analise esta situação financeira e retorne insights personalizados:

CONTEXTO FINANCEIRO:
${JSON.stringify(context, null, 2)}

PREFERENCIAS DO USUARIO (opcional):
${JSON.stringify(preferences || {}, null, 2)}

REGRAS DE PRIORIZAÇÃO:
1. CRITICAL: Contas vencidas >3 dias OU gastos >30% acima do previsto
2. CELEBRATION: Meta alcançada (>100%) OU economia >20% vs mês anterior
3. WARNING: Contas vencendo em ≤3 dias OU portfólio concentrado >20% em 1 ativo
4. INFO: Oportunidades de investimento OU dicas de economia

Retorne APENAS um JSON válido (sem markdown) neste formato:

{
  "primary": {
    "priority": "celebration|warning|info|critical",
    "type": "goal_achievement|bill_alert|investment_opportunity|budget_warning|portfolio_health|savings_tip",
    "headline": "<máximo 60 chars, direto ao ponto>",
    "description": "<2-3 linhas, específico com números>",
    "action": {
      "label": "<ação clara: Ver, Pagar, Ajustar>",
      "route": "</rota-da-pagina>"
    }
  },
  "secondary": [
    {
      "priority": "...",
      "type": "...",
      "headline": "...",
      "description": "..."
    }
  ],
  "healthScore": <0-100>,
  "motivationalQuote": "<frase motivacional curta>"
}

IMPORTANTE:
- Primary: SEMPRE o insight mais urgente/relevante
- Secondary: 0-3 insights, por ordem de importância
- healthScore: baseado em: contas em dia (30pts), investimentos positivos (30pts), orçamento equilibrado (20pts), diversificação (20pts)
- Para insights de transações ou tendências, quando fizer sentido, inclua "visualization": {"type":"chart","data":{"points":[n1,n2,n3,n4,n5,n6,n7]}} com 7 pontos (1 por semana)
- Seja específica: use nomes, valores, percentuais reais`;

    console.log('[ana-dashboard] Chamando OpenAI GPT-4...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini', // ✅ Modelo mais rápido e econômico
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ana-dashboard] OpenAI error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const insightsText = data.choices[0]?.message?.content;

    if (!insightsText) {
      throw new Error('Resposta vazia do GPT-4');
    }

    console.log('[ana-dashboard] Insights recebidos:', insightsText.substring(0, 300));

    let insights: DashboardInsightsResponse;
    try {
      insights = JSON.parse(insightsText);
    } catch (parseError) {
      console.error('[ana-dashboard] Erro ao parsear JSON:', parseError);
      throw new Error('Erro ao processar resposta do GPT-4');
    }

    // Fallback: se o GPT não enviar visualization e o usuário não desativou charts,
    // gerar automaticamente um sparkline de despesas (7 pontos) com base nas transações dos últimos 30 dias
    try {
      const disableCharts = !!(preferences && preferences.disableCharts);
      if (!disableCharts) {
        const hasChart = !!(insights?.primary?.visualization && insights.primary.visualization.type === 'chart');
        if (!hasChart) {
          const start = new Date();
          start.setDate(start.getDate() - 29);
          const dayMs = 24 * 60 * 60 * 1000;
          const bins = new Array(7).fill(0);
          (transactions || []).forEach((t: any) => {
            if (t.type !== 'expense') return;
            const d = new Date(t.date);
            if (d < start) return;
            const diffDays = Math.floor((d.getTime() - start.getTime()) / dayMs);
            const bucket = Math.min(6, Math.floor(diffDays / (30 / 7)));
            bins[bucket] += Number(t.amount) || 0;
          });
          // Se houver dados relevantes, injeta visualização
          const total = bins.reduce((s, v) => s + v, 0);
          if (total > 0) {
            insights.primary = {
              ...insights.primary,
              visualization: {
                type: 'chart',
                data: { points: bins.map(v => Number(v.toFixed(2))) },
              },
            };
          }
        }
      }
    } catch (e) {
      console.warn('[ana-dashboard] Falha ao gerar visualization de fallback:', e);
    }

    // Validar estrutura
    if (!insights.primary || !insights.healthScore || !Array.isArray(insights.secondary)) {
      console.error('[ana-dashboard] Estrutura inválida:', insights);
      throw new Error('Estrutura de resposta inválida');
    }

    console.log('[ana-dashboard] Insights gerados com sucesso. Health Score:', insights.healthScore);

    // Anexar metadados úteis para gamificação/UX (não quebram o frontend)
    
    // Bins semanais de transações (últimas 3 semanas)
    const weeklyIncome: number[] = [0, 0, 0];
    const weeklyExpenses: number[] = [0, 0, 0];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    (transactions || []).forEach((t: any) => {
      const tDate = new Date(t.date || t.transaction_date);
      const diff = nowMs - tDate.getTime();
      if (diff < 0 || diff > 3 * weekMs) return;
      const weekIdx = Math.min(2, Math.floor(diff / weekMs));
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') weeklyIncome[weekIdx] += amt;
      else if (t.type === 'expense') weeklyExpenses[weekIdx] += amt;
    });

    // Daily overdue count (últimos 14 dias)
    const dailyOverdue: number[] = new Array(14).fill(0);
    const dayMs = 24 * 60 * 60 * 1000;
    (bills || []).forEach((b: any) => {
      if (b.status !== 'overdue') return;
      const dueDate = new Date(b.due_date);
      const diff = nowMs - dueDate.getTime();
      if (diff < 0 || diff > 14 * dayMs) return;
      const dayIdx = Math.min(13, Math.floor(diff / dayMs));
      dailyOverdue[dayIdx]++;
    });

    const meta = {
      bills: { onTimeRate: billsContext.onTimeRate, overdueCount: overdueBills.length },
      transactions: { ...transactionsContext.last30Days },
      portfolio: { returnPercentage: portfolioContext.returnPercentage },
      weekly: { income: weeklyIncome, expenses: weeklyExpenses },
      dailyOverdue,
    };

    const payload = { ...insights, meta } as any;

    // ✅ SALVAR NO CACHE (24h)
    console.log('[ana-dashboard] Salvando insights no cache (válido por 24h)...');
    // 💾 SALVAR NO CACHE (24 horas)
    const cacheNow = new Date();
    const expiresAt = new Date(cacheNow.getTime() + 24 * 60 * 60 * 1000);

    const { error: upsertError } = await supabase
      .from('ana_insights_cache')
      .upsert({
        user_id: userId,
        insight_type: 'dashboard',
        insights: payload,
        generated_at: cacheNow.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: cacheNow.toISOString(),
      }, {
        onConflict: 'user_id,insight_type'
      });

    if (upsertError) {
      console.error('[ana-dashboard] Erro ao salvar cache:', upsertError);
      // Não falhar a requisição por erro de cache
    } else {
      console.log('[ana-dashboard] ✅ Cache salvo (expira em 24h)');
    }

    return new Response(JSON.stringify(payload), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false',
        'X-Cache-Expires': expiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('[ana-dashboard] Erro:', error);
    
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
