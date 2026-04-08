// WIDGET ANA CLARA DASHBOARD - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadCanonicalTaxonomyContext } from '../_shared/canonical-tag-context.ts';
import { buildDashboardEducationMentoringEntry } from '../_shared/education-renderers.ts';
import { getDefaultAIConfig, callChat } from './_shared/ai.ts';
import { ensureStructuredOutputTokens, usesOpenAIMaxCompletionTokens } from '../_shared/ai-openai-compatible.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value?: string | null): Date | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseDashboardInsightsResponse(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonText = (() => {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return cleaned.slice(start, end + 1);
    }
    return cleaned;
  })();

  return JSON.parse(jsonText);
}

function getNextCycleDate(day: number, referenceDate: Date) {
  const safeDay = clamp(day, 1, 28);
  const current = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), safeDay);
  if (current < new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())) {
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, safeDay);
  }
  return current;
}

function buildFinancialSettingsInsight(settings: any) {
  const route = '/metas?tab=config';
  if (!settings || settings.last30DaysIncome <= 0 || settings.monthlySavingsGoalPercentage <= 0) {
    return [];
  }

  const goalRate = Number(settings.monthlySavingsGoalPercentage || 0);
  const actualRate = Number(settings.actualSavingsRate || 0);
  const actualAmount = Number(settings.actualSavingsAmount || 0);
  const targetAmount = Number(settings.targetSavingsAmount || 0);

  if (actualRate >= goalRate) {
    return [
      {
        priority: 'celebration',
        type: 'savings_tip',
        headline: `Meta de economia em ${actualRate.toFixed(1)}%`,
        description: `Sua meta configurada era ${goalRate.toFixed(0)}% e você poupou R$ ${actualAmount.toFixed(2)} nos últimos 30 dias, acima da referência de R$ ${targetAmount.toFixed(2)}.`,
        action: {
          label: 'Revisar planejamento',
          route,
        },
      },
    ];
  }

  return [
    {
      priority: actualRate >= goalRate * 0.8 ? 'info' : 'warning',
      type: 'savings_tip',
      headline: `Meta de economia abaixo do planejado`,
      description: `Sua referência está em ${goalRate.toFixed(0)}%, mas os últimos 30 dias fecharam em ${actualRate.toFixed(1)}%. Faltam R$ ${Math.max(0, targetAmount - actualAmount).toFixed(2)} para bater o objetivo configurado.`,
      action: {
        label: 'Ajustar configurações',
        route,
      },
    },
  ];
}

function buildCycleInsight(cyclesSummary: any) {
  const route = '/metas?tab=config';
  if (!cyclesSummary?.nextCycle) return [];

  const { nextCycle } = cyclesSummary;
  const notifyDaysBefore = Number(nextCycle.notifyDaysBefore || 0);
  const daysUntil = Number(nextCycle.daysUntil ?? 999);

  if (notifyDaysBefore <= 0 || daysUntil < 0 || daysUntil > notifyDaysBefore) {
    return [];
  }

  const timingText = daysUntil === 0
    ? 'começa hoje'
    : daysUntil === 1
      ? 'começa amanhã'
      : `começa em ${daysUntil} dias`;

  return [
    {
      priority: daysUntil === 0 ? 'warning' : 'info',
      type: 'savings_tip',
      headline: `Ciclo ${nextCycle.name} ${timingText}`,
      description: `Esse ciclo está configurado para o dia ${nextCycle.day}. Aproveite para revisar limites, aportes e decisões do próximo período.`,
      action: {
        label: 'Ver ciclos',
        route,
      },
    },
  ];
}

function buildSpendingLimitInsights(spendingLimits: any[]) {
  if (!spendingLimits.length) return [];

  const topLimit = [...spendingLimits].sort((a, b) => b.percentage - a.percentage)[0];
  const route = '/metas?tab=spending';

  if (topLimit.percentage >= 100) {
    return [
      {
        priority: 'critical',
        type: 'budget_warning',
        headline: `${topLimit.categoryName} estourou o limite`,
        description: `Você já gastou R$ ${topLimit.current.toFixed(2)} de R$ ${topLimit.target.toFixed(2)} em ${topLimit.categoryName}. O excesso atual é de R$ ${Math.abs(topLimit.remaining).toFixed(2)}.`,
        action: {
          label: 'Ver limite',
          route,
        },
        visualization: {
          type: 'progress',
          data: {
            current: topLimit.current,
            target: topLimit.target,
            percentage: topLimit.percentage,
          },
        },
      },
    ];
  }

  if (topLimit.percentage >= 70 || topLimit.projectedTotal > topLimit.target) {
    return [
      {
        priority: topLimit.percentage >= 90 ? 'warning' : 'info',
        type: 'budget_warning',
        headline: `${topLimit.categoryName} em ${topLimit.percentage}% do limite`,
        description: `Você consumiu R$ ${topLimit.current.toFixed(2)} de R$ ${topLimit.target.toFixed(2)}${topLimit.daysLeft !== null ? ` e tem ${topLimit.daysLeft} dia(s) restantes` : ''}. Projeção atual: R$ ${topLimit.projectedTotal.toFixed(2)}.`,
        action: {
          label: 'Ajustar limite',
          route,
        },
        visualization: {
          type: 'progress',
          data: {
            current: topLimit.current,
            target: topLimit.target,
            percentage: topLimit.percentage,
          },
        },
      },
    ];
  }

  return [
    {
      priority: 'info',
      type: 'budget_warning',
      headline: `${topLimit.categoryName} sob controle`,
      description: `Você está em ${topLimit.percentage}% do limite de ${topLimit.categoryName}, com R$ ${topLimit.remaining.toFixed(2)} ainda disponíveis neste período.`,
      action: {
        label: 'Ver categoria',
        route,
      },
    },
  ];
}

function mergeSpendingLimitInsights(insights: any, spendingLimitInsights: any[]) {
  if (!spendingLimitInsights.length) return insights;

  const alreadyHasSpendingInsight = [
    insights?.primary,
    ...(Array.isArray(insights?.secondary) ? insights.secondary : []),
  ].some((item) => item?.type === 'budget_warning' && typeof item?.headline === 'string');

  if (alreadyHasSpendingInsight) {
    return insights;
  }

  return {
    ...insights,
    secondary: [
      spendingLimitInsights[0],
      ...(Array.isArray(insights?.secondary) ? insights.secondary : []),
    ].slice(0, 3),
  };
}

function calculateInvestmentGoalMonths(targetDate?: string | null) {
  if (!targetDate) return 0;
  const today = new Date();
  const target = new Date(`${targetDate}T12:00:00`);
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

function projectInvestmentGoalValue(currentAmount: number, monthlyContribution: number, annualRate: number, months: number) {
  if (months <= 0) return currentAmount;
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let balance = currentAmount;

  for (let month = 0; month < months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  return balance;
}

function solveInvestmentGoalContribution(currentAmount: number, annualRate: number, months: number, targetAmount: number) {
  if (targetAmount <= currentAmount || months <= 0) return 0;

  let low = 0;
  let high = Math.max(targetAmount, 1000);

  while (projectInvestmentGoalValue(currentAmount, high, annualRate, months) < targetAmount) {
    high *= 2;
    if (high > targetAmount * 10) break;
  }

  for (let iteration = 0; iteration < 32; iteration += 1) {
    const mid = (low + high) / 2;
    if (projectInvestmentGoalValue(currentAmount, mid, annualRate, months) >= targetAmount) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

function buildInvestmentGoalSnapshots(goals: any[], investments: any[]) {
  return goals.map((goal) => {
    const linkedCurrentAmount = goal.auto_invest
      ? (goal.linked_investments || []).reduce((sum: number, investmentId: string) => {
          const investment = investments.find((item: any) => item.id === investmentId);
          if (!investment) return sum;
          return sum + Number(investment.current_value || (Number(investment.quantity) * Number(investment.current_price || investment.purchase_price || 0)));
        }, 0)
      : 0;

    const currentAmount = Number(goal.current_amount || 0) + linkedCurrentAmount;
    const targetAmount = Number(goal.target_amount || 0);
    const monthlyContribution = Number(goal.monthly_contribution || 0);
    const annualRate = Number(goal.expected_return_rate || 0);
    const monthsRemaining = calculateInvestmentGoalMonths(goal.target_date);
    const finalProjection = projectInvestmentGoalValue(currentAmount, monthlyContribution, annualRate, monthsRemaining);
    const requiredMonthlyContribution = solveInvestmentGoalContribution(currentAmount, annualRate, monthsRemaining, targetAmount);

    return {
      id: goal.id,
      name: goal.name,
      category: goal.category,
      targetAmount,
      currentAmount,
      monthlyContribution,
      finalProjection: Number(finalProjection.toFixed(2)),
      projectedGap: Math.max(0, Number((targetAmount - finalProjection).toFixed(2))),
      requiredMonthlyContribution: Number(requiredMonthlyContribution.toFixed(2)),
      linkedInvestmentsCount: goal.auto_invest ? (goal.linked_investments || []).length : 0,
      progressPercentage: targetAmount > 0 ? Number(((currentAmount / targetAmount) * 100).toFixed(1)) : 0,
      monthsRemaining,
      isOnTrack: finalProjection >= targetAmount,
    };
  });
}

function buildInvestmentGoalInsights(investmentGoals: any[]) {
  if (!investmentGoals.length) return [];

  const topGapGoal = [...investmentGoals].sort((a, b) => b.projectedGap - a.projectedGap)[0];
  const route = '/metas?tab=investments';

  if (topGapGoal.projectedGap > 0) {
    return [
      {
        priority: topGapGoal.requiredMonthlyContribution > topGapGoal.monthlyContribution * 1.5 ? 'warning' : 'info',
        type: 'portfolio_health',
        headline: `${topGapGoal.name} precisa de ajuste`,
        description: `A meta projeta ${topGapGoal.progressPercentage}% de progresso e ainda tem gap de R$ ${topGapGoal.projectedGap.toFixed(2)}. Para fechar no prazo, o aporte mensal estimado é R$ ${topGapGoal.requiredMonthlyContribution.toFixed(2)}.`,
        action: {
          label: 'Revisar meta',
          route,
        },
      },
    ];
  }

  return [
    {
      priority: 'celebration',
      type: 'goal_achievement',
      headline: `${topGapGoal.name} está no caminho`,
      description: `A meta está coberta pela projeção atual. Valor projetado: R$ ${topGapGoal.finalProjection.toFixed(2)} para um alvo de R$ ${topGapGoal.targetAmount.toFixed(2)}.`,
      action: {
        label: 'Ver meta',
        route,
      },
    },
  ];
}

function mergeInvestmentGoalInsights(insights: any, investmentGoalInsights: any[]) {
  if (!investmentGoalInsights.length) return insights;

  const alreadyHasInvestmentGoalInsight = [
    insights?.primary,
    ...(Array.isArray(insights?.secondary) ? insights.secondary : []),
  ].some((item) => item?.type === 'portfolio_health' || item?.type === 'goal_achievement');

  if (alreadyHasInvestmentGoalInsight) {
    return insights;
  }

  return {
    ...insights,
    secondary: [
      investmentGoalInsights[0],
      ...(Array.isArray(insights?.secondary) ? insights.secondary : []),
    ].slice(0, 3),
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Preferências do usuário via body (opcional)
    let preferences = undefined;
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }
    const userId = user.id;
    console.log('[ana-dashboard-insights] User ID:', userId);
    // 🔥 VERIFICAR CACHE (se não for forceRefresh)
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase.from('ana_insights_cache').select('insights, expires_at').eq('user_id', userId).eq('insight_type', 'dashboard').single();
      if (!cacheError && cachedData) {
        const expiresAt = new Date(cachedData.expires_at);
        const now = new Date();
        if (expiresAt > now) {
          console.log('[ana-dashboard-insights] ✅ Retornando do CACHE (válido até', expiresAt.toISOString(), ')');
          const educationMentoring = await buildDashboardEducationMentoringEntry(supabase, userId);
          return new Response(JSON.stringify({ ...cachedData.insights, educationMentoring }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Cache-Hit': 'true',
              'X-Cache-Expires': expiresAt.toISOString()
            }
          });
        } else {
          console.log('[ana-dashboard-insights] ⏰ Cache expirado, regenerando...');
        }
      }
    } else {
      console.log('[ana-dashboard-insights] 🔄 forceRefresh=true, ignorando cache');
    }
    console.log('[ana-dashboard] 🚀 Gerando novos insights...');
    // FETCH CONSOLIDADO DE DADOS
    console.log('[ana-dashboard] Buscando dados consolidados...');
    // 1. CONTAS A PAGAR
    const { data: bills } = await supabase.from('payable_bills').select('*').eq('user_id', user.id);
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const overdueBills = bills?.filter((b)=>b.status === 'overdue') || [];
    const upcomingBills = bills?.filter((b)=>{
      if (b.status !== 'pending') return false;
      const dueDate = new Date(b.due_date);
      return dueDate >= now && dueDate <= sevenDaysLater;
    }) || [];
    const paidThisMonth = bills?.filter((b)=>{
      if (b.status !== 'paid') return false;
      const paidDate = new Date(b.paid_at || b.updated_at);
      return paidDate >= firstDayOfMonth;
    }) || [];
    const totalBills = bills?.length || 0;
    // Contar TODAS as contas pagas em dia (não só deste mês)
    const allPaidBills = bills?.filter((b)=>b.status === 'paid') || [];
    const onTimeBills = allPaidBills.filter((b)=>{
      const dueDate = new Date(b.due_date);
      const paidDate = new Date(b.paid_at || b.updated_at);
      return paidDate <= dueDate;
    }).length;
    const billsContext = {
      overdue: {
        count: overdueBills.length,
        total: overdueBills.reduce((sum, b)=>sum + (b.amount || 0), 0)
      },
      upcoming7Days: {
        count: upcomingBills.length,
        total: upcomingBills.reduce((sum, b)=>sum + (b.amount || 0), 0)
      },
      paidThisMonth: {
        count: paidThisMonth.length,
        total: paidThisMonth.reduce((sum, b)=>sum + (b.amount || 0), 0)
      },
      onTimeRate: totalBills > 0 ? onTimeBills / totalBills * 100 : 0
    };
    // 2. INVESTIMENTOS
    const { data: investments } = await supabase.from('investments').select('*').eq('user_id', user.id).eq('is_active', true);
    const totalInvested = investments?.reduce((sum, inv)=>sum + (inv.total_invested || inv.quantity * inv.purchase_price), 0) || 0;
    const totalValue = investments?.reduce((sum, inv)=>{
      const currentValue = inv.current_value || inv.quantity * (inv.current_price || inv.purchase_price);
      return sum + currentValue;
    }, 0) || 0;
    const returnPercentage = totalInvested > 0 ? (totalValue - totalInvested) / totalInvested * 100 : 0;
    const allocation = {};
    investments?.forEach((inv)=>{
      const cat = inv.category || 'outros';
      const value = inv.current_value || inv.quantity * (inv.current_price || inv.purchase_price);
      allocation[cat] = (allocation[cat] || 0) + value;
    });
    const topPerformers = investments?.map((inv)=>{
      const currentValue = inv.current_value || inv.quantity * (inv.current_price || inv.purchase_price);
      const invested = inv.total_invested || inv.quantity * inv.purchase_price;
      const returnPct = invested > 0 ? (currentValue - invested) / invested * 100 : 0;
      return {
        ticker: inv.ticker || inv.name,
        return: returnPct
      };
    }).sort((a, b)=>b.return - a.return).slice(0, 3) || [];
    const { data: alerts } = await supabase.from('investment_alerts').select('*').eq('user_id', user.id).eq('is_active', true).limit(5);
    const { data: investmentGoals } = await supabase
      .from('investment_goals')
      .select('id, name, category, target_amount, current_amount, target_date, monthly_contribution, expected_return_rate, linked_investments, auto_invest, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('target_date', {
        ascending: true
      })
      .limit(10);
    const investmentGoalsActive = buildInvestmentGoalSnapshots(investmentGoals || [], investments || []);
    const portfolioContext = {
      totalValue,
      totalInvested,
      returnPercentage,
      allocation,
      topPerformers,
      investmentGoals: investmentGoalsActive,
      alerts: alerts?.map((a)=>({
          type: a.alert_type,
          message: `${a.ticker}: ${a.target_value}`
        })) || []
    };
    // 3. TRANSAÇÕES (últimos 30 dias)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoDate = formatDateOnly(thirtyDaysAgo);
    const todayDateStr = formatDateOnly(now);
    const [{ data: transactions }, { data: creditCardTransactions }, canonicalTaxonomy] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('transaction_date', thirtyDaysAgoDate),
      supabase.from('credit_card_transactions').select('amount, purchase_date, category_id').eq('user_id', user.id).gte('purchase_date', thirtyDaysAgoDate),
      loadCanonicalTaxonomyContext({
        supabase,
        userId: user.id,
        startDate: thirtyDaysAgoDate,
        endDate: todayDateStr,
        includeRecentCreations: true,
      }),
    ]);
    const income = transactions?.filter((t)=>t.type === 'income').reduce((sum, t)=>sum + t.amount, 0) || 0;
    const regularExpenses = transactions?.filter((t)=>t.type === 'expense' && (t.is_paid ?? true)).reduce((sum, t)=>sum + t.amount, 0) || 0;
    const cardExpenses = creditCardTransactions?.reduce((sum, t)=>sum + Number(t.amount || 0), 0) || 0;
    const expenses = regularExpenses + cardExpenses;
    const transactionsContext = {
      last30Days: {
        income,
        expenses,
        balance: income - expenses
      }
    };
    const [{ data: userSettings }, { data: notificationPreferences }, { data: financialCycles }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('monthly_savings_goal_percentage, monthly_closing_day, budget_allocation, budget_alert_threshold')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('notification_preferences')
        .select('budget_alert_threshold_percentage, budget_alert_thresholds')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('financial_cycles')
        .select('id, name, type, day, notify_start, notify_days_before, active')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('day', { ascending: true }),
    ]);
    // 4. METAS (Goals)
    const { data: goals } = await supabase.from('financial_goals').select('id,name,goal_type,target_amount,current_amount,deadline,category_id,period_start,period_end,status,updated_at,created_at,category:categories(name)').eq('user_id', user.id).in('status', [
      'active',
      'exceeded'
    ]).limit(10);
    const goalsActive = (goals || []).map((g)=>{
      const target = Number(g.target_amount) || 0;
      const current = Number(g.current_amount) || 0;
      const progress = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
      let daysLeft = undefined;
      if (g.goal_type === 'spending_limit' && g.period_end) {
        const periodEnd = parseDateOnly(g.period_end);
        daysLeft = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined;
      } else if (g.deadline) {
        const deadline = parseDateOnly(g.deadline);
        daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined;
      }
      const periodStart = parseDateOnly(g.period_start);
      const periodEnd = parseDateOnly(g.period_end);
      const elapsedDays = periodStart ? Math.max(1, Math.floor((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1) : 1;
      const totalDays = periodStart && periodEnd ? Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1) : undefined;
      const averageDaily = g.goal_type === 'spending_limit' ? current / elapsedDays : undefined;
      const projectedTotal = averageDaily && totalDays ? averageDaily * totalDays : undefined;
      return {
        id: g.id,
        name: g.name,
        type: g.goal_type,
        target,
        current,
        progress,
        daysLeft,
        status: g.status,
        categoryId: g.category_id,
        categoryName: g.category?.name || g.name,
        remaining: target - current,
        projectedTotal,
      };
    });
    const spendingLimitsActive = goalsActive.filter((g)=>g.type === 'spending_limit').map((g)=>({
        id: g.id,
        name: g.name,
        categoryId: g.categoryId,
        categoryName: g.categoryName,
        target: g.target,
        current: g.current,
        percentage: g.progress,
        remaining: g.remaining,
        daysLeft: g.daysLeft ?? null,
        projectedTotal: Number((g.projectedTotal || g.current).toFixed(2)),
        status: g.status
      }));
    const goalsContext = {
      active: goalsActive,
      recentlyAchieved: [],
      spendingLimits: spendingLimitsActive,
      investmentGoals: investmentGoalsActive
    };
    // 5. CARTÕES DE CRÉDITO (✅ NOVO)
    const { data: creditCards } = await supabase.from('credit_cards').select('*').eq('user_id', user.id).eq('is_active', true).eq('is_archived', false);
    const { data: invoices } = await supabase.from('credit_card_invoices').select('*, credit_card:credit_cards(name)').eq('user_id', user.id).in('status', [
      'open',
      'closed',
      'overdue'
    ]);
    const totalLimit = creditCards?.reduce((sum, c)=>sum + Number(c.credit_limit), 0) || 0;
    const totalUsed = creditCards?.reduce((sum, c)=>sum + (Number(c.credit_limit) - Number(c.available_limit)), 0) || 0;
    const utilizationRate = totalLimit > 0 ? totalUsed / totalLimit * 100 : 0;
    const upcomingInvoices = invoices?.filter((i)=>i.status === 'closed') || [];
    const overdueInvoices = invoices?.filter((i)=>i.status === 'overdue') || [];
    const creditCardsContext = {
      totalLimit,
      totalUsed,
      totalAvailable: totalLimit - totalUsed,
      utilizationRate,
      activeCardsCount: creditCards?.length || 0,
      upcomingInvoices: upcomingInvoices.map((i)=>({
          card: i.credit_card?.name || 'Cartão',
          amount: Number(i.total_amount),
          dueDate: i.due_date
        })),
      overdueInvoices: overdueInvoices.map((i)=>({
          card: i.credit_card?.name || 'Cartão',
          amount: Number(i.total_amount),
          dueDate: i.due_date
        }))
    };
    const budgetAlertThreshold = notificationPreferences?.budget_alert_threshold_percentage ||
      userSettings?.budget_alert_threshold ||
      notificationPreferences?.budget_alert_thresholds?.[0] ||
      80;
    const monthlySavingsGoalPercentage = Number(userSettings?.monthly_savings_goal_percentage || 0);
    const actualSavingsAmount = Math.max(0, income - expenses);
    const actualSavingsRate = income > 0 ? Number(((actualSavingsAmount / income) * 100).toFixed(1)) : 0;
    const targetSavingsAmount = income > 0
      ? Number(((income * monthlySavingsGoalPercentage) / 100).toFixed(2))
      : 0;
    const activeCyclesSummary = (financialCycles || []).map((cycle: any) => {
      const nextDate = getNextCycleDate(Number(cycle.day || 1), now);
      const daysUntil = Math.ceil((nextDate.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: cycle.id,
        name: cycle.name,
        type: cycle.type,
        day: cycle.day,
        notifyStart: Boolean(cycle.notify_start),
        notifyDaysBefore: Number(cycle.notify_days_before || 0),
        nextDate: formatDateOnly(nextDate),
        daysUntil,
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
    const settingsContext = {
      monthlySavingsGoalPercentage,
      monthlyClosingDay: Number(userSettings?.monthly_closing_day || 1),
      budgetAllocation: userSettings?.budget_allocation || null,
      budgetAlertThreshold,
      targetSavingsAmount,
      actualSavingsAmount: Number(actualSavingsAmount.toFixed(2)),
      actualSavingsRate,
      last30DaysIncome: Number(income.toFixed(2)),
      last30DaysExpenses: Number(expenses.toFixed(2)),
    };
    const cyclesContext = {
      activeCount: activeCyclesSummary.length,
      nextCycle: activeCyclesSummary[0] || null,
      cycles: activeCyclesSummary,
    };
    const hasSufficientData = totalBills > 0 || (investments?.length || 0) > 0 || (transactions?.length || 0) > 0 || (creditCardTransactions?.length || 0) > 0 || goalsActive.length > 0 || investmentGoalsActive.length > 0 || (creditCards?.length || 0) > 0 || (invoices?.length || 0) > 0;
    // CONSTRUIR CONTEXTO COMPLETO
    const context = {
      bills: billsContext,
      portfolio: portfolioContext,
      goals: goalsContext,
      transactions: transactionsContext,
      creditCards: creditCardsContext,
      settings: settingsContext,
      cycles: cyclesContext,
      canonicalTaxonomy,
      currentMonth: now.toLocaleString('pt-BR', {
        month: 'long',
        year: 'numeric'
      }),
      previousMonth: new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('pt-BR', {
        month: 'long',
        year: 'numeric'
      })
    };
    console.log('[ana-dashboard] Contexto consolidado:', JSON.stringify(context, null, 2).substring(0, 500));
    if (!hasSufficientData) {
      const payload = {
        primary: {
          priority: 'info',
          type: 'savings_tip',
          headline: 'Dados insuficientes para gerar insights',
          description: 'Comece registrando transações, contas, metas ou investimentos para a Ana Clara analisar sua vida financeira.',
          action: {
            label: 'Ver transações',
            route: '/transacoes'
          }
        },
        secondary: [],
        healthScore: 0,
        motivationalQuote: 'Cada novo registro deixa sua analise financeira mais inteligente.',
        meta: {
          hasSufficientData: false,
          counts: {
            bills: totalBills,
            investments: investments?.length || 0,
            transactions: transactions?.length || 0,
            goals: goalsActive.length,
            creditCards: creditCards?.length || 0,
            invoices: invoices?.length || 0
          }
        }
      };
      return new Response(JSON.stringify(payload), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'false'
        }
      });
    }
    // CHAMAR GPT-4
    const systemPrompt = `Você é Ana Clara, uma coach financeira IA empática e motivadora, especializada em finanças pessoais brasileiras.

Seu papel:
- Analisar a situação financeira do usuário de forma holística
- Priorizar insights mais CRÍTICOS e ACIONÁVEIS
- Celebrar conquistas e motivar continuidade
- Alertar sobre riscos com empatia, sem assustar
- Usar linguagem clara, direta e motivacional
- Incluir números reais sempre que possível
- Quando houver spending_limit relevante, trate como meta mensal de gasto por categoria com percentual consumido, valor restante, dias restantes e projeção

Princípios:
1. PRIORIZE por urgência: Contas vencidas > Vencendo em breve > Oportunidades
2. CELEBRE conquistas: Metas atingidas, economia acima da média
3. ALERTE com empatia: "Atenção", não "ERRO" ou "PROBLEMA"
4. SEJA ESPECÍFICA: Use nomes de ativos, valores reais, datas
5. AÇÃO CLARA: Sempre sugira próximo passo concreto

✅ TAXONOMIA (canonicalTaxonomy no JSON):
- Use apenas nomes e números desse objeto para categorias e tags; não invente categorias.
- uncategorizedExpenseSharePercent e fallbackExpenseSharePercent indicam pressão sobre "Sem categoria" / categoria de fallback (ex.: Outros).

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
1. CRITICAL: Contas vencidas >3 dias OU spending_limit >100%
2. CELEBRATION: Meta alcançada (>100%) OU meta de investimento no caminho com folga OU economia >20% vs mês anterior
3. WARNING: Contas vencendo em ≤3 dias OU spending_limit >=80% OU portfólio concentrado >20% em 1 ativo OU meta de investimento com gap relevante
4. INFO: Oportunidades de investimento, dicas de economia, ou metas de gasto sob controle

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
- healthScore: baseado em: contas em dia (30pts), investimentos positivos (30pts), metas de gasto equilibradas (20pts), diversificação (20pts)
- Para insights de transações ou tendências, quando fizer sentido, inclua "visualization": {"type":"chart","data":{"points":[n1,n2,n3,n4,n5,n6,n7]}} com 7 pontos (1 por semana)
- Seja específica: use nomes, valores, percentuais reais`;
    // Buscar configuração do provedor do usuário
    const aiConfig = await getDefaultAIConfig(supabase, userId);
    let insightsText;
    if (aiConfig) {
      console.log('[ana-dashboard] 🔧 Usando provider do usuário:', aiConfig.provider, aiConfig.model);
      const combinedSystem = (aiConfig.systemPrompt ? aiConfig.systemPrompt + '\n\n' : '') + systemPrompt;
      const messages = [
        {
          role: 'system',
          content: combinedSystem
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];
      insightsText = await callChat({
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey: aiConfig.apiKey,
        temperature: Math.min(1.5, Math.max(0, aiConfig.temperature || 0.8)),
        maxTokens: ensureStructuredOutputTokens(aiConfig.maxTokens, 3500),
        systemPrompt: aiConfig.systemPrompt
      }, messages);
    } else {
      // Fallback para OpenAI usando variável de ambiente
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY não configurada e nenhum provedor de IA definido');
      }
      console.log('[ana-dashboard] ⚠️ Usando fallback OpenAI');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.8,
          ...(usesOpenAIMaxCompletionTokens('gpt-5.4-mini')
            ? { max_completion_tokens: 3500 }
            : { max_tokens: 3500 })
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ana-dashboard] OpenAI error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      const data = await response.json();
      insightsText = data.choices[0]?.message?.content;
    }
    if (!insightsText) {
      throw new Error('Resposta vazia do GPT-4');
    }
    console.log('[ana-dashboard] Insights recebidos:', insightsText.substring(0, 300));
    let insights;
    try {
      insights = parseDashboardInsightsResponse(insightsText);
    } catch (parseError) {
      console.error('[ana-dashboard] Erro ao parsear JSON:', parseError);
      throw new Error('Erro ao processar resposta do GPT-4');
    }
    insights = mergeSpendingLimitInsights(insights, buildSpendingLimitInsights(spendingLimitsActive));
    insights = mergeInvestmentGoalInsights(insights, buildInvestmentGoalInsights(investmentGoalsActive));
    const settingsDrivenInsights = buildFinancialSettingsInsight(settingsContext);
    const cycleDrivenInsights = buildCycleInsight(cyclesContext);
    const supplementalInsights = [...settingsDrivenInsights, ...cycleDrivenInsights];
    if (supplementalInsights.length) {
      const alreadyHasSimilarInsight = [
        insights?.primary,
        ...(Array.isArray(insights?.secondary) ? insights.secondary : []),
      ].some((item)=>item?.type === 'savings_tip');

      if (!alreadyHasSimilarInsight) {
        insights = {
          ...insights,
          secondary: [
            ...supplementalInsights,
            ...(Array.isArray(insights?.secondary) ? insights.secondary : []),
          ].slice(0, 3),
        };
      }
    }
    const healthBreakdown = {
      bills: clamp(Math.round((Number(billsContext.onTimeRate || 0) / 100) * 30), 0, 30),
      investments: portfolioContext.totalInvested > 0
        ? clamp(
            Math.round(
              15 +
                clamp(Number(portfolioContext.returnPercentage || 0), -10, 10) +
                Math.min(5, Number((investments?.length || 0) * 1.5))
            ),
            0,
            30
          )
        : 0,
      budget: spendingLimitsActive.length > 0
        ? clamp(
            Math.round(
              20 -
                Math.min(
                  20,
                  Math.max(0, Number(spendingLimitsActive[0]?.percentage || 0) - Number(budgetAlertThreshold))
                ) / 2
            ),
            0,
            20
          )
        : 10,
      planning: monthlySavingsGoalPercentage > 0 && income > 0
        ? clamp(Math.round((actualSavingsRate / monthlySavingsGoalPercentage) * 20), 0, 20)
        : activeCyclesSummary.length > 0
          ? 12
          : 0,
    };
    insights.healthBreakdown = healthBreakdown;
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
          const transactionSeries = [
            ...((transactions || []).filter((t)=>t.type === 'expense' && (t.is_paid ?? true)).map((t)=>({
                amount: Number(t.amount) || 0,
                date: t.transaction_date
              }))),
            ...((creditCardTransactions || []).map((t)=>({
                amount: Number(t.amount) || 0,
                date: t.purchase_date
              })))
          ];
          transactionSeries.forEach((t)=>{
            const d = parseDateOnly(t.date);
            if (!d) return;
            if (d < start) return;
            const diffDays = Math.floor((d.getTime() - start.getTime()) / dayMs);
            const bucket = Math.min(6, Math.floor(diffDays / (30 / 7)));
            bins[bucket] += t.amount;
          });
          // Se houver dados relevantes, injeta visualização
          const total = bins.reduce((s, v)=>s + v, 0);
          if (total > 0) {
            insights.primary = {
              ...insights.primary,
              visualization: {
                type: 'chart',
                data: {
                  points: bins.map((v)=>Number(v.toFixed(2)))
                }
              }
            };
          }
        }
      }
    } catch (e) {
      console.warn('[ana-dashboard] Falha ao gerar visualization de fallback:', e);
    }
    // Validar estrutura
    if (!insights.primary || typeof insights.healthScore !== 'number' || !Array.isArray(insights.secondary)) {
      console.error('[ana-dashboard] Estrutura inválida:', insights);
      throw new Error('Estrutura de resposta inválida');
    }
    console.log('[ana-dashboard] Insights gerados com sucesso. Health Score:', insights.healthScore);
    // Anexar metadados úteis para gamificação/UX (não quebram o frontend)
    // Bins semanais de transações (últimas 3 semanas)
    const weeklyIncome = [
      0,
      0,
      0
    ];
    const weeklyExpenses = [
      0,
      0,
      0
    ];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    [
      ...((transactions || []).map((t)=>({
          type: t.type,
          amount: Number(t.amount) || 0,
          date: t.transaction_date,
          is_paid: t.is_paid ?? true
        }))),
      ...((creditCardTransactions || []).map((t)=>({
          type: 'expense',
          amount: Number(t.amount) || 0,
          date: t.purchase_date,
          is_paid: true
        })))
    ].forEach((t)=>{
      if (t.type === 'expense' && !t.is_paid) return;
      const tDate = parseDateOnly(t.date);
      if (!tDate) return;
      const diff = nowMs - tDate.getTime();
      if (diff < 0 || diff > 3 * weekMs) return;
      const weekIdx = Math.min(2, Math.floor(diff / weekMs));
      const amt = t.amount;
      if (t.type === 'income') weeklyIncome[weekIdx] += amt;
      else if (t.type === 'expense') weeklyExpenses[weekIdx] += amt;
    });
    // Daily overdue count (últimos 14 dias)
    const dailyOverdue = new Array(14).fill(0);
    const dayMs = 24 * 60 * 60 * 1000;
    (bills || []).forEach((b)=>{
      if (b.status !== 'overdue') return;
      const dueDate = new Date(b.due_date);
      const diff = nowMs - dueDate.getTime();
      if (diff < 0 || diff > 14 * dayMs) return;
      const dayIdx = Math.min(13, Math.floor(diff / dayMs));
      dailyOverdue[dayIdx]++;
    });
    const meta = {
      hasSufficientData: true,
      bills: {
        onTimeRate: billsContext.onTimeRate,
        overdueCount: overdueBills.length
      },
      transactions: {
        ...transactionsContext.last30Days
      },
      spendingLimits: {
        count: spendingLimitsActive.length,
        highestUsage: spendingLimitsActive[0]?.percentage || 0
      },
      investmentGoals: {
        count: investmentGoalsActive.length,
        highestProjectedGap: investmentGoalsActive[0]?.projectedGap || 0
      },
      portfolio: {
        returnPercentage: portfolioContext.returnPercentage
      },
      settings: settingsContext,
      cycles: cyclesContext,
      healthBreakdown,
      weekly: {
        income: weeklyIncome,
        expenses: weeklyExpenses
      },
      dailyOverdue
    };
    const educationMentoring = await buildDashboardEducationMentoringEntry(supabase, userId);
    const payload = {
      ...insights,
      meta,
      educationMentoring,
    };
    // ✅ SALVAR NO CACHE (8h)
    console.log('[ana-dashboard] Salvando insights no cache (válido por 8h)...');
    // 💾 SALVAR NO CACHE (8 horas)
    const cacheNow = new Date();
    const expiresAt = new Date(cacheNow.getTime() + 8 * 60 * 60 * 1000);
    const { error: upsertError } = await supabase.from('ana_insights_cache').upsert({
      user_id: userId,
      insight_type: 'dashboard',
      insights: payload,
      generated_at: cacheNow.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: cacheNow.toISOString()
    }, {
      onConflict: 'user_id,insight_type'
    });
    if (upsertError) {
      console.error('[ana-dashboard] Erro ao salvar cache:', upsertError);
    // Não falhar a requisição por erro de cache
    } else {
      console.log('[ana-dashboard] ✅ Cache salvo (expira em 8h)');
    }
    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false',
        'X-Cache-Expires': expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('[ana-dashboard] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar insights';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
