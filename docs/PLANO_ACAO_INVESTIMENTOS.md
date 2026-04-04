# 🚀 PLANO DE AÇÃO: Tornar Investimentos 100% Real

**Data:** 10/11/2025  
**Baseado em:** AUDITORIA_INVESTIMENTOS_COMPLETA.md  
**Objetivo:** Transformar sistema de estimativas em análises 100% reais

---

## 📊 RESUMO DO PROBLEMA

**Score Atual:** 72%  
**Score Desejado:** 95%+  
**Gap:** 23 pontos percentuais

**Principais Lacunas:**
1. ❌ Ana Clara não usa IA real (30% vs 90% esperado)
2. ❌ Oportunidades baseadas em regras (50% vs 85% esperado)
3. ⚠️ Dividendos estimados (60% vs 90% esperado)
4. ❌ Heat Map com dados mock (20% vs 85% esperado)

---

## 🎯 FASE 1: ANA CLARA COM GPT-4 REAL

**Prioridade:** 🔴 CRÍTICA  
**Impacto:** +60 pontos (30% → 90%)  
**Tempo:** 4-6 horas

### Arquivos a Criar/Modificar

#### 1. Edge Function: `ana-investment-insights`

**Criar:** `supabase/functions/ana-investment-insights/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  }>;
  targets?: Array<{ assetClass: string; targetPercentage: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { portfolio }: { portfolio: Portfolio } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Construir contexto detalhado
    const context = `
ANÁLISE DE PORTFÓLIO DE INVESTIMENTOS

📊 MÉTRICAS GERAIS:
- Total Investido: R$ ${portfolio.totalInvested.toLocaleString('pt-BR')}
- Valor Atual: R$ ${portfolio.currentValue.toLocaleString('pt-BR')}
- Retorno Total: R$ ${portfolio.totalReturn.toLocaleString('pt-BR')} (${portfolio.returnPercentage.toFixed(2)}%)

🎯 ALOCAÇÃO ATUAL:
${Object.entries(portfolio.allocation)
  .map(([asset, data]) => `- ${asset}: ${data.percentage.toFixed(1)}% (R$ ${data.value.toLocaleString('pt-BR')})`)
  .join('\n')}

📈 INVESTIMENTOS INDIVIDUAIS:
${portfolio.investments
  .map(inv => `- ${inv.ticker} (${inv.type}): ${inv.quantity}x | Retorno: ${inv.returnPercentage.toFixed(2)}%${inv.dividendYield ? ` | Yield: ${inv.dividendYield}%` : ''}`)
  .join('\n')}

${portfolio.targets ? `🎯 METAS DE ALOCAÇÃO:\n${portfolio.targets.map(t => `- ${t.assetClass}: ${t.targetPercentage}%`).join('\n')}` : ''}
`;

    const prompt = `Você é Ana Clara, uma consultora financeira IA especializada em investimentos.

Analise este portfólio real e forneça insights PRÁTICOS e PERSONALIZADOS.

${context}

Forneça uma resposta em formato JSON com:
{
  "healthScore": number (0-100),
  "level": "excellent" | "good" | "warning" | "critical",
  "mainInsight": string (3-4 parágrafos de análise detalhada),
  "strengths": [string, string, string],
  "warnings": [string, string],
  "recommendations": [
    { "title": string, "description": string, "priority": "high" | "medium" | "low" },
    ...
  ],
  "nextSteps": [string, string, string]
}

IMPORTANTE:
- Seja objetiva e direta
- Use dados brasileiros (Tesouro, CDI, IPCA, B3)
- Considere o contexto econômico atual
- Priorize diversificação e segurança
- Seja honesta sobre riscos
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é Ana Clara, consultora financeira especializada em investimentos brasileiros.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const insights = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ana-insights] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 2. Hook Atualizado: `useAnaInsights.ts`

**Modificar:** `src/hooks/useAnaInsights.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useAllocationTargets } from './useAllocationTargets';
import type { Investment } from '@/types/database.types';

export interface AnaInsightsGPT {
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
  isLoading: boolean;
  error?: string;
}

export function useAnaInsights(investments: Investment[]): AnaInsightsGPT {
  const metrics = usePortfolioMetrics(investments);
  const { targets } = useAllocationTargets();
  
  const [insights, setInsights] = useState<AnaInsightsGPT>({
    healthScore: 0,
    level: 'warning',
    mainInsight: '',
    strengths: [],
    warnings: [],
    recommendations: [],
    nextSteps: [],
    isLoading: true,
  });

  useEffect(() => {
    async function fetchInsights() {
      try {
        setInsights(prev => ({ ...prev, isLoading: true, error: undefined }));

        const portfolio = {
          totalInvested: metrics.totalInvested,
          currentValue: metrics.currentValue,
          totalReturn: metrics.totalReturn,
          returnPercentage: metrics.returnPercentage,
          allocation: metrics.allocation,
          investments: investments.map(inv => ({
            ticker: inv.ticker || inv.name,
            type: inv.type,
            quantity: inv.quantity,
            returnPercentage: inv.return_percentage || 0,
            dividendYield: inv.dividend_yield,
          })),
          targets: targets.map(t => ({
            assetClass: t.asset_class,
            targetPercentage: t.target_percentage,
          })),
        };

        const { data, error } = await supabase.functions.invoke('ana-investment-insights', {
          body: { portfolio },
        });

        if (error) throw error;

        setInsights({
          ...data,
          isLoading: false,
        });
      } catch (err) {
        console.error('[useAnaInsights] Erro:', err);
        setInsights(prev => ({
          ...prev,
          isLoading: false,
          error: err.message || 'Erro ao carregar insights',
        }));
      }
    }

    if (investments.length > 0 && metrics.currentValue > 0) {
      fetchInsights();
    }
  }, [investments, metrics, targets]);

  return insights;
}
```

#### 3. Componente Atualizado: `AnaInvestmentInsights.tsx`

**Modificar:** `src/components/investments/AnaInvestmentInsights.tsx`

```tsx
// Adicionar seção de recomendações
<div className="space-y-3">
  <h3 className="font-semibold">Recomendações da Ana Clara:</h3>
  {insight.recommendations.map((rec, i) => (
    <Card key={i} className={rec.priority === 'high' ? 'border-red-300' : ''}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {rec.priority === 'high' && <AlertTriangle className="h-4 w-4 text-red-600" />}
          {rec.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{rec.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

### Deploy

```bash
# 1. Adicionar secret no Supabase
# Dashboard > Project Settings > Edge Functions > Secrets
# OPENAI_API_KEY = sk-proj-...

# 2. Deploy da função
supabase functions deploy ana-investment-insights --project-ref sbnpmhmvcspwcyjhftlw

# 3. Testar
curl -X POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/ana-investment-insights \
  -H "Authorization: Bearer <token>" \
  -d '{"portfolio": {...}}'
```

---

## 🎯 FASE 2: OPORTUNIDADES REAIS DE MERCADO

**Prioridade:** 🔴 ALTA  
**Impacto:** +35 pontos (50% → 85%)  
**Tempo:** 6-8 horas

### Arquivos a Criar/Modificar

#### 1. Edge Function Melhorada: `generate-opportunities`

**Modificar:** `supabase/functions/generate-opportunities/index.ts`

```typescript
// Adicionar busca de FIIs reais
async function fetchRealFIIsOpportunities(userId: string): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];

  try {
    // API B3 ou Status Invest (mock example)
    const fiisResponse = await fetch('https://statusinvest.com.br/category/fii');
    // Parse HTML ou usar API alternativa
    
    // Filtrar FIIs com:
    // - Dividend Yield > 10%
    // - P/VP < 1.0
    // - Liquidez > R$ 1M/dia
    
    const topFIIs = [
      { ticker: 'HGLG11', yield: 10.5, pvp: 0.95 },
      { ticker: 'MXRF11', yield: 11.2, pvp: 0.88 },
    ];

    topFIIs.forEach(fii => {
      opportunities.push({
        user_id: userId,
        opportunity_type: 'buy_opportunity',
        ticker: fii.ticker,
        title: `${fii.ticker} - FII com yield de ${fii.yield}%`,
        description: `Fundo imobiliário com dividend yield de ${fii.yield}% a.a. e P/VP de ${fii.pvp}. Oportunidade de renda passiva mensal.`,
        confidence_score: 85,
        expected_return: fii.yield,
        current_price: 100, // buscar da B3
        target_price: 105,
        ana_clara_insight: `Fundamento sólido: Yield acima da média do setor (${fii.yield}% vs 8% média) e negociado abaixo do valor patrimonial.`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });
  } catch (error) {
    console.error('[FIIs] Erro:', error);
  }

  return opportunities;
}

// Adicionar busca de ações com fundamentos
async function fetchStocksWithLowPE(userId: string): Promise<Opportunity[]> {
  // Buscar ações com P/L < 10 via Fundamentus ou similar
  // Retornar oportunidades reais
}

// Adicionar busca de Tesouro Direto
async function fetchTreasuryOpportunities(userId: string): Promise<Opportunity[]> {
  try {
    const response = await fetch('https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json');
    const data = await response.json();
    
    // Filtrar títulos IPCA+ com taxa > 6.5%
    const goodBonds = data.TrsrBdTradgList.filter(bond => 
      bond.TrsrBd.nm.includes('IPCA+') && bond.TrsrBd.anulInvstmtRate > 6.5
    );

    return goodBonds.map(bond => ({
      user_id: userId,
      opportunity_type: 'buy_opportunity',
      ticker: bond.TrsrBd.cd,
      title: `${bond.TrsrBd.nm} - Taxa real de ${bond.TrsrBd.anulInvstmtRate}%`,
      description: `Tesouro IPCA+ com rentabilidade de IPCA + ${bond.TrsrBd.anulInvstmtRate}% a.a. Proteção contra inflação.`,
      confidence_score: 95,
      expected_return: bond.TrsrBd.anulInvstmtRate,
      ana_clara_insight: 'Tesouro Direto é o investimento mais seguro do Brasil. Ideal para reserva de longo prazo.',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  } catch (error) {
    console.error('[Tesouro] Erro:', error);
    return [];
  }
}
```

---

## 🎯 FASE 3: DIVIDENDOS REAIS

**Prioridade:** 🟡 MÉDIA  
**Impacto:** +30 pontos (60% → 90%)  
**Tempo:** 4-5 horas

### 1. Criar Tabela de Agenda de Dividendos

```sql
-- Migration: criar dividend_schedule
CREATE TABLE IF NOT EXISTS dividend_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  company_name TEXT,
  dividend_type TEXT, -- 'dividendo', 'jcp', 'rendimento'
  ex_dividend_date DATE NOT NULL,
  payment_date DATE NOT NULL,
  value_per_share NUMERIC(10,4) NOT NULL,
  source TEXT DEFAULT 'manual',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ticker, ex_dividend_date)
);

CREATE INDEX idx_dividend_schedule_ticker ON dividend_schedule(ticker);
CREATE INDEX idx_dividend_schedule_payment_date ON dividend_schedule(payment_date);

-- RLS
ALTER TABLE dividend_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dividendos públicos"
ON dividend_schedule FOR SELECT
TO authenticated
USING (true);
```

### 2. Edge Function para Buscar Dividendos

**Criar:** `supabase/functions/fetch-dividend-schedule/index.ts`

```typescript
// Integrar com API Status Invest ou scraping B3
// Salvar em dividend_schedule
// Retornar próximos 90 dias
```

### 3. Atualizar `useDividendCalendar`

```typescript
// Buscar de dividend_schedule ao invés de estimar
const { data: scheduledDividends } = await supabase
  .from('dividend_schedule')
  .select('*')
  .in('ticker', tickers)
  .gte('payment_date', today.toISOString())
  .lte('payment_date', in90Days.toISOString());

// Calcular valor real: quantity * value_per_share
```

---

## 🎯 FASE 4: HEAT MAP COM DADOS REAIS

**Prioridade:** 🟢 BAIXA  
**Impacto:** +15 pontos (20% → 85%)  
**Tempo:** 3-4 horas

### 1. Criar Tabela de Snapshots

```sql
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  snapshot_date DATE NOT NULL,
  total_invested NUMERIC(15,2) NOT NULL,
  current_value NUMERIC(15,2) NOT NULL,
  total_return NUMERIC(15,2) NOT NULL,
  return_percentage NUMERIC(10,2) NOT NULL,
  allocation JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, snapshot_date)
);
```

### 2. Cron Job Diário

**Criar:** Edge Function `create-portfolio-snapshot`

```typescript
// Rodar todo dia 1º às 00:00
// Para cada usuário:
// - Calcular métricas do portfólio
// - Salvar snapshot
```

### 3. Atualizar `PerformanceHeatMap`

```typescript
// Buscar snapshots dos últimos 12 meses
const { data: snapshots } = await supabase
  .from('portfolio_snapshots')
  .select('*')
  .eq('user_id', userId)
  .gte('snapshot_date', twelveMonthsAgo)
  .order('snapshot_date');

// Calcular retorno mensal: (atual - anterior) / anterior
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Semana 1 - Crítico
- [ ] Configurar OPENAI_API_KEY no Supabase
- [ ] Criar `ana-investment-insights` Edge Function
- [ ] Atualizar `useAnaInsights` hook
- [ ] Testar insights GPT-4
- [ ] Deploy e validação

### Semana 2 - Alto
- [ ] Integrar busca de FIIs reais
- [ ] Integrar API Tesouro Direto
- [ ] Buscar ações com fundamentos (Fundamentus)
- [ ] Atualizar `generate-opportunities`
- [ ] Testar oportunidades reais

### Semana 3 - Médio
- [ ] Criar tabela `dividend_schedule`
- [ ] Criar `fetch-dividend-schedule` Edge Function
- [ ] Atualizar `useDividendCalendar`
- [ ] Integrar com Status Invest ou B3
- [ ] Cron job para atualizar agenda

### Semana 4 - Baixo
- [ ] Criar tabela `portfolio_snapshots`
- [ ] Criar `create-portfolio-snapshot` Edge Function
- [ ] Cron job diário de snapshot
- [ ] Atualizar `PerformanceHeatMap`
- [ ] Testar heat map real

---

## 🎯 RESULTADO ESPERADO

### Score Final Projetado: **95%**

| Categoria | Atual | Projetado | Melhoria |
|-----------|-------|-----------|----------|
| Ana Clara | 30% | 95% | +65% 🚀 |
| Oportunidades | 50% | 85% | +35% 🚀 |
| Dividendos | 60% | 90% | +30% 🚀 |
| Heat Map | 20% | 85% | +65% 🚀 |
| Tesouro | 0% | 90% | +90% 🚀 |

**TOTAL:** 72% → 95% (+23 pontos)

---

## 💰 INVESTIMENTO NECESSÁRIO

### APIs Pagas (Opcional)
- **OpenAI GPT-4:** ~$0.03 por análise (estimado R$ 50-100/mês)
- **Status Invest API:** Grátis ou R$ 30/mês (Pro)
- **Alpha Vantage:** Grátis (limite 500 req/dia)

### Tempo de Desenvolvimento
- **Fase 1:** 4-6 horas
- **Fase 2:** 6-8 horas
- **Fase 3:** 4-5 horas
- **Fase 4:** 3-4 horas
- **TOTAL:** 17-23 horas (~3 dias de trabalho)

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Confirmar prioridades** com stakeholder
2. **Obter chave OpenAI** API key
3. **Iniciar Fase 1** (Ana Clara GPT-4)
4. **Testar com usuários reais**
5. **Iterar baseado em feedback**

---

**Status:** 📋 AGUARDANDO APROVAÇÃO  
**Responsável:** Equipe de Desenvolvimento  
**Prazo Sugerido:** 3-4 semanas para implementação completa
