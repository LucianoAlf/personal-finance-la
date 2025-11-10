# 🔍 AUDITORIA COMPLETA: PÁGINA INVESTIMENTOS
**Data:** 10/11/2025 07:52  
**Versão:** 1.0  
**Status:** ⚠️ CRÍTICO - Problemas identificados

---

## 📊 RESUMO EXECUTIVO

### ✅ DADOS REAIS (Funcionando)
- **Cotações:** BrAPI + CoinGecko via Edge Function `get-quote`
- **Portfólio:** Banco Supabase (tabela `investments`)
- **Transações:** Banco Supabase (tabela `investment_transactions`)
- **Alertas:** Banco Supabase (tabela `investment_alerts`)
- **Benchmarks:** CDI/IPCA (Banco Central), Bitcoin/Ethereum (CoinGecko)
- **Métricas:** Calculadas em tempo real

### ⚠️ DADOS ESTIMADOS (Limitações)
- **Dividendos:** Estimativa baseada em yield (assume pagamento dia 15)
- **Oportunidades:** Lógica de regras (não usa IA real)
- **Ana Clara Insights:** Cálculos matemáticos (não usa GPT-4)

### ❌ PROBLEMAS CRÍTICOS IDENTIFICADOS
1. **Ana Clara NÃO usa IA real** - apenas cálculos matemáticos
2. **Oportunidades baseadas em regras** - não monitora mercado 24/7
3. **Dividendos são estimativas** - não busca dados reais de proventos
4. **Heat Map sem dados históricos** - mostra dados mock
5. **Tesouro Direto retorna price=0** - requer atualização manual

---

## 🔎 AUDITORIA POR ABA

### 📈 ABA 1: PORTFÓLIO

#### ✅ Funcionando 100% com Dados Reais
- **Tabela de Investimentos:** ✅ Real (Supabase)
- **Cotações ao Vivo:** ✅ Real (BrAPI via Edge Function)
- **Cálculos de Rentabilidade:** ✅ Real (baseado em current_price)
- **Auto-refresh:** ✅ Funcional (via useInvestmentPrices)

**Fonte de Dados:**
```typescript
// Hook: useInvestments
const { investments } = useInvestments(); // Busca no Supabase

// Hook: useInvestmentPrices  
const { quotes } = useInvestmentPrices({ items, autoRefresh: true });
// Chama Edge Function: /functions/v1/get-quote
```

**Edge Function: `get-quote`**
- ✅ BrAPI para ações (PETR4, VALE3, HGLG11)
- ✅ CoinGecko para crypto (BTC, ETH)
- ⚠️ Treasury retorna price=0 (mock)

---

### 💸 ABA 2: TRANSAÇÕES

#### ✅ Funcionando 100% com Dados Reais
- **Timeline de Transações:** ✅ Real (Supabase)
- **CRUD Completo:** ✅ Funcional
- **Trigger Automático:** ✅ Recalcula portfólio após transação

**Fonte de Dados:**
```typescript
// Hook: useInvestmentTransactions
const { transactions } = useInvestmentTransactions();
// Busca: SELECT * FROM investment_transactions
```

**Database Trigger:**
```sql
-- Trigger: update_after_transaction
-- Recalcula automaticamente: quantity, avg_price, current_value
```

---

### 💰 ABA 3: DIVIDENDOS

#### ⚠️ ESTIMATIVA - Não Busca Dados Reais

**Dividend Calendar:**
- ❌ **NÃO busca proventos reais** de APIs (B3, InfoMoney)
- ⚠️ **Estimativa simplificada:** assume pagamento dia 15 de cada mês
- ✅ **Cálculo correto:** `(current_price * dividend_yield%) / 12`

**Código:**
```typescript
// useDividendCalendar.ts linha 70
// ⚠️ LIMITAÇÃO: Assumindo pagamento no dia 15 de cada mês (simplificação)
for (let i = 0; i < 3; i++) {
  const paymentDate = new Date(today);
  paymentDate.setDate(15); // ❌ FIXO DIA 15
  const futureDate = addMonths(paymentDate, i);
  
  const monthlyDividendPerShare = (price * yield) / 12; // ✅ Cálculo correto
}
```

**Dividend History:**
- ✅ **Real:** Busca transações tipo 'dividend' no banco
- ✅ **Totais anuais:** Calculado corretamente

**RECOMENDAÇÃO:**
```
🔧 Integrar com API B3/Status Invest para buscar:
- Data exata de pagamento
- Valor por ação real
- Histórico de proventos
```

---

### 🔔 ABA 4: ALERTAS

#### ✅ Funcionando 100% com Dados Reais

**Alertas de Preço:**
- ✅ **Real:** Salvos no banco (investment_alerts)
- ✅ **Verificação:** Edge Function `check-investment-alerts`
- ✅ **Cron Jobs:** 2 jobs (market hours + off hours)
- ✅ **Notificações:** Push + Email (preparado WhatsApp)

**Edge Function: `check-investment-alerts`**
```typescript
// Verifica alertas ativos vs cotações reais
// Envia notificação se price >= target_price_above
// Envia notificação se price <= target_price_below
```

**Fonte de Dados:**
```typescript
// Hook: useInvestmentAlerts
const { alerts } = useInvestmentAlerts();
// Busca: SELECT * FROM investment_alerts WHERE is_active = true
```

---

### 👁️ ABA 5: VISÃO GERAL

#### 5.1 Ana Clara Insights Widget

**STATUS:** ❌ **NÃO USA IA REAL (GPT-4)**

**Como Funciona (Atual):**
```typescript
// Hook: useAnaInsights
const { healthScore } = useAnaInsights(investments);

// Utils: portfolioHealthScore.ts
// ❌ APENAS CÁLCULOS MATEMÁTICOS:
// - Diversification: conta classes de ativo (max 30 pontos)
// - Concentration: verifica se algum ativo > 20% (max 25 pontos)
// - Returns: média de retornos (max 25 pontos)
// - Risk: analisa volatilidade (max 20 pontos)
```

**Exemplo de "Insight":**
```typescript
// portfolioHealthScore.ts linha 120
if (score >= 80) {
  insight = {
    level: 'excellent',
    message: 'Seu portfólio está muito bem diversificado!', // ❌ MENSAGEM FIXA
  };
}
```

**PROBLEMA:**
- ❌ Não chama OpenAI API
- ❌ Mensagens pré-programadas
- ❌ Não analisa contexto real do mercado
- ❌ Não personaliza baseado no perfil do usuário

**RECOMENDAÇÃO:**
```
🔧 Integrar com OpenAI GPT-4:
1. Criar Edge Function: ana-insights
2. Enviar contexto: portfólio + metas + histórico
3. Receber análise personalizada
4. Exibir insights reais da IA
```

---

#### 5.2 Investment Radar (Oportunidades)

**STATUS:** ⚠️ **BASEADO EM REGRAS (Não IA Real)**

**Como Funciona:**
```typescript
// Edge Function: generate-opportunities
// ⚠️ LÓGICA DE REGRAS FIXAS:

// Regra 1: Renda fixa < 30%
if (allocation.renda_fixa < 30) {
  opportunities.push({
    title: 'Renda fixa abaixo do recomendado',
    confidence_score: 85, // ❌ FIXO
  });
}

// Regra 2: Sem FIIs
if (allocation.fiis === 0) {
  opportunities.push({
    title: 'Diversifique com Fundos Imobiliários',
    confidence_score: 75, // ❌ FIXO
  });
}

// Regra 3: Concentração > 30%
// Regra 4: Sem internacional
// Regra 5: Yield < 5%
```

**PROBLEMA:**
- ❌ Não monitora mercado em tempo real
- ❌ Não analisa notícias/fundamentação
- ❌ Não usa ML/IA para detectar padrões
- ❌ Apenas 5 regras básicas

**RECOMENDAÇÃO:**
```
🔧 Integrar análise real de mercado:
1. Buscar FIIs com yield > 10% (API B3)
2. Analisar P/L baixo (<10) de ações (API Fundamentus)
3. Detectar Tesouro IPCA+ > 13% (API Tesouro)
4. Usar GPT-4 para análise fundamentalista
```

---

#### 5.3 Diversification Score Card

**STATUS:** ✅ **CÁLCULO REAL**

**Como Funciona:**
```typescript
// Utils: diversificationScore.ts
// ✅ Calcula baseado em 4 critérios REAIS:
1. Asset Class Diversity (0-30 pts): conta categorias distintas
2. Concentration Risk (0-25 pts): verifica se ativo > 20%
3. Number of Assets (0-25 pts): penaliza < 5 investimentos
4. Geographic Exposure (0-20 pts): verifica exposição internacional
```

**Fonte de Dados:** ✅ Real (investments do Supabase)

---

#### 5.4 Performance Heat Map

**STATUS:** ❌ **DADOS MOCK (Sem Histórico)**

**Código:**
```typescript
// PerformanceHeatMap.tsx linha 15
const MOCK_DATA = {
  '2024-01': 2.5,  // ❌ DADOS FIXOS
  '2024-02': -1.2,
  '2024-03': 3.8,
  // ...
};
```

**PROBLEMA:**
- ❌ Não busca histórico real de cotações
- ❌ Não salva snapshots mensais do portfólio
- ❌ Exibe dados fictícios

**RECOMENDAÇÃO:**
```
🔧 Implementar histórico real:
1. Criar tabela: portfolio_snapshots (mensal)
2. Cron job: salvar valor total todo dia 1º
3. Calcular retorno mensal: (atual - anterior) / anterior
4. Exibir heat map com dados reais dos últimos 12 meses
```

---

#### 5.5 Benchmark Comparison

**STATUS:** ✅ **DADOS REAIS (Após Correção)**

**Edge Function: `fetch-benchmarks`**
- ✅ **CDI:** Banco Central (série 12) - API REAL
- ✅ **IPCA:** Banco Central (série 433) - API REAL
- ✅ **Bitcoin:** CoinGecko - API REAL
- ✅ **Ethereum:** CoinGecko - API REAL
- ⚠️ **S&P 500:** Alpha Vantage (fallback se sem API key)
- ⚠️ **Ouro:** Dados estimados (CoinGecko não tem)

**Hook:**
```typescript
// useBenchmarks.ts (CORRIGIDO hoje)
// ✅ AGORA USA EDGE FUNCTION (antes era mock)
const { data } = await supabase.functions.invoke('fetch-benchmarks', {
  body: { period },
});
```

---

#### 5.6 Smart Rebalance Widget

**STATUS:** ✅ **CÁLCULO REAL**

**Como Funciona:**
```typescript
// Utils: smartRebalance.ts
// ✅ Compara alocação atual vs metas REAIS:
const diff = currentPercentage - targetPercentage;

if (Math.abs(diff) > 5) { // threshold 5%
  actions.push({
    action: diff > 0 ? 'SELL' : 'BUY',
    amount: Math.abs(diff * totalValue / 100),
    reason: 'Rebalancear para atingir meta',
  });
}
```

**Fonte de Dados:**
- ✅ **Alocação Atual:** usePortfolioMetrics (cálculo real)
- ✅ **Metas:** investment_allocation_targets (Supabase)

---

#### 5.7 Gráficos

**Asset Allocation (Donut):**
- ✅ **Real:** Calculado via usePortfolioMetrics

**Portfolio Evolution (Line):**
- ⚠️ **Limitado:** Apenas mostra Total Investido vs Valor Atual
- ❌ **Sem histórico:** Não mostra evolução temporal

**Performance Bar Chart:**
- ✅ **Real:** Retorno % de cada investimento

---

## 🔧 EDGE FUNCTIONS - AUDITORIA

### 1. `get-quote` (v6)
**Status:** ✅ Funcional  
**Dados:** REAIS (BrAPI, CoinGecko)  
**Problema:** ⚠️ Treasury retorna price=0

### 2. `fetch-benchmarks` (v3)
**Status:** ✅ Funcional  
**Dados:** REAIS (Banco Central, CoinGecko)  
**Problema:** ⚠️ S&P 500 e Ouro estimados

### 3. `generate-opportunities`
**Status:** ✅ Funcional  
**Dados:** REAIS (portfólio do usuário)  
**Problema:** ❌ Lógica de regras (não IA)

### 4. `sync-investment-prices`
**Status:** ⚠️ NÃO VERIFICADO  
**Cron:** Deve rodar diariamente  
**Ação:** Atualizar current_price de todos investimentos

### 5. `check-investment-alerts`
**Status:** ✅ Funcional  
**Cron:** 2 jobs (market hours + off hours)  
**Dados:** REAIS (alertas + cotações)

### 6. `create-portfolio-snapshot`
**Status:** ⚠️ NÃO VERIFICADO  
**Necessário para:** Heat Map com dados reais

---

## 📋 HOOKS - AUDITORIA

| Hook | Dados Reais? | Fonte | Observações |
|------|--------------|-------|-------------|
| `useInvestments` | ✅ | Supabase | investments table |
| `useInvestmentPrices` | ✅ | Edge Function | get-quote |
| `useInvestmentTransactions` | ✅ | Supabase | investment_transactions |
| `usePortfolioMetrics` | ✅ | Cálculo | Baseado em investments reais |
| `useInvestmentAlerts` | ✅ | Supabase | investment_alerts |
| `useDividendCalendar` | ⚠️ | Estimativa | Dia 15 fixo, yield real |
| `useDividendHistory` | ✅ | Supabase | Transações tipo dividend |
| `useMarketOpportunities` | ⚠️ | Edge Function | Regras fixas |
| `useAnaInsights` | ❌ | Cálculo | Não usa GPT-4 |
| `useBenchmarks` | ✅ | Edge Function | Banco Central + CoinGecko |
| `useAllocationTargets` | ✅ | Supabase | allocation_targets |

---

## 🚨 PROBLEMAS CRÍTICOS DETALHADOS

### 1️⃣ Ana Clara NÃO É IA REAL

**Expectativa:**
> "Ana Clara será totalmente real e confiável usando GPT-4"

**Realidade:**
```typescript
// portfolioHealthScore.ts
const score = 
  diversificationScore +  // conta categorias
  concentrationScore +     // verifica % máximo
  returnsScore +          // média retornos
  riskScore;              // volatilidade

// ❌ NENHUMA chamada a OpenAI API
// ❌ NENHUMA análise de contexto
// ❌ NENHUMA personalização real
```

**Impacto:** 🔴 ALTO  
**Urgência:** 🔴 CRÍTICO

---

### 2️⃣ Oportunidades NÃO Monitoram Mercado

**Expectativa:**
> "Investment Radar - Ana monitora mercado 24/7, detecta oportunidades"

**Realidade:**
```typescript
// generate-opportunities/index.ts
// ❌ Apenas 5 regras fixas:
1. if (renda_fixa < 30%) → sugerir Tesouro
2. if (fiis === 0) → sugerir FIIs
3. if (concentration > 30%) → alertar risco
4. if (internacional === 0) → sugerir IVVB11
5. if (yield < 5%) → sugerir dividendos
```

**Impacto:** 🔴 ALTO  
**Urgência:** 🟡 MÉDIO

---

### 3️⃣ Dividendos São Estimativas

**Expectativa:**
> "Dividend Calendar rastreia próximos dividendos"

**Realidade:**
```typescript
// useDividendCalendar.ts
// ⚠️ Assumindo pagamento no dia 15 de cada mês (simplificação)
paymentDate.setDate(15); // FIXO
```

**Impacto:** 🟡 MÉDIO  
**Urgência:** 🟡 MÉDIO

---

### 4️⃣ Heat Map com Dados Mock

**Expectativa:**
> "Heat Map performance 12 meses"

**Realidade:**
```typescript
// PerformanceHeatMap.tsx
const MOCK_DATA = {
  '2024-01': 2.5,  // ❌ FIXO
  '2024-02': -1.2,
  // ...
};
```

**Impacto:** 🟡 MÉDIO  
**Urgência:** 🟢 BAIXO

---

### 5️⃣ Tesouro Direto Sem Cotação

**Expectativa:**
> "Integração com API do Tesouro Direto"

**Realidade:**
```typescript
// get-quote/index.ts linha 121
if (type === 'treasury') {
  quote = {
    price: 0,  // ❌ SEMPRE ZERO
    note: 'Treasury bonds require manual price update',
  };
}
```

**Impacto:** 🟡 MÉDIO  
**Urgência:** 🟡 MÉDIO

---

## ✅ O QUE ESTÁ FUNCIONANDO BEM

### Cotações Automáticas
- ✅ BrAPI para ações brasileiras (PETR4, VALE3, HGLG11)
- ✅ CoinGecko para crypto (BTC, ETH)
- ✅ Cache inteligente com TTL
- ✅ Auto-refresh a cada 5 minutos
- ✅ Fallback para cache antigo em caso de erro

### Sistema de Alertas
- ✅ 3 tipos: price_above, price_below, percent_change
- ✅ Verificação automática via cron
- ✅ Notificações push + email
- ✅ Progress bar de proximidade

### Transações
- ✅ CRUD completo
- ✅ Trigger automático de recálculo
- ✅ Histórico completo
- ✅ Suporte a buy/sell/dividend/split

### Benchmarks
- ✅ CDI e IPCA do Banco Central
- ✅ Bitcoin e Ethereum do CoinGecko
- ✅ Comparação visual

### Smart Rebalance
- ✅ Cálculo preciso de diferenças
- ✅ Sugestões BUY/SELL com valores
- ✅ Threshold configurável (5%)

---

## 📝 RECOMENDAÇÕES PRIORITÁRIAS

### 🔴 PRIORIDADE 1 (Crítico)

**1. Integrar Ana Clara com GPT-4**
```typescript
// Criar Edge Function: ana-investment-insights
const prompt = `
Analise este portfólio:
- Total Investido: ${totalInvested}
- Valor Atual: ${currentValue}
- Alocação: ${JSON.stringify(allocation)}
- Metas: ${JSON.stringify(targets)}

Forneça:
1. Análise detalhada (3-4 parágrafos)
2. 3 recomendações específicas
3. Pontos de atenção
4. Score justificado (0-100)
`;

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
});
```

**2. Implementar Busca Real de Oportunidades**
```typescript
// Integrar APIs:
1. B3 API - FIIs com yield > 10%
2. Fundamentus - Ações P/L < 10
3. Tesouro Direto API - IPCA+ > 13%
4. Status Invest - Análise fundamentalista
```

---

### 🟡 PRIORIDADE 2 (Importante)

**3. Implementar Dividendos Reais**
```sql
-- Criar tabela dividend_schedule
CREATE TABLE dividend_schedule (
  ticker TEXT,
  ex_dividend_date DATE,
  payment_date DATE,
  dividend_value NUMERIC,
  source TEXT,
  fetched_at TIMESTAMPTZ
);
```

**4. Integrar Tesouro Direto**
```typescript
// Buscar da API oficial:
const url = 'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';
```

---

### 🟢 PRIORIDADE 3 (Melhorias)

**5. Heat Map com Dados Reais**
```sql
-- Criar portfolio_snapshots
-- Cron diário: salvar snapshot
-- Exibir evolução real dos últimos 12 meses
```

**6. Melhorar Performance**
- Implementar cache Redis para cotações
- Usar Server-Sent Events para updates real-time
- Otimizar queries do Supabase

---

## 📊 SCORE FINAL DE CONFIABILIDADE

### Por Categoria

| Categoria | Score | Observações |
|-----------|-------|-------------|
| **Cotações** | 85% | ✅ Real (BrAPI, CoinGecko). ⚠️ Treasury mock |
| **Portfólio** | 95% | ✅ Dados 100% reais do banco |
| **Transações** | 100% | ✅ Perfeito |
| **Alertas** | 95% | ✅ Funcionando com dados reais |
| **Dividendos** | 60% | ⚠️ Estimativa (dia 15 fixo) |
| **Ana Clara** | 30% | ❌ Cálculos matemáticos, não IA |
| **Oportunidades** | 50% | ⚠️ Regras fixas, não monitora mercado |
| **Benchmarks** | 80% | ✅ Maioria real, alguns estimados |
| **Heat Map** | 20% | ❌ Dados mock |
| **Smart Rebalance** | 90% | ✅ Cálculo preciso |

### Score Geral: **72%**

**Interpretação:**
- ✅ **Dados transacionais:** Excelente (95%+)
- ✅ **Cotações e métricas:** Muito bom (80%+)
- ⚠️ **Análises preditivas:** Razoável (50-70%)
- ❌ **IA e Insights:** Insuficiente (<40%)

---

## 🎯 CONCLUSÃO

### Pontos Fortes
1. ✅ **Infraestrutura sólida** com Supabase + Edge Functions
2. ✅ **Cotações reais** via BrAPI e CoinGecko
3. ✅ **Sistema de alertas** robusto
4. ✅ **Cálculos precisos** de métricas e rebalanceamento

### Pontos Fracos
1. ❌ **Ana Clara não usa IA real** (apenas cálculos)
2. ❌ **Oportunidades baseadas em regras fixas**
3. ⚠️ **Dividendos são estimativas** (dia 15 fixo)
4. ❌ **Heat Map usa dados mock**
5. ⚠️ **Tesouro Direto sem cotação real**

### Risco de Confiabilidade

**BAIXO RISCO:** Cotações, Portfólio, Transações, Alertas  
**MÉDIO RISCO:** Dividendos, Benchmarks, Smart Rebalance  
**ALTO RISCO:** Ana Clara Insights, Oportunidades, Heat Map

---

## 📋 CHECKLIST DE MELHORIAS

### Implementação Imediata
- [ ] Integrar OpenAI GPT-4 na Ana Clara
- [ ] Buscar oportunidades reais de APIs
- [ ] Integrar API Tesouro Direto
- [ ] Implementar portfolio_snapshots para heat map

### Curto Prazo (1-2 semanas)
- [ ] Buscar proventos reais (B3/Status Invest)
- [ ] Melhorar cache de cotações
- [ ] Adicionar mais benchmarks
- [ ] Implementar notificações WhatsApp

### Médio Prazo (1 mês)
- [ ] Dashboard de performance real-time
- [ ] Relatórios de IR automatizados
- [ ] Comparação com carteiras modelo
- [ ] Análise fundamentalista automatizada

---

**Assinatura Digital:** Cascade AI  
**Hash Auditoria:** 9f4a8c6e (commit ref)
