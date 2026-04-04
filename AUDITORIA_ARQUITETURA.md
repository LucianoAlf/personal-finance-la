# 🔍 AUDITORIA ARQUITETURAL - Personal Finance LA
**Data**: 08/12/2025 | **Status**: Análise Retroativa de Bugs

---

## 1️⃣ FLUXO COMPLETO DE PROCESSAMENTO DE MENSAGEM

### Entrada → Saída (Transação)

```
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK UAZAPI / N8N / DIRETO                               │
│ (Mensagem WhatsApp chega)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 50-150                                    │
│ 1. DETECTAR TIPO DE PAYLOAD                                 │
│    - isInternalPayload (webhook-uazapi)                     │
│    - isN8NPayload (N8N)                                     │
│    - Direto UAZAPI                                          │
│                                                              │
│ 2. EXTRAIR DADOS                                            │
│    - phone, userId, content, messageType                    │
│    - messageData (para áudio/imagem)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 150-250                                   │
│ 3. PROCESSAR ÁUDIO (se aplicável)                           │
│    - audio-handler.ts: processarAudioPTT()                  │
│    - Transcrição via UAZAPI + Whisper                       │
│    - Resultado: texto transcrito                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 250-350                                   │
│ 4. VERIFICAR CONTEXTO ATIVO                                 │
│    - context-manager.ts: buscarContexto()                   │
│    - Se step = awaiting_payment_method → handler específico │
│    - Se step = awaiting_account → handler específico        │
│    - Se step = awaiting_card_selection → handler específico │
│                                                              │
│ ⚠️ ORDEM CRÍTICA: Contexto é processado ANTES do NLP!       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ SIM (contexto ativo)
                     │  └─> context-manager.ts handlers
                     │      └─> Retorna resposta
                     │
                     └─ NÃO (sem contexto)
                        └─> Continua para NLP
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 350-450                                   │
│ 5. CLASSIFICAÇÃO NLP (ÚNICA FONTE DE VERDADE)               │
│    - nlp-processor.ts: classificarIntencaoNLP()             │
│    - GPT-4 extrai:                                          │
│      * intencao (REGISTRAR_DESPESA, CONSULTAR_SALDO, etc)   │
│      * entidades:                                           │
│        - valor                                              │
│        - categoria                                          │
│        - descricao                                          │
│        - conta                                              │
│        - forma_pagamento                                    │
│        - data                                               │
│        - status_pagamento                                   │
│        - tipo                                               │
│      * resposta_conversacional                              │
│      * confianca                                            │
│                                                              │
│ ✅ RESULTADO: intencaoNLP (objeto completo)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 450-550                                   │
│ 6. CONVERSÃO intencaoNLP → intencao                         │
│    - Linha 925-943                                          │
│    - ✅ INCLUI TODAS as entidades (v197 fix)                │
│    - Adiciona: comando_original, texto_original             │
│                                                              │
│ ⚠️ RISCO: Perda de dados se campos não forem copiados       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 550-750                                   │
│ 7. ROTEAMENTO POR INTENÇÃO                                  │
│    - REGISTRAR_DESPESA → processarIntencaoTransacao()       │
│    - REGISTRAR_RECEITA → processarIntencaoTransacao()       │
│    - CONSULTAR_SALDO → consultarSaldoEspecifico()           │
│    - CONSULTAR_GASTOS → consultarGastos()                   │
│    - LISTAR_CONTAS → listarContas()                         │
│    - EXCLUIR_TRANSACAO → excluirUltimaTransacao()           │
│    - EDITAR_VALOR → processarEdicao()                       │
│    - AGRADECIMENTO → templateAgradecimento()                │
│    - OUTRO → resposta genérica                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ transaction-mapper.ts - Linhas 897-1096                     │
│ 8. PROCESSAR INTENÇÃO DE TRANSAÇÃO                          │
│    processarIntencaoTransacao(intencao, userId, phone)      │
│                                                              │
│    A. Validar valor                                         │
│    B. Verificar forma_pagamento                             │
│       - Se não especificado → Perguntar (awaiting_payment)  │
│    C. Buscar conta (entidades.conta)                        │
│       - Se encontrou → Usar                                 │
│       - Se não → Verificar quantas contas tem               │
│         * 1 conta → Usar                                    │
│         * Múltiplas → Perguntar (awaiting_account)          │
│    D. Detectar categoria                                    │
│       - Palavra-chave (comando + descricao)                 │
│       - Fallback: "Outros"                                  │
│    E. Registrar transação                                   │
│       - registrarTransacao()                                │
│                                                              │
│ ⚠️ RISCO: Múltiplos pontos de detecção (categoria, conta)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Precisa confirmação?
                     │  ├─ SIM → Salvar contexto + Perguntar
                     │  │        └─> Aguarda resposta do usuário
                     │  │           └─> Volta ao passo 4 (contexto ativo)
                     │  │
                     │  └─ NÃO → Registrar direto
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ transaction-mapper.ts - Linhas 500-607                      │
│ 9. REGISTRAR TRANSAÇÃO                                      │
│    registrarTransacao(input)                                │
│    - Validar valor                                          │
│    - Buscar categoria se não tiver                          │
│    - INSERT em transactions                                 │
│    - Gerar mensagem de confirmação                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ index.ts - Linhas 1400-1450                                 │
│ 10. ENVIAR RESPOSTA                                         │
│     - enviarViaEdgeFunction(phone, resposta)                │
│     - Atualizar status da mensagem em whatsapp_messages     │
│     - Retornar 200 OK                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ MAPEAMENTOS DE DADOS (DUPLICAÇÕES ENCONTRADAS)

### 🔴 PROBLEMA: Mapeamentos em 3+ lugares

#### A. Palavras-chave → Categorias

| Arquivo | Linhas | Tipo | Status |
|---------|--------|------|--------|
| `context-manager.ts` | 510-528 | `PALAVRAS_CATEGORIAS` | ✅ Atualizado v203 |
| `transaction-mapper.ts` | 83-93 | `MAPEAMENTO_CATEGORIAS` | ✅ Atualizado v203 |
| `transaction-mapper.ts` | 96-250 | `NLP_PARA_CATEGORIA` | ✅ Atualizado v203 |

**Risco**: Se um for atualizado, os outros ficam desatualizados!

**Exemplo de divergência**:
- v202: Adicionado `'luz': 'Moradia'` em `NLP_PARA_CATEGORIA`
- v203: Adicionado `'abasteci': 'Transporte'` em 3 lugares

#### B. Nicknames de Banco → Nome Oficial

| Arquivo | Linhas | Tipo | Bancos |
|---------|--------|------|--------|
| `transaction-mapper.ts` | 61-77 | `MAPEAMENTO_BANCOS` | nubank, itau, bradesco, santander, caixa, bb, c6, inter, picpay, will, pagbank |
| `context-manager.ts` | 1245 | Array inline | nubank, itau, bradesco, santander, inter, caixa, bb, c6, picpay |

**Risco**: `context-manager.ts` não tem `will` e `pagbank`!

#### C. Formas de Pagamento

| Arquivo | Linhas | Tipo | Valores |
|---------|--------|------|---------|
| `transaction-mapper.ts` | 1062-1069 | `mapFormaPagamento` | pix, credito, debito, dinheiro, boleto, transferencia |
| `context-manager.ts` | 584-590 | `mapFormaPagamento` | pix, credito, debito, dinheiro, boleto, transferencia |

**Status**: ✅ Sincronizados

---

## 3️⃣ CONVERSÕES LOSSY (PERDA DE DADOS)

### A. intencaoNLP → intencao (index.ts linhas 925-943)

```typescript
// ANTES (v196 - BUGADO)
const intencao = {
  intencao: intencaoNLP.intencao,
  confianca: intencaoNLP.confianca,
  entidades: {
    valor: intencaoNLP.entidades.valor,
    categoria: intencaoNLP.entidades.categoria,
    descricao: intencaoNLP.entidades.descricao,
    conta: intencaoNLP.entidades.conta,
    data: intencaoNLP.entidades.data,
    // ❌ FALTAVA: forma_pagamento, status_pagamento, tipo
  }
};

// DEPOIS (v197 - CORRIGIDO)
const intencao = {
  intencao: intencaoNLP.intencao,
  confianca: intencaoNLP.confianca,
  entidades: {
    valor: intencaoNLP.entidades.valor,
    categoria: intencaoNLP.entidades.categoria,
    descricao: intencaoNLP.entidades.descricao,
    conta: intencaoNLP.entidades.conta,
    data: intencaoNLP.entidades.data,
    forma_pagamento: intencaoNLP.entidades.forma_pagamento,    // ✅ ADICIONADO
    status_pagamento: intencaoNLP.entidades.status_pagamento,  // ✅ ADICIONADO
    tipo: intencaoNLP.entidades.tipo                            // ✅ ADICIONADO
  }
};
```

**Status**: ✅ Corrigido em v197

### B. Contexto → Intenção (context-manager.ts)

Quando usuário responde no contexto, os dados são salvos em `intencao_pendente`:

```typescript
// Linha 1367-1375
intencao_pendente: {
  ...intencao,
  entidades: {
    ...intencao?.entidades,
    forma_pagamento: metodo.method === 'debit' ? 'debito' : ...
  }
}
```

**Risco**: Se `intencao` original não tiver todos os campos, o spread não vai recuperá-los!

---

## 4️⃣ HANDLERS DE CONTEXTO (STEPS)

### Step: `awaiting_payment_method`

**Arquivo**: `context-manager.ts` linhas 1190-1385

**O que é detectado**:
- ✅ Método de pagamento (credit, debit, pix, cash)
- ✅ Banco na resposta (v203 fix)
- ✅ Nome do cartão (se credit)

**O que é IGNORADO**:
- ❌ Outras entidades (valor, categoria, etc)

**Fluxo**:
```
Resposta: "Paguei no débito do Itaú"
    ↓
Detecta: método=debit, banco=itau
    ↓
Se encontra banco → Registra direto (v203)
Se não encontra → Pergunta conta
```

### Step: `awaiting_account`

**Arquivo**: `context-manager.ts` linhas 305-663

**O que é detectado**:
- ✅ Número (1, 2, 3...)
- ✅ Nome da conta (exato, parcial, variações)

**O que é IGNORADO**:
- ❌ Método de pagamento (já foi detectado antes)
- ❌ Outras entidades

### Step: `awaiting_card_selection`

**Arquivo**: `context-manager.ts` linhas 1294-1312

**O que é detectado**:
- ✅ Número do cartão
- ✅ Nome do banco (se mencionado)

**O que é IGNORADO**:
- ❌ Tudo mais

---

## 5️⃣ FONTES DE VERDADE (CONFLITOS IDENTIFICADOS)

### Categoria Final

| Fonte | Prioridade | Confiabilidade | Problema |
|-------|-----------|-----------------|----------|
| NLP (`entidades.categoria`) | 1 | ⚠️ Média | Pode errar (v202 bug) |
| Palavra-chave | 2 | ✅ Alta | Incompleto (faltam palavras) |
| Fallback "Outros" | 3 | ✅ Sempre funciona | Genérico |

**Fluxo Atual** (transaction-mapper.ts linhas 1007-1057):
```
1. Detectar por palavra-chave (comando + descricao)
2. Se não encontrar → Fallback "Outros"
3. ❌ NLP categoria é IGNORADO (v202 fix)
```

**Problema**: NLP categoria é ignorado completamente!
- Se NLP acerta, não é usado
- Se NLP erra, não contamina (v202 fix)

### Conta/Banco

| Fonte | Prioridade | Confiabilidade | Problema |
|-------|-----------|-----------------|----------|
| NLP (`entidades.conta`) | 1 | ⚠️ Média | Às vezes undefined (v191) |
| Fallback texto original | 2 | ⚠️ Média | Precisa de regex |
| Contexto (resposta do usuário) | 3 | ✅ Alta | Só se usuário responder |
| Única conta | 4 | ✅ Sempre funciona | Se tem só 1 |

**Fluxo Atual** (transaction-mapper.ts linhas 948-988):
```
1. Se NLP tem conta → Buscar account_id
2. Se não encontrou → Verificar quantas contas tem
   a. 1 conta → Usar
   b. Múltiplas → Perguntar
```

### Forma de Pagamento

| Fonte | Prioridade | Confiabilidade | Problema |
|-------|-----------|-----------------|----------|
| NLP (`entidades.forma_pagamento`) | 1 | ✅ Alta | Geralmente acerta |
| Contexto (resposta do usuário) | 2 | ✅ Alta | Se usuário responder |
| Fallback | 3 | ❌ Nenhum | Não há fallback! |

**Fluxo Atual** (transaction-mapper.ts linhas 918-946):
```
1. Se NLP tem forma_pagamento → Usar
2. Se não → Perguntar (awaiting_payment_method)
```

---

## 6️⃣ PADRÕES RAIZ DOS BUGS

### Padrão A: Múltiplos Pontos de Detecção (Bugs #1, #2)

**Problema**: Regex handlers competem com NLP

```
❌ ANTES:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Regex 1      │    │ Regex 2      │    │ NLP          │
│ (roxinho?)   │    │ (analytics)  │    │ (verdadeiro) │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │ Quem chega primeiro ganha!            │
       └────────────────────────────────────────┘
```

**Solução**: Remover regex, confiar 100% em NLP

```
✅ DEPOIS:
┌──────────────────────────────────┐
│ NLP (única fonte de verdade)     │
│ - Extrai tudo de uma vez        │
│ - Sem competição                │
└──────────────────────────────────┘
```

### Padrão B: Handlers Ignoram Entidades (Bugs #3, #6, #8)

**Problema**: Handlers detectam método mas ignoram banco na mesma resposta

```
❌ ANTES:
Resposta: "Paguei no débito do Itaú"
    ↓
Handler detecta: método=debit
    ↓
Handler IGNORA: banco=itau
    ↓
Resultado: Pergunta "De qual conta?" (desnecessário!)
```

**Solução**: Extrair TODAS as entidades da mesma resposta

```
✅ DEPOIS (v203):
Resposta: "Paguei no débito do Itaú"
    ↓
Handler detecta: método=debit, banco=itau
    ↓
Se encontra banco → Registra direto!
```

### Padrão C: Fontes de Dados Misturadas (Bug #7)

**Problema**: Categoria NLP contamina detecção por palavra-chave

```
❌ ANTES:
textosParaAnalisar = [
  "Paguei 120 de Luz...",
  "Luz",
  "Saúde"  // ← NLP errou, contaminou!
]
    ↓
Detector encontra "saude" ANTES de "luz"
    ↓
Resultado: Saúde (errado!)
```

**Solução**: Remover categoria NLP do array

```
✅ DEPOIS (v202):
textosParaAnalisar = [
  "Paguei 120 de Luz...",
  "Luz"
  // Sem categoria NLP
]
    ↓
Detector encontra "luz"
    ↓
Resultado: Moradia (correto!)
```

### Padrão D: Mapeamentos Incompletos (Bugs #9, e outros)

**Problema**: Palavras-chave faltam em mapeamentos

```
❌ ANTES (v202):
"Abasteci o carro" → Não encontra "abasteci" no mapeamento
    ↓
Fallback: "Outros"
```

**Solução**: Adicionar todas as variações

```
✅ DEPOIS (v203):
Adicionar: 'abasteci', 'abastecimento', 'abastecer', 'posto', 'etanol', 'alcool', 'diesel'
    ↓
"Abasteci o carro" → Encontra "abasteci"
    ↓
Resultado: Transporte (correto!)
```

---

## 7️⃣ PROBLEMAS ARQUITETURAIS CRÍTICOS

### 1. Duplicação de Mapeamentos

**Impacto**: Alto (bugs recorrentes)

**Mapeamentos duplicados**:
- Palavras-chave → Categorias (3 lugares)
- Nicknames de banco (2 lugares)

**Solução proposta**: Centralizar em arquivo único

```typescript
// shared/mappings.ts
export const CATEGORIA_MAPPINGS = { ... };
export const BANCO_MAPPINGS = { ... };
export const PAGAMENTO_MAPPINGS = { ... };

// Importar em todos os arquivos
import { CATEGORIA_MAPPINGS } from './shared/mappings';
```

### 2. Conversões Lossy Sem Validação

**Impacto**: Médio (bugs silenciosos)

**Problema**: Quando `intencaoNLP` → `intencao`, campos podem ser perdidos

**Solução proposta**: Validação de schema

```typescript
// Validar que TODOS os campos foram copiados
const requiredFields = ['valor', 'categoria', 'descricao', 'conta', 'forma_pagamento', ...];
for (const field of requiredFields) {
  if (!(field in intencao.entidades)) {
    console.warn(`⚠️ Campo perdido: ${field}`);
  }
}
```

### 3. Handlers Não Extraem Múltiplas Entidades

**Impacto**: Alto (UX ruim, perguntas desnecessárias)

**Problema**: Quando usuário responde, handler só detecta 1 coisa

**Solução proposta**: Extrair TUDO da resposta

```typescript
// Detectar método + banco + cartão na mesma resposta
const metodo = detectarMetodo(resposta);
const banco = detectarBanco(resposta);
const cartao = detectarCartao(resposta);

// Se tem tudo → Registrar direto!
if (metodo && banco) {
  return registrar();
}
```

### 4. Sem Ordem de Prioridade Clara

**Impacto**: Médio (comportamento imprevisível)

**Problema**: Qual fonte tem prioridade? NLP? Palavra-chave? Contexto?

**Solução proposta**: Documentar ordem explícita

```typescript
// ORDEM DE PRIORIDADE (DEFINIDA)
// 1. Dados do contexto (usuário respondeu)
// 2. NLP (extração automática)
// 3. Fallback (padrão)

if (contextoAtivo) {
  return processarContexto();
} else if (intencaoNLP) {
  return processarNLP();
} else {
  return fallback();
}
```

---

## 8️⃣ MATRIZ DE BUGS vs PADRÕES

| Bug | Padrão | Descrição | v Fix | Status |
|-----|--------|-----------|-------|--------|
| 1 | A | Regex "roxinho?" | v188 | ✅ |
| 2 | A | isAnalyticsQuery | v189 | ✅ |
| 3 | B | Handler ignora filtro | v190 | ✅ |
| 4 | C | NLP não extrai "Itaú" | v191 | ✅ |
| 5 | D | TTL curto | v196 | ✅ |
| 6 | B | Entidades perdidas | v197 | ✅ |
| 7 | E | Categoria NLP contamina | v202 | ✅ |
| 8 | B | awaiting_payment ignora banco | v203 | ✅ |
| 9 | F | "Abastecimento" não mapeado | v203 | ✅ |

---

## 9️⃣ RECOMENDAÇÕES IMEDIATAS

### 🔴 CRÍTICO (Fazer agora)

1. **Centralizar mapeamentos**
   - Criar `shared/mappings.ts`
   - Importar em todos os arquivos
   - Remover duplicações

2. **Validar conversões**
   - Adicionar schema validation em `intencaoNLP → intencao`
   - Logar campos perdidos

3. **Documentar prioridades**
   - Criar arquivo `ARQUITETURA.md`
   - Definir ordem de prioridade para cada tipo de dado

### 🟡 IMPORTANTE (Próximas 2 semanas)

4. **Consolidar detecção de entidades**
   - Criar função `extrairTodasEntidades(texto)`
   - Usar em todos os handlers de contexto

5. **Adicionar testes**
   - Teste para cada mapeamento
   - Teste para cada handler de contexto
   - Teste de conversão de dados

### 🟢 MELHORIAS (Backlog)

6. **Refatorar handlers**
   - Consolidar lógica duplicada
   - Usar padrão consistente

7. **Melhorar logging**
   - Adicionar trace IDs
   - Rastrear fluxo completo

---

## 🔟 CONCLUSÃO

**Causa Raiz Comum**: Falta de **Fonte Única de Verdade** e **Validação em Camadas**

**Solução Arquitetural**:
```
┌─────────────────────────────────────────┐
│ 1. CONTEXTO ATIVO?                      │
│    → Processar contexto                 │
└────────────────┬────────────────────────┘
                 │ não
                 ▼
┌─────────────────────────────────────────┐
│ 2. NLP EXTRAI TUDO                      │
│    (única fonte de verdade)             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. VALIDAR CONVERSÃO                    │
│    (todos os campos presentes?)         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 4. ENRICHMENT (fallbacks padronizados)  │
│    - Categoria: palavra-chave → NLP     │
│    - Conta: NLP → fallback → perguntar  │
│    - Método: NLP → perguntar            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 5. VALIDAÇÃO FINAL                      │
│    (tudo preenchido?)                   │
│    - SIM → Registrar                    │
│    - NÃO → Perguntar                    │
└─────────────────────────────────────────┘
```

**Benefícios**:
- ✅ Fluxo previsível
- ✅ Menos bugs
- ✅ Mais fácil de debugar
- ✅ Mais fácil de manter
