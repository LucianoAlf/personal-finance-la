# AUDITORIA PARTE 3: SISTEMA NLP

**Gerado em:** 16/12/2025  
**Projeto:** Personal Finance LA  
**Arquivo Principal:** `supabase/functions/process-whatsapp-message/nlp-classifier.ts`

---

## 1. PROMPT PRINCIPAL DO NLP

### 1.1 Localização

| Item | Valor |
|------|-------|
| **Arquivo** | `supabase/functions/process-whatsapp-message/nlp-classifier.ts` |
| **Função** | `gerarSystemPrompt()` |
| **Linhas** | 227-1031 (~800 linhas de prompt) |
| **Tipo** | **DINÂMICO** - construído em runtime |

### 1.2 Estrutura do Prompt

O prompt é **dinâmico** e construído com os seguintes parâmetros:

```typescript
function gerarSystemPrompt(
  memoriaUsuario: string,      // Gírias e preferências aprendidas
  historicoConversa: string,   // Últimas 8 mensagens
  dataHoraAtual: string,       // Data/hora atual formatada
  contasDisponiveis: string,   // Contas bancárias do usuário
  categoriasDisponiveis: string, // Categorias do banco de dados
  nomeUsuario?: string,        // Nome do usuário para personalização
  contasAPagar?: string        // Contas a pagar pendentes
): string
```

### 1.3 Seções do Prompt (em ordem)

1. **Identidade da Ana Clara** (linhas 238-246)
   - Nome, emoji, personalidade, tom, assinatura

2. **Sobre o Sistema** (linhas 248-266)
   - O que a Ana Clara faz
   - Onde funciona (WhatsApp + Dashboard)

3. **Regras de Humanização** (linhas 267-277)
   - Usar nome do usuário
   - Variar respostas
   - Emojis com moderação

4. **Contexto Temporal** (linha 279)
   - Data/hora atual injetada

5. **Dados do Usuário** (linhas 281-292)
   - Nome, contas bancárias, contas a pagar

6. **Histórico de Conversa** (linhas 293-314)
   - Últimas 8 mensagens
   - Regras para usar o histórico

7. **Memória do Usuário** (linhas 316-318)
   - Gírias e preferências aprendidas

8. **Intenções Possíveis** (linhas 321-576)
   - 40+ intents documentados com exemplos
   - Regras de desambiguação

9. **Gírias Brasileiras** (linhas 616-641)
   - Dinheiro: conto, pila, mango
   - Bancos: roxinho, laranjinha
   - Ações: torrei, queimei

10. **Normalização de Entidades** (linhas 643-693)
    - Bancos → lowercase
    - Períodos → formato padrão
    - Métodos de pagamento

11. **Métodos de Pagamento** (linhas 697-753)
    - pix, débito, crédito, boleto, dinheiro

12. **Agrupamentos** (linhas 757-791)
    - por categoria, conta, cartão, método, dia

13. **Modo de Visualização** (linhas 795-807)
    - detalhado vs resumo

14. **Categorias Disponíveis** (linhas 823-847)
    - Injetadas do banco de dados
    - Regras de categorização inteligente

15. **Interpretação de Datas** (linhas 850-859)
    - agora, hoje, ontem, dia X

16. **Contexto de Conversa** (linhas 862-868)
    - Como usar histórico para completar fluxos

17. **Regras Críticas** (linhas 871-882)
    - Sempre extrair valor
    - Nunca inventar conta
    - Ignorar xingamentos

18. **Formato de Resposta** (linhas 885-916)
    - Formatação WhatsApp
    - Exemplos bons e ruins

19. **Exemplos de Classificação** (linhas 919-1031)
    - 10+ exemplos completos com JSON

### 1.4 Contexto Usado

| Contexto | Fonte | Atualização |
|----------|-------|-------------|
| **Histórico de conversa** | `whatsapp_messages` | Últimas 8 mensagens |
| **Contas bancárias** | `accounts` | Tempo real |
| **Contas a pagar** | `payable_bills` | Tempo real |
| **Categorias** | `categories` | Tempo real |
| **Memória/Gírias** | `user_memory` | Tempo real |
| **Nome do usuário** | `users` | Tempo real |
| **Data/hora** | Sistema | Tempo real |

---

## 2. LISTA COMPLETA DE INTENTS

### 2.1 Intents Definidos no Schema (40 intents)

| # | Intent | Descrição | Exemplo de Mensagem |
|---|--------|-----------|---------------------|
| 1 | `REGISTRAR_RECEITA` | Registrar entrada de dinheiro | "Recebi 5000 de salário" |
| 2 | `REGISTRAR_DESPESA` | Registrar gasto avulso | "Gastei 50 no mercado" |
| 3 | `REGISTRAR_TRANSFERENCIA` | Transferir entre contas | "Transferi 1000 do Itaú pro Nubank" |
| 4 | `CONSULTAR_SALDO` | Ver saldo das contas | "Qual meu saldo?" |
| 5 | `CONSULTAR_EXTRATO` | Ver últimas transações | "Extrato do Nubank" |
| 6 | `CONSULTAR_GASTOS` | Ver despesas | "Quanto gastei esse mês?" |
| 7 | `CONSULTAR_RECEITAS` | Ver receitas | "Quanto recebi?" |
| 8 | `RELATORIO_DIARIO` | Resumo do dia | "Resumo de hoje" |
| 9 | `RELATORIO_SEMANAL` | Resumo da semana | "Resumo da semana" |
| 10 | `RELATORIO_MENSAL` | Resumo do mês | "Resumo do mês" |
| 11 | `CONSULTAR_METAS` | Ver status das metas | "Como estão minhas metas?" |
| 12 | `CRIAR_META` | Criar nova meta | "Quero criar uma meta" |
| 13 | `CRIAR_LEMBRETE` | Criar lembrete | "Me lembra de pagar a luz" |
| 14 | `EDITAR_VALOR` | Corrigir valor | "Era 95" |
| 15 | `EDITAR_CONTA` | Mudar conta | "Muda pra Nubank" |
| 16 | `EDITAR_CATEGORIA` | Mudar categoria | "Era alimentação" |
| 17 | `EXCLUIR_TRANSACAO` | Excluir transação | "Exclui essa" |
| 18 | `LISTAR_CONTAS` | Listar contas bancárias | "Meus bancos" |
| 19 | `LISTAR_CATEGORIAS` | Listar categorias | "Quais categorias?" |
| 20 | `MUDAR_CONTA` | Sinônimo de EDITAR_CONTA | "Troca pra Inter" |
| 21 | `SELECIONAR_CONTA` | Responder qual conta | "Nubank" (após pergunta) |
| 22 | `COMPRA_CARTAO` | Compra no cartão à vista | "Gastei 100 no cartão Nubank" |
| 23 | `COMPRA_PARCELADA` | Compra parcelada | "Comprei TV em 10x" |
| 24 | `CONSULTAR_FATURA` | Ver fatura do cartão | "Fatura do Nubank" |
| 25 | `CONSULTAR_FATURA_VENCIDA` | Ver faturas atrasadas | "Tenho fatura vencida?" |
| 26 | `CONSULTAR_LIMITE` | Ver limite disponível | "Limite do cartão" |
| 27 | `LISTAR_CARTOES` | Ver cartões cadastrados | "Meus cartões" |
| 28 | `PAGAR_FATURA` | Pagar fatura do cartão | "Paguei a fatura do Nubank" |
| 29 | `LISTAR_CONTAS_PAGAR` | Ver contas a pagar | "Minhas contas a pagar" |
| 30 | `CONTAS_VENCENDO` | Próximos vencimentos | "O que vence essa semana?" |
| 31 | `CONTAS_VENCIDAS` | Contas em atraso | "Contas vencidas" |
| 32 | `CONTAS_DO_MES` | Contas do mês | "Contas de dezembro" |
| 33 | `RESUMO_CONTAS_MES` | Total de contas | "Quanto tenho de contas?" |
| 34 | `CADASTRAR_CONTA_PAGAR` | Cadastrar conta a pagar | "Netflix 55 dia 17" |
| 35 | `EDITAR_CONTA_PAGAR` | Editar conta a pagar | "Mudar valor da luz" |
| 36 | `EXCLUIR_CONTA_PAGAR` | Excluir conta a pagar | "Excluir netflix" |
| 37 | `MARCAR_CONTA_PAGA` | Marcar como paga | "Paguei a luz" |
| 38 | `VALOR_CONTA_VARIAVEL` | Informar valor variável | "Luz veio 190" |
| 39 | `HISTORICO_CONTA` | Ver histórico de pagamentos | "Histórico da luz" |
| 40 | `PAGAR_FATURA_CARTAO` | Pagar fatura (contas) | "Paguei a fatura do Nubank" |
| 41 | `DESFAZER_PAGAMENTO` | Estornar pagamento | "Desfazer pagamento da luz" |
| 42 | `RESUMO_PAGAMENTOS_MES` | Ver pagamentos do mês | "O que paguei esse mês?" |
| 43 | `CONTAS_AMBIGUO` | "Minhas contas" ambíguo | "Minhas contas" |
| 44 | `SAUDACAO` | Cumprimento | "Oi Ana" |
| 45 | `AJUDA` | Pedir ajuda | "Me ajuda" |
| 46 | `AGRADECIMENTO` | Agradecer | "Obrigado" |
| 47 | `OUTRO` | Fora do escopo | "Qual a capital do Brasil?" |

### 2.2 Categorização de Intents

| Categoria | Intents |
|-----------|---------|
| **Transações** | REGISTRAR_RECEITA, REGISTRAR_DESPESA, REGISTRAR_TRANSFERENCIA |
| **Consultas** | CONSULTAR_SALDO, CONSULTAR_EXTRATO, CONSULTAR_GASTOS, CONSULTAR_RECEITAS |
| **Relatórios** | RELATORIO_DIARIO, RELATORIO_SEMANAL, RELATORIO_MENSAL |
| **Edições** | EDITAR_VALOR, EDITAR_CONTA, EDITAR_CATEGORIA, MUDAR_CONTA |
| **Exclusões** | EXCLUIR_TRANSACAO, EXCLUIR_CONTA_PAGAR |
| **Cartão de Crédito** | COMPRA_CARTAO, COMPRA_PARCELADA, CONSULTAR_FATURA, CONSULTAR_FATURA_VENCIDA, CONSULTAR_LIMITE, LISTAR_CARTOES, PAGAR_FATURA |
| **Contas a Pagar** | LISTAR_CONTAS_PAGAR, CONTAS_VENCENDO, CONTAS_VENCIDAS, CONTAS_DO_MES, RESUMO_CONTAS_MES, CADASTRAR_CONTA_PAGAR, EDITAR_CONTA_PAGAR, MARCAR_CONTA_PAGA, VALOR_CONTA_VARIAVEL, HISTORICO_CONTA, PAGAR_FATURA_CARTAO, DESFAZER_PAGAMENTO, RESUMO_PAGAMENTOS_MES |
| **Listagens** | LISTAR_CONTAS, LISTAR_CATEGORIAS, LISTAR_CARTOES |
| **Metas** | CONSULTAR_METAS, CRIAR_META |
| **Contexto** | SELECIONAR_CONTA, CONTAS_AMBIGUO |
| **Social** | SAUDACAO, AJUDA, AGRADECIMENTO, OUTRO |

---

## 3. ENTIDADES EXTRAÍDAS

### 3.1 Schema de Entidades (Function Calling)

```typescript
entidades: {
  valor?: number;                    // Valor monetário
  tipo?: 'expense' | 'income' | 'transfer';
  categoria?: string;                // Nome da categoria
  descricao?: string;                // Descrição da transação
  data?: string;                     // Data (YYYY-MM-DD)
  periodo?: 'hoje' | 'ontem' | 'semana' | 'mes' | 'ano';
  conta?: string;                    // Conta bancária origem
  conta_destino?: string;            // Conta destino (transferência)
  novo_valor?: number;               // Para edição
  nova_conta?: string;               // Para edição
  nova_categoria?: string;           // Para edição
  status_pagamento?: 'paid' | 'pending';
  forma_pagamento?: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'boleto';
  cartao?: string;                   // Nome do cartão
  parcelas?: number;                 // Número de parcelas
  mes_referencia?: string;           // Mês inferido do histórico
}
```

### 3.2 Entidades por Intent

| Intent | Obrigatórias | Opcionais |
|--------|--------------|-----------|
| `REGISTRAR_DESPESA` | valor | categoria, descricao, conta, data, forma_pagamento, status_pagamento |
| `REGISTRAR_RECEITA` | valor | categoria, descricao, conta, data |
| `REGISTRAR_TRANSFERENCIA` | valor, conta | conta_destino, descricao |
| `CONSULTAR_SALDO` | - | conta |
| `CONSULTAR_GASTOS` | - | conta, periodo, categoria, forma_pagamento, agrupar_por, modo |
| `CONSULTAR_RECEITAS` | - | conta, periodo, categoria |
| `CONSULTAR_EXTRATO` | - | conta, periodo |
| `EDITAR_VALOR` | novo_valor | - |
| `EDITAR_CONTA` | nova_conta | - |
| `EDITAR_CATEGORIA` | nova_categoria | - |
| `EXCLUIR_TRANSACAO` | - | - |
| `COMPRA_CARTAO` | valor | descricao, cartao |
| `COMPRA_PARCELADA` | valor, parcelas | descricao, cartao |
| `CONSULTAR_FATURA` | - | cartao, mes_referencia |
| `CONSULTAR_LIMITE` | - | cartao |
| `PAGAR_FATURA` | - | cartao, valor |
| `CADASTRAR_CONTA_PAGAR` | - | descricao, valor, dia_vencimento, recorrencia, parcelas |
| `MARCAR_CONTA_PAGA` | conta | valor, conta_bancaria |
| `SELECIONAR_CONTA` | conta | - |
| `SAUDACAO` | - | - |
| `AJUDA` | - | - |
| `OUTRO` | - | - |

---

## 4. VALIDAÇÃO DE ENTIDADES

### 4.1 Arquivo de Validação

| Item | Valor |
|------|-------|
| **Arquivo** | `supabase/functions/shared/nlp-validator.ts` |
| **Função** | `validarEntidadesNLP()` |
| **Linhas** | 83 linhas |

### 4.2 O Que é Validado

```typescript
export function validarEntidadesNLP(
  entidades: Record<string, any>,
  textoOriginal: string
): Record<string, any>
```

**Validações realizadas:**

1. **Descrição alucinada**
   - Se descrição não está no texto original → remove
   - Lista de descrições comuns que o NLP pode inventar

2. **Categoria sem keyword**
   - Se categoria não tem keyword no texto → remove
   - Mapa de keywords por categoria

### 4.3 Correção de Entidades (Conta Bancária)

| Item | Valor |
|------|-------|
| **Arquivo** | `nlp-classifier.ts` |
| **Função** | `corrigirEntidadesContaBancaria()` |
| **Linhas** | 38-80 |

**Problema resolvido:**
- NLP confunde "conta a pagar" com "conta bancária"
- Ex: "paguei a academia no Itau" → conta="academia", conta_bancaria="itau"

### 4.4 Pré-processamento de Intenção

| Item | Valor |
|------|-------|
| **Arquivo** | `nlp-classifier.ts` |
| **Função** | `preProcessarIntencaoContaPagar()` |
| **Linhas** | 1310-1400 |

**Regras de pré-processamento:**

1. **"parcela X de Y"** → CADASTRAR_CONTA_PAGAR
2. **"Parcela de/da [item]"** → CADASTRAR_CONTA_PAGAR
3. **"cadastrar conta" ambíguo** → CADASTRAR_CONTA_AMBIGUO
4. **"dia X" + valor** → CADASTRAR_CONTA_PAGAR
5. **Assinatura conhecida + valor** → CADASTRAR_CONTA_PAGAR
6. **Conta de serviço + dia** → CADASTRAR_CONTA_PAGAR

### 4.5 O Que Acontece Quando Falta Entidade

| Cenário | Comportamento |
|---------|---------------|
| **Falta conta bancária** | Sistema pergunta "Em qual conta?" |
| **Falta valor** | Sistema pergunta "Qual o valor?" |
| **Falta categoria** | Sistema infere por palavra-chave ou usa "Outros" |
| **Falta descrição** | Sistema usa texto original como descrição |
| **Confiança < 0.6** | Sistema pede clarificação |

---

## 5. SISTEMA DE CONTEXTO

### 5.1 Tabela de Contexto

| Item | Valor |
|------|-------|
| **Tabela** | `conversation_context` |
| **Arquivo** | `context-manager.ts` |
| **TTL** | 60 minutos |

### 5.2 Estrutura do Contexto

```typescript
interface ContextoConversa {
  id: string;
  user_id: string;
  phone: string;
  context_type: ContextType;
  context_data: ContextData;
  last_interaction: string;
  expires_at: string;
}

interface ContextData {
  intencao_pendente?: IntencaoClassificada;
  transacao_id?: string;
  transacao_tipo?: 'transaction' | 'credit_card_transaction';
  step?: string;
  phone?: string;
  current_data?: Record<string, unknown>;
}
```

### 5.3 Tipos de Contexto (25 tipos)

| Categoria | Tipos |
|-----------|-------|
| **Base** | idle, editing_transaction, creating_transaction, confirming_action, multi_step_flow |
| **Seleção** | awaiting_account_type_selection, awaiting_register_account_type |
| **Contas a Pagar** | awaiting_bill_type, awaiting_bill_description, awaiting_due_day, awaiting_bill_amount, awaiting_installment_info, awaiting_average_value, awaiting_duplicate_decision, awaiting_delete_confirmation |
| **Faturas** | awaiting_invoice_due_date, awaiting_invoice_amount, awaiting_card_selection, awaiting_card_creation_confirmation, awaiting_card_limit |
| **Parcelamentos** | awaiting_installment_payment_method, awaiting_installment_card_selection |
| **Pagamentos** | awaiting_payment_value, awaiting_bill_name_for_payment, awaiting_payment_account |
| **Referência** | credit_card_context, faturas_vencidas_context |

### 5.4 Prioridade de Contextos

1. **Contextos de FLUXO** (multi-step) têm prioridade
2. **Contextos de REFERÊNCIA** (memória) são secundários

### 5.5 Como o Contexto Influencia a Classificação

1. **Histórico de conversa** é injetado no prompt (últimas 8 mensagens)
2. **Contexto ativo** é verificado ANTES da classificação NLP
3. Se há contexto ativo, a mensagem é processada no contexto (não vai para NLP)
4. **mes_referencia** pode ser inferido do histórico

---

## 6. FALLBACKS E ERROS

### 6.1 Threshold de Confiança

| Threshold | Comportamento |
|-----------|---------------|
| **< 0.6** | Pedir clarificação ao usuário |
| **0.6 - 0.8** | Processar com cautela |
| **> 0.8** | Processar normalmente |

### 6.2 Fallback de Classificação

| Item | Valor |
|------|-------|
| **Arquivo** | `nlp-classifier.ts` |
| **Função** | `fallbackClassificacao()` |
| **Linhas** | 1552-1604 |

**Quando é acionado:**
- API Key não configurada
- Erro na chamada OpenAI
- Resposta sem function_call

**O que o fallback faz:**
1. Detecta saudação por regex
2. Detecta consulta de saldo por regex
3. Detecta valor numérico (possível despesa)
4. Retorna OUTRO se nada funcionar

### 6.3 Conversa Livre

- Intent `OUTRO` captura mensagens fora do escopo
- Resposta conversacional redireciona para finanças
- Perguntas sobre o sistema ("o que você faz?") são tratadas

### 6.4 Tratamento de Erros

| Erro | Tratamento |
|------|------------|
| **OpenAI indisponível** | Usa fallback de classificação |
| **Erro de parsing JSON** | Usa fallback |
| **Contexto expirado** | Limpa contexto e processa normalmente |
| **Entidade inválida** | Remove entidade e continua |
| **Banco não encontrado** | Fallback detecta por alias |

### 6.5 Logs

- Todos os erros são logados com `console.error`
- Classificações são logadas com `console.log`
- Correções de entidades são logadas

---

## 7. PONTOS DE FALHA CONHECIDOS

### 7.1 Ambiguidade de Intent

| Mensagem | Problema | Solução Atual |
|----------|----------|---------------|
| "minhas contas" | Bancárias ou a pagar? | Intent CONTAS_AMBIGUO |
| "paguei a luz" | Despesa ou marcar paga? | Regra MARCAR_CONTA_PAGA |
| "fatura" | Cartão ou conta a pagar? | Prioriza cartão |
| "cadastrar conta" | Bancária ou a pagar? | Intent CADASTRAR_CONTA_AMBIGUO |

### 7.2 Entidades Confundidas

| Entidade | Confusão | Exemplo |
|----------|----------|---------|
| **conta** | Bancária vs a pagar | "paguei a academia no Itau" |
| **categoria** | NLP inventa | "mercado" → "Saúde" (errado) |
| **descrição** | NLP alucina | Adiciona descrição não mencionada |
| **banco** | Não extrai alias | "roxinho" não vira "nubank" |

### 7.3 Casos Edge Não Tratados

| Caso | Status |
|------|--------|
| Valores em dólar/euro | ⚠️ Parcial (detecta USD) |
| Datas relativas complexas | ⚠️ Parcial ("semana que vem") |
| Múltiplas transações em uma mensagem | ❌ Não tratado |
| Correção de múltiplos campos | ❌ Não tratado |
| Transações recorrentes automáticas | ⚠️ Parcial |

### 7.4 Mensagens que Podem Quebrar o Parser

| Mensagem | Problema |
|----------|----------|
| Emojis excessivos | Pode confundir extração |
| Texto muito longo (>500 chars) | Pode truncar |
| Caracteres especiais | Pode quebrar regex |
| Áudio com ruído | Transcrição incorreta |
| Imagem ilegível | OCR falha |

### 7.5 Bugs Conhecidos e Corrigidos

| Bug | Versão | Correção |
|-----|--------|----------|
| Regex capturava pontuação | v188 | Removido detectarIntencaoConsulta |
| isAnalyticsQuery() interceptava saldo | v189 | Removido |
| Handler ignorava filtro de conta | v190 | Usa consultarSaldoEspecifico() |
| NLP não extraía "Itaú" | v191 | Fallback detecta banco |
| TTL curto (15min) | v196 | Aumentado para 60min |
| Entidades perdidas na conversão | v197 | Incluir todas as entidades |
| Categoria NLP contaminava detecção | v202 | Remover categoria do array |

---

## 8. PROMPT ENGINEERING - ANÁLISE

### 8.1 Pontos Fortes ✅

| Aspecto | Avaliação |
|---------|-----------|
| **Estrutura** | Excelente - seções bem definidas |
| **Exemplos (few-shot)** | Sim - 10+ exemplos completos |
| **Formato de saída** | Especificado via Function Calling |
| **Casos negativos** | Sim - exemplos de "não fazer" |
| **Contexto dinâmico** | Sim - injeta dados do usuário |
| **Gírias brasileiras** | Extenso - 50+ gírias |
| **Regras de desambiguação** | Sim - múltiplas regras |
| **Personalização** | Sim - nome do usuário |

### 8.2 Pontos de Melhoria ⚠️

| Aspecto | Problema | Sugestão |
|---------|----------|----------|
| **Tamanho** | ~800 linhas é muito grande | Dividir em módulos |
| **Redundância** | Regras repetidas | Consolidar |
| **Manutenção** | Difícil de atualizar | Externalizar para JSON |
| **Versionamento** | Não há controle de versão | Adicionar versão no prompt |
| **Testes** | Não há testes automatizados | Criar suite de testes |

### 8.3 Técnicas de Prompt Engineering Usadas

| Técnica | Usado? | Exemplo |
|---------|--------|---------|
| **Few-shot learning** | ✅ | 10+ exemplos de classificação |
| **Chain-of-thought** | ❌ | Não usado |
| **Role-playing** | ✅ | "Você é a Ana Clara" |
| **Structured output** | ✅ | Function Calling |
| **Negative examples** | ✅ | "NUNCA faça isso" |
| **Context injection** | ✅ | Histórico, contas, categorias |
| **Temperature tuning** | ✅ | 0.3 (baixo para consistência) |

### 8.4 Recomendações

1. **Dividir o prompt** em módulos menores
2. **Externalizar regras** para arquivo JSON/YAML
3. **Adicionar testes** de classificação
4. **Versionar o prompt** para rollback
5. **Monitorar métricas** de acurácia
6. **Reduzir redundância** nas regras

---

## 9. FLUXO COMPLETO DE CLASSIFICAÇÃO

```
┌─────────────────────────────────────────────────────────────────┐
│                     MENSAGEM DO USUÁRIO                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. PRÉ-PROCESSAMENTO (preProcessarIntencaoContaPagar)│
│  - Detecta padrões de conta a pagar                              │
│  - Força intenção se detectado                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. BUSCAR CONTEXTO (buscarContexto)                 │
│  - Verifica se há contexto ativo                                 │
│  - Prioriza contextos de FLUXO                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   CONTEXTO ATIVO?       │     │   SEM CONTEXTO                  │
│   processarNoContexto() │     │   Continua para NLP             │
└─────────────────────────┘     └─────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. MONTAR PROMPT (gerarSystemPrompt)                │
│  - Buscar histórico (8 mensagens)                                │
│  - Buscar contas bancárias                                       │
│  - Buscar contas a pagar                                         │
│  - Buscar categorias                                             │
│  - Buscar memória/gírias                                         │
│  - Buscar nome do usuário                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              4. CHAMAR LLM (OpenAI/Gemini/Claude)                │
│  - Function Calling: classificar_comando                         │
│  - Temperature: 0.3                                              │
│  - Model: gpt-4o-mini (padrão)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   SUCESSO               │     │   ERRO                          │
│   Parse JSON            │     │   fallbackClassificacao()       │
└─────────────────────────┘     └─────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. CORREÇÃO DE ENTIDADES                            │
│  - corrigirEntidadesContaBancaria()                              │
│  - validarEntidadesNLP()                                         │
│  - Sobrescrever intenção se pré-processamento detectou           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              6. RETORNAR IntencaoClassificada                    │
│  {                                                               │
│    intencao: string,                                             │
│    confianca: number,                                            │
│    entidades: {...},                                             │
│    explicacao: string,                                           │
│    resposta_conversacional: string,                              │
│    comando_original: string                                      │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. ESTATÍSTICAS

| Métrica | Valor |
|---------|-------|
| **Linhas do prompt** | ~800 |
| **Intents definidos** | 47 |
| **Entidades no schema** | 15 |
| **Tipos de contexto** | 25 |
| **Gírias mapeadas** | 50+ |
| **Bancos suportados** | 30+ |
| **Exemplos few-shot** | 10+ |
| **Regras de desambiguação** | 15+ |
| **Bugs corrigidos (v188-v202)** | 7 |

---

## 11. ARQUIVOS RELACIONADOS

| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `nlp-classifier.ts` | 1.611 | Classificação NLP principal |
| `context-manager.ts` | 4.067 | Gerenciamento de contexto |
| `nlp-validator.ts` | 83 | Validação de entidades |
| `nlp-processor.ts` | 811 | Processamento NLP legado |
| `shared/mappings.ts` | 691 | Mapeamentos de categorias/bancos |

---

*Gerado automaticamente em 16/12/2025 via análise de código*
