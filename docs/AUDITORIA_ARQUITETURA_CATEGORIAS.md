# 🔍 AUDITORIA PROFUNDA - PROBLEMA DE ARQUITETURA

## Data: 17/12/2025

---

## 📋 PROBLEMA REPORTADO

O usuário reporta que:
1. Categoria "TV" deveria ser "Eletrodomésticos" automaticamente
2. WhatsApp retorna "Outros", frontend mostra "Eletrodomésticos"
3. Dados aparecem em uma página mas não em outra
4. Múltiplas fontes de verdade para a mesma informação
5. Código paralelo tratando a mesma coisa de formas diferentes

---

## 🔴 PROBLEMA RAIZ IDENTIFICADO

### O Fluxo Atual (PROBLEMÁTICO)

```
WhatsApp: "TV 2000 em 10x no Nubank"
    ↓
detectarCategoriaPorTexto(["TV"])
    ↓
Retorna: "Eletrodomesticos" (sem acento) ✅
    ↓
buscarCategoriaInteligente("Eletrodomesticos")
    ↓
normalizarCategoriaNLP("eletrodomesticos")  ← 🔴 PROBLEMA AQUI
    ↓
Busca em NLP_CATEGORIA_MAP["eletrodomesticos"]
    ↓
NÃO ENCONTRA → Retorna "Outros" ❌
    ↓
Busca "Outros" no banco → ID de "Outros"
```

### A Causa Raiz

**Linha 330 de `transaction-mapper.ts`:**
```typescript
const nomeBanco = normalizarCategoriaNLP(nomeNormalizado) || nomeCategoria;
```

A função `normalizarCategoriaNLP()` foi criada para converter categorias em **INGLÊS** (do NLP) para **PORTUGUÊS**:
- "food" → "Alimentação"
- "transport" → "Transporte"

**MAS** está sendo usada para converter categorias que **JÁ ESTÃO EM PORTUGUÊS**:
- "eletrodomesticos" → busca no mapa → NÃO ENCONTRA → retorna "Outros"

---

## 🔴 MÚLTIPLAS FONTES DE VERDADE (CÓDIGO DUPLICADO)

### Funções que tratam categoria:

| Arquivo | Função | Propósito |
|---------|--------|-----------|
| `transaction-mapper.ts` | `detectarCategoriaPorTexto()` | Detecta categoria por palavra-chave |
| `transaction-mapper.ts` | `buscarCategoriaInteligente()` | Busca ID da categoria no banco |
| `transaction-mapper.ts` | `detectarCategoriaAutomatica()` | Orquestra detecção + busca |
| `transaction-mapper.ts` | `buscarCategoriaPorNome()` | Busca categoria por nome exato |
| `shared/mappings.ts` | `detectarCategoriaPorPalavraChave()` | Detecta categoria por palavra-chave |
| `shared/mappings.ts` | `normalizarCategoriaNLP()` | Converte inglês → português |

### Problema: DUAS funções fazem a mesma coisa!

1. `detectarCategoriaPorTexto()` em `transaction-mapper.ts`
2. `detectarCategoriaPorPalavraChave()` em `shared/mappings.ts`

E ambas usam `CATEGORIA_KEYWORDS` de `shared/mappings.ts`.

---

## 🔴 TABELAS COM DADOS DUPLICADOS

### Onde os dados são armazenados:

| Tabela | Propósito | Tem category_id? |
|--------|-----------|------------------|
| `transactions` | Transações gerais | ✅ Sim |
| `credit_card_transactions` | Transações de cartão | ✅ Sim |
| `payable_bills` | Contas a pagar | ✅ Sim |

### Problema: MESMA transação em MÚLTIPLAS tabelas

Quando o usuário faz "TV 2000 em 10x no Nubank":
1. Cria 1 registro em `credit_card_transactions` ✅
2. Cria 10 registros em `payable_bills` ✅
3. **NÃO** cria em `transactions` (correto)

**MAS** a página de Transações busca de AMBAS as tabelas e combina:
- `useTransactions.ts` linha 88-108: busca de `credit_card_transactions`
- `useTransactions.ts` linha 162: combina com `transactions`

---

## 🔴 HOOKS COM LÓGICA DUPLICADA

| Hook | Tabela(s) | Traz categoria? |
|------|-----------|-----------------|
| `useTransactions` | `transactions` + `credit_card_transactions` | ✅ Via JOIN |
| `useCreditCardTransactions` | `credit_card_transactions` | ✅ Via JOIN |
| `usePayableBills` | `payable_bills` | ❌ Só category_id |
| `useContasConsolidadas` | Função SQL | ❓ Depende da função |

---

## ✅ SOLUÇÃO PROPOSTA

### 1. Corrigir `buscarCategoriaInteligente()` (URGENTE)

**Remover** a chamada desnecessária a `normalizarCategoriaNLP()`:

```typescript
// ANTES (problemático)
const nomeNormalizado = normalizarTexto(nomeCategoria);
const nomeBanco = normalizarCategoriaNLP(nomeNormalizado) || nomeCategoria;
const nomeBancoNorm = normalizarTexto(nomeBanco);

// DEPOIS (correto)
const nomeBancoNorm = normalizarTexto(nomeCategoria);
```

### 2. Unificar funções de detecção de categoria

Manter APENAS `detectarCategoriaPorPalavraChave()` em `shared/mappings.ts` e remover `detectarCategoriaPorTexto()` de `transaction-mapper.ts`.

### 3. Garantir que `CATEGORIA_KEYWORDS` tenha TODAS as variações

Já tem "tv", "televisao", "televisão" → "Eletrodomésticos" ✅

### 4. Remover `NLP_CATEGORIA_MAP` do fluxo de detecção

Esse mapa é para converter categorias do NLP em inglês, não para categorias já detectadas em português.

---

## 📊 ARQUITETURA IDEAL (FONTE ÚNICA DE VERDADE)

```
WhatsApp: "TV 2000 em 10x no Nubank"
    ↓
detectarCategoriaPorPalavraChave("tv") → "Eletrodomésticos"
    ↓
buscarCategoriaNoSQL("Eletrodomésticos", tipo="expense")
    ↓
Retorna ID: "37528e86-6d91-4750-9511-6502d1d001cf"
    ↓
Insere em credit_card_transactions COM category_id
    ↓
Insere em payable_bills COM category_id
    ↓
Frontend busca COM JOIN em categories
    ↓
Exibe "Eletrodomésticos" em TODAS as páginas
```

---

## 🛠️ CORREÇÃO IMEDIATA

Arquivo: `supabase/functions/process-whatsapp-message/transaction-mapper.ts`

Linha 329-331:
```typescript
// REMOVER ESTAS LINHAS:
const nomeNormalizado = normalizarTexto(nomeCategoria);
const nomeBanco = normalizarCategoriaNLP(nomeNormalizado) || nomeCategoria;
const nomeBancoNorm = normalizarTexto(nomeBanco);

// SUBSTITUIR POR:
const nomeBancoNorm = normalizarTexto(nomeCategoria);
```

Isso elimina a camada intermediária que está causando o problema.

---

## 📝 CONCLUSÃO

O problema NÃO é de arquitetura geral, mas de uma **camada intermediária desnecessária** que foi adicionada para converter categorias em inglês para português, mas está sendo aplicada a categorias que já estão em português, causando fallback para "Outros".

A correção é **cirúrgica**: remover 2 linhas de código.
