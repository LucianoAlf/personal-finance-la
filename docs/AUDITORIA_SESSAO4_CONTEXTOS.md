# AUDITORIA DE ARQUITETURA - SESSÃO 4: CONTEXTO E FLUXOS

**Data:** 2025-01-XX  
**Arquivo Principal:** `supabase/functions/process-whatsapp-message/context-manager.ts`  
**Linhas de Código:** 4.080 linhas  
**Projeto Supabase:** `sbnpmhmvcspwcyjhftlw`

---

## 1. MAPEAMENTO COMPLETO DOS CONTEXTOS

### 1.1 Enum `conversation_type` (27 tipos)

| # | Contexto | Propósito | TTL | Categoria |
|---|----------|-----------|-----|-----------|
| 1 | `idle` | Estado padrão, sem contexto ativo | - | Base |
| 2 | `creating_transaction` | Criando nova transação (despesa/receita) | 60min | Transação |
| 3 | `editing_transaction` | Editando transação existente | 60min | Transação |
| 4 | `confirming_action` | Aguardando confirmação genérica | 60min | Confirmação |
| 5 | `multi_step_flow` | Fluxo multi-etapas genérico | 60min | Fluxo |
| 6 | `awaiting_account_type_selection` | Seleção de tipo de conta | 60min | Conta |
| 7 | `awaiting_register_account_type` | Cadastro de tipo de conta | 60min | Conta |
| 8 | `awaiting_bill_type` | Seleção de tipo de conta a pagar | 60min | Contas Pagar |
| 9 | `awaiting_bill_description` | Descrição da conta a pagar | 60min | Contas Pagar |
| 10 | `awaiting_due_day` | Dia de vencimento | 60min | Contas Pagar |
| 11 | `awaiting_bill_amount` | Valor da conta a pagar | 60min | Contas Pagar |
| 12 | `awaiting_installment_info` | Info de parcelas | 60min | Contas Pagar |
| 13 | `awaiting_average_value` | Valor médio (contas variáveis) | 60min | Contas Pagar |
| 14 | `awaiting_duplicate_decision` | Decisão sobre duplicata | 60min | Contas Pagar |
| 15 | `awaiting_delete_confirmation` | Confirmação de exclusão | 60min | Exclusão |
| 16 | `awaiting_invoice_due_date` | Vencimento de fatura | 60min | Cartão |
| 17 | `awaiting_invoice_amount` | Valor da fatura | 60min | Cartão |
| 18 | `awaiting_card_selection` | Seleção de cartão | 60min | Cartão |
| 19 | `awaiting_card_creation_confirmation` | Confirmação criar cartão | 60min | Cartão |
| 20 | `awaiting_card_limit` | Limite do cartão | 60min | Cartão |
| 21 | `awaiting_installment_payment_method` | Método pagamento parcelamento | 60min | Parcelamento |
| 22 | `awaiting_installment_card_selection` | Seleção cartão parcelamento | 60min | Parcelamento |
| 23 | `awaiting_payment_value` | Valor do pagamento | 60min | Pagamento |
| 24 | `awaiting_bill_name_for_payment` | Nome conta para pagamento | 60min | Pagamento |
| 25 | `awaiting_payment_account` | Conta bancária para pagamento | 60min | Pagamento |
| 26 | `credit_card_context` | Contexto geral de cartão | 60min | Cartão |
| 27 | `faturas_vencidas_context` | Contexto faturas vencidas | 60min | Cartão |

### 1.2 Estrutura da Tabela `conversation_context`

```sql
CREATE TABLE conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone VARCHAR NOT NULL,
  context_type conversation_type NOT NULL DEFAULT 'idle',
  context_data JSONB DEFAULT '{}',
  last_interaction TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'), -- DB default
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Observação:** O TTL padrão do banco é 5 minutos, mas o código usa `CONTEXT_EXPIRATION_MINUTES = 60`.

---

## 2. HANDLERS DE CONTEXTO

### 2.1 Função Principal: `processarNoContexto()`

**Localização:** Linhas 200-800  
**Complexidade:** ALTA (600+ linhas, múltiplos branches)

```typescript
export async function processarNoContexto(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string | null>
```

### 2.2 Mapeamento de Handlers

| Contexto | Handler | Linhas | Complexidade |
|----------|---------|--------|--------------|
| `creating_transaction` | Switch por `step` | 250-600 | ALTA |
| `editing_transaction` | `processarEdicao()` | 700-800 | MÉDIA |
| `confirming_action` | Switch por `step` | 800-1200 | ALTA |
| `awaiting_due_day` | `processarDiaVencimento()` | 2341-2373 | BAIXA |
| `awaiting_bill_amount` | `processarValorConta()` | 2607-2647 | MÉDIA |
| `awaiting_average_value` | `processarValorMedio()` | 2741-2813 | MÉDIA |
| `awaiting_duplicate_decision` | `processarDecisaoDuplicata()` | 2507-2574 | MÉDIA |
| `awaiting_delete_confirmation` | `processarConfirmacaoExclusaoConta()` | 2577-2604 | BAIXA |
| `awaiting_bill_type` | `processarTipoConta()` | 2820-2869 | MÉDIA |
| `awaiting_bill_description` | `processarDescricaoConta()` | 2872-2899 | BAIXA |
| `awaiting_installment_info` | `processarInfoParcelas()` | 2903-2925 | BAIXA |
| `awaiting_invoice_due_date` | `processarDiaVencimentoFatura()` | 3162-3207 | MÉDIA |
| `awaiting_invoice_amount` | `processarValorFatura()` | 3210-3248 | MÉDIA |
| `awaiting_card_selection` | `processarSelecaoCartaoFatura()` | 3251-3349 | MÉDIA |
| `awaiting_card_creation_confirmation` | `processarConfirmacaoCriarCartao()` | 3352-3450 | MÉDIA |
| `awaiting_card_limit` | `processarLimiteCartao()` | 3453-3531 | MÉDIA |
| `awaiting_installment_payment_method` | `processarMetodoPagamentoParcelamento()` | 3538-3678 | ALTA |
| `awaiting_installment_card_selection` | `processarSelecaoCartaoParcelamento()` | 3681-3775 | MÉDIA |
| `awaiting_payment_value` | `processarValorPagamento()` | 3782-3805 | BAIXA |
| `awaiting_bill_name_for_payment` | `processarNomeContaPagamento()` | 3808-3843 | MÉDIA |
| `awaiting_payment_account` | `processarSelecaoContaPagamento()` | 3846-4061 | ALTA |

### 2.3 Steps dentro de `creating_transaction`

| Step | Propósito | Próximo Step |
|------|-----------|--------------|
| `awaiting_account` | Seleção de conta bancária | `awaiting_category` ou FIM |
| `awaiting_category` | Seleção de categoria | FIM |
| `awaiting_payment_method` | Método de pagamento | `awaiting_account` ou FIM |
| `awaiting_description` | Descrição da transação | FIM |
| `awaiting_image_account` | Conta para transação de imagem | FIM |

### 2.4 Steps dentro de `confirming_action`

| Step | Propósito | Próximo Step |
|------|-----------|--------------|
| `awaiting_card_selection` | Seleção de cartão | FIM |
| `awaiting_image_account` | Conta para imagem | FIM |
| `awaiting_transfer_account` | Conta para transferência | FIM |

---

## 3. MATRIZ DE TRANSIÇÕES

### 3.1 Fluxo: Registrar Despesa

```
[INÍCIO] → NLP detecta REGISTRAR_DESPESA
    │
    ├─→ Conta única? → Registra direto → [FIM]
    │
    └─→ Múltiplas contas?
        │
        └─→ creating_transaction (step: awaiting_account)
            │
            └─→ Usuário seleciona conta → Registra → [FIM]
```

### 3.2 Fluxo: Cadastrar Conta a Pagar

```
[INÍCIO] → NLP detecta CADASTRAR_CONTA_PAGAR
    │
    ├─→ Dados completos? → Registra direto → [FIM]
    │
    └─→ Falta tipo?
        │
        └─→ awaiting_bill_type
            │
            └─→ Falta descrição?
                │
                └─→ awaiting_bill_description
                    │
                    └─→ Falta valor?
                        │
                        └─→ awaiting_bill_amount
                            │
                            └─→ Falta dia?
                                │
                                └─→ awaiting_due_day
                                    │
                                    └─→ É parcelamento?
                                        │
                                        ├─→ Sim → awaiting_installment_info
                                        │         │
                                        │         └─→ awaiting_installment_payment_method
                                        │             │
                                        │             └─→ Cartão? → awaiting_installment_card_selection
                                        │
                                        └─→ Não → Registra → [FIM]
```

### 3.3 Fluxo: Fatura de Cartão

```
[INÍCIO] → NLP detecta PAGAR_FATURA ou comando de fatura
    │
    ├─→ Cartão único? → Processa direto
    │
    └─→ Múltiplos cartões?
        │
        └─→ awaiting_card_selection
            │
            └─→ Falta valor?
                │
                └─→ awaiting_invoice_amount
                    │
                    └─→ Falta vencimento?
                        │
                        └─→ awaiting_invoice_due_date → [FIM]
```

### 3.4 Fluxo: Pagamento de Conta

```
[INÍCIO] → NLP detecta MARCAR_CONTA_PAGA
    │
    ├─→ Conta encontrada com valor?
    │   │
    │   └─→ Múltiplas contas bancárias?
    │       │
    │       └─→ awaiting_payment_account → [FIM]
    │
    └─→ Conta variável (sem valor)?
        │
        └─→ awaiting_payment_value
            │
            └─→ awaiting_payment_account → [FIM]
```

### 3.5 Fluxo: Imagem (Nota Fiscal, PIX, etc.)

```
[INÍCIO] → Imagem detectada
    │
    └─→ OCR processa imagem
        │
        └─→ confirming_action (step: awaiting_image_account)
            │
            └─→ Usuário seleciona conta → Registra → [FIM]
```

---

## 4. ESTADOS ÓRFÃOS E PROBLEMAS

### 4.1 Contextos Potencialmente Órfãos

| Contexto | Problema | Severidade |
|----------|----------|------------|
| `multi_step_flow` | Definido no enum mas SEM handler específico | 🟡 MÉDIA |
| `awaiting_register_account_type` | Definido mas pouco usado | 🟢 BAIXA |
| `faturas_vencidas_context` | Handler existe mas fluxo incompleto | 🟡 MÉDIA |

### 4.2 Problemas de Transição

| Problema | Descrição | Impacto |
|----------|-----------|---------|
| **Timeout sem feedback** | Contexto expira após 60min sem avisar usuário | 🟡 MÉDIA |
| **Cancelamento implícito** | "cancelar" limpa contexto mas nem sempre confirma | 🟢 BAIXA |
| **Fallback genérico** | Alguns handlers retornam mensagem genérica sem limpar contexto | 🟡 MÉDIA |

### 4.3 Contextos com TTL Problemático

- **TTL do banco (5min)** vs **TTL do código (60min)**: Inconsistência
- Recomendação: Unificar para 30min (equilíbrio entre UX e segurança)

---

## 5. ESTRUTURA DE `context_data`

### 5.1 `creating_transaction`

```typescript
{
  step: 'awaiting_account' | 'awaiting_category' | 'awaiting_payment_method' | 'awaiting_description',
  phone: string,
  intencao_pendente?: {
    intencao: string,
    entidades: {
      valor: number,
      descricao: string,
      categoria?: string,
      conta?: string,
      forma_pagamento?: string
    }
  },
  dados_transacao?: {
    valor: number,
    descricao: string,
    categoria?: string,
    conta?: string,
    tipo: 'expense' | 'income'
  }
}
```

### 5.2 `awaiting_bill_*` (Contas a Pagar)

```typescript
{
  descricao?: string,
  valor?: number,
  diaVencimento?: number,
  tipo?: 'fixed' | 'variable' | 'subscription' | 'installment' | 'one_time',
  recorrencia?: 'mensal' | 'unica',
  parcelaAtual?: number,
  totalParcelas?: number,
  textoOriginal?: string,
  phone?: string
}
```

### 5.3 `awaiting_card_*` (Cartão)

```typescript
{
  cartaoId?: string,
  cartaoNome?: string,
  valor?: number,
  diaVencimento?: number | string,
  cartoes?: Array<{ id: string, name: string }>,
  criarNovoCartao?: boolean,
  nomeCartao?: string,
  bancoNome?: string
}
```

### 5.4 `awaiting_payment_*` (Pagamento)

```typescript
{
  billId: string,
  descricao: string,
  valorFinal?: number,
  metodoPagamento?: string,
  contasDisponiveis?: Array<{ id: string, name: string }>
}
```

### 5.5 `confirming_action`

```typescript
{
  step: 'awaiting_card_selection' | 'awaiting_image_account' | 'awaiting_transfer_account',
  phone: string,
  dados_cartao?: object,
  dados_imagem?: {
    tipo: 'nota_fiscal' | 'ifood' | 'pix' | 'comprovante_pagamento',
    valor: number,
    descricao: string,
    categoria: string,
    data?: string,
    tipo_transacao?: 'expense' | 'income'
  },
  contas?: Array<{ id: string, name: string }>
}
```

---

## 6. ANÁLISE DE CONCORRÊNCIA

### 6.1 Problemas Identificados

| Problema | Descrição | Risco |
|----------|-----------|-------|
| **Race Condition em Contexto** | Duas mensagens rápidas podem sobrescrever contexto | 🟡 MÉDIO |
| **Upsert sem Lock** | `salvarContexto()` usa upsert mas sem transaction lock | 🟡 MÉDIO |
| **Contexto por user_id** | Apenas 1 contexto ativo por usuário (correto) | ✅ OK |

### 6.2 Código de `salvarContexto()`

```typescript
// Linha 120-150
export async function salvarContexto(
  userId: string,
  contextType: ContextType,
  contextData: Record<string, unknown>,
  phone?: string
): Promise<void> {
  const supabase = getSupabase();
  const expiresAt = new Date(Date.now() + CONTEXT_EXPIRATION_MINUTES * 60 * 1000);
  
  await supabase
    .from('conversation_context')
    .upsert({
      user_id: userId,
      phone: phone || '',
      context_type: contextType,
      context_data: contextData,
      last_interaction: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}
```

### 6.3 Recomendações

1. **Adicionar versão/timestamp** no context_data para detectar conflitos
2. **Usar transaction** para operações críticas
3. **Implementar debounce** no frontend para mensagens rápidas

---

## 7. FLUXOS CRÍTICOS DOCUMENTADOS

### 7.1 Registrar Despesa (Fluxo Completo)

```
1. Usuário: "gastei 50 no mercado"
2. NLP classifica: REGISTRAR_DESPESA
3. Entidades: { valor: 50, descricao: "mercado", categoria: "Alimentação" }
4. Sistema busca contas do usuário
5. Se 1 conta → registra direto
6. Se múltiplas contas:
   a. Salva contexto: creating_transaction (step: awaiting_account)
   b. Envia lista de contas
   c. Usuário responde: "1" ou "Nubank"
   d. processarNoContexto() processa
   e. Registra transação
   f. Limpa contexto
   g. Envia confirmação com saldo atualizado
```

### 7.2 Cadastrar Conta a Pagar (Fluxo Completo)

```
1. Usuário: "cadastrar netflix 55 reais dia 17"
2. NLP classifica: CADASTRAR_CONTA_PAGAR
3. Entidades: { descricao: "Netflix", valor: 55, diaVencimento: 17 }
4. Sistema detecta tipo: subscription
5. Verifica duplicatas
6. Se duplicata encontrada:
   a. Salva contexto: awaiting_duplicate_decision
   b. Pergunta: atualizar/manter/criar nova
7. Se não duplicata:
   a. Cadastra conta
   b. Envia confirmação
```

### 7.3 Pagar Conta (Fluxo Completo)

```
1. Usuário: "paguei a luz"
2. NLP classifica: MARCAR_CONTA_PAGA
3. Sistema busca conta "luz" pendente
4. Se conta variável (sem valor):
   a. Salva contexto: awaiting_payment_value
   b. Pergunta valor
   c. Usuário: "185"
5. Sistema busca contas bancárias
6. Se múltiplas contas:
   a. Salva contexto: awaiting_payment_account
   b. Lista contas
   c. Usuário seleciona
7. Registra pagamento:
   a. Atualiza status para 'paid'
   b. Cria transação de despesa
   c. Atualiza saldo da conta
   d. Registra no histórico
8. Envia confirmação com estatísticas do mês
```

### 7.4 Compra no Cartão (Fluxo Completo)

```
1. Usuário: "comprei 200 no nubank"
2. NLP classifica: COMPRA_CARTAO
3. Sistema detecta ambiguidade (débito ou crédito?)
4. Salva contexto: creating_transaction (step: awaiting_payment_method)
5. Pergunta método
6. Usuário: "crédito"
7. Sistema busca cartão Nubank
8. Registra em credit_card_transactions
9. Envia confirmação
```

---

## 8. PROPOSTAS DE SIMPLIFICAÇÃO

### 8.1 Consolidação de Contextos

| Atual | Proposta | Justificativa |
|-------|----------|---------------|
| `awaiting_bill_type` + `awaiting_bill_description` | `awaiting_bill_info` | Podem ser coletados juntos |
| `awaiting_invoice_due_date` + `awaiting_invoice_amount` | `awaiting_invoice_info` | Mesmo fluxo |
| `awaiting_installment_payment_method` + `awaiting_installment_card_selection` | `awaiting_installment_details` | Sequenciais |

**Redução:** 27 → 22 contextos (-5)

### 8.2 Unificação de Handlers

```typescript
// ANTES: Múltiplos handlers similares
processarDiaVencimento()
processarDiaVencimentoFatura()
processarDiaVencimentoLegado()

// DEPOIS: Handler unificado
processarDia(tipo: 'conta' | 'fatura' | 'parcela')
```

### 8.3 Máquina de Estados Explícita

```typescript
// Proposta: Definir transições explícitas
const TRANSICOES: Record<ContextType, ContextType[]> = {
  'idle': ['creating_transaction', 'awaiting_bill_type', ...],
  'awaiting_bill_type': ['awaiting_bill_description', 'idle'],
  'awaiting_bill_description': ['awaiting_bill_amount', 'awaiting_due_day', 'idle'],
  // ...
};

function validarTransicao(de: ContextType, para: ContextType): boolean {
  return TRANSICOES[de]?.includes(para) ?? false;
}
```

### 8.4 Timeout com Feedback

```typescript
// Proposta: Notificar usuário antes de expirar
async function verificarContextosExpirando() {
  const contextos = await buscarContextosExpirando(5); // 5 min antes
  for (const ctx of contextos) {
    await enviarViaEdgeFunction(ctx.phone, 
      `⏰ Você tem uma ação pendente. Deseja continuar?\n\n` +
      `Responda "sim" para continuar ou "não" para cancelar.`
    );
  }
}
```

---

## 9. MÉTRICAS E ESTATÍSTICAS

### 9.1 Distribuição de Código

| Categoria | Linhas | % |
|-----------|--------|---|
| Handlers de Contexto | ~2.500 | 61% |
| Funções Auxiliares | ~800 | 20% |
| Templates/Formatação | ~500 | 12% |
| Imports/Tipos | ~280 | 7% |
| **TOTAL** | **4.080** | 100% |

### 9.2 Complexidade Ciclomática

| Função | Complexidade | Recomendação |
|--------|--------------|--------------|
| `processarNoContexto()` | 45+ | ⚠️ Refatorar |
| `processarSelecaoContaPagamento()` | 20+ | ⚠️ Simplificar |
| `processarMetodoPagamentoParcelamento()` | 15+ | 🟡 Aceitável |
| Demais handlers | 5-10 | ✅ OK |

---

## 10. RECOMENDAÇÕES FINAIS

### 10.1 Prioridade ALTA

1. **Unificar TTL**: Banco (5min) vs Código (60min) → Definir 30min
2. **Refatorar `processarNoContexto()`**: Dividir em sub-handlers por categoria
3. **Adicionar logs estruturados**: Para debugging de fluxos complexos

### 10.2 Prioridade MÉDIA

4. **Consolidar contextos similares**: Reduzir de 27 para ~22
5. **Implementar máquina de estados**: Transições explícitas e validadas
6. **Adicionar timeout com feedback**: Notificar antes de expirar

### 10.3 Prioridade BAIXA

7. **Remover handlers legados**: `processarDiaVencimentoLegado()`, `processarValorContaLegado()`
8. **Documentar context_data**: TypeScript interfaces para cada contexto
9. **Testes automatizados**: Cobertura para fluxos críticos

---

## 11. DIAGRAMA DE CONTEXTOS

```
                                    ┌─────────────────┐
                                    │      idle       │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │ creating_         │    │ awaiting_bill_*   │    │ awaiting_card_*   │
        │ transaction       │    │ (8 estados)       │    │ (6 estados)       │
        └─────────┬─────────┘    └─────────┬─────────┘    └─────────┬─────────┘
                  │                        │                        │
                  ▼                        ▼                        ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │ confirming_action │    │ awaiting_payment_*│    │ credit_card_      │
        │ (3 steps)         │    │ (3 estados)       │    │ context           │
        └─────────┬─────────┘    └─────────┬─────────┘    └─────────┬─────────┘
                  │                        │                        │
                  └────────────────────────┼────────────────────────┘
                                           │
                                           ▼
                                    ┌─────────────────┐
                                    │   TRANSAÇÃO     │
                                    │   REGISTRADA    │
                                    └─────────────────┘
```

---

## 12. ARQUIVOS RELACIONADOS

| Arquivo | Propósito | Linhas |
|---------|-----------|--------|
| `context-manager.ts` | Gerenciamento de contexto | 4.080 |
| `index.ts` | Entry point, roteamento | 1.832 |
| `contas-pagar.ts` | Lógica de contas a pagar | ~1.500 |
| `cartao-credito.ts` | Lógica de cartões | ~800 |
| `transaction-mapper.ts` | CRUD de transações | ~600 |
| `nlp-classifier.ts` | Classificação NLP | ~400 |

---

**Autor:** Cascade AI  
**Versão:** 1.0  
**Última Atualização:** 2025-01-XX
