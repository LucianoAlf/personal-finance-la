# 💎 PLANO EXECUTIVO: PÁGINA INVESTIMENTOS
## Personal Finance LA - Sistema Completo

**Versão:** 2.0 | **Data:** Nov 2025 | **Tempo:** 12-15 dias (96h)  
**Status:** ✅ Base Existente + Expansão Planejada

---

## 📊 SITUAÇÃO ATUAL (O QUE JÁ EXISTE)

### ✅ **Database:**
- Tabela `investments` criada (linhas 288-315 do schema)
- Campos: id, user_id, type, name, ticker, quantity, purchase_price, current_price, total_invested, current_value, purchase_date, notes, is_active
- Tipos: stock, fund, treasury, crypto, real_estate, other
- RLS habilitado
- Trigger update_updated_at

### ✅ **Frontend:**
- Página `src/pages/Investments.tsx` (158 linhas)
- 4 cards resumo (Total, Atual, Valorização, Rentabilidade)
- Tabela portfolio básica
- **USANDO MOCK DATA** (precisa conectar Supabase!)
- Header padronizado
- Layout responsivo

### ❌ **O QUE FALTA (Implementar):**
- Hook `useInvestments` (CRUD real com Supabase)
- Tabelas complementares (investment_accounts, transactions, goals, opportunities)
- Integrações de API (B3, Tesouro, Cripto)
- Ana Clara insights
- Gráficos avançados (Chart.js)
- Metas de investimento
- Simuladores (aposentadoria, aportes)
- Gamificação específica
- Feed de oportunidades

---

## 🎯 VISÃO GERAL

### **Objetivo:**
Centralizar TODOS os investimentos (Renda Fixa, Ações, FIIs, Fundos, Cripto) com:
- 📊 Visão consolidada em tempo real
- 🤖 Ana Clara com insights personalizados
- 📈 Projeções futuras e simuladores
- 🎮 Gamificação específica
- 🔔 Alertas inteligentes de oportunidades

### **Diferenciais:**
✅ Integração com sistema financeiro pessoal  
✅ Ana Clara como consultora de investimentos  
✅ WhatsApp: "Quanto tenho investido?"  
✅ Projeção: "Você se aposentará em 2045"  
✅ Gamificação única para investimentos  

---

## 🗄️ DATABASE (5 TABELAS + 2 VIEWS + 2 FUNCTIONS)

### **1. `investment_accounts`** - Corretoras/Bancos
```
- name, institution_name, account_type
- currency (BRL/USD/EUR), is_active
- auto_sync_enabled, api_credentials (futuro)
```

### **2. `investments`** - Cada ativo individual
```
- ticker, name, category, subcategory
- quantity, average_price, current_price
- total_invested, current_value, total_return
- dividend_yield, maturity_date, annual_rate
- status: active/sold/matured
```

**Categorias:** fixed_income, stock, reit, fund, crypto, international, pension

### **3. `investment_transactions`** - Histórico
```
- transaction_type: buy/sell/dividend/interest/fee
- quantity, price, total_value, fees
- transaction_date
```

### **4. `investment_goals`** - Metas específicas
```
- name, target_amount, target_date
- monthly_contribution, expected_return_rate
- risk_profile: conservative/moderate/aggressive
- suggested_allocation (JSONB por categoria)
```

### **5. `market_opportunities`** - Oportunidades Ana Clara
```
- ticker, opportunity_type, title, description
- current_price, target_price, expected_return
- ana_clara_insight, confidence_score
- expires_at, is_active
```

### **Views:**
- `v_portfolio_summary` - Resumo consolidado por user
- `v_investment_performance` - Performance por período

### **Functions:**
- `calculate_portfolio_metrics(user_id)` - Métricas avançadas
- `sync_investment_prices()` - Atualiza preços (Cron)

---

## 🎨 FRONTEND (20 COMPONENTES + 8 HOOKS)

### **Componentes Principais:**

#### **📊 Overview:**
- `PortfolioOverview` - Cards: Total, Variação, Alocação
- `PortfolioChart` - Gráfico evolução (1d/7d/1m/3m/1a/all)
- `AssetAllocationChart` - Donut por categoria
- `BenchmarkComparison` - vs CDI/IPCA/Ibovespa

#### **💰 Gestão:**
- `InvestmentCard` - Card individual ativo
- `InvestmentList` - Lista/Grid ativos
- `InvestmentDialog` - CRUD (criar/editar)
- `TransactionHistory` - Histórico operações
- `AssetSearchDialog` - Buscar ativo (API)

#### **🎯 Metas & Simulação:**
- `InvestmentGoalCard` - Meta investimento
- `RetirementSimulator` - Aposentadoria
- `RebalancingTool` - Rebalanceamento carteira
- `DividendCalendar` - Proventos futuros

#### **🤖 Ana Clara:**
- `AnaInvestmentInsights` - Widget insights
- `OpportunityCard` - Card oportunidade
- `OpportunityFeed` - Feed oportunidades
- `PortfolioHealthScore` - Score 0-100

### **Hooks:**
```typescript
useInvestments()              // CRUD + fetch principal
useInvestmentAccounts()       // Gerenciar contas
useInvestmentTransactions()   // Histórico
useInvestmentGoals()          // Metas
usePortfolioMetrics()         // Métricas calculadas
useMarketOpportunities()      // Feed oportunidades
useAssetPrices()              // Preços tempo real
useRetirementSimulation()     // Simulações
```

---

## 🔌 INTEGRAÇÕES DE APIS (5 FONTES REAIS)

### **1. B3 - Ações e FIIs 🇧🇷**
**API:** Status Invest (gratuita) ou Yahoo Finance
- Preço atual, variação, volume
- Dividend yield, P/L, ROE
- Histórico de cotações
- **Update:** A cada 15 min (mercado aberto)

### **2. Tesouro Direto 🏛️**
**API:** Tesouro Nacional (oficial, gratuita)
- Lista títulos disponíveis
- Taxas, preços, vencimentos
- Simulador rentabilidade
- **Update:** Diário (após 18h)

### **3. Criptomoedas 🪙**
**API:** CoinGecko (gratuita, 50 calls/min)
- Top 100 criptos por market cap
- Preço em BRL, variação 24h
- Gráficos históricos
- **Update:** A cada 5 min

### **4. Câmbio 💱**
**API:** Banco Central (oficial, gratuita)
- Dólar comercial/turismo
- Euro, Libra, outras moedas
- Cotação PTAX
- **Update:** Diário (após fechamento)

### **5. Internacional 🌎**
**API:** Alpha Vantage (gratuita, 500 calls/dia)
- Ações NYSE, NASDAQ
- ETFs internacionais
- Real-time quotes
- **Update:** A cada 1 min (mercado aberto)

---

## 🤖 ANA CLARA - INSIGHTS INVESTIMENTOS

### **Análises Automáticas:**

#### **1. Portfolio Health Score (0-100)**
```
Critérios avaliados:
- Diversificação (30 pontos)
- Risco vs Perfil (25 pontos)
- Performance vs Benchmark (20 pontos)
- Rebalanceamento necessário (15 pontos)
- Taxa de proventos (10 pontos)
```

#### **2. Alertas Inteligentes:**
- 🔴 "Sua carteira está 80% em ações. Rebalancear?"
- 🟡 "PETR4 caiu 5% hoje. Oportunidade de compra?"
- 🟢 "Parabéns! Seu portfólio rendeu 15% no ano"
- 📊 "CDI subiu para 11%. Renda fixa ficou mais atrativa"

#### **3. Recomendações Personalizadas:**
```typescript
Ana Clara analisa:
- Perfil de risco do usuário
- Horizonte de investimento (metas)
- Alocação atual vs ideal
- Performance histórica
- Proventos recebidos

Sugere:
- Onde aportar próximos R$ 1.000
- Quais ativos vender (tax loss)
- Rebalanceamento necessário
- Oportunidades do momento
```

#### **4. Projeção de Futuro:**
"Com seus investimentos atuais (R$ 50k) e aportes mensais de R$ 2k, em 20 anos você terá R$ 1,2M (considerando rentabilidade de 10% a.a.)"

---

## 🎮 GAMIFICAÇÃO INVESTIMENTOS

### **Níveis:**
- 🌱 **Iniciante** (R$ 0 - R$ 1k)
- 🌿 **Investidor** (R$ 1k - R$ 10k)
- 🌳 **Acumulador** (R$ 10k - R$ 100k)
- 🏆 **Milionário** (R$ 100k - R$ 1M)
- 👑 **Mestre** (R$ 1M+)

### **Conquistas:**
- 🎯 **Primeiro Aporte** - Fez primeiro investimento
- 📈 **Diversificado** - Tem 3+ tipos de ativos
- 💎 **Diamante** - Portfólio > R$ 100k
- 🔥 **Streak** - 12 meses consecutivos aportando
- 📊 **Analista** - Gerou 10 relatórios
- 🤖 **Seguiu Ana** - Aceitou 5 recomendações
- 🎉 **Meta Alcançada** - Completou meta investimento
- 💰 **Provento** - Recebeu primeiro dividendo

### **Leaderboard (Opcional):**
- Ranking entre amigos
- Comparação anônima de rentabilidade
- Desafios mensais

---

## 📊 FEATURES ESSENCIAIS (MVP)

### **✅ Deve ter no MVP:**
1. ✅ CRUD completo de investimentos
2. ✅ Portfolio overview (total, variação, alocação)
3. ✅ Gráfico evolução temporal
4. ✅ Integração B3 (ações/FIIs)
5. ✅ Integração Tesouro Direto
6. ✅ Integração Cripto (CoinGecko)
7. ✅ Ana Clara: insights básicos
8. ✅ Metas de investimento
9. ✅ Histórico de transações
10. ✅ Update automático de preços (Cron)

### **🔜 Pós-MVP:**
- Monte Carlo Simulation
- Retirement Calculator avançado
- Tax Loss Harvesting
- Portfolio Health Score completo
- Integração Open Banking (certificado digital)
- Análise técnica (RSI, MACD, Bollinger)
- Backtesting de estratégias
- Alertas de price target
- Robo-advisor completo

---

## 🎨 UI/UX DESIGN

### **Estrutura da Página `/investimentos`:**

```
┌──────────────────────────────────────────────────────┐
│ 💎 Investimentos      [Buscar Ativo] [+ Novo Ativo]│
│ Construa seu patrimônio de longo prazo              │
└──────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│ 💰 Total        │ 📈 Rentabilidade │ 📊 Proventos   │
│ R$ 125.430,00  │ +R$ 8.234 (7%)  │ R$ 1.245/mês   │
└─────────────────┴─────────────────┴─────────────────┘

┌──────────────────────────────────────────────────────┐
│ 🤖 Ana Clara diz:                                    │
│ Seu portfólio está bem diversificado! Score: 85/100 │
│ 💡 Dica: Que tal aportar R$ 1k em Renda Fixa?       │
└──────────────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📊 Gráfico Evolução                        │
│ [1D] [7D] [1M] [3M] [1A] [ALL]            │
│                                            │
│       ╱╲                                   │
│      ╱  ╲    ╱╲                           │
│     ╱    ╲  ╱  ╲                          │
│    ╱      ╲╱    ╲╱                        │
│                                            │
└────────────────────────────────────────────┘

┌─ Tabs ──────────────────────────────────────┐
│ [Todos] [Ações] [FIIs] [Renda Fixa] [Cripto]│
└─────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ PETR4 - Petrobras PN              📈 +2.3%│
│ 100 ações • Média: R$ 32,50              │
│ R$ 3.450,00 → R$ 3.530,00 (+R$ 80)      │
│ [Ver Detalhes] [Comprar Mais]            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 🎯 Metas de Investimento                   │
│ Aposentadoria: 65% (R$ 65k de R$ 100k)    │
│ Casa Própria: 40% (R$ 80k de R$ 200k)     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 🔔 Oportunidades                           │
│ • HGLG11: Dividend Yield de 11% ao ano    │
│ • Tesouro Selic: Taxa de 13,5% a.a.      │
└────────────────────────────────────────────┘
```

### **Cores:**
- Verde: +performance, dividendos
- Vermelho: -performance
- Azul: Renda Fixa
- Laranja: Ações
- Roxo: Criptomoedas
- Cinza: Neutro

---

## ⏱️ CRONOGRAMA REVISADO (12 dias / 96h)

### **FASE 1: DATABASE EXPANSION (2 dias / 16h)**
**Status:** Parcial - Tabela base existe, falta complementares
- ✅ Tabela `investments` (JÁ EXISTE!)
- ⏳ Migration: Adicionar campos (category, subcategory, dividend_yield, etc)
- ⏳ Criar `investment_accounts`
- ⏳ Criar `investment_transactions`
- ⏳ Criar `investment_goals`
- ⏳ Criar `market_opportunities`
- ⏳ Views + Functions
- ⏳ Índices otimizados

### **FASE 2: BACKEND/APIs (3 dias / 24h)**
- ⏳ Service B3 API (Status Invest)
- ⏳ Service Tesouro API
- ⏳ Service Crypto API (CoinGecko)
- ⏳ Service Forex API (Banco Central)
- ⏳ Edge Function: sync-prices (Cron)
- ⏳ Edge Function: ana-investment-insights

### **FASE 3: HOOK & SUPABASE (2 dias / 16h)**
**Status:** CRÍTICO - Substituir mockData!
- ⏳ Hook `useInvestments` (CRUD real)
- ⏳ Hook `useInvestmentAccounts`
- ⏳ Hook `useInvestmentTransactions`
- ⏳ Hook `useInvestmentGoals`
- ⏳ Hook `usePortfolioMetrics`
- ⏳ TypeScript types expansion
- ⏳ Utils (cálculos, formatação)

### **FASE 4: COMPONENTES UI (3 dias / 24h)**
**Status:** Base existe, precisa expandir
- ✅ Página básica (JÁ EXISTE!)
- ⏳ `InvestmentDialog` (CRUD)
- ⏳ `AssetAllocationChart` (donut)
- ⏳ `PortfolioChart` (evolução)
- ⏳ `InvestmentCard` (melhorar tabela)
- ⏳ `InvestmentGoalCard`
- ⏳ `OpportunityFeed`
- ⏳ `AnaInvestmentInsights`
- ⏳ `RetirementSimulator`
- ⏳ Gráficos Chart.js

### **FASE 5: INTEGRAÇÃO & TESTES (2 dias / 16h)**
- ⏳ Integração Dashboard (widget)
- ⏳ Integração Sidebar (badge)
- ⏳ Testes E2E
- ⏳ Ajustes finais
- ⏳ Documentação

---

## 🧪 PLANO DE TESTES

### **1. Testes Unitários:**
- Cálculos de rentabilidade
- Formatação de valores
- Validações de input
- Utils de conversão

### **2. Testes de Integração:**
- CRUD investimentos
- Fetch de APIs externas
- Atualização de preços
- Sincronização Realtime

### **3. Testes E2E:**
- Criar novo investimento
- Editar/Deletar investimento
- Buscar ativo via API
- Criar meta investimento
- Visualizar oportunidades
- Gerar relatório

### **4. Testes de Performance:**
- Load time < 2s
- API calls otimizados
- Lazy loading de gráficos
- Infinite scroll na lista

---

## 🎯 MÉTRICAS DE SUCESSO

### **Adoção:**
- 80% usuários registram ao menos 1 investimento
- 60% usuários criam meta investimento
- 50% usuários aportam mensalmente

### **Engagement:**
- 5+ acessos/mês à página Investimentos
- 3+ oportunidades visualizadas/semana
- 70% seguem recomendação Ana Clara

### **Performance:**
- Portfolio atualizado em < 5s
- Gráficos renderizam em < 1s
- APIs respondem em < 500ms

---

## 🚨 AÇÃO IMEDIATA: CONECTAR SUPABASE

**ANTES DE TUDO**, precisamos:

### **Passo 0: Substituir Mock Data (1-2h)**
```typescript
// ❌ ATUAL (linha 4 de Investments.tsx):
import { mockInvestments } from '@/utils/mockData';

// ✅ MUDAR PARA:
import { useInvestments } from '@/hooks/useInvestments';

// E criar o hook:
export function useInvestments() {
  const { data, loading } = supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId);
  // ...
}
```

**Isso fará a página funcionar COM DADOS REAIS do banco!** 🎯

---

## 🚀 NEXT STEPS

1. ✅ **Aprovar este plano revisado**
2. 🔴 **CRÍTICO:** Conectar Supabase (substituir mockData)
3. ⏳ **Iniciar FASE 1** (Expandir database)
4. ⏳ **Setup APIs** (keys, endpoints)
5. ⏳ **Implementar features avançadas** (12 dias)
6. ⏳ **Testar com usuários reais**
7. ⏳ **Iterar e melhorar**

---

## 📝 RESUMO EXECUTIVO

### **O QUE TEMOS:**
- ✅ 30% do trabalho feito (tabela + página básica)
- ✅ Layout padronizado
- ✅ Estrutura pronta para expansão

### **O QUE FALTA:**
- 🔴 **Conectar ao Supabase** (mockData → real data)
- ⏳ **Expandir database** (4 tabelas complementares)
- ⏳ **Integrações de API** (5 fontes reais)
- ⏳ **Features avançadas** (gráficos, insights, metas)
- ⏳ **Gamificação** (conquistas específicas)

### **Tempo Estimado:**
- **Com base existente:** 12 dias (96h)
- **Se fosse do zero:** 18-20 dias (144-160h)
- **Economia:** 40-50 horas! 🎉

---

**🎉 Base sólida! Vamos expandir para o melhor sistema de investimentos do Brasil!**
