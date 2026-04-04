# 🚀 SPRINT 3: FEATURES CORE - PLANO COMPLETO

**Duração:** 4 dias  
**Status:** 📋 Planejamento  
**Objetivo:** Sistema completo de gestão de investimentos com CRUD, transações, gráficos e alertas

---

## 📊 VISÃO GERAL

### **O que será implementado:**
✅ CRUD completo de investimentos (Create, Read, Update, Delete)  
✅ Sistema de transações (Buy, Sell, Dividend, Split)  
✅ 3 Gráficos interativos (Donut, Line, Bar)  
✅ Dividend Calendar (próximos dividendos) 🎯 **FEATURE KILLER**  
✅ Sistema de alertas de preço  
✅ Atualização automática de cotações  
✅ Métricas de portfólio (valor total, retorno, alocação)  

---

## 🗄️ ARQUITETURA DO BANCO DE DADOS

### **Tabelas Existentes (Sprint 1):**

#### **1. investments** (expandida)
```sql
-- Campos principais
id UUID PRIMARY KEY
user_id UUID (FK)
name TEXT
ticker TEXT
type TEXT -- 'stock', 'fund', 'crypto', 'treasury', 'real_estate', 'other'
category TEXT -- 'renda_fixa', 'acoes_nacionais', 'fiis', 'internacional', 'cripto', 'previdencia'
subcategory TEXT

-- Quantidades e valores
quantity DECIMAL
purchase_price DECIMAL -- Preço médio de compra
current_price DECIMAL
total_invested DECIMAL
current_value DECIMAL

-- Renda fixa
annual_rate DECIMAL
maturity_date DATE
dividend_yield DECIMAL

-- Controle
status TEXT -- 'active', 'sold', 'matured'
account_id UUID (FK investment_accounts)
purchase_date DATE
last_price_update TIMESTAMP
```

#### **2. investment_transactions**
```sql
id UUID PRIMARY KEY
user_id UUID (FK)
investment_id UUID (FK investments)
type TEXT -- 'buy', 'sell', 'dividend', 'split', 'bonus'
quantity DECIMAL
price DECIMAL
total_amount DECIMAL
date DATE
notes TEXT
created_at TIMESTAMP
```

#### **3. investment_accounts**
```sql
id UUID PRIMARY KEY
user_id UUID (FK)
name TEXT -- 'Nu Invest', 'XP', 'Clear'
type TEXT -- 'broker', 'bank'
status TEXT -- 'active', 'inactive'
```

#### **4. investment_allocation_targets** (metas)
```sql
id UUID PRIMARY KEY
user_id UUID (FK)
asset_class TEXT -- 'renda_fixa', 'acoes', 'fiis', etc
target_percentage DECIMAL -- Meta: 30%, 40%, etc
```

#### **5. investment_quotes_history** (cache de cotações - Sprint 2)
```sql
id UUID PRIMARY KEY
symbol TEXT
price DECIMAL
source TEXT -- 'brapi', 'coingecko', 'tesouro'
cached_at TIMESTAMP
metadata JSONB
```

### **Novas Tabelas (Sprint 3):**

#### **6. investment_alerts** (alertas de preço)
```sql
CREATE TABLE investment_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'price_above', 'price_below', 'percent_change'
  target_value DECIMAL NOT NULL,
  current_value DECIMAL,
  is_active BOOLEAN DEFAULT true,
  last_checked TIMESTAMP,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_alert_type CHECK (alert_type IN ('price_above', 'price_below', 'percent_change'))
);

-- Índices
CREATE INDEX idx_investment_alerts_user_active ON investment_alerts(user_id, is_active);
CREATE INDEX idx_investment_alerts_ticker ON investment_alerts(ticker);

-- RLS
ALTER TABLE investment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON investment_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON investment_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON investment_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON investment_alerts FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 🎨 ARQUITETURA UI/UX

### **Estrutura de Páginas:**

```
/investimentos
├─ Header (breadcrumb, filtros, botões)
├─ Portfolio Summary Cards (4 cards)
│  ├─ Total Investido
│  ├─ Valor Atual
│  ├─ Valorização
│  └─ Rentabilidade %
├─ Tabs
│  ├─ 📊 Visão Geral (default)
│  │  ├─ Gráfico Donut (Alocação por Categoria)
│  │  ├─ Gráfico Line (Evolução Temporal)
│  │  └─ Gráfico Bar (Performance por Ativo)
│  ├─ 💼 Meus Investimentos
│  │  ├─ Filtros (categoria, corretora, status)
│  │  ├─ Grid de InvestmentCards
│  │  └─ Botão "Novo Investimento"
│  ├─ 📈 Transações
│  │  ├─ Timeline de transações
│  │  ├─ Filtros (tipo, período, investimento)
│  │  └─ Botão "Nova Transação"
│  ├─ 💰 Dividendos
│  │  ├─ DividendCalendar (próximos 90 dias)
│  │  ├─ Histórico de recebimentos
│  │  └─ Total recebido (mês/ano)
│  └─ 🔔 Alertas
│     ├─ Lista de alertas ativos
│     ├─ Histórico de alertas disparados
│     └─ Botão "Novo Alerta"
```

---

## 🧩 COMPONENTES UI/UX

### **DIA 1-2: Componentes Base**

#### **1. InvestmentCard.tsx** (Card individual)
```tsx
interface InvestmentCardProps {
  investment: Investment;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewTransactions: (id: string) => void;
}

// Design:
// - Badge de categoria (cor por tipo)
// - Ticker em destaque
// - Quantidade × Preço médio
// - Valor atual (grande)
// - Rentabilidade % (verde/vermelho com seta)
// - Mini gráfico sparkline (evolução 7 dias)
// - Menu dropdown (Editar, Transações, Alertas, Deletar)
// - Animação hover com glassmorphism
```

#### **2. InvestmentDialog.tsx** (CRUD)
```tsx
// Abas:
// 1. Básico (nome, ticker, tipo, categoria, corretora)
// 2. Valores (quantidade, preço compra, data)
// 3. Renda Fixa (taxa, vencimento) - condicional
// 4. Observações

// Features:
// - Validação Zod
// - Busca ticker com autocomplete (API BrAPI)
// - Cálculo automático de totais
// - Upload de comprovante (futuro)
```

#### **3. TransactionDialog.tsx**
```tsx
// Campos:
// - Tipo (Buy, Sell, Dividend, Split)
// - Investimento (select com busca)
// - Quantidade
// - Preço unitário
// - Total (calculado)
// - Data
// - Observações

// Validações:
// - Buy: adiciona à quantidade
// - Sell: não pode vender mais que tem
// - Dividend: não altera quantidade
// - Split: recalcula preço médio
```

#### **4. AlertDialog.tsx**
```tsx
// Campos:
// - Investimento (select)
// - Tipo (Preço acima, Preço abaixo, Variação %)
// - Valor alvo
// - Notificação (Push, Email, WhatsApp)

// Features:
// - Preview do alerta
// - Validação de valor (não pode ser negativo)
// - Status do alerta (ativo/inativo)
```

### **DIA 3: Gráficos**

#### **5. AssetAllocationChart.tsx** (Donut)
```tsx
// Biblioteca: Recharts
// Tipo: PieChart com Legend
// Dados: Alocação por categoria
// Cores: Personalizadas por categoria
// Tooltip: Nome, Valor, %
// Centro: Total investido
```

#### **6. PortfolioEvolutionChart.tsx** (Line)
```tsx
// Biblioteca: Recharts
// Tipo: LineChart com CartesianGrid
// Dados: Valor do portfólio ao longo do tempo
// Linhas:
//   - Portfolio (roxo, linha cheia)
//   - Benchmark CDI (cinza, linha tracejada)
// Períodos: 1M, 3M, 6M, 1A, Tudo
// Tooltip: Data, Valor, Variação %
```

#### **7. PerformanceBarChart.tsx** (Bar)
```tsx
// Biblioteca: Recharts
// Tipo: BarChart
// Dados: Rentabilidade % por ativo (top 10)
// Cores: Verde (positivo), Vermelho (negativo)
// Eixo Y: Percentual
// Tooltip: Ticker, Rentabilidade, Valor investido
```

### **DIA 4: Features Especiais**

#### **8. DividendCalendar.tsx** 🎯 **FEATURE KILLER**
```tsx
// Design: Calendar view + List view
// Dados:
// - Próximos ex-dividend dates (90 dias)
// - Valor estimado de dividendo
// - Histórico de dividendos recebidos
// - Total acumulado (mês/ano)

// API Integration:
// - BrAPI: Histórico de dividendos
// - Cálculo: dividend_yield × quantidade × current_price / 12

// Features:
// - Badge de "Paga hoje"
// - Filtro por investimento
// - Export para calendário (iCal)
```

#### **9. AlertsList.tsx**
```tsx
// Design: Card list
// Campos:
// - Ticker
// - Tipo de alerta
// - Valor alvo vs Atual
// - Status (Ativo, Disparado, Inativo)
// - Progress bar (proximidade do alvo)
// - Ações (Editar, Deletar, Ativar/Desativar)
```

#### **10. TransactionTimeline.tsx**
```tsx
// Design: Vertical timeline
// Agrupamento por data
// Ícones por tipo:
//   - Buy: +
//   - Sell: -
//   - Dividend: 💰
//   - Split: ⚡
// Cores por tipo
// Filtros: Tipo, Período, Investimento
```

---

## 🔧 HOOKS CUSTOMIZADOS

### **DIA 1-2: Hooks de Dados**

#### **1. useInvestmentTransactions.ts**
```tsx
export function useInvestmentTransactions(investmentId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch transactions
  const fetchTransactions = async () => {
    let query = supabase
      .from('investment_transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (investmentId) {
      query = query.eq('investment_id', investmentId);
    }
    
    const { data } = await query;
    setTransactions(data || []);
  };
  
  // Add transaction
  const addTransaction = async (transaction: TransactionInput) => {
    const { data } = await supabase
      .from('investment_transactions')
      .insert(transaction)
      .select()
      .single();
    
    // Trigger recálculo de preço médio
    if (transaction.type === 'buy' || transaction.type === 'sell') {
      await recalculateInvestment(transaction.investment_id);
    }
    
    await fetchTransactions();
    return data;
  };
  
  // Delete transaction
  const deleteTransaction = async (id: string) => {
    await supabase
      .from('investment_transactions')
      .delete()
      .eq('id', id);
    
    await fetchTransactions();
  };
  
  // Computed values
  const totalBuy = useMemo(() => 
    transactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.total_amount, 0),
    [transactions]
  );
  
  const totalSell = useMemo(() => 
    transactions
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.total_amount, 0),
    [transactions]
  );
  
  const totalDividends = useMemo(() => 
    transactions
      .filter(t => t.type === 'dividend')
      .reduce((sum, t) => sum + t.total_amount, 0),
    [transactions]
  );
  
  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    totalBuy,
    totalSell,
    totalDividends,
    refresh: fetchTransactions,
  };
}
```

#### **2. usePortfolioMetrics.ts**
```tsx
export function usePortfolioMetrics() {
  const { investments } = useInvestments();
  
  const metrics = useMemo(() => {
    const totalInvested = investments.reduce(
      (sum, inv) => sum + (inv.total_invested || 0), 0
    );
    
    const currentValue = investments.reduce(
      (sum, inv) => sum + (inv.current_value || inv.total_invested || 0), 0
    );
    
    const totalReturn = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 
      ? (totalReturn / totalInvested) * 100 
      : 0;
    
    // Alocação por categoria
    const allocation = investments.reduce((acc, inv) => {
      const category = inv.category || 'outros';
      const value = inv.current_value || inv.total_invested || 0;
      
      if (!acc[category]) {
        acc[category] = { value: 0, percentage: 0 };
      }
      acc[category].value += value;
      
      return acc;
    }, {} as Record<string, { value: number; percentage: number }>);
    
    // Calcular percentuais
    Object.keys(allocation).forEach(key => {
      allocation[key].percentage = currentValue > 0
        ? (allocation[key].value / currentValue) * 100
        : 0;
    });
    
    return {
      totalInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      allocation,
      count: investments.length,
    };
  }, [investments]);
  
  return metrics;
}
```

#### **3. useInvestmentAlerts.ts**
```tsx
export function useInvestmentAlerts() {
  const [alerts, setAlerts] = useState<InvestmentAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('investment_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    setAlerts(data || []);
  };
  
  const addAlert = async (alert: CreateAlertInput) => {
    const { data } = await supabase
      .from('investment_alerts')
      .insert(alert)
      .select()
      .single();
    
    await fetchAlerts();
    return data;
  };
  
  const deleteAlert = async (id: string) => {
    await supabase
      .from('investment_alerts')
      .delete()
      .eq('id', id);
    
    await fetchAlerts();
  };
  
  const toggleAlert = async (id: string, isActive: boolean) => {
    await supabase
      .from('investment_alerts')
      .update({ is_active: isActive })
      .eq('id', id);
    
    await fetchAlerts();
  };
  
  // Realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel('investment_alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'investment_alerts',
      }, fetchAlerts)
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return {
    alerts,
    loading,
    addAlert,
    deleteAlert,
    toggleAlert,
    refresh: fetchAlerts,
  };
}
```

#### **4. useDividendCalendar.ts**
```tsx
export function useDividendCalendar() {
  const { investments } = useInvestments();
  const { transactions } = useInvestmentTransactions();
  
  const upcomingDividends = useMemo(() => {
    // Filtrar investimentos com dividend_yield
    const dividendStocks = investments.filter(inv => 
      inv.dividend_yield && inv.dividend_yield > 0
    );
    
    // Calcular próximos pagamentos (estimativa)
    const nextPayments = dividendStocks.map(inv => {
      const annualDividend = inv.current_price * (inv.dividend_yield / 100);
      const monthlyDividend = annualDividend / 12;
      const expectedAmount = monthlyDividend * inv.quantity;
      
      return {
        ticker: inv.ticker,
        name: inv.name,
        quantity: inv.quantity,
        dividendYield: inv.dividend_yield,
        expectedAmount,
        // Estimar próxima data (simplificado - pode integrar API)
        nextPaymentDate: estimateNextDividendDate(inv.ticker),
      };
    });
    
    return nextPayments.sort((a, b) => 
      a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime()
    );
  }, [investments]);
  
  const receivedDividends = useMemo(() => {
    return transactions
      .filter(t => t.type === 'dividend')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);
  
  const totalReceived = useMemo(() => {
    const now = new Date();
    const thisMonth = receivedDividends.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear();
    });
    
    const thisYear = receivedDividends.filter(t => {
      const date = new Date(t.date);
      return date.getFullYear() === now.getFullYear();
    });
    
    return {
      month: thisMonth.reduce((sum, t) => sum + t.total_amount, 0),
      year: thisYear.reduce((sum, t) => sum + t.total_amount, 0),
      all: receivedDividends.reduce((sum, t) => sum + t.total_amount, 0),
    };
  }, [receivedDividends]);
  
  return {
    upcomingDividends,
    receivedDividends,
    totalReceived,
  };
}
```

---

## 🔄 EDGE FUNCTIONS

### **1. check-investment-alerts** (Cron Job)
```typescript
// supabase/functions/check-investment-alerts/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 1. Buscar alertas ativos
    const { data: alerts } = await supabase
      .from('investment_alerts')
      .select('*, investments(*)')
      .eq('is_active', true);
    
    const triggered = [];
    
    for (const alert of alerts) {
      // 2. Buscar cotação atual
      const currentPrice = await getCurrentPrice(alert.ticker);
      
      // 3. Verificar se deve disparar
      let shouldTrigger = false;
      
      if (alert.alert_type === 'price_above' && currentPrice >= alert.target_value) {
        shouldTrigger = true;
      } else if (alert.alert_type === 'price_below' && currentPrice <= alert.target_value) {
        shouldTrigger = true;
      } else if (alert.alert_type === 'percent_change') {
        const changePercent = ((currentPrice - alert.investments.current_price) / alert.investments.current_price) * 100;
        if (Math.abs(changePercent) >= alert.target_value) {
          shouldTrigger = true;
        }
      }
      
      if (shouldTrigger) {
        // 4. Enviar notificação
        await sendNotification(alert, currentPrice);
        
        // 5. Marcar como disparado
        await supabase
          .from('investment_alerts')
          .update({ 
            triggered_at: new Date().toISOString(),
            current_value: currentPrice,
            is_active: false,
          })
          .eq('id', alert.id);
        
        triggered.push(alert);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        checked: alerts.length,
        triggered: triggered.length,
        details: triggered,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});

async function getCurrentPrice(ticker: string): Promise<number> {
  // Integração com BrAPI ou cache
  const response = await fetch(
    `https://brapi.dev/api/quote/${ticker}?token=${Deno.env.get('BRAPI_API_KEY')}`
  );
  const data = await response.json();
  return data.results[0]?.regularMarketPrice || 0;
}

async function sendNotification(alert: any, currentPrice: number) {
  // Push notification, Email, ou WhatsApp
  console.log(`Alert triggered: ${alert.ticker} - ${currentPrice}`);
}
```

### **2. Cron Job Configuration**
```sql
-- A cada 5 minutos durante pregão
SELECT cron.schedule(
  'check-investment-alerts-market-hours',
  '*/5 10-17 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/check-investment-alerts',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);

-- A cada 1 hora fora do pregão
SELECT cron.schedule(
  'check-investment-alerts-off-hours',
  '0 * * * *',
  $$
  SELECT
    CASE
      WHEN EXTRACT(HOUR FROM NOW()) NOT BETWEEN 10 AND 17
        OR EXTRACT(DOW FROM NOW()) IN (0, 6)
      THEN
        net.http_post(
          url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/check-investment-alerts',
          headers := '{"Content-Type": "application/json"}'::jsonb
        )
    END AS request_id;
  $$
);
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **DIA 1: CRUD + Transações (8h)**

#### **Database:**
- [ ] Criar migration `investment_alerts`
- [ ] Aplicar RLS policies
- [ ] Testar inserção de dados

#### **Backend:**
- [ ] Hook `useInvestmentTransactions.ts`
- [ ] Função `recalculateInvestment()` (preço médio)
- [ ] Types para transações

#### **Frontend:**
- [ ] Component `InvestmentDialog.tsx`
- [ ] Component `TransactionDialog.tsx`
- [ ] Integrar com `Investments.tsx`
- [ ] Aba "Meus Investimentos"
- [ ] Aba "Transações"

#### **Testes:**
- [ ] Criar investimento
- [ ] Editar investimento
- [ ] Deletar investimento
- [ ] Adicionar transação Buy
- [ ] Adicionar transação Sell
- [ ] Verificar recálculo de preço médio

---

### **DIA 2: Métricas + Alertas (8h)**

#### **Backend:**
- [ ] Hook `usePortfolioMetrics.ts`
- [ ] Hook `useInvestmentAlerts.ts`
- [ ] Função `calculateAllocation()`

#### **Frontend:**
- [ ] Component `PortfolioSummaryCards.tsx` (4 cards)
- [ ] Component `AlertDialog.tsx`
- [ ] Component `AlertsList.tsx`
- [ ] Aba "Alertas"

#### **Edge Function:**
- [ ] Criar `check-investment-alerts`
- [ ] Configurar Cron Jobs
- [ ] Testar manualmente

#### **Testes:**
- [ ] Métricas calculando corretamente
- [ ] Criar alerta
- [ ] Alerta disparando (teste manual)

---

### **DIA 3: Gráficos (8h)**

#### **Dependencies:**
- [ ] Instalar Recharts: `pnpm install recharts`

#### **Frontend:**
- [ ] Component `AssetAllocationChart.tsx` (Donut)
- [ ] Component `PortfolioEvolutionChart.tsx` (Line)
- [ ] Component `PerformanceBarChart.tsx` (Bar)
- [ ] Aba "Visão Geral"
- [ ] Layout responsivo

#### **Dados:**
- [ ] Preparar dados para cada gráfico
- [ ] Cores personalizadas
- [ ] Tooltips formatados
- [ ] Legendas

#### **Testes:**
- [ ] Gráficos renderizando
- [ ] Tooltips funcionando
- [ ] Responsividade mobile

---

### **DIA 4: Dividend Calendar + Polish (8h)**

#### **Backend:**
- [ ] Hook `useDividendCalendar.ts`
- [ ] Função `estimateNextDividendDate()`
- [ ] Integração com BrAPI (histórico dividendos)

#### **Frontend:**
- [ ] Component `DividendCalendar.tsx`
- [ ] Component `DividendHistoryTable.tsx`
- [ ] Aba "Dividendos"
- [ ] Cards de resumo (Recebido mês/ano)

#### **Polish:**
- [ ] Animações (framer-motion)
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Lint errors corrigidos

#### **Testes E2E:**
- [ ] Fluxo completo: Criar → Transação → Ver gráfico → Alerta
- [ ] Mobile responsivo
- [ ] Performance (< 3s load)

---

## 🎨 DESIGN SYSTEM

### **Cores por Categoria:**
```tsx
const CATEGORY_COLORS = {
  renda_fixa: '#10b981', // green-500
  acoes_nacionais: '#3b82f6', // blue-500
  fiis: '#f59e0b', // amber-500
  internacional: '#8b5cf6', // purple-500
  cripto: '#ec4899', // pink-500
  previdencia: '#6366f1', // indigo-500
  outros: '#6b7280', // gray-500
};
```

### **Ícones:**
- Buy: `+` ou `TrendingUp`
- Sell: `-` ou `TrendingDown`
- Dividend: `💰` ou `DollarSign`
- Split: `⚡` ou `Zap`
- Alert: `🔔` ou `Bell`

### **Badges:**
- Active: Verde
- Sold: Cinza
- Matured: Azul
- Alert Triggered: Vermelho

---

## 📊 MÉTRICAS DE SUCESSO

### **Performance:**
- [ ] Página carrega em < 3 segundos
- [ ] Gráficos renderizam em < 1 segundo
- [ ] Auto-refresh não trava UI

### **UX:**
- [ ] Todas operações têm feedback visual
- [ ] Não há erros no console
- [ ] Mobile 100% funcional
- [ ] Animações suaves (60fps)

### **Funcionalidades:**
- [ ] CRUD completo funcionando
- [ ] Transações recalculam valores corretamente
- [ ] Gráficos com dados reais
- [ ] Alertas disparando automaticamente
- [ ] Dividend Calendar com datas estimadas

---

## 🚀 DEPLOY

### **Checklist:**
- [ ] Migrations aplicadas no Supabase
- [ ] Edge Functions deployed
- [ ] Cron Jobs configurados
- [ ] Variáveis de ambiente configuradas
- [ ] Build sem erros
- [ ] Commit + Push para GitHub

---

## 📝 PRÓXIMOS PASSOS

Após Sprint 3:
- **Sprint 4:** Ana Clara + Investment Radar
- **Sprint 5:** Analytics Avançado + Relatórios

---

**SPRINT 3: PRONTO PARA INICIAR! 🚀**
