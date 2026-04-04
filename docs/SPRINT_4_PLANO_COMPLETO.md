# 🚀 SPRINT 4: ANA CLARA + INSIGHTS - PLANO COMPLETO

**Duração:** 3 dias (24h estimado)  
**Objetivo:** IA proativa com insights personalizados e monitoramento 24/7  
**Status:** 📋 PLANEJADO

---

## 🎯 OBJETIVOS DO SPRINT

### **Features Killer:**
1. 🔥 **Investment Radar** - Ana Clara monitora mercado 24/7
2. 🔥 **Smart Rebalance** - Sugestões automáticas de ajustes
3. 🔥 **Ana Insights Widget** - Portfolio Health Score 0-100
4. 🔥 **WhatsApp Commands** - Comandos naturais via N8N

### **Resultado Esperado:**
✅ Ana Clara funcionando como consultora financeira IA  
✅ Oportunidades de mercado detectadas automaticamente  
✅ Rebalanceamento sugerido quando necessário  
✅ WhatsApp respondendo comandos de investimentos  
✅ Gamificação básica implementada  

---

## 📅 CRONOGRAMA DETALHADO

### **DIA 1: INVESTMENT RADAR** (8h)

#### **Backend (4h):**
- [ ] Edge Function `generate-opportunities`
  - Análise de portfólio atual
  - Busca oportunidades: Tesouro >13%, FIIs >10%, Ações P/L <10
  - Salva em `market_opportunities`
  - Calcula confidence_score
- [ ] Cron Job para rodar radar 1x/dia (09:00)
- [ ] Integration com APIs externas
- [ ] Functions: `dismiss_opportunity`, `expire_old_opportunities`

#### **Frontend (4h):**
- [ ] Hook `useMarketOpportunities`
- [ ] Component `OpportunityCard` (com dismiss)
- [ ] Component `OpportunityFeed` (lista)
- [ ] Integration na página Investments
- [ ] Notificação toast quando nova oportunidade

---

### **DIA 2: SMART REBALANCE** (8h)

#### **Utils (2h):**
- [ ] `calculateRebalancing()` function
  - Compara current vs target allocation
  - Gera ações BUY/SELL quando diff > 5%
  - Calcula valores exatos

#### **Frontend (4h):**
- [ ] Hook `useAllocationTargets`
- [ ] Component `SmartRebalanceWidget`
  - Cards de ações sugeridas
  - Badges BUY/SELL
  - Razões para cada ação
  - Botão "Aplicar sugestão"
- [ ] Integration na aba "Visão Geral"

#### **Backend (2h):**
- [ ] Function `apply_rebalance_suggestion`
- [ ] Validações e limites

---

### **DIA 3: ANA INSIGHTS + WHATSAPP** (8h)

#### **Ana Insights (4h):**
- [ ] Utils: `calculatePortfolioHealthScore()`
  - Diversificação (30pts)
  - Alocação correta (25pts)
  - Performance (25pts)
  - Liquidez (20pts)
- [ ] Hook `useAnaInsights`
- [ ] Component `AnaInvestmentInsights`
  - Avatar Ana Clara
  - Health Score com Progress
  - Insight principal
  - Ações sugeridas
- [ ] Integration na página

#### **WhatsApp Commands (3h):**
- [ ] N8N workflow para investment commands
- [ ] Handlers:
  - "portfólio" → resumo
  - "adicionar X {ticker} a {preço}" → registrar
  - "{ticker}" → cotação
  - "dividendos" → próximos pagamentos
  - "oportunidades" → radar
  - "rebalancear" → sugestões
- [ ] Response formatters

#### **Gamificação (1h):**
- [ ] Badge system básico
- [ ] Achievements: "Primeira compra", "10 investimentos", etc
- [ ] UI simples

---

## 🗄️ ARQUITETURA DATABASE

### **Tabelas Existentes (usar):**
```sql
-- JÁ CRIADAS NO SPRINT 1
market_opportunities (
  id uuid,
  user_id uuid,
  type text, -- 'fixed_income_opportunity', 'stock_opportunity', etc
  title text,
  description text,
  confidence_score integer,
  asset_class text,
  expected_return numeric,
  risk_level text,
  expires_at timestamp,
  dismissed boolean,
  created_at timestamp
)

investment_allocation_targets (
  id uuid,
  user_id uuid,
  asset_class text,
  target_percentage numeric,
  created_at timestamp
)
```

### **Novas Functions SQL:**
```sql
-- Expirar oportunidades antigas (>7 dias)
CREATE OR REPLACE FUNCTION expire_old_opportunities()
RETURNS void AS $$
BEGIN
  UPDATE market_opportunities
  SET dismissed = true
  WHERE expires_at < NOW() AND dismissed = false;
END;
$$ LANGUAGE plpgsql;

-- Buscar oportunidades ativas
CREATE OR REPLACE FUNCTION get_active_opportunities(p_user_id uuid)
RETURNS SETOF market_opportunities AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM market_opportunities
  WHERE user_id = p_user_id
    AND dismissed = false
    AND expires_at > NOW()
  ORDER BY confidence_score DESC, created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎨 ARQUITETURA UI/UX

### **Página Investments - Nova Estrutura:**

```
/investimentos
├─ 📊 4 Cards Resumo (já existe)
├─ 📑 6 Abas: (ATUALIZADO - era 5)
│  ├─ 💼 Portfólio (já existe)
│  ├─ 📈 Transações (já existe)
│  ├─ 💰 Dividendos (já existe)
│  ├─ 🔔 Alertas (já existe)
│  ├─ 🤖 Ana Clara [NOVA] 🔥
│  │  ├─ Portfolio Health Score
│  │  ├─ Investment Radar Feed
│  │  ├─ Smart Rebalance Widget
│  │  └─ Gamificação Badges
│  └─ 📊 Visão Geral (já existe)
│     └─ + Ana Insights Card (adicionar)
```

**OU** (alternativa mais simples):

```
/investimentos
├─ 📊 4 Cards Resumo
├─ Ana Clara Widget (topo, sempre visível) 🔥
├─ 📑 5 Abas (mantém as atuais)
│  └─ Visão Geral
│     ├─ Gráficos (já existe)
│     ├─ Investment Radar Feed [NOVO]
│     └─ Smart Rebalance Widget [NOVO]
```

### **Componentes Novos:**

1. **AnaInvestmentInsights** (Card principal)
```tsx
<Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
  <CardHeader>
    <Avatar + "Ana Clara diz:"
  </CardHeader>
  <CardContent>
    <HealthScore circular progress />
    <Insight message />
    <SuggestedActions buttons />
  </CardContent>
</Card>
```

2. **OpportunityFeed** (Lista de oportunidades)
```tsx
<div className="space-y-4">
  {opportunities.map(opp => (
    <OpportunityCard
      type={opp.type}
      title={opp.title}
      description={opp.description}
      confidenceScore={opp.confidence_score}
      onDismiss={() => dismiss(opp.id)}
    />
  ))}
</div>
```

3. **SmartRebalanceWidget** (Sugestões)
```tsx
<Card>
  <CardHeader>🎯 Rebalanceamento Sugerido</CardHeader>
  <CardContent>
    {actions.map(action => (
      <div className="flex justify-between items-center p-3 border-l-4">
        <Badge>{action.action}</Badge>
        <span>{action.assetClass}</span>
        <span className="font-bold">{formatCurrency(action.amount)}</span>
      </div>
    ))}
    <Button>Aplicar Sugestão</Button>
  </CardContent>
</Card>
```

### **Design System:**

**Cores Ana Clara:**
- Primary: Purple (#8b5cf6)
- Secondary: Pink (#ec4899)
- Success: Green (#10b981)
- Warning: Amber (#f59e0b)

**Avatars:**
- Ana Clara: `/ana-clara.png` (circular, 40px)
- User badges: Circle with icon

**Animações:**
- Insights: Fade in + slide up
- Opportunities: Slide in from right
- Health Score: Circular progress animated

---

## 🔧 CÓDIGO DE REFERÊNCIA

### **1. Investment Radar - Edge Function**

```typescript
// supabase/functions/generate-opportunities/index.ts
import { createClient } from '@supabase/supabase-js';

export async function generateOpportunities(userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // 1. Buscar portfólio atual
  const { data: investments } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  const opportunities: Opportunity[] = [];
  
  // 2. Analisar renda fixa
  const fixedIncomeAllocation = calculateAllocation(investments, 'renda_fixa');
  if (fixedIncomeAllocation < 30) {
    opportunities.push({
      type: 'fixed_income_opportunity',
      title: 'Renda fixa abaixo do recomendado',
      description: 'Considere aumentar exposição em Tesouro Direto ou CDBs',
      confidence_score: 80,
      asset_class: 'renda_fixa',
      risk_level: 'low',
      expires_at: addDays(new Date(), 7),
    });
  }
  
  // 3. Buscar FIIs com alto yield (API externa)
  const highYieldREITs = await fetchHighYieldREITs();
  if (highYieldREITs.length > 0) {
    opportunities.push({
      type: 'reit_opportunity',
      title: `FII ${highYieldREITs[0].ticker} com yield atrativo`,
      description: `${highYieldREITs[0].name} está pagando ${highYieldREITs[0].yield}% a.a.`,
      confidence_score: 75,
      asset_class: 'fiis',
      expected_return: highYieldREITs[0].yield,
      risk_level: 'medium',
      expires_at: addDays(new Date(), 3),
    });
  }
  
  // 4. Salvar no banco
  const { error } = await supabase
    .from('market_opportunities')
    .insert(opportunities.map(opp => ({ ...opp, user_id: userId })));
  
  // 5. Notificar via WhatsApp (se houver novas)
  if (opportunities.length > 0) {
    await sendWhatsAppNotification(userId, opportunities[0]);
  }
  
  return opportunities;
}
```

### **2. Smart Rebalance - Utils**

```typescript
// src/utils/smartRebalance.ts
export interface RebalanceAction {
  assetClass: string;
  action: 'BUY' | 'SELL';
  amount: number;
  percentage: number;
  reason: string;
}

export function calculateRebalancing(
  currentAllocation: Allocation[],
  targetAllocation: Allocation[],
  totalValue: number
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];
  const threshold = 5; // Rebalancear se diferença > 5%
  
  for (const target of targetAllocation) {
    const current = currentAllocation.find(a => a.class === target.class);
    const currentPct = current?.percentage || 0;
    const diff = target.percentage - currentPct;
    
    if (Math.abs(diff) > threshold) {
      const amount = (Math.abs(diff) / 100) * totalValue;
      
      actions.push({
        assetClass: target.class,
        action: diff > 0 ? 'BUY' : 'SELL',
        amount,
        percentage: Math.abs(diff),
        reason: `Alocação atual: ${currentPct.toFixed(1)}%, Meta: ${target.percentage}%`,
      });
    }
  }
  
  return actions.sort((a, b) => b.percentage - a.percentage);
}
```

### **3. Portfolio Health Score - Utils**

```typescript
// src/utils/portfolioHealthScore.ts
export interface HealthScoreBreakdown {
  total: number;
  diversification: number; // 0-30
  allocation: number; // 0-25
  performance: number; // 0-25
  liquidity: number; // 0-20
}

export function calculatePortfolioHealthScore(
  investments: Investment[],
  targets: AllocationTarget[]
): HealthScoreBreakdown {
  let score = {
    total: 0,
    diversification: 0,
    allocation: 0,
    performance: 0,
    liquidity: 0,
  };
  
  // 1. Diversificação (30 pontos)
  const assetClasses = new Set(investments.map(i => i.category)).size;
  score.diversification = Math.min((assetClasses / 6) * 30, 30);
  
  // 2. Alocação vs Meta (25 pontos)
  const allocationDiff = calculateAllocationDiff(investments, targets);
  score.allocation = Math.max(25 - allocationDiff * 2, 0);
  
  // 3. Performance (25 pontos)
  const avgReturn = calculateAvgReturn(investments);
  if (avgReturn > 10) score.performance = 25;
  else if (avgReturn > 5) score.performance = 20;
  else if (avgReturn > 0) score.performance = 15;
  else score.performance = 0;
  
  // 4. Liquidez (20 pontos)
  const liquidAssets = investments.filter(i => 
    ['acoes_nacionais', 'fiis', 'cripto'].includes(i.category)
  );
  const liquidityPct = (liquidAssets.length / investments.length) * 100;
  score.liquidity = Math.min((liquidityPct / 60) * 20, 20);
  
  score.total = Math.round(
    score.diversification + 
    score.allocation + 
    score.performance + 
    score.liquidity
  );
  
  return score;
}
```

### **4. WhatsApp Commands - N8N Handlers**

```typescript
// src/services/whatsappCommands.ts
export const investmentCommands = {
  'portfólio': async (userId: string) => {
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId);
    
    const summary = formatPortfolioSummary(investments);
    return `💎 *Seu Portfólio*\n\n${summary}`;
  },
  
  'adicionar {quantidade} {ticker} a {preço}': async (
    userId: string,
    params: { quantidade: number; ticker: string; preço: number }
  ) => {
    const investment = {
      user_id: userId,
      ticker: params.ticker.toUpperCase(),
      quantity: params.quantidade,
      purchase_price: params.preço,
      type: 'stock',
      status: 'active',
    };
    
    await supabase.from('investments').insert(investment);
    
    return `✅ *Investimento registrado!*\n\n${params.quantidade} x ${params.ticker} a R$ ${params.preço}`;
  },
  
  '{ticker}': async (userId: string, ticker: string) => {
    const quote = await getQuote(ticker);
    const change = quote.regularMarketChange >= 0 ? '📈' : '📉';
    
    return `
📊 *${ticker.toUpperCase()}*

Preço: R$ ${quote.regularMarketPrice.toFixed(2)}
${change} Variação: ${quote.regularMarketChangePercent.toFixed(2)}%
    `.trim();
  },
  
  'dividendos': async (userId: string) => {
    const dividends = await getUpcomingDividends(userId);
    return formatDividendsSummary(dividends);
  },
  
  'oportunidades': async (userId: string) => {
    const { data: opportunities } = await supabase
      .from('market_opportunities')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('confidence_score', { ascending: false })
      .limit(3);
    
    return formatOpportunities(opportunities);
  },
};
```

---

## 📦 ENTREGÁVEIS

### **Backend:**
- [ ] Edge Function: `generate-opportunities`
- [ ] Edge Function: `ana-insights`
- [ ] Cron Job: Investment Radar (1x/dia)
- [ ] SQL Functions: expire_opportunities, get_active_opportunities
- [ ] WhatsApp handlers (N8N)

### **Frontend:**
- [ ] Hooks: useMarketOpportunities, useAnaInsights, useAllocationTargets
- [ ] Components: AnaInvestmentInsights, OpportunityCard, OpportunityFeed, SmartRebalanceWidget
- [ ] Utils: calculatePortfolioHealthScore, calculateRebalancing
- [ ] Nova aba "Ana Clara" OU integration na "Visão Geral"
- [ ] Gamificação básica (badges)

### **Documentação:**
- [ ] SPRINT_4_DIA_1_COMPLETO.md
- [ ] SPRINT_4_DIA_2_COMPLETO.md
- [ ] SPRINT_4_DIA_3_COMPLETO.md
- [ ] SPRINT_4_COMPLETO_FINAL.md

---

## ✅ CRITÉRIOS DE SUCESSO

### **Funcional:**
- [ ] Portfolio Health Score calculando corretamente
- [ ] Oportunidades aparecendo no feed
- [ ] Smart Rebalance sugerindo ajustes quando diff > 5%
- [ ] WhatsApp respondendo 5+ comandos
- [ ] Badges de gamificação funcionando

### **Performance:**
- [ ] Radar executando em < 10s
- [ ] Health Score calculado em < 500ms
- [ ] WhatsApp respondendo em < 3s

### **UX:**
- [ ] Ana Clara visível e destacada
- [ ] Insights claros e acionáveis
- [ ] Notificações não invasivas
- [ ] Mobile responsivo

---

## 🚀 PRÓXIMO SPRINT

**SPRINT 5: ANALYTICS AVANÇADO** (3 dias)
- DIA 1: Diversification Score + UI
- DIA 2: Heat Map Performance (estilo GitHub)
- DIA 3: Benchmark Comparison + Relatórios IR

---

**Data de Criação:** 09 Nov 2025  
**Status:** 📋 PRONTO PARA EXECUÇÃO
