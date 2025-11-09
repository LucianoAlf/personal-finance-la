# 🚀 SPRINT 5.1: MELHORIAS AVANÇADAS - PLANO COMPLETO

**Objetivo:** Elevar o Analytics Avançado para produção com dados reais e exportação profissional

---

## 📊 VISÃO GERAL DAS MELHORIAS

1. **Export PDF Real** - jsPDF + autotable
2. **APIs Reais de Benchmarks** - IBGE, Banco Central, B3
3. **Portfolio Snapshots** - Histórico diário automático
4. **Gráficos Interativos** - Chart.js
5. **Mais Benchmarks** - S&P 500, Bitcoin, Ouro

---

## 1️⃣ EXPORT PDF REAL

### **📋 Objetivo**
Gerar relatórios profissionais em PDF com logo, tabelas formatadas e gráficos.

### **🏗️ Arquitetura Backend**
**Não requer backend** - tudo no frontend.

### **🎨 Arquitetura Frontend**

#### **Dependências:**
```bash
pnpm install jspdf jspdf-autotable
pnpm install @types/jspdf-autotable --save-dev
```

#### **Estrutura de Arquivos:**
```
src/
├── utils/
│   └── pdfExport.ts              # Gerador de PDF
├── components/investments/
│   └── InvestmentReportDialog.tsx # Atualizar botão Export
```

#### **Utils - pdfExport.ts:**
```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportReportToPDF(report: InvestmentReport) {
  const doc = new jsPDF();
  
  // 1. HEADER
  doc.setFontSize(20);
  doc.text('Relatório de Investimentos', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(report.period.label, 105, 28, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 105, 34, { align: 'center' });
  
  // 2. SUMMARY
  doc.setFontSize(14);
  doc.text('Resumo', 14, 45);
  
  const summaryData = [
    ['Total Investido', formatCurrency(report.summary.totalInvested)],
    ['Valor Atual', formatCurrency(report.summary.currentValue)],
    ['Retorno Total', formatCurrency(report.summary.totalReturn)],
    ['Rentabilidade', `${report.summary.returnPercentage.toFixed(2)}%`],
  ];
  
  autoTable(doc, {
    startY: 50,
    head: [['Métrica', 'Valor']],
    body: summaryData,
    theme: 'grid',
  });
  
  // 3. ALLOCATION
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text('Alocação por Categoria', 14, finalY);
  
  const allocationData = Object.entries(report.allocation).map(([cat, data]) => [
    cat,
    formatCurrency(data.value),
    `${data.percentage.toFixed(2)}%`,
  ]);
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Categoria', 'Valor', 'Percentual']],
    body: allocationData,
    theme: 'striped',
  });
  
  // 4. DIVIDENDS
  finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text('Dividendos', 14, finalY);
  
  const dividendData = [
    ['Total Recebido', formatCurrency(report.dividends.totalReceived)],
    ['Pagamentos', report.dividends.count.toString()],
    ['Yield on Cost', `${report.dividends.yieldOnCost.toFixed(2)}%`],
  ];
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Métrica', 'Valor']],
    body: dividendData,
    theme: 'grid',
  });
  
  // 5. FOOTER
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // 6. SAVE
  const fileName = `relatorio-investimentos-${report.period.label.replace(/\s/g, '-')}.pdf`;
  doc.save(fileName);
}
```

#### **UI/UX:**
- Botão "Exportar PDF" habilitado
- Loading state durante geração
- Toast de sucesso após download
- Preview opcional antes de exportar

---

## 2️⃣ APIS REAIS DE BENCHMARKS

### **📋 Objetivo**
Buscar dados reais de CDI, IPCA, IBOVESPA, S&P 500, Bitcoin e Ouro.

### **🔑 Autenticação das APIs**

#### **A. Banco Central do Brasil (CDI, IPCA)**
**API:** https://api.bcb.gov.br  
**Autenticação:** ❌ **Não requer** (API pública)

**Endpoints:**
```
CDI: https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json
IPCA: https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json
```

#### **B. B3 / Yahoo Finance (IBOVESPA)**
**API:** Yahoo Finance API (via RapidAPI)  
**Autenticação:** ✅ **Requer API Key** (gratuito até 500 req/dia)

**Como configurar:**
1. Criar conta em: https://rapidapi.com
2. Assinar: https://rapidapi.com/apidojo/api/yahoo-finance1
3. Copiar API Key
4. Adicionar no Supabase Vault:
   ```
   YAHOO_FINANCE_API_KEY=your_key_here
   YAHOO_FINANCE_HOST=yahoo-finance1.p.rapidapi.com
   ```

**Endpoint:**
```
GET https://yahoo-finance1.p.rapidapi.com/v8/finance/chart/%5EBVSP
Headers:
  x-rapidapi-key: {API_KEY}
  x-rapidapi-host: yahoo-finance1.p.rapidapi.com
```

#### **C. Alpha Vantage (S&P 500, Bitcoin)**
**API:** https://www.alphavantage.co  
**Autenticação:** ✅ **Requer API Key** (gratuito até 500 req/dia)

**Como configurar:**
1. Obter key em: https://www.alphavantage.co/support/#api-key
2. Adicionar no Supabase Vault:
   ```
   ALPHA_VANTAGE_API_KEY=your_key_here
   ```

**Endpoints:**
```
S&P 500: https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&apikey={API_KEY}
Bitcoin: https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=BTC&market=USD&apikey={API_KEY}
```

#### **D. CoinGecko (Bitcoin, Ethereum)**
**API:** https://www.coingecko.com/api  
**Autenticação:** ❌ **Não requer** (API pública)

**Endpoint:**
```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true
```

### **🏗️ Arquitetura Backend**

#### **Edge Function: fetch-benchmarks**
```typescript
// supabase/functions/fetch-benchmarks/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { period } = await req.json(); // '1M', '3M', '6M', '1Y'
  
  // Buscar paralelamente
  const [cdi, ipca, ibov, sp500, bitcoin] = await Promise.all([
    fetchCDI(period),
    fetchIPCA(period),
    fetchIBOV(period),
    fetchSP500(period),
    fetchBitcoin(period),
  ]);
  
  return new Response(
    JSON.stringify({
      benchmarks: [
        { name: 'CDI', return: cdi, type: 'fixed_income' },
        { name: 'IPCA', return: ipca, type: 'inflation' },
        { name: 'IBOVESPA', return: ibov, type: 'equity' },
        { name: 'S&P 500', return: sp500, type: 'equity' },
        { name: 'Bitcoin', return: bitcoin, type: 'crypto' },
      ],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

async function fetchCDI(period: string): Promise<number> {
  const response = await fetch(
    'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/365?formato=json'
  );
  const data = await response.json();
  return calculateReturn(data, period);
}

// Similar para IPCA, IBOV, etc.
```

#### **Supabase Secrets (Vault):**
```
YAHOO_FINANCE_API_KEY=...
YAHOO_FINANCE_HOST=yahoo-finance1.p.rapidapi.com
ALPHA_VANTAGE_API_KEY=...
```

### **🎨 Arquitetura Frontend**

#### **Hook atualizado:**
```typescript
// src/hooks/useBenchmarks.ts
export function useBenchmarks(period: Period = '1Y'): Benchmark[] {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBenchmarks() {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('fetch-benchmarks', {
          body: { period },
        });
        
        if (error) throw error;
        setBenchmarks(data.benchmarks);
      } catch (err) {
        console.error('Erro ao buscar benchmarks:', err);
        setError('Falha ao carregar benchmarks');
        // Fallback para dados mock
        setBenchmarks(MOCK_BENCHMARKS[period]);
      } finally {
        setLoading(false);
      }
    }

    fetchBenchmarks();
  }, [period]);

  return benchmarks;
}
```

---

## 3️⃣ PORTFOLIO SNAPSHOTS

### **📋 Objetivo**
Salvar snapshot diário do portfólio para histórico e análises.

### **🏗️ Arquitetura Backend**

#### **A. Tabela: portfolio_snapshots**
```sql
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  snapshot_date date NOT NULL,
  
  -- Valores
  total_invested numeric NOT NULL,
  current_value numeric NOT NULL,
  return_amount numeric,
  return_percentage numeric,
  
  -- Breakdown
  allocation jsonb, -- { "renda_fixa": 30, "acoes": 50, ... }
  top_performers jsonb, -- [{ "ticker": "PETR4", "return": 15.2 }]
  
  -- Dividendos
  dividends_ytd numeric DEFAULT 0,
  dividend_yield numeric DEFAULT 0,
  
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_portfolio_snapshots_user_date 
ON portfolio_snapshots(user_id, snapshot_date DESC);

-- RLS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert snapshots" ON portfolio_snapshots
  FOR INSERT WITH CHECK (true);
```

#### **B. Edge Function: create-portfolio-snapshot**
```typescript
// supabase/functions/create-portfolio-snapshot/index.ts
serve(async (req) => {
  // 1. Buscar todos usuários ativos
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true);
  
  for (const user of users) {
    // 2. Buscar investimentos do usuário
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (!investments || investments.length === 0) continue;
    
    // 3. Calcular métricas
    const totalInvested = investments.reduce((sum, inv) => sum + inv.total_invested, 0);
    const currentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
    const returnAmount = currentValue - totalInvested;
    const returnPercentage = (returnAmount / totalInvested) * 100;
    
    // 4. Calcular allocation
    const allocation = calculateAllocation(investments);
    
    // 5. Salvar snapshot
    await supabase.from('portfolio_snapshots').insert({
      user_id: user.id,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_invested: totalInvested,
      current_value: currentValue,
      return_amount: returnAmount,
      return_percentage: returnPercentage,
      allocation,
    });
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### **C. Cron Job:**
```sql
-- Rodar diariamente às 00:30 (após mercado fechar)
SELECT cron.schedule(
  'daily-portfolio-snapshot',
  '30 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/create-portfolio-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  ) AS request_id;
  $$
);
```

### **🎨 Arquitetura Frontend**

#### **Hook:**
```typescript
// src/hooks/usePortfolioHistory.ts
export function usePortfolioHistory(days: number = 90) {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('snapshot_date', subDays(new Date(), days).toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (!error) setHistory(data);
      setLoading(false);
    }

    fetchHistory();
  }, [days]);

  return { history, loading };
}
```

#### **Component:**
```typescript
// src/components/investments/PortfolioHistoryChart.tsx
export function PortfolioHistoryChart() {
  const { history } = usePortfolioHistory(365);
  
  // Renderizar gráfico de linha com Chart.js
  return <Line data={chartData} options={options} />;
}
```

---

## 4️⃣ GRÁFICOS INTERATIVOS (CHART.JS)

### **📋 Objetivo**
Substituir gráficos estáticos por interativos com tooltips, zoom e animações.

### **🏗️ Arquitetura Frontend**

#### **Dependências:**
```bash
pnpm install chart.js react-chartjs-2
```

#### **Componentes a Atualizar:**
1. `AssetAllocationChart.tsx` → Donut interativo
2. `PortfolioEvolutionChart.tsx` → Line com zoom
3. `PerformanceBarChart.tsx` → Bar com animações

#### **Exemplo: PortfolioEvolutionChart.tsx**
```typescript
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export function PortfolioEvolutionChart() {
  const { history } = usePortfolioHistory(365);

  const data = {
    labels: history.map(h => format(new Date(h.snapshot_date), 'dd/MM')),
    datasets: [
      {
        label: 'Valor Atual',
        data: history.map(h => h.current_value),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Total Investido',
        data: history.map(h => h.total_invested),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}
```

---

## 5️⃣ MAIS BENCHMARKS

### **📋 Objetivo**
Adicionar S&P 500, Bitcoin, Ouro, Ethereum, Dólar.

### **🎨 UI/UX**

#### **BenchmarkComparison.tsx atualizado:**
```typescript
const BENCHMARK_CATEGORIES = {
  'Renda Fixa': ['CDI'],
  'Inflação': ['IPCA'],
  'Ações BR': ['IBOVESPA'],
  'Ações USA': ['S&P 500', 'Nasdaq'],
  'Cripto': ['Bitcoin', 'Ethereum'],
  'Commodities': ['Ouro', 'Prata'],
  'Moedas': ['Dólar', 'Euro'],
};

export function BenchmarkComparison() {
  const [selectedCategories, setSelectedCategories] = useState(['Renda Fixa', 'Ações BR']);
  
  // Filtrar benchmarks por categoria selecionada
  const filteredBenchmarks = benchmarks.filter(b => 
    selectedCategories.some(cat => BENCHMARK_CATEGORIES[cat].includes(b.name))
  );
  
  return (
    <Card>
      {/* Multi-select de categorias */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(BENCHMARK_CATEGORIES).map(cat => (
          <Badge
            key={cat}
            variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>
      
      {/* Lista de benchmarks */}
      {filteredBenchmarks.map(bench => (
        <BenchmarkRow key={bench.name} benchmark={bench} />
      ))}
    </Card>
  );
}
```

---

## 📊 CRONOGRAMA DE IMPLEMENTAÇÃO

### **Fase 1 (2h):** Export PDF Real
- ✅ Instalar dependências
- ✅ Criar pdfExport.ts
- ✅ Atualizar InvestmentReportDialog
- ✅ Testar download

### **Fase 2 (3h):** APIs Reais de Benchmarks
- ✅ Criar Edge Function fetch-benchmarks
- ✅ Configurar Supabase Secrets
- ✅ Implementar fetchCDI, fetchIPCA, etc.
- ✅ Atualizar useBenchmarks hook
- ✅ Testar integração

### **Fase 3 (3h):** Portfolio Snapshots
- ✅ Criar tabela portfolio_snapshots
- ✅ Criar Edge Function create-portfolio-snapshot
- ✅ Configurar Cron Job diário
- ✅ Criar usePortfolioHistory hook
- ✅ Criar PortfolioHistoryChart component

### **Fase 4 (2h):** Gráficos Interativos
- ✅ Instalar Chart.js
- ✅ Atualizar AssetAllocationChart
- ✅ Atualizar PortfolioEvolutionChart
- ✅ Atualizar PerformanceBarChart

### **Fase 5 (2h):** Mais Benchmarks
- ✅ Adicionar S&P 500, Bitcoin, Ouro
- ✅ Implementar fetchers
- ✅ Atualizar BenchmarkComparison UI
- ✅ Adicionar filtros por categoria

**TOTAL ESTIMADO:** 12 horas

---

## ✅ CRITÉRIOS DE SUCESSO

- [ ] PDF exportando com logo, tabelas e footer
- [ ] Benchmarks vindo de APIs reais (CDI, IPCA, IBOV)
- [ ] Snapshots sendo salvos diariamente às 00:30
- [ ] Gráficos interativos com tooltips e zoom
- [ ] 8+ benchmarks disponíveis para comparação
- [ ] UI responsiva e performática

---

**Data de Criação:** 09 Nov 2025  
**Status:** 📋 PRONTO PARA APROVAÇÃO
