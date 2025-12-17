# AUDITORIA PARTE 4: HISTÓRICO DE PROBLEMAS E BUGS

**Gerado em:** 16/12/2025  
**Projeto:** Personal Finance LA  
**Fonte:** Análise de código, comentários BUG #X, memórias do sistema

---

## 1. BUGS DOCUMENTADOS NO CÓDIGO (BUG #X)

### 1.1 Lista Completa de Bugs Identificados

| Bug # | Descrição | Arquivo | Status |
|-------|-----------|---------|--------|
| **BUG #10** | NLP não extraía `forma_pagamento` do texto | `transaction-mapper.ts:905` | ✅ Corrigido |
| **BUG #13** | Ambiguidade "paguei com [banco]" sem método explícito | `index.ts:991` | ✅ Corrigido |
| **BUG #14** | Banco não era preservado no contexto | `transaction-mapper.ts:969` | ✅ Corrigido |
| **BUG #16** | NLP retornava banco como "cartao" em vez de "conta" | `index.ts:1022` | ✅ Corrigido |
| **BUG #17** | NLP inventava descrições que não existiam no texto | `transaction-mapper.ts:883` | ✅ Corrigido |
| **BUG #18** | Sistema confundia nova transação com resposta ao contexto | `context-manager.ts:1860` | ✅ Corrigido |
| **BUG #19** | Categoria mencionada explicitamente era removida | `nlp-validator.ts:51` | ✅ Corrigido |
| **BUG #21** | Transferências não tinham handler dedicado | `transaction-mapper.ts:1192` | ✅ Corrigido |

### 1.2 Detalhamento dos Bugs

#### BUG #10 - Fallback de Forma de Pagamento
```
Problema: NLP não extraía forma_pagamento quando usuário dizia "no pix", "no débito"
Solução: Fallback para detectar forma_pagamento ANTES de verificar método
Arquivo: transaction-mapper.ts:905-920
```

#### BUG #13 + #16 - Ambiguidade Banco vs Cartão
```
Problema: "Paguei 50 no Itaú" → NLP não sabia se era débito ou crédito
Solução: Detectar ambiguidade e perguntar método antes de processar
Arquivo: index.ts:988-1042
```

#### BUG #14 - Banco Perdido no Contexto
```
Problema: Ao perguntar método, o banco era perdido do contexto
Solução: Preservar entidades.conta no context_data
Arquivo: transaction-mapper.ts:969
```

#### BUG #17 - Descrição Alucinada pelo NLP
```
Problema: NLP inventava descrições como "Uber", "iFood" que não estavam no texto
Solução: Validar descrição contra texto original antes de usar
Arquivos: transaction-mapper.ts:883-898, nlp-validator.ts
```

#### BUG #18 - Confusão Nova Transação vs Resposta
```
Problema: "Comprei um lanche e paguei no pix" era tratado como resposta ao contexto
Solução: Função pareceNovaTransacao() detecta padrão de nova transação
Arquivo: context-manager.ts:1860-1865, shared/context-detector.ts
```

#### BUG #19 - Categoria Explícita Removida
```
Problema: Se usuário dizia "gastei 50 em alimentação", a categoria era removida
Solução: Verificar se nome da categoria está explícito no texto antes de remover
Arquivo: nlp-validator.ts:51-54
```

#### BUG #21 - Handler de Transferência
```
Problema: Transferências não tinham fluxo dedicado, eram tratadas como despesa
Solução: Handler processarIntencaoTransferencia() com template próprio
Arquivo: transaction-mapper.ts:1192-1330, response-templates.ts:356
```

---

## 2. BUGS CORRIGIDOS (MEMÓRIAS DO SISTEMA)

### 2.1 Sessão NLP-First (08/12/2025)

| Versão | Bug | Correção |
|--------|-----|----------|
| **v188** | `detectarIntencaoConsulta` capturava pontuação | Removido completamente |
| **v189** | `isAnalyticsQuery()` interceptava consultas de saldo | Removido |
| **v190** | Handler CONSULTAR_SALDO ignorava filtro de conta | Usa `consultarSaldoEspecifico()` |
| **v191** | NLP não extraía banco do texto | Fallback detecta bancos por alias |

### 2.2 FASE 1 (15/11/2025)

| Problema | Solução |
|----------|---------|
| **NaN em valores de transação** | Validação regex + `Number.isNaN` + range em `applyIntent` |
| **Detecção de transações limitada** | Keywords expandidas de 15 para 35+ termos |
| **LLM inconsistente** | Temperature reduzida para 0.1 |

### 2.3 FASE 2 (15/11/2025)

| Problema | Solução |
|----------|---------|
| **Botões interativos não funcionavam** | Removidos completamente, sistema 100% conversacional |
| **Conta não detectada** | `detectAccountFromMessage()` com keywords |
| **Código legado** | Removido `sendInteractiveButtons()` e `handleButtonClick()` |

### 2.4 FASE 3.2 - Contas a Pagar

| Versão | Bug | Correção |
|--------|-----|----------|
| **v246** | bill_type não mapeava corretamente | `mapearBillTypeParaBanco()` |
| **v248** | Recorrência não detectada | Detecta `dados.recorrencia === 'mensal'` |

---

## 3. CATEGORIZAÇÃO DOS PROBLEMAS

### 3.1 PROBLEMAS DE NLP (40% dos bugs)

| Tipo | Frequência | Impacto | Exemplos |
|------|------------|---------|----------|
| **Alucinação de descrição** | Alta | Alto | NLP inventa "Uber" quando não está no texto |
| **Alucinação de categoria** | Alta | Médio | NLP categoriza errado baseado em inferência |
| **Alucinação de valor** | Média | Alto | NLP extrai número de parcela como valor |
| **Alucinação de dia** | Média | Médio | NLP inventa dia de vencimento |
| **Confusão conta vs cartão** | Alta | Alto | "Itaú" pode ser conta ou cartão |
| **Confusão conta bancária vs a pagar** | Alta | Alto | "paguei a academia" → conta="academia" |
| **Intent errado** | Média | Alto | COMPRA_CARTAO vs CADASTRAR_CONTA_PAGAR |

### 3.2 PROBLEMAS DE LÓGICA (30% dos bugs)

| Tipo | Frequência | Impacto | Exemplos |
|------|------------|---------|----------|
| **Contexto perdido** | Alta | Alto | Banco perdido ao perguntar método |
| **Fluxo interrompido** | Média | Alto | Nova transação confundida com resposta |
| **Estado inconsistente** | Média | Médio | Contexto expirado mas dados pendentes |
| **Regex capturando errado** | Média | Médio | Pontuação incluída na extração |

### 3.3 PROBLEMAS DE INTEGRAÇÃO (20% dos bugs)

| Tipo | Frequência | Impacto | Exemplos |
|------|------------|---------|----------|
| **Timeout OpenAI** | Baixa | Alto | analytics-query tem timeout de 10s |
| **Rate limit** | Baixa | Médio | Depende do plano |
| **UAZAPI indisponível** | Rara | Alto | Mensagens não enviadas |
| **Transcrição de áudio** | Média | Médio | Whisper falha com ruído |

### 3.4 PROBLEMAS DE BANCO (10% dos bugs)

| Tipo | Frequência | Impacto | Exemplos |
|------|------------|---------|----------|
| **Constraint violada** | Rara | Alto | bill_type inválido |
| **RLS bloqueando** | Rara | Alto | Usuário sem permissão |
| **Coluna faltando** | Rara | Alto | Migração não aplicada |

---

## 4. ARQUIVOS COM MAIS BUGS

### 4.1 Ranking por `console.error`

| # | Arquivo | Erros | Responsabilidade |
|---|---------|-------|------------------|
| 1 | `context-manager.ts` | 21 | Gerenciamento de contexto |
| 2 | `contas-pagar.ts` | 18 | Contas a pagar |
| 3 | `command-handlers.ts` | 12 | Handlers de comandos |
| 4 | `analytics-query/index.ts` | 11 | Consultas analíticas |
| 5 | `cartao-credito.ts` | 9 | Cartões de crédito |
| 6 | `nlp-classifier.ts` | 9 | Classificação NLP |
| 7 | `transaction-mapper.ts` | 9 | Mapeamento de transações |
| 8 | `webhook-uazapi/index.ts` | 9 | Webhook UAZAPI |

### 4.2 Ranking por BUG/FIX/TODO

| # | Arquivo | Marcações | Tipo Principal |
|---|---------|-----------|----------------|
| 1 | `context-manager.ts` | 89 | Fluxos multi-step |
| 2 | `contas-pagar.ts` | 87 | Validação de dados |
| 3 | `consultas.ts` | 76 | Consultas complexas |
| 4 | `index.ts` | 37 | Roteamento de intents |
| 5 | `transaction-mapper.ts` | 35 | Mapeamento de transações |
| 6 | `nlp-classifier.ts` | 27 | Classificação NLP |

---

## 5. PADRÕES IDENTIFICADOS

### 5.1 Padrão 1: Alucinação do NLP

**Problema recorrente:** NLP (GPT-4) inventa dados que não existem no texto original.

**Manifestações:**
- Descrição inventada (BUG #17)
- Categoria inferida incorretamente
- Dia de vencimento inventado
- Valor confundido com número de parcela

**Solução implementada:**
```typescript
// nlp-validator.ts
export function validarEntidadesNLP(entidades, textoOriginal) {
  // Valida descrição contra texto original
  // Remove se não encontrar
}
```

**Arquitetura de 3 camadas (anti-alucinação):**
1. **Camada 1:** GPT-4 extrai (pode alucinar)
2. **Camada 2:** Validação contra texto original
3. **Camada 3:** Busca fuzzy como fallback

### 5.2 Padrão 2: Ambiguidade de Entidades

**Problema recorrente:** Mesma palavra pode significar coisas diferentes.

| Palavra | Pode ser |
|---------|----------|
| "Itaú" | Conta bancária OU Cartão de crédito |
| "conta" | Conta bancária OU Conta a pagar |
| "paguei" | Despesa OU Marcar conta como paga |
| "fatura" | Fatura de cartão OU Conta a pagar |

**Solução implementada:**
- Intents de desambiguação: `CONTAS_AMBIGUO`, `CADASTRAR_CONTA_AMBIGUO`
- Pré-processamento com regras específicas
- Perguntas de clarificação ao usuário

### 5.3 Padrão 3: Contexto Perdido

**Problema recorrente:** Dados são perdidos entre etapas do fluxo.

**Manifestações:**
- Banco perdido ao perguntar método (BUG #14)
- Valor perdido ao perguntar conta
- Descrição perdida ao perguntar categoria

**Solução implementada:**
```typescript
// Preservar TODAS as entidades no contexto
await salvarContexto(userId, 'creating_transaction', {
  step: 'awaiting_payment_method',
  current_data: {
    valor: entidades.valor,
    descricao: entidades.descricao,
    conta: entidades.conta, // ✅ BUG #14: Preservar!
  }
});
```

### 5.4 Padrão 4: Regex vs NLP

**Problema recorrente:** Regex e NLP competem pela mesma extração.

**Regra de ouro estabelecida:**
> NUNCA usar regex para extrair o que o NLP já extraiu. Fallback só quando NLP falha.

**Bugs causados por violação:**
- v188: `detectarIntencaoConsulta` capturava pontuação
- v189: `isAnalyticsQuery()` interceptava consultas de saldo

---

## 6. MENSAGENS QUE CAUSAM MAIS PROBLEMAS

### 6.1 Mensagens Ambíguas

| Mensagem | Problema | Solução |
|----------|----------|---------|
| "minhas contas" | Bancárias ou a pagar? | Intent CONTAS_AMBIGUO |
| "paguei a luz" | Despesa ou marcar paga? | Regra MARCAR_CONTA_PAGA |
| "cadastrar conta" | Bancária ou a pagar? | Intent CADASTRAR_CONTA_AMBIGUO |
| "fatura do Nubank" | Cartão ou conta? | Prioriza cartão |

### 6.2 Mensagens com Números Confusos

| Mensagem | Problema | Solução |
|----------|----------|---------|
| "TV parcela 3 de 10" | Valor=10 ou parcelas=10? | Detectar padrão "X de Y" |
| "parcela 15 de 10" | Parcela atual > total? | Validação de parcelas |
| "água 15" | R$15 ou dia 15? | Contexto determina |

### 6.3 Mensagens com Bancos

| Mensagem | Problema | Solução |
|----------|----------|---------|
| "paguei 50 no Itaú" | Débito ou crédito? | Perguntar método |
| "gastei no roxinho" | Alias não reconhecido | Fallback de aliases |
| "paguei a academia no Itaú" | conta="academia" errado | Correção de entidades |

---

## 7. CORRELAÇÃO ENTRE PROBLEMAS

### 7.1 Cadeia de Bugs

```
BUG #17 (descrição alucinada)
    ↓
BUG #19 (categoria removida indevidamente)
    ↓
Transação sem categoria
    ↓
Fallback para "Outros"
```

```
BUG #13 (ambiguidade banco)
    ↓
BUG #14 (banco perdido no contexto)
    ↓
BUG #16 (banco como "cartao")
    ↓
Transação na conta errada
```

### 7.2 Módulos Interdependentes

```
nlp-classifier.ts
    ↓ (entidades)
transaction-mapper.ts
    ↓ (validação)
context-manager.ts
    ↓ (fluxo)
index.ts (handler)
```

**Impacto:** Bug em `nlp-classifier.ts` propaga para todos os outros.

---

## 8. PONTOS DE FALHA CONHECIDOS (NÃO CORRIGIDOS)

### 8.1 Casos Edge Não Tratados

| Caso | Status | Risco |
|------|--------|-------|
| Múltiplas transações em uma mensagem | ❌ Não tratado | Médio |
| Correção de múltiplos campos | ❌ Não tratado | Baixo |
| Valores em dólar/euro | ⚠️ Parcial | Baixo |
| Datas relativas complexas | ⚠️ Parcial | Médio |
| Áudio com muito ruído | ⚠️ Parcial | Médio |
| Imagem ilegível | ⚠️ Parcial | Baixo |

### 8.2 Limitações Conhecidas

| Limitação | Impacto | Workaround |
|-----------|---------|------------|
| Timeout Edge Function (60s) | Alto | Dividir operações |
| Context TTL (60min) | Médio | Aumentado de 15min |
| Rate limit OpenAI | Médio | Fallback de classificação |
| Tamanho do prompt (~800 linhas) | Médio | Nenhum |

---

## 9. RECOMENDAÇÕES

### 9.1 Prioridade Alta

1. **Monitoramento de alucinações**
   - Criar métricas de quantas vezes `nlp-validator.ts` remove entidades
   - Alertar quando taxa > 20%

2. **Testes automatizados de NLP**
   - Suite de testes com mensagens problemáticas conhecidas
   - Rodar antes de cada deploy

3. **Logging estruturado**
   - Padronizar logs para análise posterior
   - Incluir `user_id`, `intent`, `entidades`, `correcoes`

### 9.2 Prioridade Média

4. **Dividir prompt do NLP**
   - Modularizar as ~800 linhas
   - Facilitar manutenção

5. **Versionar prompt**
   - Controle de versão para rollback
   - A/B testing de prompts

6. **Melhorar fallbacks**
   - Fallback mais inteligente quando NLP falha
   - Usar histórico do usuário

### 9.3 Prioridade Baixa

7. **Múltiplas transações**
   - Implementar parsing de múltiplas transações
   - "Gastei 50 no mercado e 30 no Uber"

8. **Correção em lote**
   - Permitir corrigir múltiplos campos de uma vez
   - "Era 95 no Nubank em Alimentação"

---

## 10. ESTATÍSTICAS FINAIS

| Métrica | Valor |
|---------|-------|
| **Bugs documentados (BUG #X)** | 8 |
| **Bugs corrigidos (memórias)** | 15+ |
| **Arquivos com mais erros** | context-manager.ts (21) |
| **Padrões identificados** | 4 |
| **Casos edge não tratados** | 6 |
| **Categoria mais problemática** | NLP (40%) |
| **Módulo mais crítico** | nlp-classifier.ts |

---

## 11. LINHA DO TEMPO DE CORREÇÕES

```
15/11/2025 - FASE 1
├── NaN em valores eliminado
├── Keywords expandidas (15 → 35+)
└── Temperature LLM reduzida (0.1)

15/11/2025 - FASE 2
├── Botões removidos (100% conversacional)
├── detectAccountFromMessage() implementado
└── Código legado removido

08/12/2025 - NLP-First
├── v188: detectarIntencaoConsulta removido
├── v189: isAnalyticsQuery() removido
├── v190: consultarSaldoEspecifico() implementado
└── v191: Fallback de bancos por alias

11/12/2025 - FASE 3.3
├── Integração faturas x contas a pagar
├── Função get_contas_consolidadas
└── Handlers de contexto para faturas

16/12/2025 - Atual
├── 47 intents implementados
├── 25 tipos de contexto
├── Arquitetura 3 camadas anti-alucinação
└── Sistema estável
```

---

*Gerado automaticamente em 16/12/2025 via análise de código e memórias do sistema*
