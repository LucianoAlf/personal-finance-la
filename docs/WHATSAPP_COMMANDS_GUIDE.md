# 📱 WHATSAPP COMMANDS - GUIA DE IMPLEMENTAÇÃO

**Sprint 4 DIA 3**  
**Status:** 📋 Documentado (Implementação N8N Externa)

---

## 🎯 OBJETIVO

Permitir que usuários interajam com o sistema de investimentos via WhatsApp usando comandos naturais em português.

---

## 🔧 ARQUITETURA

### **Stack:**
- **N8N:** Automação e workflow
- **UAZAPI:** Gateway WhatsApp
- **Supabase:** Backend (Edge Functions + Database)

### **Fluxo:**
```
WhatsApp → UAZAPI → N8N → Parser → Edge Function → Database → Response → N8N → UAZAPI → WhatsApp
```

---

## 📋 COMANDOS IMPLEMENTADOS

### **1. Portfólio** 
```
Comando: "portfólio" ou "portfolio" ou "carteira"
Resposta:
💎 Seu Portfólio

Total Investido: R$ 50.000,00
Valor Atual: R$ 55.000,00
Rentabilidade: +10,00% (R$ 5.000,00)

📊 Alocação:
• Renda Fixa: 30,0% (R$ 16.500,00)
• Ações Nacionais: 40,0% (R$ 22.000,00)
• FIIs: 20,0% (R$ 11.000,00)
• Internacional: 10,0% (R$ 5.500,00)

5 investimentos ativos
```

### **2. Adicionar Investimento**
```
Comando: "adicionar 100 PETR4 a 28.50"
Resposta:
✅ Investimento registrado!

100 x PETR4 a R$ 28,50
Total investido: R$ 2.850,00
Tipo: Ações
```

### **3. Cotação**
```
Comando: "PETR4" ou "cotação PETR4"
Resposta:
📊 PETR4 - Petrobras PN

Preço: R$ 30,25
📈 Variação: +2,15% (R$ 0,64)
Abertura: R$ 29,80
Máxima: R$ 30,50
Mínima: R$ 29,75

Atualizado: 10/11/2025 15:30
```

### **4. Dividendos**
```
Comando: "dividendos" ou "proventos"
Resposta:
💰 Próximos Dividendos (90 dias)

ITSA4 (15/11): R$ 45,00
BBDC4 (20/11): R$ 78,50
PETR4 (05/12): R$ 120,00

Total próximos 30 dias: R$ 123,50
Total próximos 90 dias: R$ 243,50
```

### **5. Oportunidades**
```
Comando: "oportunidades" ou "radar"
Resposta:
🔍 Oportunidades Detectadas

1. Renda fixa abaixo do recomendado
   Confiança: 85%
   Sua alocação: 25%, Meta: 30%
   
2. Diversifique com FIIs
   Confiança: 75%
   Yield médio: 8-10% a.a.
```

### **6. Rebalancear**
```
Comando: "rebalancear" ou "ajustar portfólio"
Resposta:
🎯 Rebalanceamento Sugerido

COMPRAR Renda Fixa: R$ 2.500,00
   Atual: 25%, Meta: 30%

VENDER Ações: R$ 1.000,00
   Atual: 42%, Meta: 40%

Portfólio está 7,5% desbalanceado
```

---

## 🛠️ IMPLEMENTAÇÃO N8N

### **Workflow Principal:**

```javascript
// N8N Workflow: Investment Commands Handler

// 1. Webhook Trigger (UAZAPI)
{
  "from": "5511999999999",
  "body": "portfólio",
  "timestamp": "2025-11-10T10:30:00Z"
}

// 2. Parser Node (Function)
function parseCommand(message) {
  const msg = message.toLowerCase().trim();
  
  // Detectar tipo de comando
  if (msg === 'portfólio' || msg === 'portfolio' || msg === 'carteira') {
    return { type: 'portfolio', params: null };
  }
  
  // Adicionar investimento: "adicionar 100 PETR4 a 28.50"
  const addMatch = msg.match(/adicionar\s+(\d+)\s+(\w+)\s+a\s+([\d.,]+)/);
  if (addMatch) {
    return {
      type: 'add_investment',
      params: {
        quantity: parseInt(addMatch[1]),
        ticker: addMatch[2].toUpperCase(),
        price: parseFloat(addMatch[3].replace(',', '.'))
      }
    };
  }
  
  // Cotação: "PETR4" ou "cotação PETR4"
  if (/^[A-Z]{4}\d{1,2}$/.test(msg.toUpperCase())) {
    return { type: 'quote', params: { ticker: msg.toUpperCase() } };
  }
  
  // Dividendos
  if (msg === 'dividendos' || msg === 'proventos') {
    return { type: 'dividends', params: null };
  }
  
  // Oportunidades
  if (msg === 'oportunidades' || msg === 'radar') {
    return { type: 'opportunities', params: null };
  }
  
  // Rebalancear
  if (msg === 'rebalancear' || msg === 'ajustar portfolio' || msg === 'ajustar portfólio') {
    return { type: 'rebalance', params: null };
  }
  
  return { type: 'unknown', params: null };
}

// 3. Switch Node (Router)
switch (command.type) {
  case 'portfolio': // Edge Function: get-portfolio-summary
  case 'add_investment': // Edge Function: add-investment
  case 'quote': // Edge Function: get-quote
  case 'dividends': // Edge Function: get-dividends
  case 'opportunities': // Edge Function: get-opportunities
  case 'rebalance': // Edge Function: get-rebalance-suggestions
  default: // Mensagem de ajuda
}

// 4. HTTP Request to Supabase Edge Function
{
  "method": "POST",
  "url": "https://[PROJECT].supabase.co/functions/v1/whatsapp-[command]",
  "headers": {
    "Authorization": "Bearer {{$env.SUPABASE_ANON_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "userId": "{{$json.userId}}",
    "params": "{{$json.params}}"
  }
}

// 5. Format Response (Function)
function formatResponse(data, commandType) {
  switch (commandType) {
    case 'portfolio':
      return formatPortfolioResponse(data);
    // ... outros formatters
  }
}

// 6. Send WhatsApp Message (UAZAPI)
{
  "endpoint": "send-message",
  "to": "{{$json.from}}",
  "message": "{{$json.formattedResponse}}"
}
```

---

## 📦 EDGE FUNCTIONS NECESSÁRIAS

### **1. whatsapp-portfolio**
```typescript
// supabase/functions/whatsapp-portfolio/index.ts
export async function handler(userId: string) {
  const { data: investments } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  const metrics = calculateMetrics(investments);
  return formatPortfolioSummary(metrics);
}
```

### **2. whatsapp-add-investment**
```typescript
// supabase/functions/whatsapp-add-investment/index.ts
export async function handler(
  userId: string,
  params: { quantity: number; ticker: string; price: number }
) {
  const { data, error } = await supabase
    .from('investments')
    .insert({
      user_id: userId,
      ticker: params.ticker,
      quantity: params.quantity,
      purchase_price: params.price,
      type: 'stock',
      status: 'active',
    })
    .select()
    .single();
  
  return formatAddInvestmentResponse(data);
}
```

### **3. whatsapp-quote**
```typescript
// supabase/functions/whatsapp-quote/index.ts
export async function handler(ticker: string) {
  const quote = await fetchQuoteFromBrAPI(ticker);
  return formatQuoteResponse(quote);
}
```

### **4. whatsapp-dividends**
```typescript
// supabase/functions/whatsapp-dividends/index.ts
export async function handler(userId: string) {
  const dividends = await calculateUpcomingDividends(userId);
  return formatDividendsResponse(dividends);
}
```

### **5. whatsapp-opportunities**
```typescript
// supabase/functions/whatsapp-opportunities/index.ts
export async function handler(userId: string) {
  const { data } = await supabase
    .from('market_opportunities')
    .select('*')
    .eq('user_id', userId)
    .eq('dismissed', false)
    .limit(3);
  
  return formatOpportunitiesResponse(data);
}
```

### **6. whatsapp-rebalance**
```typescript
// supabase/functions/whatsapp-rebalance/index.ts
export async function handler(userId: string) {
  const actions = await calculateRebalancing(userId);
  return formatRebalanceResponse(actions);
}
```

---

## 🎮 GAMIFICAÇÃO BÁSICA

### **Badges Implementados:**

```typescript
// src/types/badges.ts
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (data: any) => boolean;
}

export const INVESTMENT_BADGES: Badge[] = [
  {
    id: 'first_investment',
    name: 'Primeira Compra',
    description: 'Registrou seu primeiro investimento',
    icon: '🎯',
    condition: (investments) => investments.length >= 1,
  },
  {
    id: 'diversified',
    name: 'Diversificado',
    description: 'Investiu em 3 ou mais classes de ativos',
    icon: '🌈',
    condition: (investments) => {
      const categories = new Set(investments.map(i => i.category));
      return categories.size >= 3;
    },
  },
  {
    id: 'investor',
    name: 'Investidor',
    description: 'Possui 10 ou mais investimentos',
    icon: '💼',
    condition: (investments) => investments.length >= 10,
  },
  {
    id: 'dividend_earner',
    name: 'Dividendeiro',
    description: 'Recebeu seus primeiros dividendos',
    icon: '💰',
    condition: (transactions) => {
      return transactions.some(t => t.transaction_type === 'dividend');
    },
  },
  {
    id: 'balanced',
    name: 'Balanceado',
    description: 'Portfólio com Health Score acima de 80',
    icon: '⚖️',
    condition: (healthScore) => healthScore >= 80,
  },
  {
    id: 'consistent',
    name: 'Consistente',
    description: 'Investiu por 6 meses consecutivos',
    icon: '🔥',
    condition: (transactions) => {
      // Lógica de 6 meses consecutivos
      return checkConsecutiveMonths(transactions, 6);
    },
  },
];
```

### **UI de Badges:**

```typescript
// src/components/investments/BadgesDisplay.tsx
export function BadgesDisplay({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {INVESTMENT_BADGES.map(badge => {
        const earned = badges.includes(badge.id);
        return (
          <div
            key={badge.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              earned
                ? 'bg-purple-100 border-purple-300'
                : 'bg-gray-100 border-gray-300 opacity-50'
            }`}
          >
            <span className="text-2xl">{badge.icon}</span>
            <div>
              <p className="text-sm font-semibold">{badge.name}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **N8N Setup:**
- [ ] Criar conta N8N (https://n8n.io)
- [ ] Configurar webhook UAZAPI
- [ ] Criar workflow principal
- [ ] Implementar parser de comandos
- [ ] Testar cada comando

### **Edge Functions:**
- [ ] Deploy whatsapp-portfolio
- [ ] Deploy whatsapp-add-investment
- [ ] Deploy whatsapp-quote
- [ ] Deploy whatsapp-dividends
- [ ] Deploy whatsapp-opportunities
- [ ] Deploy whatsapp-rebalance

### **Gamificação:**
- [ ] Criar badges.ts com definições
- [ ] Component BadgesDisplay
- [ ] Lógica de unlock badges
- [ ] Notificações ao ganhar badge
- [ ] Persistir badges no profile

---

## 📊 MÉTRICAS DE SUCESSO

- [ ] 80%+ dos comandos respondem em < 3s
- [ ] Taxa de erro < 5%
- [ ] 10+ usuários usando WhatsApp diariamente
- [ ] 5+ badges desbloqueados por usuário

---

**Status:** 📋 Pronto para implementação externa  
**Próximos Passos:** Configurar N8N + UAZAPI  
**Data:** 10 Nov 2025
