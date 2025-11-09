# 🏗️ ARQUITETURA COMPLETA: MÓDULO INVESTIMENTOS

**Versão:** 2.0  
**Data:** 09 Nov 2025  
**Status:** Sprint 3 Completo | Sprints 4-5 Planejados

---

## 📊 VISÃO GERAL

### **Sprints Implementados:**
✅ **SPRINT 1:** Database Foundation (100%)  
✅ **SPRINT 3:** Features Core (100%)  
- CRUD + Transações
- Métricas + Alertas
- Gráficos + Dividendos

### **Sprints Planejados:**
📋 **SPRINT 4:** Ana Clara + Insights (0%)  
📋 **SPRINT 5:** Analytics Avançado (0%)

---

## 🗄️ ARQUITETURA DATABASE

### **Tabelas Existentes (Sprint 1 + 3):**

```sql
-- INVESTIMENTOS PRINCIPAL
CREATE TABLE investments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  
  -- Básico
  name text NOT NULL,
  ticker text,
  type text NOT NULL, -- 'stock', 'fund', 'crypto', 'treasury', 'real_estate'
  
  -- Categorização
  category text, -- 'renda_fixa', 'acoes_nacionais', 'fiis', 'internacional', 'cripto', 'previdencia'
  subcategory text,
  
  -- Quantidades e Valores
  quantity numeric NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL,
  current_price numeric,
  total_invested numeric,
  current_value numeric,
  
  -- Renda Fixa
  annual_rate numeric, -- Taxa anual
  maturity_date date,
  
  -- Dividendos
  dividend_yield numeric, -- Percentual anual
  
  -- Controle
  status text DEFAULT 'active', -- 'active', 'sold', 'matured'
  account_id uuid REFERENCES investment_accounts(id),
  purchase_date date,
  last_price_update timestamp,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- TRANSAÇÕES
CREATE TABLE investment_transactions (
  id uuid PRIMARY KEY,
  investment_id uuid REFERENCES investments(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  
  transaction_type text NOT NULL, -- 'buy', 'sell', 'dividend', 'split', 'bonus'
  quantity numeric,
  price numeric,
  total_value numeric NOT NULL,
  fees numeric,
  tax numeric,
  transaction_date date NOT NULL,
  notes text,
  created_at timestamp DEFAULT now()
);

-- CONTAS/CORRETORAS
CREATE TABLE investment_accounts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL, -- 'XP', 'Nu Invest', etc
  account_type text, -- 'brokerage', 'bank', 'crypto_exchange'
  account_number text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- METAS DE ALOCAÇÃO
CREATE TABLE investment_allocation_targets (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  asset_class text NOT NULL, -- 'renda_fixa', 'acoes', etc
  target_percentage numeric NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(user_id, asset_class)
);

-- CACHE DE COTAÇÕES
CREATE TABLE investment_quotes_history (
  id uuid PRIMARY KEY,
  ticker text NOT NULL,
  price numeric NOT NULL,
  source text, -- 'brapi', 'yahoo', etc
  quote_date timestamp NOT NULL,
  metadata jsonb,
  created_at timestamp DEFAULT now(),
  UNIQUE(ticker, quote_date)
);

-- ALERTAS DE PREÇO (Sprint 3)
CREATE TABLE investment_alerts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  investment_id uuid REFERENCES investments(id),
  ticker text NOT NULL,
  
  alert_type text NOT NULL, -- 'price_above', 'price_below', 'percent_change'
  target_value numeric NOT NULL,
  current_value numeric,
  
  is_active boolean DEFAULT true,
  triggered_at timestamp,
  last_checked timestamp,
  created_at timestamp DEFAULT now()
);

-- OPORTUNIDADES DE MERCADO (Ana Clara)
CREATE TABLE market_opportunities (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  
  type text NOT NULL, -- 'fixed_income_opportunity', 'stock_opportunity', etc
  title text NOT NULL,
  description text,
  
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  asset_class text,
  expected_return numeric,
  risk_level text, -- 'low', 'medium', 'high'
  
  expires_at timestamp,
  dismissed boolean DEFAULT false,
  dismissed_at timestamp,
  created_at timestamp DEFAULT now()
);
```

### **Views:**

```sql
-- RESUMO DO PORTFÓLIO
CREATE VIEW portfolio_summary AS
SELECT 
  user_id,
  COUNT(*) as total_investments,
  SUM(total_invested) as total_invested,
  SUM(current_value) as current_value,
  SUM(current_value - total_invested) as total_return,
  ((SUM(current_value) - SUM(total_invested)) / NULLIF(SUM(total_invested), 0) * 100) as return_percentage
FROM investments
WHERE is_active = true
GROUP BY user_id;

-- PERFORMANCE POR INVESTIMENTO
CREATE VIEW investment_performance AS
SELECT 
  id,
  user_id,
  name,
  ticker,
  category,
  current_value - total_invested as return_amount,
  ((current_value - total_invested) / NULLIF(total_invested, 0) * 100) as return_percentage,
  dividend_yield,
  EXTRACT(days FROM (CURRENT_DATE - purchase_date)) as days_held
FROM investments
WHERE is_active = true;
```

### **Functions:**

```sql
-- CALCULAR MÉTRICAS DO PORTFÓLIO
CREATE OR REPLACE FUNCTION calculate_portfolio_metrics(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_invested', COALESCE(SUM(total_invested), 0),
    'current_value', COALESCE(SUM(current_value), 0),
    'total_return', COALESCE(SUM(current_value - total_invested), 0),
    'return_percentage', 
      CASE 
        WHEN COALESCE(SUM(total_invested), 0) > 0 
        THEN ((COALESCE(SUM(current_value), 0) - COALESCE(SUM(total_invested), 0)) / COALESCE(SUM(total_invested), 1) * 100)
        ELSE 0 
      END,
    'num_investments', COUNT(*),
    'num_categories', COUNT(DISTINCT category)
  )
  INTO v_metrics
  FROM investments
  WHERE user_id = p_user_id AND is_active = true;
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- EXPIRAR OPORTUNIDADES ANTIGAS
CREATE OR REPLACE FUNCTION expire_old_opportunities()
RETURNS void AS $$
BEGIN
  UPDATE market_opportunities
  SET dismissed = true, dismissed_at = NOW()
  WHERE expires_at < NOW() AND dismissed = false;
END;
$$ LANGUAGE plpgsql;
```

### **Triggers:**

```sql
-- RECALCULAR INVESTIMENTO APÓS TRANSAÇÃO
CREATE OR REPLACE FUNCTION update_investment_after_transaction()
RETURNS trigger AS $$
BEGIN
  IF NEW.transaction_type = 'buy' THEN
    UPDATE investments
    SET 
      quantity = quantity + NEW.quantity,
      total_invested = total_invested + NEW.total_value,
      purchase_price = (total_invested + NEW.total_value) / (quantity + NEW.quantity),
      updated_at = NOW()
    WHERE id = NEW.investment_id;
    
  ELSIF NEW.transaction_type = 'sell' THEN
    UPDATE investments
    SET 
      quantity = quantity - NEW.quantity,
      status = CASE WHEN (quantity - NEW.quantity) <= 0 THEN 'sold' ELSE status END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_investment
AFTER INSERT ON investment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_investment_after_transaction();
```

---

## 🔧 ARQUITETURA BACKEND

### **Edge Functions (Supabase):**

#### **1. check-investment-alerts** ✅ DEPLOYADO
```
Endpoint: /functions/v1/check-investment-alerts
Frequência: 
  - A cada 5min (10h-17h, seg-sex) - Cron Job #14
  - A cada hora (off hours) - Cron Job #15
Função:
  - Buscar alertas ativos
  - Consultar cotações via BrAPI
  - Comparar com targets
  - Disparar quando condição atingida
  - Atualizar current_value
```

#### **2. generate-opportunities** 📋 PLANEJADO (Sprint 4)
```
Endpoint: /functions/v1/generate-opportunities
Frequência: 1x/dia (09:00)
Função:
  - Analisar portfólio do usuário
  - Detectar oportunidades:
    * Tesouro Direto >13%
    * FIIs com yield >10%
    * Ações com P/L <10
  - Salvar em market_opportunities
  - Notificar via WhatsApp
```

#### **3. ana-insights** 📋 PLANEJADO (Sprint 4)
```
Endpoint: /functions/v1/ana-insights
Função:
  - Calcular Portfolio Health Score
  - Gerar insights personalizados
  - Sugerir ações
  - Retornar como JSON
```

#### **4. create-portfolio-snapshot** 📋 PLANEJADO (Sprint 5)
```
Endpoint: /functions/v1/create-portfolio-snapshot
Frequência: Diária (00:00)
Função:
  - Snapshot diário do portfólio
  - Salvar em portfolio_snapshots
  - Usado para Heat Map histórico
```

### **Cron Jobs (pg_cron):**

```sql
-- JOB #14: Alertas (market hours) ✅
Schedule: */5 10-17 * * 1-5
Function: check-investment-alerts

-- JOB #15: Alertas (off hours) ✅
Schedule: 0 * * * *
Function: check-investment-alerts (condicional)

-- JOB #16: Investment Radar 📋 SPRINT 4
Schedule: 0 9 * * *
Function: generate-opportunities

-- JOB #17: Daily Snapshot 📋 SPRINT 5
Schedule: 0 0 * * *
Function: create-portfolio-snapshot
```

### **Integrações Externas:**

**BrAPI (Cotações Brasileiras):**
```typescript
GET https://brapi.dev/api/quote/{tickers}
Response: { results: [ { symbol, regularMarketPrice, ... } ] }
Usado: check-investment-alerts, sync-prices
```

**APIs de Benchmarks (Sprint 5):**
```typescript
CDI: API do Banco Central
IPCA: IBGE API
IBOVESPA: B3 ou Yahoo Finance
```

**WhatsApp (via N8N - Sprint 4):**
```typescript
Webhook: https://n8n.app/webhook/investment-commands
Commands:
  - "portfólio" → summary
  - "adicionar X PETR4 a Y" → create
  - "PETR4" → quote
  - "dividendos" → calendar
  - "oportunidades" → radar
```

---

## 🎨 ARQUITETURA FRONTEND

### **Estrutura de Pastas:**

```
src/
├── components/
│   ├── investments/
│   │   ├── InvestmentDialog.tsx ✅
│   │   ├── TransactionDialog.tsx ✅
│   │   ├── TransactionTimeline.tsx ✅
│   │   ├── PortfolioSummaryCards.tsx ✅
│   │   ├── AlertDialog.tsx ✅
│   │   ├── AlertsList.tsx ✅
│   │   ├── AssetAllocationChart.tsx ✅
│   │   ├── PortfolioEvolutionChart.tsx ✅
│   │   ├── PerformanceBarChart.tsx ✅
│   │   ├── DividendCalendar.tsx ✅
│   │   ├── DividendHistoryTable.tsx ✅
│   │   ├── AnaInvestmentInsights.tsx 📋 Sprint 4
│   │   ├── OpportunityCard.tsx 📋 Sprint 4
│   │   ├── OpportunityFeed.tsx 📋 Sprint 4
│   │   ├── SmartRebalanceWidget.tsx 📋 Sprint 4
│   │   ├── DiversificationScoreCard.tsx 📋 Sprint 5
│   │   ├── PerformanceHeatMap.tsx 📋 Sprint 5
│   │   ├── BenchmarkComparison.tsx 📋 Sprint 5
│   │   └── InvestmentReportDialog.tsx 📋 Sprint 5
│   └── ui/ (shadcn components)
├── hooks/
│   ├── useInvestments.ts ✅
│   ├── useInvestmentTransactions.ts ✅
│   ├── usePortfolioMetrics.ts ✅
│   ├── useInvestmentAlerts.ts ✅
│   ├── useDividendCalendar.ts ✅
│   ├── useMarketOpportunities.ts 📋 Sprint 4
│   ├── useAnaInsights.ts 📋 Sprint 4
│   ├── useAllocationTargets.ts 📋 Sprint 4
│   ├── useMonthlyReturns.ts 📋 Sprint 5
│   ├── useBenchmarks.ts 📋 Sprint 5
│   └── usePortfolioReturn.ts 📋 Sprint 5
├── utils/
│   ├── formatters.ts ✅
│   ├── portfolioHealthScore.ts 📋 Sprint 4
│   ├── smartRebalance.ts 📋 Sprint 4
│   ├── diversificationScore.ts 📋 Sprint 5
│   └── investmentReport.ts 📋 Sprint 5
├── pages/
│   └── Investments.tsx ✅ (5 abas)
└── types/
    └── database.types.ts ✅
```

### **Página Investments - Estrutura Atual:**

```tsx
/investimentos
├─ 📊 4 Cards Resumo (animados) ✅
│  ├─ Total Investido
│  ├─ Valor Atual
│  ├─ Valorização (R$ + %)
│  └─ Rentabilidade (%)
│
├─ 📑 5 Abas: ✅
│  ├─ 💼 Portfólio
│  │  ├─ Tabela de investimentos
│  │  ├─ Menu dropdown (editar/excluir)
│  │  └─ Botão "Novo Investimento"
│  │
│  ├─ 📈 Transações
│  │  ├─ Timeline agrupada por data
│  │  ├─ Ícones por tipo (Buy, Sell, Dividend, Split)
│  │  ├─ Menu dropdown (excluir)
│  │  └─ Botão "Nova Transação"
│  │
│  ├─ 💰 Dividendos 🔥
│  │  ├─ DividendCalendar
│  │  │  ├─ 3 Cards (30d, 90d, total)
│  │  │  ├─ Pagamentos por mês
│  │  │  └─ Cards individuais
│  │  └─ DividendHistoryTable
│  │     ├─ 3 Cards resumo
│  │     ├─ Breakdown por ano
│  │     └─ Tabela detalhada
│  │
│  ├─ 🔔 Alertas
│  │  ├─ Lista de alertas
│  │  ├─ Progress bar (proximidade)
│  │  ├─ Badges de status
│  │  ├─ Toggle ativar/desativar
│  │  └─ Botão "Novo Alerta"
│  │
│  └─ 📊 Visão Geral
│     ├─ Grid 2 colunas:
│     │  ├─ AssetAllocationChart (Donut)
│     │  └─ PortfolioEvolutionChart (Line)
│     └─ PerformanceBarChart (Full width)
```

### **Estrutura Planejada (Sprint 4-5):**

```tsx
/investimentos
├─ 📊 4 Cards Resumo ✅
│
├─ Ana Clara Widget (topo) 📋 Sprint 4
│  ├─ Avatar + "Ana Clara diz:"
│  ├─ Portfolio Health Score (circular)
│  ├─ Insight principal
│  └─ Ações sugeridas (buttons)
│
├─ 📑 5 Abas (ou 6 com nova aba "Ana Clara"):
│  ├─ 💼 Portfólio ✅
│  ├─ 📈 Transações ✅
│  ├─ 💰 Dividendos ✅
│  ├─ 🔔 Alertas ✅
│  │
│  ├─ 🤖 Ana Clara [NOVA] 📋 Sprint 4
│  │  ├─ Portfolio Health Score (detalhado)
│  │  ├─ OpportunityFeed
│  │  │  ├─ Cards de oportunidades
│  │  │  └─ Botão dismiss
│  │  ├─ SmartRebalanceWidget
│  │  │  ├─ Ações BUY/SELL
│  │  │  └─ Botão aplicar
│  │  └─ Gamificação (badges)
│  │
│  └─ 📊 Visão Geral ✅ + 📋 Sprint 5
│     ├─ Gráficos (Donut, Line, Bar) ✅
│     ├─ DiversificationScoreCard 📋
│     ├─ PerformanceHeatMap 📋
│     ├─ BenchmarkComparison 📋
│     └─ Botão "Gerar Relatório" 📋
```

---

## 🎨 DESIGN SYSTEM

### **Cores:**

```typescript
// Cores principais
const colors = {
  // Investimentos
  invested: '#3b82f6', // Azul
  current: '#10b981', // Verde
  positive: '#10b981', // Verde (ganhos)
  negative: '#ef4444', // Vermelho (perdas)
  
  // Ana Clara
  ana: {
    primary: '#8b5cf6', // Purple
    secondary: '#ec4899', // Pink
  },
  
  // Categorias
  rendaFixa: '#10b981', // Verde
  acoesNacionais: '#3b82f6', // Azul
  fiis: '#f59e0b', // Âmbar
  internacional: '#8b5cf6', // Roxo
  cripto: '#ec4899', // Rosa
  previdencia: '#6366f1', // Índigo
  outros: '#6b7280', // Cinza
  
  // Dividendos
  dividends: {
    next30: '#10b981',
    next90: '#3b82f6',
    total: '#8b5cf6',
  },
  
  // Heat Map
  heatMap: {
    high: '#16a34a', // Verde escuro
    medium: '#4ade80', // Verde claro
    low: '#bbf7d0', // Verde muito claro
    neutral: '#e5e7eb', // Cinza
    lowNeg: '#fecaca', // Vermelho claro
    mediumNeg: '#f87171', // Vermelho médio
    highNeg: '#dc2626', // Vermelho escuro
  },
};
```

### **Componentes UI (shadcn/ui):**

✅ **Já usados:**
- Card, CardHeader, CardTitle, CardContent
- Button, Badge
- Dialog, DialogTrigger, DialogContent, DialogHeader
- Tabs, TabsList, TabsTrigger, TabsContent
- Progress
- Tooltip, TooltipTrigger, TooltipContent
- Select, SelectTrigger, SelectContent, SelectItem

📋 **A usar (Sprint 4-5):**
- Avatar, AvatarImage
- Separator
- RadioGroup
- Checkbox

### **Animações (Framer Motion):**

```typescript
// Entrada de cards
const cardVariant = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: index * 0.1 },
};

// Entrada lateral
const slideVariant = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 },
};

// Progress circular
const circularProgress = {
  initial: { pathLength: 0 },
  animate: { pathLength: score / 100 },
  transition: { duration: 1, ease: 'easeOut' },
};
```

---

## 📈 MÉTRICAS E KPIs

### **Portfolio Health Score (0-100):**

```typescript
interface HealthScoreBreakdown {
  total: number; // 0-100
  diversification: number; // 0-30
  allocation: number; // 0-25
  performance: number; // 0-25
  liquidity: number; // 0-20
}

// Critérios:
// 1. Diversification (30pts):
//    - 6+ classes de ativo: 30pts
//    - 3-5 classes: 15-25pts
//    - 1-2 classes: 0-10pts
//
// 2. Allocation (25pts):
//    - Próximo das metas: 25pts
//    - Diff < 10%: 15-20pts
//    - Diff > 10%: 0-10pts
//
// 3. Performance (25pts):
//    - Retorno > 10% a.a.: 25pts
//    - Retorno > 5% a.a.: 20pts
//    - Retorno > 0%: 15pts
//    - Retorno < 0%: 0pts
//
// 4. Liquidity (20pts):
//    - > 60% em ativos líquidos: 20pts
//    - 30-60%: 10-15pts
//    - < 30%: 0-5pts
```

### **Diversification Score (0-100):**

```typescript
interface DiversificationBreakdown {
  assetClasses: number; // 0-30
  concentration: number; // 0-30
  numAssets: number; // 0-20
  geography: number; // 0-20
}

// Critérios:
// 1. Asset Classes (30pts): Número de classes diferentes
// 2. Concentration (30pts): Nenhum ativo > 30% do total
// 3. Num Assets (20pts): Ideal 10+ ativos
// 4. Geography (20pts): Exposição internacional
```

---

## 🚀 ROADMAP COMPLETO

### **✅ SPRINT 1: Database Foundation** (100%)
- 6 tabelas, 2 views, 4 functions, 3 triggers
- 25 RLS policies

### **✅ SPRINT 3: Features Core** (100%)
- CRUD + Transações (4 tipos)
- Métricas + Alertas (Edge Function + 2 Cron Jobs)
- Gráficos (Donut, Line, Bar)
- Dividendos (Calendar + History)
- 5 abas funcionais

### **📋 SPRINT 4: Ana Clara + Insights** (0%)
**DIA 1:** Investment Radar
**DIA 2:** Smart Rebalance
**DIA 3:** Ana Insights + WhatsApp

### **📋 SPRINT 5: Analytics Avançado** (0%)
**DIA 1:** Diversification Score
**DIA 2:** Heat Map Performance
**DIA 3:** Benchmarks + Reports

### **⏳ Pós-MVP (Backlog):**
- Tax Optimizer
- Social Goals
- Retirement Calculator avançado
- Monte Carlo Simulation
- Backtesting

---

**Última Atualização:** 09 Nov 2025  
**Versão:** 2.0  
**Status:** ✅ Pronto para Sprint 4
