# 📋 AUDITORIA DE ARQUITETURA - SESSÃO 2: USO DO GPT-4/NLP

**Data:** 16/12/2025  
**Foco:** Fluxo NLP, Chamadas GPT-4, Categorização, Anti-Alucinação  
**Arquivos Analisados:** 12 arquivos principais

---

## 📊 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Arquivos com chamadas GPT-4 | 6 |
| Total de chamadas GPT-4 por mensagem texto | **1-2** |
| Chamadas GPT-4 para imagens | 5 funções |
| Prompts diferentes | 8 |
| Fallbacks implementados | ✅ Sim |
| Validação anti-alucinação | ✅ Parcial |
| ⚠️ Categoria GPT-4 ignorada em 1 local | 1 |
| ⚠️ Código duplicado (2 classificadores) | 2 arquivos |

---

## 1. MAPEAMENTO DE ARQUIVOS NLP

### Arquivos que usam GPT-4/OpenAI:

| Arquivo | Linhas | Propósito |
|---------|--------|-----------|
| `nlp-classifier.ts` | 1611 | **PRINCIPAL** - Classificação de intenção + extração de entidades |
| `nlp-processor.ts` | 958 | **LEGADO** - Classificador antigo (ainda exportado para compatibilidade) |
| `cartao-credito.ts` | 2675 | Classificação específica de cartão de crédito |
| `image-reader.ts` | ~600 | OCR de imagens (5 funções diferentes) |
| `context-manager.ts` | 4080 | Usa categoria do GPT-4 para transações |
| `transaction-mapper.ts` | 1476 | ⚠️ **IGNORA** categoria do GPT-4! |

### Arquivos auxiliares (sem chamadas diretas):

| Arquivo | Propósito |
|---------|-----------|
| `shared/mappings.ts` | Mapeamento palavra-chave → categoria (720 linhas) |
| `shared/nlp-validator.ts` | Validação estrutural de entidades |
| `templates-humanizados.ts` | Templates de resposta |
| `consultas.ts` | Handlers de consultas |
| `contas-pagar.ts` | Handlers de contas a pagar |

---

## 2. CHAMADAS AO GPT-4 DOCUMENTADAS

### 2.1 Classificação Principal (`nlp-classifier.ts`)

```
📍 Arquivo: nlp-classifier.ts
📍 Função: classificarIntencaoNLP()
📍 Linha: 1498-1511
```

**Propósito:** Classificação de intenção + extração de entidades

**Modelo:** `gpt-4o-mini` (ou configurado pelo usuário)

**Temperature:** 0.3

**Prompt Template:** (~1000 linhas de system prompt)
- Identidade da Ana Clara
- 40+ intenções possíveis
- Gírias brasileiras
- Categorias do banco de dados
- Histórico de conversa
- Contas bancárias do usuário
- Contas a pagar do usuário
- Memória do usuário (gírias personalizadas)
- Regras de desambiguação
- Exemplos de classificação

**O que é feito com a resposta:**
- ✅ Intenção é USADA para roteamento
- ✅ Entidades são USADAS (valor, descrição, conta)
- ⚠️ Categoria é USADA em `context-manager.ts` mas **IGNORADA** em `transaction-mapper.ts`

**Fallback:** `fallbackClassificacao()` - regex simples

---

### 2.2 Classificador Legado (`nlp-processor.ts`)

```
📍 Arquivo: nlp-processor.ts
📍 Função: classificarIntencaoInteligente()
📍 Linha: 729-745
```

**Propósito:** Classificação de intenção (versão antiga)

**Status:** ⚠️ **CÓDIGO DUPLICADO** - Ainda exportado para compatibilidade

**Diferenças do novo:**
- Menos intenções (22 vs 40+)
- Sem contas a pagar
- Sem pré-processamento de conta a pagar

**Recomendação:** Remover e usar apenas `nlp-classifier.ts`

---

### 2.3 Classificador de Cartão (`cartao-credito.ts`)

```
📍 Arquivo: cartao-credito.ts
📍 Função: classificarIntencaoCartaoIA()
📍 Linha: 313-381
```

**Propósito:** Classificação específica para operações de cartão de crédito

**Modelo:** `gpt-4o-mini`

**Temperature:** 0.1 (mais determinístico)

**Prompt:** (~50 linhas)
- Lista de cartões do usuário
- Aliases conhecidos (roxinho, laranjinha)
- Categorias de gastos
- 8 intenções de cartão

**O que é feito com a resposta:**
- ✅ Intenção é USADA
- ✅ Cartão extraído é VALIDADO (anti-alucinação)
- ✅ Termo/categoria é USADO

**Fallback:** Retorna `null` → sistema usa classificador principal

---

### 2.4 OCR de Imagens (`image-reader.ts`)

```
📍 Arquivo: image-reader.ts
📍 5 funções diferentes
📍 Linhas: 146, 221, 321, 417, 511
```

| Função | Propósito | Modelo |
|--------|-----------|--------|
| `lerImagemComGPT4Vision()` | OCR genérico | gpt-4o |
| `extrairDadosNotaFiscal()` | Extração de nota fiscal | gpt-4o |
| `extrairDadosComprovante()` | Extração de comprovante | gpt-4o |
| `extrairDadosBoleto()` | Extração de boleto | gpt-4o |
| `extrairDadosRecibo()` | Extração de recibo | gpt-4o |

**Todas usam GPT-4 Vision** para análise de imagens.

---

## 3. FLUXO DE CATEGORIZAÇÃO

### Diagrama do Fluxo:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENSAGEM DO USUÁRIO                          │
│                  "gastei 50 no uber"                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. PRÉ-PROCESSAMENTO (nlp-classifier.ts)           │
│  - Detecta padrões de conta a pagar (dia X, assinaturas)        │
│  - Pode FORÇAR intenção antes do GPT-4                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. GPT-4 CLASSIFICAÇÃO (nlp-classifier.ts)         │
│  - Classifica intenção (40+ tipos)                              │
│  - Extrai entidades: valor, categoria, descrição, conta         │
│  - Retorna: { intencao, entidades, resposta_conversacional }    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. VALIDAÇÃO (nlp-validator.ts)                    │
│  - Valida estrutura das entidades                               │
│  - Remove valores inválidos (NaN, negativos)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────────┐               ┌───────────────────────┐
│  context-manager.ts   │               │ transaction-mapper.ts │
│  (COM CONTA)          │               │ (SEM CONTA)           │
└───────────────────────┘               └───────────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────────┐               ┌───────────────────────┐
│ PRIORIDADE 1:         │               │ ⚠️ IGNORA GPT-4!      │
│ Categoria do GPT-4    │               │                       │
│ (entidades.categoria) │               │ Usa APENAS:           │
│                       │               │ - comando_original    │
│ PRIORIDADE 2:         │               │ - descrição           │
│ Mapeamento keywords   │               │                       │
│ (mappings.ts)         │               │ Busca em mappings.ts  │
│                       │               │                       │
│ PRIORIDADE 3:         │               │ Fallback: "Outros"    │
│ Fallback "Outros"     │               │                       │
└───────────────────────┘               └───────────────────────┘
```

### Ordem de Prioridade ATUAL:

#### Em `context-manager.ts` (linhas 1078-1119):
1. ✅ **GPT-4** (`entidades.categoria`) - IA entende semântica
2. ⚡ **Mapeamento por palavra-chave** (`mappings.ts`) - fallback rápido
3. ⚠️ **"Outros"** - último fallback

#### Em `transaction-mapper.ts` (linhas 1035-1084):
1. ❌ **GPT-4 IGNORADO** - Comentário explícito: "O NLP pode errar a categoria"
2. ⚡ **Mapeamento por palavra-chave** (`mappings.ts`) - ÚNICO método
3. ⚠️ **"Outros"** - fallback

### ⚠️ CONFLITO IDENTIFICADO:

```typescript
// transaction-mapper.ts linha 1035-1040
// PASSO ÚNICO: Detectar categoria analisando textos disponíveis
// ⚠️ NÃO incluir entidades.categoria aqui!
// O NLP pode errar a categoria e contaminar a detecção por palavra-chave
const textosParaAnalisar = [
  intencao.comando_original,  // "gastei 15 no uber"
  descricao,                   // "Uber"
  // ❌ REMOVIDO: entidades.categoria (causava bug quando NLP errava)
];
```

**Problema:** A categoria do GPT-4 é **IGNORADA** em `transaction-mapper.ts`, mas **USADA** em `context-manager.ts`. Isso causa inconsistência dependendo do fluxo.

---

## 4. CUSTO vs VALOR

### Chamadas GPT-4 por Mensagem de TEXTO:

| Cenário | Chamadas | Custo Estimado |
|---------|----------|----------------|
| Mensagem simples (despesa/receita) | 1 | ~$0.002 |
| Mensagem de cartão de crédito | 2 | ~$0.004 |
| Mensagem com imagem | 1-2 | ~$0.01-0.02 |

### Análise de Redundância:

| Chamada | Redundante? | Justificativa |
|---------|-------------|---------------|
| `classificarIntencaoNLP()` | ❌ Não | Principal e necessária |
| `classificarIntencaoCartaoIA()` | ⚠️ Parcial | Poderia ser integrada ao classificador principal |
| `classificarIntencaoInteligente()` | ✅ Sim | Código legado duplicado |

### Respostas IGNORADAS:

| Campo | Onde é ignorado | Impacto |
|-------|-----------------|---------|
| `entidades.categoria` | `transaction-mapper.ts` | ⚠️ **ALTO** - Categorização pode falhar |
| `resposta_conversacional` | Algumas intenções | ✅ Baixo - Usa templates |

---

## 5. PROMPTS DO GPT-4

### 5.1 Prompt de Classificação Principal

**Arquivo:** `nlp-classifier.ts` função `gerarSystemPrompt()`

**Tamanho:** ~1000 linhas

**Estrutura:**
```
1. IDENTIDADE DA ANA CLARA
   - Nome, emoji, personalidade, tom

2. SOBRE O SISTEMA
   - O que faz, onde funciona

3. REGRAS DE HUMANIZAÇÃO
   - Usar nome do usuário, variar respostas

4. CONTEXTO TEMPORAL
   - Data/hora atual

5. CONTAS BANCÁRIAS DO USUÁRIO
   - Lista dinâmica do banco

6. CONTAS A PAGAR DO USUÁRIO
   - Lista dinâmica do banco

7. HISTÓRICO DA CONVERSA
   - Últimas 8 mensagens

8. MEMÓRIA DO USUÁRIO
   - Gírias personalizadas

9. INTENÇÕES POSSÍVEIS (40+)
   - Transações, consultas, cartão, contas a pagar, social

10. GÍRIAS BRASILEIRAS
    - Dinheiro, ações, bancos, comida

11. CATEGORIAS DISPONÍVEIS
    - Lista dinâmica do banco

12. REGRAS DE CATEGORIZAÇÃO
    - Interpretar contexto, não apenas palavras-chave

13. INTERPRETAÇÃO DE DATAS
    - hoje, ontem, semana passada

14. REGRAS CRÍTICAS
    - Sempre extrair valor, sugerir categoria

15. FORMATO DE RESPOSTA
    - Formatação WhatsApp

16. EXEMPLOS DE CLASSIFICAÇÃO
    - 10+ exemplos de input/output
```

### 5.2 Prompt de Cartão de Crédito

**Arquivo:** `cartao-credito.ts` função `classificarIntencaoCartaoIA()`

**Tamanho:** ~50 linhas

**Estrutura:**
```
1. CARTÕES DO USUÁRIO
   - Lista dinâmica

2. ALIASES CONHECIDOS
   - nubank = roxinho, itau = personnalite

3. CATEGORIAS DE GASTOS
   - Alimentação, Transporte, etc.

4. INTENÇÕES POSSÍVEIS (8)
   - CONSULTAR_FATURA, LISTAR_COMPRAS, etc.

5. REGRAS IMPORTANTES
   - Mapear aliases, extrair mês, período

6. FORMATO DE RESPOSTA
   - JSON específico
```

---

## 6. ANTI-ALUCINAÇÃO

### Validações Implementadas:

| Validação | Arquivo | Status |
|-----------|---------|--------|
| Validação estrutural de entidades | `nlp-validator.ts` | ✅ Implementado |
| Validação de valor (NaN, range) | `nlp-validator.ts` | ✅ Implementado |
| Validação de cartão extraído | `cartao-credito.ts` | ✅ Implementado |
| Busca fuzzy de cartão | `cartao-credito.ts` | ✅ Implementado |
| Correção conta vs conta_bancaria | `nlp-classifier.ts` | ✅ Implementado |
| Pré-processamento de conta a pagar | `nlp-classifier.ts` | ✅ Implementado |

### Sistema de 3 Camadas (Cartão):

```
CAMADA 1: GPT-4 Inteligente
    │
    ▼
CAMADA 2: Validação Anti-Alucinação
    │ - Verifica se cartão existe na lista do usuário
    │ - Rejeita se GPT inventou cartão
    │
    ▼
CAMADA 3: Busca Fuzzy
    │ - Se validação falhou, tenta match aproximado
    │ - "roxinho" → "Nubank"
    │
    ▼
RESULTADO VALIDADO
```

### Fallbacks Implementados:

| Situação | Fallback |
|----------|----------|
| API Key não configurada | `fallbackClassificacao()` - regex |
| Erro na API OpenAI | `fallbackClassificacao()` - regex |
| Resposta sem function_call | `fallbackClassificacao()` - regex |
| Confiança < 0.6 | Pede clarificação ao usuário |
| Categoria não encontrada | "Outros" |
| Cartão não encontrado | Busca fuzzy → null |

### Correção de Entidades:

```typescript
// nlp-classifier.ts - corrigirEntidadesContaBancaria()
// Corrige quando GPT confunde conta a pagar com conta bancária
// "paguei a academia no Itau" → conta="academia", conta_bancaria="itau"
```

---

## 7. CÓDIGO PROBLEMÁTICO ENCONTRADO

### 7.1 Categoria do GPT-4 IGNORADA

```typescript
// transaction-mapper.ts linhas 1035-1040
// ⚠️ NÃO incluir entidades.categoria aqui!
// O NLP pode errar a categoria e contaminar a detecção por palavra-chave
const textosParaAnalisar = [
  intencao.comando_original,
  descricao,
  // ❌ REMOVIDO: entidades.categoria (causava bug quando NLP errava)
];
```

**Impacto:** Categorização semântica perdida. Ex: "hotel" → GPT sabe que é "Viagens", mas mapeamento por keyword pode não ter.

### 7.2 Código Duplicado

```typescript
// nlp-processor.ts - classificarIntencaoInteligente() 
// nlp-classifier.ts - classificarIntencaoNLP()
// DOIS classificadores fazendo a mesma coisa!
```

**Impacto:** Manutenção duplicada, possível divergência de comportamento.

### 7.3 Comentários de Remoção

```typescript
// index.ts linha 693-698
// ⚠️ REMOVIDO: O handler de regex estava interceptando ANTES do NLP
// Código antigo removido em 08/12/2025

// index.ts linha 821-824
// ⚠️ REMOVIDO em 13/12/2025: O bypass estava interceptando consultas

// index.ts linha 834-844
// ⚠️ REMOVIDO em 08/12/2025: O handler de analytics estava interceptando
```

**Observação:** Código foi removido corretamente, comentários documentam decisões.

### 7.4 TODO Pendente

```typescript
// context-manager.ts linha 779
// TODO: Implementar consulta de limite
return `💳 *${cartaoNome}*\n\n⚠️ Consulta de limite ainda não implementada.`;
```

---

## 8. DIAGRAMA DO FLUXO NLP COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WEBHOOK WHATSAPP                                │
│                      (process-whatsapp-message)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      TIPO DE MENSAGEM?                                  │
└─────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │  TEXTO  │          │  ÁUDIO  │          │ IMAGEM  │
    └─────────┘          └─────────┘          └─────────┘
          │                    │                    │
          │                    ▼                    ▼
          │            ┌─────────────┐      ┌─────────────┐
          │            │  WHISPER    │      │ GPT-4 VISION│
          │            │ (transcrição)│      │   (OCR)     │
          │            └─────────────┘      └─────────────┘
          │                    │                    │
          └────────────────────┴────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMANDOS RÁPIDOS (BYPASS NLP)                        │
│  /saldo, /ajuda, /contas, etc.                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                         (se não for comando rápido)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRÉ-PROCESSAMENTO                                    │
│  - Detecta padrões de conta a pagar                                     │
│  - Pode forçar intenção CADASTRAR_CONTA_PAGAR                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BUSCA DE CONTEXTO (PARALELO)                         │
│  - Memória do usuário                                                   │
│  - Histórico de conversa (8 msgs)                                       │
│  - Contas bancárias                                                     │
│  - Categorias                                                           │
│  - Nome do usuário                                                      │
│  - Contas a pagar                                                       │
│  - Configuração de IA                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GPT-4 CLASSIFICAÇÃO                                  │
│  Modelo: gpt-4o-mini (ou configurado)                                   │
│  Temperature: 0.3                                                       │
│  Function Calling: classificar_comando                                  │
│                                                                         │
│  OUTPUT:                                                                │
│  - intencao (40+ tipos)                                                 │
│  - confianca (0-1)                                                      │
│  - entidades (valor, categoria, descrição, conta, etc.)                 │
│  - resposta_conversacional                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    VALIDAÇÃO DE ENTIDADES                               │
│  - Remove NaN, valores negativos                                        │
│  - Valida estrutura                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONFIANÇA < 0.6?                                     │
│  SIM → Pede clarificação ao usuário                                     │
│  NÃO → Continua processamento                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ROTEAMENTO POR INTENÇÃO                              │
└─────────────────────────────────────────────────────────────────────────┘
     │           │           │           │           │
     ▼           ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│TRANSAÇÃO│ │CONSULTA │ │ CARTÃO  │ │ CONTAS  │ │ SOCIAL  │
│         │ │         │ │         │ │ A PAGAR │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
     │           │           │           │           │
     ▼           ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│context- │ │consultas│ │cartao-  │ │contas-  │ │templates│
│manager  │ │.ts      │ │credito  │ │pagar.ts │ │         │
│.ts      │ │         │ │.ts      │ │         │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ GPT-4 ADICIONAL │
                    │ (classificação  │
                    │  de cartão)     │
                    └─────────────────┘
```

---

## 9. RECOMENDAÇÕES

### 🔴 CRÍTICO

1. **Unificar uso da categoria do GPT-4**
   - `transaction-mapper.ts` deve usar `entidades.categoria` como PRIORIDADE 1
   - Mapeamento por keyword como PRIORIDADE 2 (fallback)
   - Isso já funciona em `context-manager.ts`

2. **Remover código duplicado**
   - Deprecar `nlp-processor.ts` → `classificarIntencaoInteligente()`
   - Usar apenas `nlp-classifier.ts` → `classificarIntencaoNLP()`

### 🟡 IMPORTANTE

3. **Integrar classificador de cartão**
   - Considerar adicionar intenções de cartão ao classificador principal
   - Evitar 2 chamadas GPT-4 para mensagens de cartão

4. **Implementar consulta de limite**
   - TODO pendente em `context-manager.ts` linha 779

5. **Adicionar métricas de uso**
   - Logar qual método de categorização foi usado
   - Medir taxa de fallback para "Outros"

### 🟢 MELHORIAS

6. **Cache de contexto**
   - Histórico de conversa e contas podem ser cacheados por 5 minutos

7. **Prompt mais enxuto**
   - 1000 linhas de prompt pode ser otimizado
   - Separar exemplos em poucos mais relevantes

8. **Testes automatizados**
   - Criar suite de testes para classificação
   - Testar edge cases de categorização

---

## 10. MÉTRICAS DE CUSTO

### Estimativa Mensal (100 usuários, 50 msgs/dia cada):

| Item | Cálculo | Custo |
|------|---------|-------|
| Chamadas texto | 100 × 50 × 30 × $0.002 | $300/mês |
| Chamadas cartão (10%) | 15.000 × $0.002 | $30/mês |
| Chamadas imagem (5%) | 7.500 × $0.015 | $112/mês |
| **TOTAL** | | **~$442/mês** |

### Otimizações possíveis:

| Otimização | Economia |
|------------|----------|
| Integrar classificador de cartão | -$30/mês |
| Cache de contexto | -10% tokens |
| Prompt mais enxuto | -20% tokens |

---

**Documento gerado automaticamente pela Auditoria de Arquitetura - Sessão 2**
