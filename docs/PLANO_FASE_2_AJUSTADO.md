# 🎯 PLANO FASE 2 - AJUSTADO (com insights do Claude)

**Data:** 15/11/2025  
**Baseado em:** Análise Windsurf + Revisão Claude

---

## 🔴 FASE 2.1 - CRÍTICO (4-5h)
**Objetivo:** Prevenir Alucinação + Consultas com Dados Reais

### **1. Edge Function `analytics-query` (2h)**

```typescript
// Nova Edge Function: supabase/functions/analytics-query/index.ts

serve(async (req) => {
  const { user_id, query_type, filters } = await req.json();
  
  switch (query_type) {
    case 'account_balance':
      return getAccountBalance(user_id, filters.account_name);
    
    case 'sum_by_category':
      return getSumByCategory(user_id, filters.category, filters.period);
    
    case 'sum_by_merchant':
      return getSumByMerchant(user_id, filters.merchant, filters.period);
    
    case 'sum_by_account_type':
      return getSumByAccountType(user_id, filters.account_type, filters.period);
    
    case 'sum_by_account_and_merchant':
      return getSumByAccountAndMerchant(user_id, filters.account, filters.merchant, filters.period);
  }
});

// ✅ Previne alucinação - sempre consulta banco real
async function getAccountBalance(userId: string, accountName: string) {
  const { data } = await supabase
    .from('accounts')
    .select('name, current_balance, type')
    .eq('user_id', userId)
    .ilike('name', `%${accountName}%`)
    .single();
  
  return {
    account: data.name,
    balance: data.current_balance,
    type: data.type,
    formatted: formatCurrency(data.current_balance)
  };
}

async function getSumByCategory(userId: string, categoryName: string, period: Period) {
  const { start, end } = parsePeriod(period);
  
  const { data } = await supabase
    .from('transactions')
    .select('amount, categories!inner(name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .ilike('categories.name', `%${categoryName}%`)
    .gte('transaction_date', start)
    .lte('transaction_date', end);
  
  const total = data.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  return {
    category: categoryName,
    total,
    count: data.length,
    period,
    formatted: formatCurrency(total)
  };
}
```

### **2. Parser de Períodos (1h)**

```typescript
// lib/period-parser.ts

interface Period {
  start: string; // YYYY-MM-DD
  end: string;
}

function parsePeriod(input: string): Period {
  const today = new Date();
  const lowerInput = input.toLowerCase();
  
  const patterns: Record<string, () => Period> = {
    'hoje': () => ({
      start: formatDate(today),
      end: formatDate(today)
    }),
    
    'ontem': () => {
      const yesterday = subDays(today, 1);
      return {
        start: formatDate(yesterday),
        end: formatDate(yesterday)
      };
    },
    
    'essa semana': () => ({
      start: formatDate(startOfWeek(today)),
      end: formatDate(today)
    }),
    
    'semana passada': () => {
      const lastWeek = subDays(today, 7);
      return {
        start: formatDate(startOfWeek(lastWeek)),
        end: formatDate(endOfWeek(lastWeek))
      };
    },
    
    'esse mês': () => ({
      start: formatDate(startOfMonth(today)),
      end: formatDate(today)
    }),
    
    'mês passado': () => {
      const lastMonth = subMonths(today, 1);
      return {
        start: formatDate(startOfMonth(lastMonth)),
        end: formatDate(endOfMonth(lastMonth))
      };
    }
  };
  
  // Detectar padrões
  for (const [pattern, fn] of Object.entries(patterns)) {
    if (lowerInput.includes(pattern)) {
      return fn();
    }
  }
  
  // Detectar mês específico: "outubro", "novembro"
  const monthMatch = lowerInput.match(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i);
  if (monthMatch) {
    return parseNamedMonth(monthMatch[0]);
  }
  
  // Detectar "últimos X dias"
  const daysMatch = lowerInput.match(/últimos?\s+(\d+)\s+dias?/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return {
      start: formatDate(subDays(today, days)),
      end: formatDate(today)
    };
  }
  
  // Default: esse mês
  return patterns['esse mês']();
}
```

### **3. Integrar com `process-whatsapp-message` (1-2h)**

```typescript
// Detectar intent de consulta
const ANALYTICS_KEYWORDS = [
  'quanto', 'qual', 'saldo', 'gastei', 'gastar',
  'total', 'soma', 'valor', 'despesa', 'receita'
];

if (ANALYTICS_KEYWORDS.some(kw => lowerContent.includes(kw))) {
  console.log('📊 [v24] Consulta analítica detectada');
  
  // Chamar analytics-query
  const analyticsResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/analytics-query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        user_id: user.id,
        raw_query: content,
        phone: phone
      })
    }
  );
  
  const result = await analyticsResponse.json();
  
  // Enviar resposta com dados REAIS
  await sendWhatsAppMessage(phone, result.formatted_response);
}
```

---

## 🟡 FASE 2.2 - IMPORTANTE (3-4h)
**Objetivo:** Múltiplas Contas + PIX + Transferências

### **1. Melhorar `detectAccountFromMessage()` (1-2h)**

```typescript
async function detectAccountFromMessage(message: string, userId: string, supabase: any) {
  const lowerMsg = message.toLowerCase();
  
  // 1. Tentar nome exato
  const exactMatch = await tryExactAccountName(lowerMsg, userId, supabase);
  if (exactMatch) return { account: exactMatch, confidence: 'high' };
  
  // 2. Detectar tipo de transação
  const transactionType = detectTransactionType(lowerMsg);
  
  // 3. Buscar contas do tipo
  const accountType = transactionType === 'debit' ? 'checking' : 'credit_card';
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('type', accountType);
  
  // 4. MÚLTIPLAS CONTAS → PERGUNTAR
  if (accounts.length > 1) {
    return {
      needsConfirmation: true,
      accounts,
      transactionType,
      message: `💳 Em qual conta ${transactionType === 'debit' ? 'corrente' : 'de crédito'} foi?`
    };
  }
  
  // 5. ÚNICA CONTA → USAR
  if (accounts.length === 1) {
    return { account: accounts[0], confidence: 'medium' };
  }
  
  return null;
}
```

### **2. Detecção de PIX (1h)**

```typescript
function detectPIX(message: string): PIXInfo | null {
  const lowerMsg = message.toLowerCase();
  
  // Padrões PIX
  const pixPatterns = [
    /(?:fiz|enviei|mandei)\s+(?:um\s+)?pix/i,
    /pix\s+de\s+(\d+)/i,
    /pix\s+(?:para|pro|pra)\s+(\w+)/i,
    /recebi\s+pix/i
  ];
  
  const isPIX = pixPatterns.some(pattern => pattern.test(message));
  if (!isPIX) return null;
  
  // Extrair informações
  const amountMatch = message.match(/(\d+(?:[.,]\d{1,2})?)/);
  const recipientMatch = message.match(/(?:para|pro|pra)\s+(\w+)/i);
  const isReceived = /recebi/i.test(message);
  
  return {
    type: isReceived ? 'pix_received' : 'pix_sent',
    amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : null,
    recipient: recipientMatch ? recipientMatch[1] : null
  };
}

// Integração
if (pixInfo) {
  if (pixInfo.type === 'pix_sent') {
    // Perguntar de qual conta saiu
    await saveContext(userId, phone, 'awaiting_pix_account', {
      pix_info: pixInfo,
      transaction_message: content
    });
    
    const accountsList = userAccounts
      .filter(a => a.type === 'checking')
      .map(a => `• ${a.name}`)
      .join('\n');
    
    return `💳 De qual conta saiu o PIX?\n\n${accountsList}`;
  }
}
```

### **3. Transferências Internas vs Externas (1h)**

```typescript
function detectTransfer(message: string): TransferInfo | null {
  // Padrão: "do X para Y"
  const transferPattern = /(?:transferi|enviei|mandei)\s+(?:do|da)\s+(\w+)\s+(?:para|pro|pra)\s+(\w+)/i;
  const match = message.match(transferPattern);
  
  if (!match) return null;
  
  return {
    fromAccountName: match[1],
    toAccountName: match[2],
    amount: extractAmount(message)
  };
}

async function handleTransfer(transferInfo: TransferInfo, userId: string, supabase: any) {
  // Buscar contas do usuário
  const fromAccount = await findAccountByName(transferInfo.fromAccountName, userId, supabase);
  const toAccount = await findAccountByName(transferInfo.toAccountName, userId, supabase);
  
  if (fromAccount && toAccount) {
    // TRANSFERÊNCIA INTERNA
    await supabase.from('transactions').insert({
      user_id: userId,
      account_id: fromAccount.id,
      transfer_to_account_id: toAccount.id,
      type: 'transfer',
      amount: transferInfo.amount,
      description: `Transferência ${fromAccount.name} → ${toAccount.name}`
    });
    
    return `✅ Transferência interna registrada!\n💸 ${fromAccount.name} → ${toAccount.name}\n💵 ${formatCurrency(transferInfo.amount)}`;
  }
  
  if (fromAccount && !toAccount) {
    // TRANSFERÊNCIA EXTERNA
    await supabase.from('transactions').insert({
      user_id: userId,
      account_id: fromAccount.id,
      type: 'expense',
      amount: transferInfo.amount,
      description: `Transferência para ${transferInfo.toAccountName}`
    });
    
    return `✅ Transferência externa registrada!\n💸 De: ${fromAccount.name}\n👤 Para: ${transferInfo.toAccountName}\n💵 ${formatCurrency(transferInfo.amount)}`;
  }
  
  return '❌ Conta de origem não encontrada';
}
```

---

## 🟢 FASE 2.3 - POLISH (2-3h)
**Objetivo:** Queries Avançadas + Formatação Rica

### **1. Filtros Combinados (2h)**
```typescript
// "Quanto gastei no iFood no cartão Nubank esse mês?"
case 'sum_by_merchant_and_account':
  const { data } = await supabase
    .from('transactions')
    .select('amount, accounts!inner(name)')
    .eq('user_id', userId)
    .ilike('description', `%${merchant}%`)
    .ilike('accounts.name', `%${accountName}%`)
    .gte('transaction_date', period.start)
    .lte('transaction_date', period.end);
```

### **2. Formatação Rica (1h)**
```typescript
// Top 5 gastos
function formatTopExpenses(transactions: Transaction[]): string {
  const sorted = transactions
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  return `📊 *Top 5 Gastos*\n\n${sorted.map((t, i) => 
    `${i+1}. ${t.description} - ${formatCurrency(t.amount)}`
  ).join('\n')}`;
}

// Gráfico ASCII
function formatBarChart(data: {label: string, value: number}[]): string {
  const max = Math.max(...data.map(d => d.value));
  return data.map(d => {
    const bars = '█'.repeat(Math.round((d.value / max) * 10));
    return `${d.label.padEnd(15)} ${bars} ${formatCurrency(d.value)}`;
  }).join('\n');
}
```

---

## 📊 COMPARAÇÃO FINAL

| Item | Antes (Windsurf) | Depois (Ajustado) |
|------|------------------|-------------------|
| Ordem | Contas → Analytics → Transfers | Analytics → Contas+PIX → Polish |
| PIX | ❌ Não mencionado | ✅ Explícito |
| Categorias | ⚠️ Implícito | ✅ Explícito |
| Períodos | ⚠️ Implícito | ✅ Parser completo |
| Prioridade | ⚠️ Pode ter alucinação | ✅ Previne primeiro |

---

## ⏱️ CRONOGRAMA

```
DIA 1 (4-5h):
✅ FASE 2.1 - Analytics
  - Edge Function analytics-query (2h)
  - Parser de períodos (1h)
  - Integração process-whatsapp (1-2h)
  
DIA 2 (3-4h):
✅ FASE 2.2 - Contas + PIX
  - Múltiplas contas (1-2h)
  - Detecção PIX (1h)
  - Transferências (1h)
  
DIA 3 (2-3h):
✅ FASE 2.3 - Polish
  - Filtros combinados (2h)
  - Formatação rica (1h)
```

**Total:** 9-12h (vs 10-13h original)
