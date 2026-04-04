# 🏗️ ARQUITETURA COMPLETA N8N - PERSONAL FINANCE LA
**Guia Visual Detalhado de Todos os 10 Workflows**

**Versão:** 2.0 Final  
**Data:** Novembro 2025  
**Status:** ✅ Pronto para Implementação

---

## 📚 ÍNDICE GERAL

### PARTE 1: WORKFLOWS DE PROCESSAMENTO (Real-time)
1. [Workflow 1: Processar Mensagem de Texto](#workflow-1) - 15 nodes
2. [Workflow 2: Processar Mensagem de Áudio](#workflow-2) - 16 nodes  
3. [Workflow 3: Processar Mensagem com Imagem](#workflow-3) - 18 nodes
4. [Workflow 4: Comandos Rápidos](#workflow-4) - 11 nodes

### PARTE 2: WORKFLOWS DE NOTIFICAÇÕES (Agendados)
5. [Workflow 5: Lembretes de Contas](#workflow-5) - 10 nodes
6. [Workflow 6: Resumo Diário](#workflow-6) - 10 nodes
7. [Workflow 7: Resumo Semanal](#workflow-7) - 11 nodes
8. [Workflow 8: Resumo Mensal](#workflow-8) - 14 nodes
9. [Workflow 9: Alertas de Orçamento](#workflow-9) - 10 nodes
10. [Workflow 10: Progresso de Metas](#workflow-10) - 12 nodes

### PARTE 3: CONFIGURAÇÕES E DEPLOYMENT
- [Credenciais e APIs](#credenciais)
- [Variáveis de Ambiente](#env-vars)
- [Testes e Validação](#testes)
- [Monitoramento](#monitoramento)
- [Plano de Deploy](#deploy)

---

## 🎯 VISÃO GERAL DO SISTEMA

```
┌────────────────────────────────────────────────────────────┐
│                    PERSONAL FINANCE LA                     │
│                   N8N Workflows System                     │
└────────────────────────────────────────────────────────────┘

                        👤 USUÁRIO
                           │
                           │ WhatsApp
                           ↓
                   ┌──────────────┐
                   │   UAZAPI     │
                   │   Webhook    │
                   └───────┬──────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ↓                    ↓                    ↓
┌──────────┐       ┌─────────────┐      ┌──────────┐
│ GRUPO 1  │       │   GRUPO 2   │      │ GRUPO 3  │
│          │       │             │      │          │
│ Processo │       │ Notificações│      │ Análises │
│ Mensagens│       │ Agendadas   │      │          │
│          │       │             │      │          │
│ WF 1-4   │       │   WF 5-8    │      │  WF 9-10 │
└────┬─────┘       └──────┬──────┘      └─────┬────┘
     │                    │                   │
     └────────────────────┼───────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ↓               ↓               ↓
    ┌──────────┐   ┌───────────┐  ┌──────────┐
    │ Supabase │   │  OpenAI   │  │  Google  │
    │   DB     │   │  GPT-4    │  │  Cloud   │
    └──────────┘   └───────────┘  └──────────┘
          │
          ↓
    ┌──────────┐
    │Dashboard │
    │ React PWA│
    └──────────┘
```

---

# PARTE 1: WORKFLOWS DE PROCESSAMENTO

---

<a name="workflow-1"></a>
## 🔵 WORKFLOW 1: PROCESSAR MENSAGEM DE TEXTO

**Trigger:** Webhook (Real-time)  
**Nodes:** 15  
**Complexidade:** Média  
**Execuções/dia:** ~500-1000

### Diagrama Visual Completo

```
[1] Webhook UAZAPI
    │ Recebe POST com mensagem
    ↓
[2] IF: É texto?
    │ Verifica message.conversation
    ↓ YES
[3] Function: Parse Data
    │ Extrai: phone, message, timestamp
    ↓
[4] Supabase: Get User
    │ SELECT * FROM users WHERE phone = ?
    ↓
[5] IF: User existe?
    │ Verifica se retornou resultado
    ↓ YES                    ↓ NO
[6] OpenAI: Extract        [Error] Usuário não cadastrado
    │ GPT-4 extrai dados     │ Envia msg: "Faça cadastro"
    │ financeiros             └─→ FIM
    ↓
[7] Function: Validate
    │ Valida campos obrigatórios
    ↓
[8] Supabase: Get Categories
    │ Busca categorias do usuário
    ↓
[9] Supabase: Get Accounts
    │ Busca contas do usuário
    ↓
[10] Function: Map Data
     │ Mapeia categoria e conta
     ↓
[11] Supabase: Insert Transaction
     │ INSERT INTO transactions (...)
     ↓
[12] Supabase: Update Balance
     │ UPDATE accounts SET balance = ...
     ↓
[13] Function: Format Response
     │ Monta mensagem de confirmação
     ↓
[14] HTTP: Send WhatsApp
     │ POST para UAZAPI
     ↓
[15] Supabase: Log Conversation
     │ Salva histórico Ana Clara
     ↓
    FIM ✅
```

### Configuração dos Nodes Principais

**Node 1: Webhook**
```javascript
{
  "path": "/webhook/whatsapp",
  "httpMethod": "POST",
  "responseMode": "lastNode",
  "authentication": "headerAuth"
}
```

**Node 6: OpenAI Extract**
```javascript
{
  "model": "gpt-4",
  "temperature": 0.3,
  "messages": [{
    "role": "system",
    "content": "Você é Ana Clara, extrai dados financeiros..."
  }, {
    "role": "user", 
    "content": "={{ $('Parse Data').item.json.message_text }}"
  }]
}
```

**SQL Node 11: Insert Transaction**
```sql
INSERT INTO transactions (
  user_id, type, amount, category_id, 
  account_id, description, transaction_date,
  is_paid, payment_date
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *
```

### Exemplo de Mensagem de Resposta

```
✅ Registrado!

🍔 Alimentação - Compras no mercado
💰 R$ 50,00
📅 Hoje, 10:30

Carteira:
R$ 2.500,00 → R$ 2.450,00
```

---

<a name="workflow-2"></a>
## 🔵 WORKFLOW 2: PROCESSAR MENSAGEM DE ÁUDIO

**Trigger:** Webhook (Real-time)  
**Nodes:** 16  
**Complexidade:** Alta  
**APIs Extras:** Google Speech-to-Text

### Diferenças em relação ao Workflow 1

```
[1] Webhook UAZAPI
    ↓
[2] IF: É áudio?
    │ Verifica audioMessage
    ↓ YES
[3] Function: Parse Audio Data
    │ Extrai URL e metadata
    ↓
[4] HTTP: Download Audio
    │ GET audio_url → binary
    ↓
[5] Google Speech-to-Text ⭐
    │ Transcreve áudio → texto
    ↓
[6] Function: Combine Data
    │ Junta transcript + phone
    ↓
[7-16] → MESMO FLUXO DO WORKFLOW 1
       (Get User, Extract, Insert, etc.)
```

### Node Específico: Google Speech-to-Text

```javascript
{
  "operation": "recognize",
  "languageCode": "pt-BR",
  "model": "default",
  "enableAutomaticPunctuation": true
}
```

### Tratamento de Erros Específicos

```javascript
// Node: Error Handler
if (audioLength < 1) {
  return "Por favor, grave um áudio mais longo";
}
if (audioLength > 60) {
  return "Áudio muito longo. Máximo 60 segundos";
}
if (transcriptConfidence < 0.7) {
  return "Não consegui entender. Pode repetir?";
}
```

---

<a name="workflow-3"></a>
## 🔵 WORKFLOW 3: PROCESSAR MENSAGEM COM IMAGEM

**Trigger:** Webhook (Real-time)  
**Nodes:** 18  
**Complexidade:** Alta  
**APIs Extras:** Google Cloud Vision, Supabase Storage

### Fluxo Específico de Imagem

```
[1] Webhook UAZAPI
    ↓
[2] IF: É imagem?
    │ Verifica imageMessage
    ↓ YES
[3] Function: Parse Image Data
    │ Extrai URL, caption, phone
    ↓
[4] HTTP: Download Image
    │ GET image_url → binary
    ↓
[5] Google Cloud Vision ⭐
    │ OCR: extrai texto da imagem
    ↓
[6] OpenAI: Parse OCR Text
    │ GPT-4 interpreta texto extraído
    │ e identifica valor, data, local
    ↓
[7] Supabase Storage: Upload ⭐
    │ Salva imagem em bucket 'receipts'
    │ receipts/{user_id}/{timestamp}.jpg
    ↓
[8] Function: Combine All Data
    │ Dados + receipt_url
    ↓
[9-18] → FLUXO NORMAL
        (Get User, Insert com receipt_url, etc.)
```

### Node 5: Google Cloud Vision

```javascript
{
  "operation": "annotate",
  "features": ["TEXT_DETECTION"],
  "languageHints": ["pt"],
  "imageSource": "binary"
}
```

### Node 7: Supabase Storage

```javascript
{
  "operation": "upload",
  "bucket": "receipts",
  "fileName": "={{ $('Get User').json.id }}/{{ Date.now() }}.jpg",
  "file": "={{ $binary.data }}",
  "options": {
    "cacheControl": "3600",
    "upsert": false
  }
}
```

### Exemplo de Resposta com Imagem

```
✅ Comprovante registrado!

📸 Nota fiscal processada
🏪 Supermercado XYZ
💰 R$ 127,50
📅 Hoje, 10:30
🍔 Alimentação

Carteira:
R$ 2.450,00 → R$ 2.322,50

O comprovante foi salvo e pode ser
consultado no dashboard 😊
```

---

<a name="workflow-4"></a>
## 🔵 WORKFLOW 4: COMANDOS RÁPIDOS

**Trigger:** Webhook (Real-time)  
**Nodes:** 11 + múltiplas rotas  
**Complexidade:** Média

### Estrutura com Switch

```
[1] Webhook
    ↓
[2] Function: Parse Command
    │ Extrai comando e phone
    ↓
[3] IF: É comando?
    │ Verifica se começa com /
    ↓ YES
[4] Supabase: Get User
    ↓
[5] Switch: Qual comando? ⭐
    │
    ├─ /saldo      → [6A] Get Accounts → [7A] Format
    ├─ /resumo     → [6B] Get Summary → [7B] Format
    ├─ /contas     → [6C] Get Bills → [7C] Format
    ├─ /ajuda      → [6D] Help Message
    ├─ /categorias → [6E] Get Categories → [7E] Format
    ├─ /metas      → [6F] Get Goals → [7F] Format
    └─ default     → [Error] Comando não reconhecido
    │
    └─→ Todos convergem em:
        │
        [9] HTTP: Send WhatsApp
        ↓
        [10] Supabase: Log Command
        ↓
       FIM ✅
```

### Exemplo de Cada Comando

**Comando: /saldo**
```
💰 *Seus Saldos*

Carteira: R$ 2.322,50
Nubank: -R$ 1.500,00 ⚠️
Poupança: R$ 5.000,00

━━━━━━━━━━━━━━━━━━━━
💵 *Total: R$ 5.822,50*
━━━━━━━━━━━━━━━━━━━━
```

**Comando: /resumo**
```
📊 *Resumo de Novembro*

Período: 01/11 a 03/11

💰 Receitas: R$ 5.500,00
💸 Despesas: R$ 1.250,00
💵 Saldo: +R$ 4.250,00 (77%)

📈 *Maiores gastos:*
1. 🏠 Moradia: R$ 500 (40%)
2. 🍔 Alimentação: R$ 300 (24%)
3. 🚗 Transporte: R$ 200 (16%)
```

**Comando: /contas**
```
📅 *Contas a Vencer*

*Hoje (03/11):*
• Energia: R$ 230,00

*Amanhã (04/11):*
• Internet: R$ 99,00

*Esta semana:*
• Academia: R$ 150 (06/11)
• Netflix: R$ 55,90 (08/11)

*Total: R$ 534,90*

💡 Dica: Programe os pagamentos!
```

---

# PARTE 2: WORKFLOWS DE NOTIFICAÇÕES

---

<a name="workflow-5"></a>
## 🔵 WORKFLOW 5: LEMBRETES DE CONTAS A VENCER

**Trigger:** Cron `0 9 * * *` (Diário às 09:00)  
**Nodes:** 10  
**Complexidade:** Média

### Fluxo Completo

```
[1] Schedule Trigger (Cron)
    │ Executa todo dia às 09:00
    ↓
[2] Supabase: Get Users with Bills
    │ Query: usuários com contas vencendo em 3 dias
    ↓
[3] Split In Batches
    │ Processa 10 usuários por vez
    ↓
  ┌─── LOOP para cada usuário ───┐
  │                               │
[4] Supabase: Get Bills for User
    │ Busca contas do usuário com days_until_due
    ↓
[5] IF: Has Bills?
    │ Se tiver contas pendentes
    ↓ YES               ↓ NO
[6] Function: Group    Skip usuário
    │ Agrupa por: hoje, amanhã, 3 dias
    ↓
[7] Function: Format Message
    │ Monta mensagem por urgência
    ↓
[8] HTTP: Send WhatsApp
    ↓
[9] Supabase: Log Notification
    │ Evita envios duplicados
    ↓
[10] Wait: 1 segundo
     │ Rate limiting
     └─→ Volta para próximo usuário
```

### Query SQL Otimizada

```sql
SELECT DISTINCT
  u.id, u.full_name, u.phone
FROM users u
INNER JOIN transactions t ON u.id = t.user_id
WHERE t.type = 'expense'
  AND t.is_recurring = true
  AND t.is_paid = false
  AND t.due_date BETWEEN CURRENT_DATE 
      AND CURRENT_DATE + INTERVAL '3 days'
  AND (u.preferences->>'notifications_enabled')::boolean = true
ORDER BY u.id
```

### Níveis de Urgência

```javascript
// Node 7: Format Message
if (daysUntilDue === 0) {
  urgency = 'high';
  emoji = '⚠️';
  title = '*Atenção: Contas Vencendo Hoje!*';
} else {
  urgency = 'normal';
  emoji = '📅';
  title = '*Lembretes de Contas*';
}
```

---

<a name="workflow-6"></a>
## 🔵 WORKFLOW 6: RESUMO DIÁRIO

**Trigger:** Cron `0 20 * * *` (Diário às 20:00)  
**Nodes:** 10  
**Complexidade:** Média

### Fluxo com IA

```
[1] Schedule: 20:00 daily
    ↓
[2] Supabase: Get Active Users
    │ Apenas quem teve transações hoje
    ↓
[3] Split In Batches (10)
    ↓
  ┌─── LOOP ───┐
[4] Supabase: Get Daily Summary
    │ Transações + Top categorias + Saldo
    ↓
[5] IF: Had Activity?
    ↓ YES
[6] OpenAI: Generate Insight ⭐
    │ Ana Clara analisa o dia
    │ e dá dica personalizada
    ↓
[7] Function: Format Summary
    ↓
[8] HTTP: Send WhatsApp
    ↓
[9] Log + Wait
    └─→ Next user
```

### Query de Resumo Diário

```sql
WITH today_summary AS (
  SELECT type, SUM(amount) as total, COUNT(*) as count
  FROM transactions
  WHERE user_id = $1 
    AND transaction_date = CURRENT_DATE
  GROUP BY type
),
today_by_category AS (
  SELECT c.name, c.icon, SUM(t.amount) as total
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = $1 
    AND t.type = 'expense'
    AND t.transaction_date = CURRENT_DATE
  GROUP BY c.name, c.icon
  ORDER BY total DESC
  LIMIT 3
)
SELECT * FROM today_summary, today_by_category;
```

### Prompt para Ana Clara

```
Você é Ana Clara, coach financeira.

Dados do dia do usuário:
- Despesas: R$ {{expense.total}}
- Receitas: R$ {{income.total}}
- Transações: {{count}}
- Top categorias: {{categories}}
- Saldo atual: R$ {{balance}}

Gere um insight breve (máximo 2 frases) 
e encorajador sobre o dia financeiro.
Seja positiva mas realista.
Use emoji moderadamente.
```

---

<a name="workflow-7"></a>
## 🔵 WORKFLOW 7: RESUMO SEMANAL

**Trigger:** Cron `0 9 * * 1` (Segunda-feira 09:00)  
**Nodes:** 11  
**Complexidade:** Alta

### Query Complexa com Comparação

```sql
WITH week_summary AS (
  -- Total da semana
  SELECT type, SUM(amount) as total, COUNT(*) as count
  FROM transactions
  WHERE user_id = $1
    AND transaction_date >= $2  -- Segunda passada
    AND transaction_date <= $3  -- Domingo passado
  GROUP BY type
),
week_by_category AS (
  -- Top 5 categorias
  SELECT c.name, c.icon, SUM(t.amount) as total,
    ROUND((SUM(t.amount) / 
      (SELECT SUM(amount) FROM transactions 
       WHERE user_id = $1 AND type = 'expense' 
       AND transaction_date >= $2 AND transaction_date <= $3)
      * 100)::numeric, 0) as percentage
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = $1 AND t.type = 'expense'
    AND t.transaction_date >= $2 
    AND t.transaction_date <= $3
  GROUP BY c.name, c.icon
  ORDER BY total DESC
  LIMIT 5
),
previous_week_comparison AS (
  -- Semana anterior para comparar
  SELECT SUM(amount) as prev_week_total
  FROM transactions
  WHERE user_id = $1 AND type = 'expense'
    AND transaction_date >= ($2::date - INTERVAL '7 days')
    AND transaction_date < $2::date
)
SELECT 
  ws.*, 
  wbc.*, 
  pwc.prev_week_total
FROM week_summary ws, week_by_category wbc, previous_week_comparison pwc;
```

### Cálculo de Variação

```javascript
// Node: Calculate Insights
const thisWeek = data.total_expense;
const lastWeek = data.prev_week_total;
const variation = ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1);
const trend = variation > 5 ? 'up' : variation < -5 ? 'down' : 'stable';

return {
  week_vs_week: `${variation > 0 ? '+' : ''}${variation}%`,
  trend: trend,
  emoji: trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'
};
```

---

<a name="workflow-8"></a>
## 🔵 WORKFLOW 8: RESUMO MENSAL

**Trigger:** Cron `0 10 1 * *` (Dia 1 às 10:00)  
**Nodes:** 14  
**Complexidade:** Muito Alta

### Fluxo com Geração de PDF

```
[1] Schedule: Dia 1, 10:00
    ↓
[2] Function: Get Previous Month
    │ Calcula primeiro/último dia do mês anterior
    ↓
[3] Supabase: Get Users
    ↓
[4] Split In Batches (5)
    │ Batches menores (processamento pesado)
    ↓
  ┌─── LOOP ───┐
[5] Supabase: Call get_monthly_summary()
    │ Function no Supabase retorna análise completa
    ↓
[6] OpenAI: Generate Analysis
    │ Ana Clara analisa MÊS INTEIRO
    │ Conquistas, pontos de atenção, recomendações
    ↓
[7] Function: Format Complete Message
    │ Mensagem LONGA com todos os dados
    ↓
[8] HTTP: Send WhatsApp (Mensagem)
    ↓
[9] HTTP: Generate PDF ⭐ (opcional)
    │ POST para PDFShift
    │ HTML → PDF
    ↓
[10] IF: User Wants PDF?
     ↓ YES              ↓ NO
[11] HTTP: Send PDF    Skip
     │ via WhatsApp
     ↓                  ↓
[12] Log Notification
     ↓
[13] Supabase: Create Report Entry
     │ Salva relatório em monthly_reports
     ↓
[14] Wait (2s)
      └─→ Next
```

### Function Supabase: get_monthly_summary()

```sql
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_user_id UUID,
  p_month_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH summary AS (
    -- Total receitas/despesas
    SELECT type, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE user_id = p_user_id
      AND DATE_TRUNC('month', transaction_date) = 
          DATE_TRUNC('month', p_month_date)
    GROUP BY type
  ),
  by_category AS (
    -- Por categoria
    SELECT c.name, c.icon, SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id 
      AND t.type = 'expense'
      AND DATE_TRUNC('month', t.transaction_date) = 
          DATE_TRUNC('month', p_month_date)
    GROUP BY c.name, c.icon
    ORDER BY total DESC
  ),
  budget_status AS (
    -- Status do orçamento
    SELECT b.category_id, c.name, b.planned_amount,
      COALESCE(SUM(t.amount), 0) as spent,
      ROUND((COALESCE(SUM(t.amount), 0) / b.planned_amount * 100)::numeric, 0) as usage_pct
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = b.category_id 
      AND t.user_id = b.user_id
      AND DATE_TRUNC('month', t.transaction_date) = b.month
    WHERE b.user_id = p_user_id 
      AND b.month = DATE_TRUNC('month', p_month_date)
    GROUP BY b.category_id, c.name, b.planned_amount
  ),
  goals_update AS (
    -- Progresso das metas
    SELECT g.name, g.icon, g.target_amount, g.current_amount,
      ROUND((g.current_amount / g.target_amount * 100)::numeric, 0) as progress_pct
    FROM goals g
    WHERE g.user_id = p_user_id 
      AND g.status = 'active'
  )
  SELECT json_build_object(
    'summary', (SELECT json_agg(summary.*) FROM summary),
    'by_category', (SELECT json_agg(by_category.*) FROM by_category),
    'budget', (SELECT json_agg(budget_status.*) FROM budget_status),
    'goals', (SELECT json_agg(goals_update.*) FROM goals_update)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

<a name="workflow-9"></a>
## 🔵 WORKFLOW 9: ALERTAS DE ORÇAMENTO

**Trigger:** Cron `0 */6 * * *` (A cada 6 horas)  
**Nodes:** 10  
**Complexidade:** Média

### Lógica de Detecção

```
[1] Schedule: 00:00, 06:00, 12:00, 18:00
    ↓
[2] Supabase: Get Budget Status
    │ CTE calcula usage_percentage
    │ Filtra apenas >= 80%
    ↓
[3] IF: Has Alerts?
    ↓ YES
[4] Function: Check Last Alert
    │ Anti-spam: não enviar duplicatas em 12h
    ↓
[5] Split In Batches
    ↓
  ┌─── LOOP ───┐
[6] Function: Calculate Days Left
    │ Dias até fim do mês
    │ Valor disponível
    │ Média diária recomendada
    ↓
[7] Function: Format Alert
    │ Mensagem por nível:
    │ • 80-89%: WARNING
    │ • 90-99%: CRITICAL
    │ • 100%+: EXCEEDED
    ↓
[8] HTTP: Send WhatsApp
    ↓
[9] Log Alert
    └─→ Next
```

### Query com Níveis de Alerta

```sql
WITH budget_usage AS (
  SELECT 
    b.user_id, b.category_id, c.name, c.icon,
    b.planned_amount,
    COALESCE(SUM(t.amount), 0) as spent_amount,
    ROUND((COALESCE(SUM(t.amount), 0) / 
           b.planned_amount * 100)::numeric, 0) as usage_percentage
  FROM budgets b
  LEFT JOIN transactions t 
    ON b.category_id = t.category_id 
    AND b.user_id = t.user_id
    AND DATE_TRUNC('month', t.transaction_date) = b.month
  LEFT JOIN categories c ON b.category_id = c.id
  WHERE b.month = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY b.user_id, b.category_id, c.name, c.icon, b.planned_amount
)
SELECT 
  u.*, bu.*,
  CASE 
    WHEN bu.usage_percentage >= 100 THEN 'exceeded'
    WHEN bu.usage_percentage >= 90 THEN 'critical'
    WHEN bu.usage_percentage >= 80 THEN 'warning'
    ELSE 'ok'
  END as alert_level
FROM budget_usage bu
INNER JOIN users u ON bu.user_id = u.id
WHERE bu.usage_percentage >= 80
  AND (u.preferences->>'budget_alerts')::boolean = true
ORDER BY bu.usage_percentage DESC;
```

### Mensagens por Nível

```javascript
// Node 7: Format Alert
const messages = {
  warning: `⚠️ *Alerta de Orçamento*

Categoria: ${icon} ${name}
💸 Gasto: R$ ${spent.toFixed(2)}
🎯 Planejado: R$ ${planned.toFixed(2)}
📊 Uso: ${usage}% ${'█'.repeat(Math.floor(usage/10))}${'░'.repeat(10-Math.floor(usage/10))}

Você usou ${usage}% do orçamento.
Ainda faltam ${daysLeft} dias!

💡 Restam R$ ${remaining.toFixed(2)} (R$ ${dailyAvg.toFixed(2)}/dia)`,

  critical: `🚨 *ATENÇÃO: Orçamento Crítico!*

Categoria: ${icon} ${name}
💸 Gasto: R$ ${spent.toFixed(2)}
🎯 Planejado: R$ ${planned.toFixed(2)}
📊 Uso: ${usage}% ${'█'.repeat(Math.floor(usage/10))}${'▮'.repeat(1)}

⚠️ Você está no limite!
Faltam apenas R$ ${remaining.toFixed(2)}.

Ainda há ${daysLeft} dias. Vamos ajustar? 💪`,

  exceeded: `🔴 *ORÇAMENTO ULTRAPASSADO!*

Categoria: ${icon} ${name}
💸 Gasto: R$ ${spent.toFixed(2)}
🎯 Planejado: R$ ${planned.toFixed(2)}
📊 Uso: ${usage}% ${'█'.repeat(12)}${'▮'}
⚠️ Ultrapassou em R$ ${Math.abs(remaining).toFixed(2)} (${(usage-100)}%)

Ainda faltam ${daysLeft} dias!

💡 Sugestão: Ajustar outras categorias ou revisar orçamento.`
};
```

---

<a name="workflow-10"></a>
## 🔵 WORKFLOW 10: PROGRESSO DE METAS

**Trigger:** Cron `0 10 15 * *` (Dia 15 às 10:00)  
**Nodes:** 12  
**Complexidade:** Alta

### Fluxo com Achievement System

```
[1] Schedule: Dia 15, 10:00
    ↓
[2] Supabase: Get Goals Milestones
    │ Query detecta marcos: 25%, 50%, 75%, 100%
    │ Verifica se já foi notificado
    ↓
[3] IF: Has Milestones?
    ↓ YES
[4] Split In Batches
    ↓
  ┌─── LOOP ───┐
[5] Function: Calculate Details
    │ Meses restantes
    │ Aporte mensal necessário
    │ Projeção de conclusão
    ↓
[6] Function: Format Milestone
    │ Mensagem diferente para cada marco
    ↓
[7] IF: Meta 100%?
    ↓ YES              ↓ NO
[8A] Update Status   [8B] Send Message
     │ completed
     ↓
[9A] Create 
     Achievement
     │ "Meta Alcançada"
     ↓
[10A] Send Celebration
      │ + GIF
      └──┬───────────────┘
         │
[11] Log Notification
     ↓
[12] Wait
      └─→ Next
```

### Query de Detecção de Marcos

```sql
WITH goal_milestones AS (
  SELECT 
    g.id, g.user_id, g.name, g.icon,
    g.target_amount, g.current_amount,
    ROUND((g.current_amount / g.target_amount * 100)::numeric, 0) as progress_pct,
    g.target_date,
    DATE_PART('day', g.target_date - CURRENT_DATE)::integer as days_remaining,
    -- Detectar qual marco foi atingido
    CASE
      WHEN (g.current_amount / g.target_amount * 100) >= 100 THEN 100
      WHEN (g.current_amount / g.target_amount * 100) >= 75 THEN 75
      WHEN (g.current_amount / g.target_amount * 100) >= 50 THEN 50
      WHEN (g.current_amount / g.target_amount * 100) >= 25 THEN 25
      ELSE 0
    END as milestone_reached
  FROM goals g
  WHERE g.status = 'active'
)
SELECT u.*, gm.*
FROM goal_milestones gm
INNER JOIN users u ON gm.user_id = u.id
WHERE gm.milestone_reached > 0
  -- Verificar se não foi notificado nos últimos 30 dias
  AND NOT EXISTS (
    SELECT 1 FROM notifications_log nl
    WHERE nl.user_id = gm.user_id
      AND nl.notification_type = 'goal_milestone'
      AND nl.metadata->>'goal_id' = gm.id::text
      AND nl.metadata->>'milestone' = gm.milestone_reached::text
      AND nl.sent_at >= CURRENT_DATE - INTERVAL '30 days'
  )
ORDER BY gm.progress_pct DESC;
```

### Mensagens por Marco

```javascript
// Node 6: Format Milestone
const milestoneMessages = {
  25: `🎯 *Primeiro Marco Atingido!*

${icon} Meta: ${name}

████░░░░░░░░ 25%

💰 Alcançado: R$ ${(current).toLocaleString('pt-BR')}
🎯 Alvo: R$ ${target.toLocaleString('pt-BR')}
💵 Faltam: R$ ${(target - current).toLocaleString('pt-BR')}

Você já conquistou 1/4 do caminho!
Continue assim! 💪`,

  50: `🎉 *Metade do Caminho!*

${icon} Meta: ${name}

██████░░░░░░ 50%

💰 Alcançado: R$ ${current.toLocaleString('pt-BR')}
🎯 Alvo: R$ ${target.toLocaleString('pt-BR')}
💵 Faltam: R$ ${(target - current).toLocaleString('pt-BR')}

⏰ Prazo: ${deadline}
📊 Aporte sugerido: R$ ${monthlyTarget.toLocaleString('pt-BR')}/mês

Parabéns! Você está na metade!
A reta final já começou! 🚀`,

  75: `🌟 *Você Está Quase Lá!*

${icon} Meta: ${name}

█████████░░░ 75%

💰 Alcançado: R$ ${current.toLocaleString('pt-BR')}
🎯 Alvo: R$ ${target.toLocaleString('pt-BR')}
💵 Faltam apenas: R$ ${(target - current).toLocaleString('pt-BR')}

⏰ Prazo: ${deadline}
📊 Aporte sugerido: R$ ${monthlyTarget.toLocaleString('pt-BR')}/mês

Faltam apenas 25%!
Seu objetivo está muito próximo! 💎`,

  100: `🏆 *META ALCANÇADA!* 🎊

${icon} ${name}

████████████ 100%

💰 *R$ ${target.toLocaleString('pt-BR')} CONQUISTADOS!*
━━━━━━━━━━━━━━━━━━━━

PARABÉNS! 🎉🎊🥳

Você conseguiu! Sua dedicação e
disciplina valeram a pena!

É hora de comemorar e realizar
esse sonho! 🌟✨

Já pensou na próxima meta? 😊`
};
```

---

# PARTE 3: CONFIGURAÇÕES E DEPLOYMENT

---

<a name="credenciais"></a>
## 🔐 CREDENCIAIS E APIS

### Resumo de Todas as APIs

| API | Uso | Workflows | Custo Estimado |
|-----|-----|-----------|----------------|
| UAZAPI | WhatsApp | Todos (1-10) | ~R$50/mês |
| OpenAI GPT-4 | IA/NLP | 1,2,3,6,7,8 | ~$30-50/mês |
| Supabase | Database | Todos (1-10) | Grátis até 500MB |
| Google Speech | Áudio→Texto | 2 | $0.006/15s |
| Google Vision | OCR | 3 | $1.50/1000 imgs |
| PDFShift | PDF | 8 (opcional) | $9/mês |

### Setup de Credenciais no N8N

**1. UAZAPI**
```
Name: UAZAPI WhatsApp
Type: Header Auth
Header Name: Authorization
Value: Bearer {{$env.UAZAPI_API_KEY}}
```

**2. OpenAI**
```
Name: OpenAI GPT-4
Type: OpenAI
API Key: {{$env.OPENAI_API_KEY}}
```

**3. Supabase**
```
Name: Supabase Personal Finance
Type: Supabase
Host: {{$env.SUPABASE_URL}}
Service Role Key: {{$env.SUPABASE_SERVICE_KEY}}
```

**4. Google Cloud**
```
Name: Google Cloud Services
Type: Google Cloud Service Account
Credentials JSON: {{$env.GOOGLE_CREDENTIALS_JSON}}
```

---

<a name="env-vars"></a>
## 📋 ARQUIVO .env COMPLETO

```bash
# ===================================
# N8N CORE
# ===================================
N8N_HOST=n8n.financela.com
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=SenhaForte123!

# ===================================
# WEBHOOK
# ===================================
WEBHOOK_URL=https://n8n.financela.com
WEBHOOK_AUTH_TOKEN=token_seguro_aleatorio_12345

# ===================================
# UAZAPI (WhatsApp)
# ===================================
UAZAPI_API_KEY=sua_api_key_aqui
UAZAPI_INSTANCE_ID=instancia_12345
UAZAPI_BASE_URL=https://api.uazapi.com

# ===================================
# OPENAI
# ===================================
OPENAI_API_KEY=sk-proj-xxxxxx
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_RPM=60

# ===================================
# SUPABASE
# ===================================
# Produção
SUPABASE_URL_PROD=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY_PROD=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY_PROD=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dev
SUPABASE_URL_DEV=https://yyyyy.supabase.co
SUPABASE_SERVICE_KEY_DEV=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===================================
# GOOGLE CLOUD
# ===================================
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-cloud.json
GOOGLE_PROJECT_ID=personal-finance-la

# ===================================
# PDFSHIFT (Opcional)
# ===================================
PDFSHIFT_API_KEY=api_xxxxx

# ===================================
# GENERAL
# ===================================
ENVIRONMENT=production
NODE_ENV=production
TZ=America/Sao_Paulo
LOG_LEVEL=info
```

---

<a name="testes"></a>
## 🧪 TESTES E VALIDAÇÃO

### Checklist Geral

```
□ INFRAESTRUTURA
  □ N8N instalado e rodando
  □ Todas as credenciais configuradas
  □ Variáveis de ambiente carregadas
  □ Webhook acessível externamente

□ INTEGRAÇÕES
  □ UAZAPI conectado e recebendo webhooks
  □ OpenAI respondendo (testar com curl)
  □ Supabase acessível (testar queries)
  □ Google Cloud APIs habilitadas
  
□ WORKFLOWS 1-4 (Processamento)
  □ Workflow 1: Texto simples
  □ Workflow 1: Texto com data
  □ Workflow 1: Receita
  □ Workflow 2: Áudio claro
  □ Workflow 2: Áudio com ruído
  □ Workflow 3: Nota fiscal clara
  □ Workflow 3: Imagem borrada
  □ Workflow 4: Todos os comandos

□ WORKFLOWS 5-10 (Notificações)
  □ Workflow 5: Lembretes (testar com data manipulada)
  □ Workflow 6: Resumo diário
  □ Workflow 7: Resumo semanal
  □ Workflow 8: Resumo mensal + PDF
  □ Workflow 9: Alertas de orçamento
  □ Workflow 10: Progresso de metas

□ EDGE CASES
  □ Usuário não cadastrado
  □ Erro na API externa
  □ Timeout em query
  □ Mensagem muito longa
  □ Rate limit atingido
```

### Script de Teste Automatizado

```bash
#!/bin/bash
# test_all_workflows.sh

WEBHOOK_URL="https://n8n.financela.com/webhook/whatsapp"
TEST_PHONE="5521999999999"

echo "🧪 Testando todos os workflows..."

# Teste 1: Mensagem de texto
echo "Test 1: Processar Texto"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "data": {
      "key": {"remoteJid": "'$TEST_PHONE'@s.whatsapp.net"},
      "message": {"conversation": "Gastei 50 no mercado"},
      "messageTimestamp": '$(date +%s)'
    }
  }'

sleep 2

# Teste 2: Comando /saldo
echo "Test 2: Comando Saldo"
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "data": {
      "key": {"remoteJid": "'$TEST_PHONE'@s.whatsapp.net"},
      "message": {"conversation": "/saldo"},
      "messageTimestamp": '$(date +%s)'
    }
  }'

echo "✅ Testes concluídos!"
```

---

<a name="monitoramento"></a>
## 📊 MONITORAMENTO

### Métricas Importantes

```javascript
// Estrutura de Log
{
  "timestamp": "2025-11-03T10:30:45.123Z",
  "level": "info|warn|error",
  "workflow_id": "wf_1",
  "workflow_name": "Processar Texto",
  "execution_id": "exec_abc123",
  "user_id": "uuid",
  "phone": "5521999999999",
  "action": "transaction_created",
  "duration_ms": 2341,
  "success": true,
  "error": null,
  "metadata": {
    "transaction_id": "uuid",
    "amount": 50.00,
    "category": "Alimentação"
  }
}
```

### Dashboard de Métricas

```
KPIs por Workflow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Taxa de sucesso: 98.5%
• Tempo médio: 2.3s
• Execuções/hora: 42
• Erros/dia: 3

Alertas:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Workflow 2: Taxa erro 7% (>5%)
⚠️ OpenAI: Slow response (4.2s avg)
✅ Supabase: Healthy
✅ UAZAPI: Healthy
```

---

<a name="deploy"></a>
## 🚀 PLANO DE DEPLOY

### Fase 1: Setup (Semana 1)

```bash
# 1. Instalar N8N
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  --env-file .env \
  n8nio/n8n

# 2. Configurar domínio e SSL
# (Nginx + Let's Encrypt)

# 3. Criar todas as credenciais no N8N

# 4. Testar conectividade
curl https://n8n.financela.com/healthcheck
```

### Fase 2: Workflows Core (Semana 2-3)

1. ✅ Importar Workflow 1 (Texto)
2. ✅ Testar com usuário real
3. ✅ Importar Workflow 4 (Comandos)
4. ✅ Testar todos os comandos
5. ✅ Configurar Webhook no UAZAPI
6. ✅ Teste end-to-end

### Fase 3: Workflows Avançados (Semana 4)

1. ✅ Importar Workflow 2 (Áudio)
2. ✅ Importar Workflow 3 (Imagem)
3. ✅ Configurar Google Cloud
4. ✅ Testes de OCR e Speech
5. ✅ Testes de carga

### Fase 4-6: Notificações e Otimização (Semanas 5-8)

- Implementar workflows 5-10
- Testes de agendamento
- Otimização de queries
- Load testing
- Monitoramento 24/7
- Go-live! 🚀

---

## 📝 CONCLUSÃO

Este documento fornece a **arquitetura completa e detalhada** de todos os 10 workflows do sistema Personal Finance LA.

### O que você tem agora:

✅ **Diagramas visuais** de todos os workflows  
✅ **Configurações node por node**  
✅ **Queries SQL otimizadas**  
✅ **Exemplos de mensagens**  
✅ **Tratamento de erros**  
✅ **Setup de credenciais**  
✅ **Scripts de teste**  
✅ **Plano de deployment**

### Próximos Passos:

1. **Revisar e aprovar** esta arquitetura
2. **Começar pelo Fase 1** (Setup)
3. **Implementar workflows** na ordem sugerida
4. **Testar cada um** antes de avançar
5. **Monitorar métricas** desde o dia 1
6. **Iterar e melhorar** com feedback dos usuários

---

**Documentos Relacionados:**
- `PRD_Personal_Finance_LA.md` - Requisitos do produto
- `database_schema.sql` - Esquema do banco
- `Modelo_de_UI_UX/` - Designs da interface

**Links Úteis:**
- N8N Docs: https://docs.n8n.io
- UAZAPI: https://docs.uazapi.com
- OpenAI: https://platform.openai.com/docs
- Supabase: https://supabase.com/docs

---

**Versão:** 2.0 Final Consolidada  
**Data:** Novembro 2025  
**Autor:** Claude + LA Music Team  
**Status:** ✅ **PRONTO PARA IMPLEMENTAÇÃO**

**Boa sorte com a implementação! 🚀💪**
