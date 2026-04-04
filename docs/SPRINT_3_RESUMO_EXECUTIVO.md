# 🎯 SPRINT 3: RESUMO EXECUTIVO

**Status:** 📋 Pronto para iniciar  
**Duração:** 4 dias (32 horas)  
**Objetivo:** Sistema completo de investimentos com gráficos e alertas

---

## 📊 VISÃO RÁPIDA

### **O que vamos construir:**

```
┌─────────────────────────────────────────────┐
│  PÁGINA INVESTIMENTOS                       │
├─────────────────────────────────────────────┤
│  📊 4 Cards de Resumo                       │
│  ├─ Total Investido: R$ 50.000            │
│  ├─ Valor Atual: R$ 53.500                │
│  ├─ Rentabilidade: +7,00%                 │
│  └─ Retorno: +R$ 3.500                    │
├─────────────────────────────────────────────┤
│  📑 5 Abas:                                 │
│  ├─ 📊 Visão Geral (3 gráficos)           │
│  ├─ 💼 Meus Investimentos (grid cards)    │
│  ├─ 📈 Transações (timeline)              │
│  ├─ 💰 Dividendos (calendar) 🔥           │
│  └─ 🔔 Alertas (lista)                    │
└─────────────────────────────────────────────┘
```

---

## 🗂️ ESTRUTURA DE ARQUIVOS

### **Novos Arquivos (20):**

```
src/
├── hooks/
│   ├── useInvestmentTransactions.ts    ⭐ Gerencia transações
│   ├── usePortfolioMetrics.ts          ⭐ Calcula métricas
│   ├── useInvestmentAlerts.ts          ⭐ Gerencia alertas
│   └── useDividendCalendar.ts          🔥 Próximos dividendos
├── components/investments/
│   ├── InvestmentDialog.tsx            ⭐ CRUD investimentos
│   ├── InvestmentCard.tsx              📦 Card individual
│   ├── TransactionDialog.tsx           ⭐ Add transação
│   ├── TransactionTimeline.tsx         📅 Timeline
│   ├── AlertDialog.tsx                 🔔 Criar alerta
│   ├── AlertsList.tsx                  📋 Lista alertas
│   ├── PortfolioSummaryCards.tsx       📊 4 cards resumo
│   ├── AssetAllocationChart.tsx        🍩 Gráfico Donut
│   ├── PortfolioEvolutionChart.tsx     📈 Gráfico Linha
│   ├── PerformanceBarChart.tsx         📊 Gráfico Barras
│   ├── DividendCalendar.tsx            🔥 Calendar dividendos
│   └── DividendHistoryTable.tsx        📋 Histórico
└── utils/
    └── investmentCalculations.ts       🧮 Funções auxiliares

supabase/
├── migrations/
│   └── 20251109_create_investment_alerts.sql
└── functions/
    └── check-investment-alerts/
        └── index.ts                     ⏰ Cron alertas
```

---

## 📅 CRONOGRAMA DIA A DIA

### **DIA 1: CRUD + Transações** ⏱️ 8h

```
Morning (4h)
├─ 1h: Migration investment_alerts
├─ 2h: Hook useInvestmentTransactions
└─ 1h: InvestmentDialog (formulário)

Afternoon (4h)
├─ 2h: TransactionDialog (Buy, Sell, Dividend, Split)
├─ 1h: TransactionTimeline (lista)
└─ 1h: Integração Investments.tsx (abas)
```

**Entregáveis:**
- ✅ Criar/Editar/Deletar investimentos
- ✅ Adicionar transações
- ✅ Recálculo automático de preço médio

---

### **DIA 2: Métricas + Alertas** ⏱️ 8h

```
Morning (4h)
├─ 2h: Hook usePortfolioMetrics
├─ 1h: PortfolioSummaryCards (4 cards)
└─ 1h: Hook useInvestmentAlerts

Afternoon (4h)
├─ 2h: AlertDialog + AlertsList
├─ 1h: Edge Function check-investment-alerts
└─ 1h: Configurar Cron Jobs
```

**Entregáveis:**
- ✅ Cards de resumo funcionando
- ✅ Sistema de alertas completo
- ✅ Cron Job verificando alertas

---

### **DIA 3: Gráficos** ⏱️ 8h

```
Morning (4h)
├─ 1h: Instalar Recharts
├─ 1h: AssetAllocationChart (Donut)
├─ 1h: PortfolioEvolutionChart (Line)
└─ 1h: PerformanceBarChart (Bar)

Afternoon (4h)
├─ 2h: Preparar dados para gráficos
├─ 1h: Customizar cores e tooltips
└─ 1h: Aba "Visão Geral" layout
```

**Entregáveis:**
- ✅ 3 gráficos interativos
- ✅ Tooltips formatados
- ✅ Responsivo mobile

---

### **DIA 4: Dividendos + Polish** ⏱️ 8h

```
Morning (4h)
├─ 2h: Hook useDividendCalendar
├─ 1h: DividendCalendar component
└─ 1h: DividendHistoryTable

Afternoon (4h)
├─ 1h: Cards resumo dividendos
├─ 1h: Animações + Loading states
├─ 1h: Testes E2E
└─ 1h: Correção de bugs + Polish
```

**Entregáveis:**
- ✅ Dividend Calendar funcionando 🔥
- ✅ Sistema 100% polido
- ✅ Pronto para produção

---

## 🗄️ DATABASE: 1 NOVA TABELA

### **investment_alerts**
```sql
CREATE TABLE investment_alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  investment_id UUID REFERENCES investments,
  ticker TEXT NOT NULL,
  alert_type TEXT, -- 'price_above', 'price_below', 'percent_change'
  target_value DECIMAL NOT NULL,
  current_value DECIMAL,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Triggers:** Nenhum  
**RLS:** 4 policies (SELECT, INSERT, UPDATE, DELETE)  
**Índices:** 2 (user_active, ticker)

---

## 🧩 COMPONENTES: 15 NOVOS

### **Principais:**
1. **InvestmentDialog** - CRUD completo ⭐
2. **TransactionDialog** - Buy/Sell/Dividend ⭐
3. **DividendCalendar** - Próximos dividendos 🔥
4. **AssetAllocationChart** - Donut alocação
5. **PortfolioEvolutionChart** - Linha evolução
6. **AlertsList** - Gerenciar alertas

### **Auxiliares:**
7. InvestmentCard
8. TransactionTimeline
9. AlertDialog
10. PerformanceBarChart
11. DividendHistoryTable
12. PortfolioSummaryCards
13. InvestmentFilters
14. TransactionFilters
15. EmptyStates

---

## 🔧 HOOKS: 4 NOVOS

1. **useInvestmentTransactions** - Gerencia transações ⭐
2. **usePortfolioMetrics** - Calcula métricas ⭐
3. **useInvestmentAlerts** - Gerencia alertas ⭐
4. **useDividendCalendar** - Próximos dividendos 🔥

---

## ⚙️ EDGE FUNCTIONS: 1 NOVA

### **check-investment-alerts**
- **Trigger:** Cron (5min pregão, 1h fora)
- **Ação:** Verifica alertas e dispara notificações
- **Integrações:** BrAPI (cotações), Push/Email/WhatsApp

---

## 📦 DEPENDENCIES

### **Novas:**
```bash
pnpm install recharts
```

### **Já instaladas:**
- ✅ @supabase/supabase-js
- ✅ framer-motion
- ✅ lucide-react
- ✅ react-hook-form
- ✅ zod

---

## 🎨 FEATURES KILLER 🔥

### **1. Dividend Calendar**
> "Nunca mais perca uma data de dividendo!"

- Próximos 90 dias de pagamentos
- Valor estimado por ação
- Total acumulado mês/ano
- Export para Google Calendar

### **2. Smart Alerts**
> "Seja notificado no momento certo"

- Preço alvo (acima/abaixo)
- Variação percentual
- Multi-canal (Push, Email, WhatsApp)
- Auto-desativa após disparar

### **3. Transaction Timeline**
> "Histórico visual completo"

- Agrupamento por data
- Ícones por tipo
- Busca e filtros
- Cálculo de retorno por transação

---

## ✅ CRITÉRIOS DE SUCESSO

### **Funcional:**
- [ ] CRUD investimentos: 100% funcional
- [ ] Transações: 4 tipos (Buy, Sell, Dividend, Split)
- [ ] Gráficos: 3 renderizando com dados reais
- [ ] Alertas: Disparando automaticamente
- [ ] Dividendos: Calendar com próximas datas

### **Performance:**
- [ ] Página carrega em < 3s
- [ ] Gráficos renderizam em < 1s
- [ ] 0 erros no console
- [ ] Build sem warnings

### **UX:**
- [ ] Mobile 100% responsivo
- [ ] Loading states em todas operações
- [ ] Toasts de feedback
- [ ] Animações suaves (60fps)

---

## 🚀 DEPLOY CHECKLIST

- [ ] Migration aplicada
- [ ] Edge Function deployed
- [ ] Cron Jobs configurados
- [ ] Build OK
- [ ] Testes E2E passando
- [ ] Commit + Push
- [ ] Documentação atualizada

---

## 📊 ESTIMATIVA DE LINHAS

| Categoria | Linhas | Arquivos |
|-----------|--------|----------|
| Hooks | ~1.200 | 4 |
| Components | ~2.500 | 15 |
| Utils | ~300 | 1 |
| SQL | ~150 | 1 |
| Edge Function | ~200 | 1 |
| **TOTAL** | **~4.350** | **22** |

---

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO

### **Must Have (P0):**
1. CRUD investimentos
2. Sistema de transações
3. Métricas de portfólio
4. 3 Gráficos principais

### **Should Have (P1):**
5. Sistema de alertas
6. Dividend Calendar

### **Nice to Have (P2):**
7. Animações avançadas
8. Export dados
9. Filtros avançados

---

## 💡 DICAS DE IMPLEMENTAÇÃO

### **Performance:**
- Use `useMemo` para cálculos pesados
- `React.memo` em componentes de lista
- Debounce em inputs de busca
- Lazy load de gráficos

### **UX:**
- Loading skeleton em vez de spinner
- Otimistic updates (UI atualiza antes do servidor)
- Drag & drop para reordenar (futuro)
- Atalhos de teclado (Ctrl+N para novo)

### **Manutenibilidade:**
- 1 componente = 1 responsabilidade
- Extrair lógica complexa para utils
- Types compartilhados em database.types.ts
- Comentários apenas em lógica complexa

---

## 🔄 FLUXO DE TRABALHO

```
1. Ler SPRINT_3_PLANO_COMPLETO.md
2. Executar checklist dia a dia
3. Testar após cada etapa
4. Commit frequentes (feature por feature)
5. Push ao final de cada dia
6. Documentar problemas em ISSUES.md
```

---

**SPRINT 3: PRONTO PARA ARRASAR! 🚀🔥**

**Próximo comando:** "Pode iniciar DIA 1 do Sprint 3"
