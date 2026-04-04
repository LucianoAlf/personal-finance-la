# 🚀 SPRINT 5: ANALYTICS AVANÇADO - PLANO COMPLETO

**Duração:** 3 dias (24h estimado)  
**Objetivo:** Análises profissionais e relatórios avançados  
**Status:** 📋 PLANEJADO

---

## 🎯 OBJETIVOS DO SPRINT

### **Features Killer:**
1. 🔥 **Diversification Score** - Pontuação 0-100 de diversificação
2. 🔥 **Heat Map Performance** - Visualização estilo GitHub (12 meses)
3. 🔥 **Benchmark Comparison** - vs CDI, IPCA, IBOV
4. 🔥 **Investment Reports** - Relatórios para IR

---

## 📅 CRONOGRAMA DETALHADO

### **DIA 1: DIVERSIFICATION SCORE** (8h)

#### **Utils (3h):**
```typescript
export function calculateDiversificationScore(investments: Investment[]): {
  score: number;
  breakdown: {
    assetClasses: number; // 0-30
    concentration: number; // 0-30
    numAssets: number; // 0-20
    geography: number; // 0-20
  };
  recommendations: string[];
} {
  let breakdown = {
    assetClasses: 0,
    concentration: 0,
    numAssets: 0,
    geography: 0,
  };
  
  const recommendations: string[] = [];
  
  // 1. Diversificação por classe (30 pontos)
  const classes = new Set(investments.map(i => i.category)).size;
  breakdown.assetClasses = Math.min((classes / 6) * 30, 30);
  if (classes < 3) {
    recommendations.push('Diversifique em mais classes de ativos');
  }
  
  // 2. Concentração (30 pontos)
  const totalValue = investments.reduce((sum, i) => sum + i.current_value, 0);
  const maxConcentration = Math.max(
    ...investments.map(i => (i.current_value / totalValue) * 100)
  );
  breakdown.concentration = maxConcentration > 30 ? 0 : 30;
  if (maxConcentration > 30) {
    recommendations.push(`Reduzir concentração (máx: ${maxConcentration.toFixed(1)}%)`);
  }
  
  // 3. Número de ativos (20 pontos)
  const numAssets = investments.length;
  breakdown.numAssets = Math.min((numAssets / 10) * 20, 20);
  if (numAssets < 5) {
    recommendations.push('Adicionar mais ativos ao portfólio');
  }
  
  // 4. Diversificação geográfica (20 pontos)
  const hasInternational = investments.some(i => i.category === 'internacional');
  breakdown.geography = hasInternational ? 20 : 0;
  if (!hasInternational) {
    recommendations.push('Considerar exposição internacional');
  }
  
  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  return { score: Math.round(score), breakdown, recommendations };
}
```

#### **Component (3h):**
```tsx
export function DiversificationScoreCard() {
  const { investments } = useInvestments();
  const { score, breakdown, recommendations } = useMemo(
    () => calculateDiversificationScore(investments),
    [investments]
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pontuação de Diversificação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-6">
          <div className="text-6xl font-bold text-purple-600">{score}</div>
          <p className="text-muted-foreground">de 100</p>
        </div>
        
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{getLabel(key)}</span>
                <span className="text-sm font-medium">{value}/30</span>
              </div>
              <Progress value={(value / 30) * 100} />
            </div>
          ))}
        </div>
        
        {recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <p className="font-semibold mb-2">Recomendações:</p>
            <ul className="space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-sm">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### **Integration (2h):**
- [ ] Adicionar na aba "Visão Geral"
- [ ] Animações entrada
- [ ] Tooltip explicativo

---

### **DIA 2: HEAT MAP PERFORMANCE** (8h)

#### **Hook (2h):**
```typescript
export function useMonthlyReturns() {
  const { transactions } = useInvestmentTransactions();
  
  return useMemo(() => {
    const monthlyData: MonthlyReturn[] = [];
    
    // Últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(startOfMonth(new Date()), i);
      const endDate = endOfMonth(date);
      
      // Calcular valor do portfólio no final do mês
      const valueAtEnd = calculatePortfolioValue(transactions, endDate);
      const valueAtStart = calculatePortfolioValue(transactions, date);
      
      const returnPct = valueAtStart > 0
        ? ((valueAtEnd - valueAtStart) / valueAtStart) * 100
        : 0;
      
      monthlyData.push({
        date,
        return: returnPct,
        value: valueAtEnd,
      });
    }
    
    return monthlyData;
  }, [transactions]);
}
```

#### **Component (4h):**
```tsx
export function PerformanceHeatMap() {
  const monthlyReturns = useMonthlyReturns();
  
  const getHeatColor = (returnPct: number): string => {
    if (returnPct > 10) return 'bg-green-700';
    if (returnPct > 5) return 'bg-green-600';
    if (returnPct > 2) return 'bg-green-400';
    if (returnPct > 0) return 'bg-green-200';
    if (returnPct === 0) return 'bg-gray-200';
    if (returnPct > -2) return 'bg-red-200';
    if (returnPct > -5) return 'bg-red-400';
    if (returnPct > -10) return 'bg-red-600';
    return 'bg-red-700';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Mensal (12 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-2">
          {monthlyReturns.map((month) => (
            <Tooltip key={month.date.toISOString()}>
              <TooltipTrigger>
                <div
                  className={cn(
                    'aspect-square rounded-md transition-all hover:scale-110',
                    getHeatColor(month.return)
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-semibold">
                    {format(month.date, 'MMM/yy', { locale: ptBR })}
                  </p>
                  <p className="text-lg font-bold">
                    {month.return >= 0 ? '+' : ''}
                    {month.return.toFixed(2)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(month.value)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex justify-center items-center gap-2 text-xs">
          <span className="text-muted-foreground">Menos</span>
          <div className="w-4 h-4 bg-red-700 rounded" />
          <div className="w-4 h-4 bg-red-400 rounded" />
          <div className="w-4 h-4 bg-red-200 rounded" />
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="w-4 h-4 bg-green-200 rounded" />
          <div className="w-4 h-4 bg-green-400 rounded" />
          <div className="w-4 h-4 bg-green-700 rounded" />
          <span className="text-muted-foreground">Mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **Integration (2h):**
- [ ] Adicionar na aba "Visão Geral"
- [ ] Responsivo mobile (6 colunas em mobile)
- [ ] Animação hover

---

### **DIA 3: BENCHMARKS + REPORTS** (8h)

#### **Benchmark Comparison (4h):**

**Hook:**
```typescript
export function useBenchmarks(period: '1M' | '3M' | '6M' | '1Y' = '1Y') {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  
  useEffect(() => {
    async function fetchBenchmarks() {
      // Buscar dados de APIs públicas
      const cdi = await fetchCDI(period);
      const ipca = await fetchIPCA(period);
      const ibov = await fetchIBOV(period);
      
      setBenchmarks([
        { name: 'CDI', return: cdi, type: 'fixed_income' },
        { name: 'IPCA', return: ipca, type: 'inflation' },
        { name: 'IBOVESPA', return: ibov, type: 'equity' },
      ]);
    }
    
    fetchBenchmarks();
  }, [period]);
  
  return benchmarks;
}
```

**Component:**
```tsx
export function BenchmarkComparison() {
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');
  const portfolioReturn = usePortfolioReturn(period);
  const benchmarks = useBenchmarks(period);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Performance vs Benchmarks</CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1M">1 mês</SelectItem>
              <SelectItem value="3M">3 meses</SelectItem>
              <SelectItem value="6M">6 meses</SelectItem>
              <SelectItem value="1Y">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Seu Portfólio */}
          <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
            <span className="font-semibold">Seu Portfólio</span>
            <span className="text-2xl font-bold text-purple-600">
              {portfolioReturn >= 0 ? '+' : ''}
              {portfolioReturn.toFixed(2)}%
            </span>
          </div>
          
          <Separator />
          
          {/* Benchmarks */}
          {benchmarks.map((bench) => {
            const diff = portfolioReturn - bench.return;
            const isWinning = diff > 0;
            
            return (
              <div key={bench.name} className="flex justify-between items-center">
                <span className="text-muted-foreground">{bench.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium">
                    {bench.return >= 0 ? '+' : ''}
                    {bench.return.toFixed(2)}%
                  </span>
                  <Badge variant={isWinning ? 'default' : 'destructive'}>
                    {isWinning ? '↑' : '↓'}
                    {Math.abs(diff).toFixed(2)}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **Investment Reports (4h):**

**Report Generator:**
```typescript
export function generateInvestmentReport(
  period: 'monthly' | 'quarterly' | 'annual',
  year: number,
  month?: number
): InvestmentReport {
  const startDate = getStartDate(period, year, month);
  const endDate = getEndDate(period, year, month);
  
  const transactions = getTransactions(startDate, endDate);
  const investments = getInvestments(endDate);
  
  return {
    period: { type: period, start: startDate, end: endDate },
    
    summary: {
      totalInvested: sumInvested(transactions),
      currentValue: sumCurrentValue(investments),
      totalReturn: calculateReturn(transactions, investments),
      returnPercentage: calculateReturnPct(transactions, investments),
    },
    
    allocation: calculateAllocation(investments),
    
    performance: {
      bestPerformer: findBestPerformer(investments),
      worstPerformer: findWorstPerformer(investments),
      avgReturn: calculateAvgReturn(investments),
    },
    
    dividends: {
      totalReceived: sumDividends(transactions, startDate, endDate),
      count: countDividends(transactions, startDate, endDate),
      yieldOnCost: calculateYieldOnCost(investments, transactions),
    },
    
    transactions: {
      buys: transactions.filter(t => t.transaction_type === 'buy'),
      sells: transactions.filter(t => t.transaction_type === 'sell'),
      dividends: transactions.filter(t => t.transaction_type === 'dividend'),
    },
    
    // Para IR
    taxReport: {
      capitalGains: calculateCapitalGains(transactions, startDate, endDate),
      dividendsReceived: sumDividends(transactions, startDate, endDate),
      tradingProfit: calculateTradingProfit(transactions, startDate, endDate),
      swingTrade: calculateSwingTrade(transactions, startDate, endDate),
      dayTrade: calculateDayTrade(transactions, startDate, endDate),
    },
  };
}
```

**Component:**
```tsx
export function InvestmentReportDialog() {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  
  const report = useMemo(
    () => generateInvestmentReport(period, year, month),
    [period, year, month]
  );
  
  const handleExport = () => {
    // Export to PDF or Excel
    exportToPDF(report);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Gerar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Relatório de Investimentos</DialogTitle>
        </DialogHeader>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={period} onValueChange={setPeriod}>
            <SelectItem value="monthly">Mensal</SelectItem>
            <SelectItem value="quarterly">Trimestral</SelectItem>
            <SelectItem value="annual">Anual</SelectItem>
          </Select>
          {/* Year and Month selects */}
        </div>
        
        {/* Report Content */}
        <div className="space-y-6">
          <ReportSummary data={report.summary} />
          <ReportAllocation data={report.allocation} />
          <ReportPerformance data={report.performance} />
          <ReportDividends data={report.dividends} />
          <ReportTaxes data={report.taxReport} />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleExport}>
            Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🗄️ ARQUITETURA DATABASE

### **Nova Tabela (opcional):**
```sql
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  snapshot_date date NOT NULL,
  total_invested numeric NOT NULL,
  current_value numeric NOT NULL,
  return_amount numeric,
  return_percentage numeric,
  allocation jsonb, -- { "renda_fixa": 30, "acoes": 50, ... }
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Index
CREATE INDEX idx_portfolio_snapshots_user_date 
ON portfolio_snapshots(user_id, snapshot_date DESC);

-- RLS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own snapshots" ON portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);
```

### **Cron Job para Snapshots:**
```sql
-- Rodar diariamente às 00:00
SELECT cron.schedule(
  'daily-portfolio-snapshot',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT].supabase.co/functions/v1/create-portfolio-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    )
  ) AS request_id;
  $$
);
```

---

## 📦 ENTREGÁVEIS

### **Frontend:**
- [ ] DiversificationScoreCard component
- [ ] PerformanceHeatMap component
- [ ] BenchmarkComparison component
- [ ] InvestmentReportDialog component
- [ ] Hooks: useMonthlyReturns, useBenchmarks, usePortfolioReturn
- [ ] Utils: calculateDiversificationScore, generateInvestmentReport

### **Backend:**
- [ ] Edge Function: create-portfolio-snapshot (opcional)
- [ ] Cron Job: Daily snapshot (opcional)
- [ ] API integrations: CDI, IPCA, IBOV
- [ ] Report export (PDF generation)

### **Documentação:**
- [ ] SPRINT_5_DIA_1_COMPLETO.md
- [ ] SPRINT_5_DIA_2_COMPLETO.md
- [ ] SPRINT_5_DIA_3_COMPLETO.md
- [ ] SPRINT_5_COMPLETO_FINAL.md

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] Diversification Score calculando corretamente
- [ ] Heat Map renderizando 12 meses
- [ ] Benchmarks comparando CDI, IPCA, IBOV
- [ ] Relatórios gerando corretamente
- [ ] Export PDF funcionando
- [ ] Todos componentes responsivos

---

**Data de Criação:** 09 Nov 2025  
**Status:** 📋 PRONTO PARA EXECUÇÃO
