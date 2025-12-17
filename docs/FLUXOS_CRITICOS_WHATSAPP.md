# 📋 DOCUMENTAÇÃO DOS FLUXOS CRÍTICOS - WHATSAPP

**Data:** 16/12/2025  
**Arquivo Principal:** `supabase/functions/process-whatsapp-message/index.ts`  
**Versão:** V26 - Modularizado Completo

---

## 🏗️ ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MENSAGEM WHATSAPP                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    1. DETECTAR TIPO DE PAYLOAD                      │
│  • Interno (webhook-uazapi) → message_id, user_id, from_number      │
│  • N8N/UAZAPI direto → body.EventType                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    2. EXTRAIR DADOS DO USUÁRIO                      │
│  • phone, userId, content, messageType                              │
│  • Buscar user em `users` table                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    3. PROCESSAR MÍDIA (SE HOUVER)                   │
│  • Áudio → transcribe-audio (Whisper API)                           │
│  • Imagem → extract-receipt-data (GPT-4 Vision)                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    4. VERIFICAR CONTEXTO ATIVO                      │
│  • buscarContexto(userId)                                           │
│  • Se ativo → processarNoContexto()                                 │
│  • TTL: 60 minutos                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    5. CLASSIFICAR INTENÇÃO (GPT-4)                  │
│  • classificarIntencaoNLP() com Function Calling                    │
│  • Retorna: intencao, confianca, entidades, explicacao              │
│  • Threshold: 0.6 (abaixo pede clarificação)                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    6. VALIDAR ENTIDADES                             │
│  • validarEntidadesNLP() - Anti-alucinação                          │
│  • Remove descrições/categorias inventadas                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    7. ROTEAR PARA HANDLER                           │
│  • TRANSAÇÕES → processarIntencaoTransacao()                        │
│  • CARTÃO → processarIntencaoCartao()                               │
│  • CONTAS A PAGAR → processarIntencaoContaPagar()                   │
│  • CONSULTAS → consultarFinancasUnificada()                         │
│  • SOCIAL → templates humanizados                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    8. ENVIAR RESPOSTA                               │
│  • enviarViaEdgeFunction(phone, mensagem)                           │
│  • Atualizar whatsapp_messages (status, intent)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 FLUXO 1: REGISTRAR DESPESA

### Cenário Simples (Dados Completos)
```
Usuário: "Gastei 50 no mercado"
```

**Fluxo:**
```
1. NLP classifica → REGISTRAR_DESPESA (confiança: 0.95)
2. Entidades extraídas: { valor: 50, categoria: "mercado" }
3. validarEntidadesNLP() → OK
4. processarIntencaoTransacao()
   └── Detecta conta padrão do usuário
   └── Cria transação em `transactions`
5. Resposta: "✅ Despesa registrada! R$ 50,00 - Mercado"
```

### Cenário com Ambiguidade (BUG #13/#16)
```
Usuário: "Paguei 50 no Itaú"
```

**Fluxo:**
```
1. NLP classifica → COMPRA_CARTAO (confiança: 0.85)
2. Entidades: { valor: 50, conta: "itau" }
3. VERIFICAÇÃO DE AMBIGUIDADE (index.ts:991-1042):
   └── Tem banco detectado? SIM (itau)
   └── Tem forma_pagamento? NÃO
   └── Tem "crédito"/"cartão" explícito? NÃO
   └── → AMBIGUIDADE DETECTADA!
4. Salvar contexto: awaiting_payment_method
5. Resposta: "💳 Você pagou no débito ou crédito?"
```

**Continuação:**
```
Usuário: "débito"
```

**Fluxo:**
```
1. buscarContexto() → awaiting_payment_method
2. processarNoContexto() → processarMetodoPagamento()
3. Recupera dados: { valor: 50, conta: "itau" }
4. Cria transação com payment_method: "debit"
5. Resposta: "✅ Despesa registrada! R$ 50,00 - Débito Itaú"
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `index.ts` | Detecção de ambiguidade | 991-1042 |
| `transaction-mapper.ts` | processarIntencaoTransacao | ~200 |
| `context-manager.ts` | processarMetodoPagamento | ~1800 |

---

## 🔴 FLUXO 2: CONSULTAR SALDO

### Cenário Geral
```
Usuário: "Qual meu saldo?"
```

**Fluxo:**
```
1. NLP classifica → CONSULTAR_SALDO (confiança: 0.98)
2. Entidades: {} (sem filtro)
3. Handler CONSULTAR_SALDO (index.ts:1212-1269)
4. consultarSaldo(userId) → busca todas as contas
5. Resposta:
   "💰 *Seus Saldos*
   
   🟣 Nubank: R$ 1.500,00
   🟠 Itaú: R$ 3.200,00
   
   💵 *Total:* R$ 4.700,00"
```

### Cenário com Filtro
```
Usuário: "Saldo do roxinho"
```

**Fluxo:**
```
1. NLP classifica → CONSULTAR_SALDO
2. Entidades: { conta: "nubank" } (normalizado de "roxinho")
3. Se NLP não extraiu → FALLBACK (index.ts:1220-1247):
   └── bancosConhecidos inclui { nome: 'nubank', aliases: ['roxinho'] }
   └── Detecta "roxinho" → contaFiltro = "nubank"
4. consultarSaldoEspecifico(userId, "nubank")
5. Resposta: "🟣 *Nubank*: R$ 1.500,00"
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `index.ts` | Handler CONSULTAR_SALDO | 1212-1269 |
| `command-handlers.ts` | consultarSaldo | ~50 |
| `consultas.ts` | consultarSaldoEspecifico | ~100 |

---

## 🔴 FLUXO 3: CARTÃO DE CRÉDITO

### Compra no Cartão
```
Usuário: "Gastei 200 no cartão Nubank"
```

**Fluxo:**
```
1. NLP classifica → COMPRA_CARTAO (confiança: 0.92)
2. Entidades: { valor: 200, cartao: "nubank" }
3. INTENCOES_CARTAO.includes() → TRUE (index.ts:901-909)
4. processarIntencaoCartao() (cartao-credito.ts)
   └── Busca cartão do usuário
   └── Busca fatura aberta
   └── Cria credit_card_transaction
5. Resposta: "💳 Compra registrada! R$ 200,00 no Nubank"
```

### Compra Parcelada
```
Usuário: "Comprei TV em 10x de 500"
```

**Fluxo:**
```
1. NLP classifica → COMPRA_PARCELADA
2. Entidades: { valor: 500, parcelas: 10, descricao: "TV" }
3. processarIntencaoCartao() com tipo: 'compra_parcelada'
   └── Cria 10 transações (1/10, 2/10, ..., 10/10)
   └── Distribui nas faturas futuras
4. Resposta: "💳 Compra parcelada! TV - 10x R$ 500,00"
```

### Consultar Fatura
```
Usuário: "Fatura do Nubank"
```

**Fluxo:**
```
1. NLP classifica → CONSULTAR_FATURA
2. Entidades: { cartao: "nubank" }
3. processarIntencaoCartao() com tipo: 'consulta_fatura'
   └── Busca fatura atual ou mes_referencia
   └── Lista transações da fatura
4. Resposta:
   "💳 *Fatura Nubank - Dezembro*
   
   📅 Vence: 15/01/2025
   💰 Total: R$ 1.850,00
   
   *Transações:*
   • iFood - R$ 45,00
   • Netflix - R$ 55,00
   ..."
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `index.ts` | Roteamento INTENCOES_CARTAO | 901-1088 |
| `cartao-credito.ts` | processarIntencaoCartao | ~100 |
| `cartao-credito.ts` | Anti-alucinação 3 camadas | ~45 |

---

## 🔴 FLUXO 4: CONTAS A PAGAR

### Cadastrar Conta
```
Usuário: "Netflix 55 dia 17"
```

**Fluxo:**
```
1. NLP classifica → CADASTRAR_CONTA_PAGAR
2. Entidades: { descricao: "Netflix", valor: 55, dia_vencimento: 17 }
3. intencoesContasPagar.includes() → TRUE (index.ts:1094-1111)
4. processarIntencaoContaPagar() (contas-pagar.ts)
   └── mapearBillTypeParaBanco("netflix") → "subscription"
   └── Detecta recorrência: is_recurring = true
   └── Cria em payable_bills
5. Resposta: "✅ Conta cadastrada! Netflix R$ 55,00 - Dia 17 🔄 Mensal"
```

### Listar Contas
```
Usuário: "Minhas contas a pagar"
```

**Fluxo:**
```
1. NLP classifica → LISTAR_CONTAS_PAGAR
2. processarIntencaoContaPagar('LISTAR_CONTAS_PAGAR')
   └── Busca payable_bills + credit_card_invoices
   └── Agrupa: VENCIDAS, PRÓXIMOS 7 DIAS, RESTANTE
3. Resposta:
   "📋 *Contas a Pagar*
   
   🔴 *VENCIDAS* (2)
   1. 💡 Luz - 10/12: R$ 180,00 — 6 dias atraso
   
   🟡 *PRÓXIMOS 7 DIAS* (3)
   2. 📺 Netflix - 17/12: R$ 55,00 — amanhã
   ..."
```

### Desambiguação "Minhas Contas"
```
Usuário: "Minhas contas"
```

**Fluxo:**
```
1. NLP classifica → CONTAS_AMBIGUO (ou LISTAR_CONTAS)
2. Verificação (index.ts:1504-1531):
   └── isMinhasContasAmbiguo? SIM
   └── Redireciona para CONTAS_AMBIGUO
3. Salva contexto: awaiting_account_type_selection
4. Resposta:
   "🤔 Você quer ver:
   1️⃣ Contas bancárias (saldos)
   2️⃣ Contas a pagar (boletos)"
```

**Continuação:**
```
Usuário: "2"
```

**Fluxo:**
```
1. buscarContexto() → awaiting_account_type_selection
2. processarNoContexto() → detecta "2" ou "pagar"
3. Executa LISTAR_CONTAS_PAGAR
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `index.ts` | Roteamento contas a pagar | 1094-1168 |
| `contas-pagar.ts` | processarIntencaoContaPagar | ~500 |
| `contas-pagar.ts` | mapearBillTypeParaBanco | ~200 |
| `context-manager.ts` | awaiting_account_type_selection | ~2000 |

---

## 🔴 FLUXO 5: TRANSFERÊNCIA

### Entre Contas Próprias
```
Usuário: "Transferi 500 do Nubank pro Itaú"
```

**Fluxo:**
```
1. NLP classifica → REGISTRAR_TRANSFERENCIA
2. Entidades: { valor: 500, conta: "nubank", conta_destino: "itau" }
3. Handler (index.ts:1698-1755):
   └── Tem conta + conta_destino + valor? SIM
   └── processarTransferenciaEntreContas()
4. Cria 2 transações:
   └── Saída: -500 no Nubank (type: transfer)
   └── Entrada: +500 no Itaú (type: transfer)
5. Resposta: "✅ Transferência! R$ 500,00 Nubank → Itaú"
```

### Para Terceiros
```
Usuário: "Transferi 200 pro João"
```

**Fluxo:**
```
1. NLP classifica → REGISTRAR_TRANSFERENCIA
2. Entidades: { valor: 200, descricao: "João" }
3. processarIntencaoTransferencia()
   └── Sem conta_destino → transferência para terceiros
   └── Cria 1 transação de saída
4. Resposta: "✅ Transferência! R$ 200,00 para João"
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `index.ts` | Handler REGISTRAR_TRANSFERENCIA | 1698-1755 |
| `transaction-mapper.ts` | processarTransferenciaEntreContas | ~1200 |
| `transaction-mapper.ts` | processarIntencaoTransferencia | ~1100 |

---

## 🔴 FLUXO 6: EDIÇÃO E EXCLUSÃO

### Editar Valor
```
Usuário: "Era 95"
```

**Fluxo:**
```
1. NLP classifica → EDITAR_VALOR
2. Entidades: { novo_valor: 95 }
3. Handler (index.ts:1580-1593):
   └── processarEdicao(userId, { valor: 95 })
   └── Busca última transação do usuário
   └── Atualiza amount
4. Resposta: "✅ Valor corrigido! R$ 95,00"
```

### Excluir Transação
```
Usuário: "Exclui essa"
```

**Fluxo:**
```
1. Comando rápido detectado (index.ts:731-745)
   └── Regex: /^(exclui|apaga|deleta)...$/
2. excluirUltimaTransacao(userId)
   └── Busca última transação
   └── Deleta de transactions ou credit_card_transactions
3. Resposta: "🗑️ Transação excluída!"
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `index.ts` | Comando rápido excluir | 731-745 |
| `index.ts` | Handler EDITAR_VALOR | 1580-1593 |
| `command-handlers.ts` | excluirUltimaTransacao | ~100 |
| `transaction-mapper.ts` | processarEdicao | ~800 |

---

## 🔴 FLUXO 7: CONTEXTO CONVERSACIONAL

### Tipos de Contexto (25 tipos)
```typescript
type ContextType =
  // Transações
  | 'creating_transaction'
  | 'awaiting_account'
  | 'awaiting_payment_method'
  | 'awaiting_category'
  | 'awaiting_transfer_account'
  
  // Cartão
  | 'credit_card_context'
  | 'awaiting_card_selection'
  | 'awaiting_card_confirmation'
  
  // Contas a Pagar
  | 'awaiting_bill_type'
  | 'awaiting_description'
  | 'awaiting_amount'
  | 'awaiting_due_day'
  | 'awaiting_installment_info'
  | 'awaiting_account_type_selection'
  
  // Faturas
  | 'awaiting_invoice_due_date'
  | 'awaiting_invoice_amount'
  | 'awaiting_card_creation_confirmation'
  | 'awaiting_card_limit'
  
  // Confirmações
  | 'confirming_action'
  | 'confirming_delete'
  ...
```

### Ciclo de Vida do Contexto
```
1. CRIAR: salvarContexto(userId, type, data, phone)
   └── Insere em conversation_context
   └── TTL: 60 minutos

2. BUSCAR: buscarContexto(userId)
   └── Retorna contexto ativo (se não expirado)

3. PROCESSAR: processarNoContexto(texto, contexto, userId, phone)
   └── Switch por context_type
   └── Executa handler específico

4. LIMPAR: limparContexto(userId)
   └── Deleta contexto após conclusão
```

### Arquivos Envolvidos
| Arquivo | Função | Linha |
|---------|--------|-------|
| `context-manager.ts` | salvarContexto | ~100 |
| `context-manager.ts` | buscarContexto | ~150 |
| `context-manager.ts` | processarNoContexto | ~200 |
| `context-manager.ts` | Handlers específicos | ~500-3500 |

---

## 🛡️ VALIDAÇÕES ANTI-ALUCINAÇÃO

### Camada 1: nlp-validator.ts
```typescript
// Valida descrição contra texto original
if (descricoesSuspeitas.includes(descricaoLower) && 
    !textoOriginal.includes(descricaoLower)) {
  entidades.descricao = undefined; // Remove alucinação
}
```

### Camada 2: Validação de Categoria
```typescript
// BUG #19: Se categoria está EXPLÍCITA no texto, MANTER
if (texto.includes(categoriaNorm)) {
  // NÃO remove - usuário disse a categoria
}
```

### Camada 3: cartao-credito.ts
```typescript
// Valida se nome do cartão existe na lista do usuário
const cartaoExiste = cartoesUsuario.some(c => 
  c.name.toLowerCase().includes(cartaoNLP)
);
if (!cartaoExiste) {
  // Pede para selecionar cartão válido
}
```

---

## 📊 GRUPOS DE INTENTS

### INTENCOES_COM_TEMPLATE (Dados Estruturados)
```typescript
const INTENCOES_COM_TEMPLATE = [
  'AJUDA',
  'CONSULTAR_SALDO',
  'CONSULTAR_EXTRATO',
  'LISTAR_CONTAS',
  'LISTAR_CATEGORIAS',
  'RELATORIO_DIARIO',
  'RELATORIO_SEMANAL',
  'RELATORIO_MENSAL',
  'CONSULTAR_METAS',
  'EXCLUIR_TRANSACAO',
  'EDITAR_VALOR',
  'EDITAR_CONTA',
  'EDITAR_CATEGORIA'
];
```

### INTENCOES_CONVERSACIONAIS (Resposta GPT)
```typescript
const INTENCOES_CONVERSACIONAIS = [
  'SAUDACAO',
  'AGRADECIMENTO',
  'OUTRO'
];
```

### INTENCOES_TRANSACAO (Template de Confirmação)
```typescript
const INTENCOES_TRANSACAO = [
  'REGISTRAR_DESPESA',
  'REGISTRAR_RECEITA',
  'REGISTRAR_TRANSFERENCIA'
];
```

### INTENCOES_CARTAO
```typescript
const INTENCOES_CARTAO = [
  'COMPRA_CARTAO',
  'COMPRA_PARCELADA',
  'CONSULTAR_FATURA',
  'CONSULTAR_FATURA_VENCIDA',
  'CONSULTAR_LIMITE',
  'LISTAR_CARTOES',
  'PAGAR_FATURA'
];
```

### INTENCOES_CONTAS_PAGAR
```typescript
const intencoesContasPagar = [
  'LISTAR_CONTAS_PAGAR',
  'CONTAS_VENCENDO',
  'CONTAS_VENCIDAS',
  'CONTAS_DO_MES',
  'RESUMO_CONTAS_MES',
  'CADASTRAR_CONTA_PAGAR',
  'EDITAR_CONTA_PAGAR',
  'EXCLUIR_CONTA_PAGAR',
  'MARCAR_CONTA_PAGA',
  'VALOR_CONTA_VARIAVEL',
  'HISTORICO_CONTA',
  'PAGAR_FATURA_CARTAO',
  'DESFAZER_PAGAMENTO',
  'RESUMO_PAGAMENTOS_MES',
  'CONTAS_AMBIGUO',
  'CADASTRAR_CONTA_AMBIGUO'
];
```

---

## 🔧 FALLBACKS IMPLEMENTADOS

### 1. Fallback de Banco (index.ts:1220-1247)
```typescript
const bancosConhecidos = [
  { nome: 'nubank', aliases: ['nubank', 'roxinho', 'roxo', 'nu'] },
  { nome: 'itau', aliases: ['itau', 'itaú', 'laranjinha'] },
  { nome: 'bradesco', aliases: ['bradesco', 'brades'] },
  // ... 12 bancos
];

// Se NLP não extraiu, detectar no texto
for (const banco of bancosConhecidos) {
  for (const alias of banco.aliases) {
    if (textoLower.includes(alias)) {
      contaFiltro = banco.nome;
      break;
    }
  }
}
```

### 2. Fallback de Forma de Pagamento (transaction-mapper.ts)
```typescript
// BUG #10: Detectar forma_pagamento ANTES de verificar método
const formasPagamento = ['pix', 'débito', 'debito', 'crédito', 'credito', 'dinheiro', 'boleto'];
for (const forma of formasPagamento) {
  if (textoLower.includes(forma)) {
    entidades.forma_pagamento = forma;
    break;
  }
}
```

### 3. Fallback de Estabelecimento (index.ts:1426-1466)
```typescript
const estabelecimentosConhecidos = [
  'ifood', 'uber', 'rappi', '99', 'spotify', 'netflix', 'amazon', ...
];

// Detectar padrão "quanto gastei de/com/no [estabelecimento]"
const padroesEstabelecimento = [
  /(?:quanto|qual)\s+(?:gastei|foi|paguei)\s+(?:de|com|no|na|em)\s+(\w+)/,
  ...
];
```

---

## 📁 MÓDULOS DO SISTEMA

| Módulo | Responsabilidade | Linhas |
|--------|------------------|--------|
| `index.ts` | Orquestrador principal | 1.816 |
| `nlp-classifier.ts` | Classificação GPT-4 | 1.611 |
| `context-manager.ts` | Gerenciamento de contexto | 3.500+ |
| `transaction-mapper.ts` | CRUD transações | 1.400+ |
| `cartao-credito.ts` | Operações de cartão | 1.200+ |
| `contas-pagar.ts` | Contas a pagar | 3.800+ |
| `consultas.ts` | Consultas unificadas | 800+ |
| `response-templates.ts` | Templates de resposta | 634 |
| `templates-humanizados.ts` | Templates humanizados | 345 |
| `command-handlers.ts` | Handlers de comando | 404 |
| `utils.ts` | Utilitários | 370 |
| `nlp-validator.ts` | Validação anti-alucinação | 83 |

---

*Documentação gerada em 16/12/2025 - Auditoria Completa*
