# AUDITORIA PARTE 2: EDGE FUNCTIONS

**Gerado em:** 16/12/2025  
**Projeto:** Personal Finance LA  
**Supabase Project ID:** sbnpmhmvcspwcyjhftlw

---

## 1. INVENTÁRIO DE EDGE FUNCTIONS

### Resumo Geral
- **Total de Edge Functions:** 38 (excluindo backups)
- **Linhas de código total:** ~25.000+ linhas
- **Função mais complexa:** `process-whatsapp-message` (19.694 linhas com módulos)

### Lista Completa por Categoria

#### 🔵 WHATSAPP / NLP (Núcleo Principal)
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| **process-whatsapp-message** | index.ts | 21 módulos | 19.694 |
| webhook-uazapi | index.ts | - | 412 |
| send-whatsapp-message | index.ts | - | 110 |
| transcribe-audio | index.ts | 1 (_shared/ai.ts) | 137 |
| llm-intent-parser | index.ts | - | 346 |

#### 🟢 TRANSAÇÕES / CATEGORIZAÇÃO
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| categorize-transaction | index.ts | - | 522 |
| execute-quick-command | index.ts | - | 489 |
| analytics-query | index.ts | - | 603 |

#### 🟡 IMAGENS / OCR
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| extract-receipt-data | index.ts | 1 (_shared/ai.ts) | 306 |

#### 🟣 INSIGHTS / IA
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| ana-dashboard-insights | index.ts | 1 (_shared/ai.ts) | 504 |
| ana-investment-insights | index.ts | 1 (_shared/ai.ts) | 316 |
| generate-opportunities | index.ts | - | ~200 |

#### 🔴 NOTIFICAÇÕES / LEMBRETES
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| send-bill-reminders | index.ts | 1 (templates) | 270 |
| send-daily-summary | index.ts | - | ~150 |
| send-weekly-summary | index.ts | - | ~150 |
| send-monthly-summary | index.ts | - | ~150 |
| send-ana-tips | index.ts | - | ~100 |
| send-large-transaction-alerts | index.ts | - | ~100 |
| send-low-balance-alerts | index.ts | - | ~100 |
| send-overdue-bill-alerts | index.ts | - | ~100 |
| send-opportunity-notification | index.ts | - | ~150 |
| send-portfolio-snapshot-notification | index.ts | - | ~100 |
| send-proactive-notifications | index.ts | - | 354 |
| send-investment-summary | index.ts | - | ~150 |

#### 🟠 INVESTIMENTOS
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| sync-investment-prices | index.ts | - | 278 |
| fetch-benchmarks | index.ts | - | ~150 |
| create-portfolio-snapshot | index.ts | - | ~100 |
| get-quote | index.ts | - | ~150 |

#### ⚪ CONFIGURAÇÕES / WEBHOOKS
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| get-user-settings | index.ts | - | ~150 |
| update-ai-config | index.ts | - | ~200 |
| validate-api-key | index.ts | - | ~150 |
| update-webhook | index.ts | - | ~200 |
| trigger-webhook | index.ts | - | ~150 |
| test-webhook-connection | index.ts | - | ~150 |

#### 🔵 AUTOMAÇÃO / CRON
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| invoice-automation | index.ts | - | 191 |
| _cron/investment-radar | index.ts | - | ~100 |

#### ⚫ UTILITÁRIOS
| Função | Arquivo Principal | Módulos | Linhas |
|--------|------------------|---------|--------|
| generate-qr-code | index.ts | - | ~50 |
| test-email | index.ts | - | ~100 |

---

## 2. MAPA DE DEPENDÊNCIAS

### 2.1 process-whatsapp-message (FUNÇÃO PRINCIPAL)

```
process-whatsapp-message/
├── index.ts (1.811 linhas) ─────────────────────────────────────────┐
│                                                                     │
├── MÓDULOS INTERNOS (imports diretos):                               │
│   ├── utils.ts (370 linhas)                                         │
│   │   └── getSupabase, normalizeMessageType, corsHeaders,           │
│   │       enviarViaEdgeFunction, buscarUltimaInteracao, getEmojiBanco│
│   │                                                                  │
│   ├── context-manager.ts (3.949 linhas) ⚠️ MUITO GRANDE             │
│   │   └── buscarContexto, isContextoAtivo, processarNoContexto,     │
│   │       salvarContexto, limparContexto, processarAcaoRapidaCartao │
│   │                                                                  │
│   ├── button-handler.ts (7.429 bytes)                               │
│   │   └── processarBotao                                            │
│   │                                                                  │
│   ├── quick-commands.ts (372 linhas)                                │
│   │   └── isComandoRapido, processarComandoRapido                   │
│   │                                                                  │
│   ├── response-templates.ts (634 linhas)                            │
│   │   └── templateErroGenerico, templateComandoNaoReconhecido       │
│   │                                                                  │
│   ├── humanization.ts (427 linhas)                                  │
│   │   └── isPrimeiraInteracaoDia                                    │
│   │                                                                  │
│   ├── templates-humanizados.ts (345 linhas)                         │
│   │   └── templateBoasVindas, templateSaudacaoPrimeiraVez,          │
│   │       templateSaudacaoRetorno, templateAjuda, templateSobreSistema│
│   │                                                                  │
│   ├── nlp-processor.ts (811 linhas)                                 │
│   │   └── classificarIntencao, isAnalyticsQuery (DESATIVADO),       │
│   │       isComandoEdicao, isComandoExclusao, extrairEntidadesEdicao│
│   │                                                                  │
│   ├── nlp-classifier.ts (1.403 linhas) ⭐ GPT-4 Function Calling    │
│   │   └── classificarIntencaoNLP, IntencaoClassificada,             │
│   │       corrigirEntidadesContaBancaria                            │
│   │                                                                  │
│   ├── transaction-mapper.ts (1.431 linhas)                          │
│   │   └── processarIntencaoTransacao, processarIntencaoTransferencia,│
│   │       processarTransferenciaEntreContas, processarEdicao,       │
│   │       processarExclusao, templatePerguntaMetodoPagamentoComBancos│
│   │                                                                  │
│   ├── audio-handler.ts (7.231 bytes)                                │
│   │   └── isAudioPTT, extrairMessageId, processarAudioPTT,          │
│   │       extrairInfoAudio                                          │
│   │                                                                  │
│   ├── command-handlers.ts (404 linhas)                              │
│   │   └── excluirUltimaTransacao, excluirTransacaoPorId,            │
│   │       mudarContaUltimaTransacao, consultarSaldo, listarContas,  │
│   │       extrairNomeConta                                          │
│   │                                                                  │
│   ├── image-reader.ts (579 linhas)                                  │
│   │   └── detectarTipoImagem, lerNotaFiscal, lerPedidoIFood         │
│   │                                                                  │
│   ├── consultas.ts (1.718 linhas)                                   │
│   │   └── detectarIntencaoConsulta, processarConsulta,              │
│   │       consultarSaldoEspecifico, extrairPeriodoDoTexto,          │
│   │       extrairModoDoTexto, extrairMetodoDoTexto,                 │
│   │       consultarFinancasUnificada                                │
│   │                                                                  │
│   ├── cartao-credito.ts (2.615 linhas)                              │
│   │   └── detectarIntencaoCartao, processarIntencaoCartao           │
│   │                                                                  │
│   ├── contas-pagar.ts (4.957 linhas) ⚠️ MAIOR ARQUIVO               │
│   │   └── processarIntencaoContaPagar, TipoIntencaoContaPagar,      │
│   │       CONTA_ALIASES, detectarFaturaCartao                       │
│   │                                                                  │
│   ├── validacoes.ts (616 linhas)                                    │
│   │   └── validarValor, validarDiaVencimento, validarDescricao,     │
│   │       validarParcelas, textoContemValorNegativo,                │
│   │       validarDataCompleta, extrairEValidarData                  │
│   │                                                                  │
│   └── types.ts (5.286 bytes)                                        │
│       └── Interfaces TypeScript                                     │
│                                                                      │
├── IMPORTS EXTERNOS (../shared/):                                     │
│   └── nlp-validator.ts (3.962 bytes)                                │
│       └── validarEntidadesNLP                                       │
│                                                                      │
└── EDGE FUNCTIONS CHAMADAS:                                          │
    └── send-whatsapp-message (via enviarViaEdgeFunction)             │
```

### 2.2 Outras Edge Functions - Dependências

| Edge Function | Tabelas Acessadas | APIs Externas | Secrets |
|--------------|-------------------|---------------|---------|
| **webhook-uazapi** | users, whatsapp_messages | - | UAZAPI_TOKEN |
| **send-whatsapp-message** | - | UAZAPI | UAZAPI_TOKEN, UAZAPI_BASE_URL |
| **transcribe-audio** | ai_provider_configs | OpenAI Whisper | OPENAI_API_KEY |
| **categorize-transaction** | ai_provider_configs, categories, transactions, accounts | OpenAI/Gemini/Claude | Dinâmico por usuário |
| **extract-receipt-data** | ai_provider_configs | OpenAI Vision | OPENAI_API_KEY |
| **execute-quick-command** | accounts, transactions, payable_bills, financial_goals, investments, credit_cards | - | - |
| **analytics-query** | transactions, accounts, categories | - | - |
| **ana-dashboard-insights** | payable_bills, transactions, accounts, ana_insights_cache | OpenAI/Gemini/Claude | Dinâmico |
| **ana-investment-insights** | investments, investment_transactions | OpenAI/Gemini/Claude | Dinâmico |
| **send-bill-reminders** | payable_bills, bill_reminders, users | UAZAPI | CRON_SECRET, UAZAPI_TOKEN |
| **invoice-automation** | credit_card_invoices, credit_card_transactions | - | - |
| **sync-investment-prices** | investments | APIs de cotação | - |

---

## 3. ANÁLISE DA FUNÇÃO PRINCIPAL: process-whatsapp-message

### 3.1 Métricas

| Métrica | Valor |
|---------|-------|
| **Linhas de código (index.ts)** | 1.811 |
| **Linhas totais (com módulos)** | 19.694 |
| **Módulos importados** | 21 arquivos |
| **Handlers internos** | 35+ |
| **Intents reconhecidos** | 47 |

### 3.2 Arquivos/Módulos Importados

| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| contas-pagar.ts | 4.957 | Gestão de contas a pagar |
| context-manager.ts | 3.949 | Gerenciamento de contexto conversacional |
| cartao-credito.ts | 2.615 | Operações de cartão de crédito |
| index.ts | 1.811 | Orquestrador principal |
| consultas.ts | 1.718 | Consultas financeiras |
| transaction-mapper.ts | 1.431 | CRUD de transações |
| nlp-classifier.ts | 1.403 | Classificação NLP com GPT-4 |
| nlp-processor.ts | 811 | Processamento NLP legado |
| response-templates.ts | 634 | Templates de resposta |
| validacoes.ts | 616 | Validações de dados |
| image-reader.ts | 579 | Leitura de imagens |
| humanization.ts | 427 | Humanização de respostas |
| command-handlers.ts | 404 | Handlers de comandos |
| quick-commands.ts | 372 | Comandos rápidos |
| utils.ts | 370 | Utilitários |
| templates-humanizados.ts | 345 | Templates humanizados |

### 3.3 Fluxo de Decisão (Roteamento de Mensagens)

```
ENTRADA (Payload)
    │
    ├─► Detectar tipo de payload (interno/N8N/UAZAPI)
    │
    ├─► Extrair dados (phone, userId, content, messageType)
    │
    ├─► Validar usuário (buscar no banco)
    │
    ├─► ÁUDIO? ──► processarAudioPTT() ──► transcrição ──► continua fluxo
    │
    ├─► IMAGEM? ──► detectarTipoImagem() ──► lerNotaFiscal/lerPedidoIFood
    │
    ├─► CONTEXTO ATIVO? ──► processarNoContexto()
    │
    ├─► COMANDO RÁPIDO? ──► processarComandoRapido()
    │
    ├─► EDIÇÃO? ──► processarEdicao()
    │
    ├─► EXCLUSÃO? ──► processarExclusao()
    │
    ├─► COMANDOS CONVERSACIONAIS RÁPIDOS (regex)
    │   ├─► "exclui essa" ──► excluirUltimaTransacao()
    │   ├─► "muda pra X" ──► mudarContaUltimaTransacao()
    │   ├─► "saldo" ──► consultarSaldo()
    │   └─► "meus bancos" ──► listarContas()
    │
    ├─► CLASSIFICAÇÃO NLP (GPT-4 Function Calling)
    │   │
    │   ├─► Confiança < 0.6? ──► Pedir clarificação
    │   │
    │   ├─► INTENTS DE CARTÃO ──► processarIntencaoCartao()
    │   │
    │   ├─► INTENTS DE CONTAS A PAGAR ──► processarIntencaoContaPagar()
    │   │
    │   ├─► SAUDACAO ──► templateSaudacao()
    │   │
    │   ├─► AJUDA ──► templateAjuda()
    │   │
    │   ├─► CONSULTAR_SALDO ──► consultarSaldo/consultarSaldoEspecifico()
    │   │
    │   ├─► CONSULTAR_RECEITAS ──► consultarFinancasUnificada(tipo: income)
    │   │
    │   ├─► CONSULTAR_GASTOS/EXTRATO/RELATORIO ──► consultarFinancasUnificada()
    │   │
    │   ├─► LISTAR_CONTAS ──► listarContas() ou CONTAS_AMBIGUO
    │   │
    │   ├─► EXCLUIR_TRANSACAO ──► excluirUltimaTransacao/excluirTransacaoPorId()
    │   │
    │   ├─► EDITAR_VALOR/CONTA/CATEGORIA ──► processarEdicao()
    │   │
    │   ├─► AGRADECIMENTO ──► templateAgradecimento()
    │   │
    │   ├─► OUTRO ──► templateSobreSistema() ou resposta conversacional
    │   │
    │   ├─► REGISTRAR_TRANSFERENCIA ──► processarTransferenciaEntreContas()
    │   │
    │   └─► REGISTRAR_RECEITA/DESPESA ──► processarIntencaoTransacao()
    │
    └─► COMANDO NÃO RECONHECIDO ──► templateComandoNaoReconhecido()
```

### 3.4 Pontos de Falha Identificados

| Ponto | Descrição | Risco | Mitigação |
|-------|-----------|-------|-----------|
| **GPT-4 indisponível** | NLP falha completamente | ALTO | Fallback para regex básico |
| **UAZAPI offline** | Não envia respostas | ALTO | Retry + log |
| **Contexto expirado** | Perde estado da conversa | MÉDIO | TTL de 60min |
| **Transcrição falha** | Áudio não processado | MÉDIO | Mensagem de erro amigável |
| **Imagem ilegível** | OCR falha | BAIXO | Pedir texto manual |
| **Banco não encontrado** | Fallback de bancos | BAIXO | Lista de aliases |

---

## 4. MAPA DE INTENTS E HANDLERS

### 4.1 Intents Reconhecidos pelo NLP (47 total)

| Intent | Handler/Função | Arquivo | Tabelas Afetadas |
|--------|---------------|---------|------------------|
| **REGISTRAR_RECEITA** | processarIntencaoTransacao | transaction-mapper.ts | transactions, accounts |
| **REGISTRAR_DESPESA** | processarIntencaoTransacao | transaction-mapper.ts | transactions, accounts |
| **REGISTRAR_TRANSFERENCIA** | processarTransferenciaEntreContas | transaction-mapper.ts | transactions, accounts |
| **CONSULTAR_SALDO** | consultarSaldo/consultarSaldoEspecifico | command-handlers.ts, consultas.ts | accounts |
| **CONSULTAR_EXTRATO** | consultarFinancasUnificada | consultas.ts | transactions |
| **CONSULTAR_GASTOS** | consultarFinancasUnificada | consultas.ts | transactions |
| **CONSULTAR_RECEITAS** | consultarFinancasUnificada | consultas.ts | transactions |
| **RELATORIO_DIARIO** | consultarFinancasUnificada | consultas.ts | transactions |
| **RELATORIO_SEMANAL** | consultarFinancasUnificada | consultas.ts | transactions |
| **RELATORIO_MENSAL** | consultarFinancasUnificada | consultas.ts | transactions |
| **CONSULTAR_METAS** | (não implementado) | - | financial_goals |
| **CRIAR_META** | (não implementado) | - | financial_goals |
| **CRIAR_LEMBRETE** | (não implementado) | - | bill_reminders |
| **EDITAR_VALOR** | processarEdicao | transaction-mapper.ts | transactions |
| **EDITAR_CONTA** | mudarContaUltimaTransacao | command-handlers.ts | transactions |
| **EDITAR_CATEGORIA** | processarEdicao | transaction-mapper.ts | transactions |
| **EXCLUIR_TRANSACAO** | excluirUltimaTransacao/excluirTransacaoPorId | command-handlers.ts | transactions |
| **LISTAR_CONTAS** | listarContas | command-handlers.ts | accounts |
| **LISTAR_CATEGORIAS** | (não implementado) | - | categories |
| **MUDAR_CONTA** | mudarContaUltimaTransacao | command-handlers.ts | transactions |
| **SELECIONAR_CONTA** | processarNoContexto | context-manager.ts | - |
| **COMPRA_CARTAO** | processarIntencaoCartao | cartao-credito.ts | credit_card_transactions |
| **COMPRA_PARCELADA** | processarIntencaoCartao | cartao-credito.ts | credit_card_transactions |
| **CONSULTAR_FATURA** | processarIntencaoCartao | cartao-credito.ts | credit_card_invoices |
| **CONSULTAR_FATURA_VENCIDA** | processarIntencaoCartao | cartao-credito.ts | credit_card_invoices |
| **CONSULTAR_LIMITE** | processarIntencaoCartao | cartao-credito.ts | credit_cards |
| **LISTAR_CARTOES** | processarIntencaoCartao | cartao-credito.ts | credit_cards |
| **PAGAR_FATURA** | processarIntencaoCartao | cartao-credito.ts | credit_card_invoices |
| **LISTAR_CONTAS_PAGAR** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **CONTAS_VENCENDO** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **CONTAS_VENCIDAS** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **CONTAS_DO_MES** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **RESUMO_CONTAS_MES** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **CADASTRAR_CONTA_PAGAR** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **EDITAR_CONTA_PAGAR** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **EXCLUIR_CONTA_PAGAR** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **MARCAR_CONTA_PAGA** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills, bill_payment_history |
| **VALOR_CONTA_VARIAVEL** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **HISTORICO_CONTA** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **PAGAR_FATURA_CARTAO** | processarIntencaoContaPagar | contas-pagar.ts | credit_card_invoices |
| **DESFAZER_PAGAMENTO** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **RESUMO_PAGAMENTOS_MES** | processarIntencaoContaPagar | contas-pagar.ts | payable_bills |
| **CONTAS_AMBIGUO** | processarIntencaoContaPagar | contas-pagar.ts | - |
| **CADASTRAR_CONTA_AMBIGUO** | processarIntencaoContaPagar | contas-pagar.ts | - |
| **SAUDACAO** | templateSaudacao* | templates-humanizados.ts | - |
| **AJUDA** | templateAjuda | templates-humanizados.ts | - |
| **AGRADECIMENTO** | templateAgradecimento | templates-humanizados.ts | - |
| **OUTRO** | templateSobreSistema / resposta conversacional | templates-humanizados.ts | - |

---

## 5. ANÁLISE DE COMPLEXIDADE

| Edge Function | Complexidade | Risco de Quebra | Cobertura de Erros | Documentação |
|--------------|--------------|-----------------|-------------------|--------------|
| **process-whatsapp-message** | 🔴 ALTA | 🔴 ALTO | 🟡 REGULAR | 🟡 REGULAR |
| **contas-pagar.ts** | 🔴 ALTA | 🔴 ALTO | 🟢 BOA | 🟡 REGULAR |
| **context-manager.ts** | 🔴 ALTA | 🔴 ALTO | 🟡 REGULAR | 🟡 REGULAR |
| **cartao-credito.ts** | 🟡 MÉDIA | 🟡 MÉDIO | 🟢 BOA | 🟡 REGULAR |
| **nlp-classifier.ts** | 🟡 MÉDIA | 🟡 MÉDIO | 🟢 BOA | 🟢 BOA |
| **consultas.ts** | 🟡 MÉDIA | 🟡 MÉDIO | 🟢 BOA | 🟡 REGULAR |
| **transaction-mapper.ts** | 🟡 MÉDIA | 🟡 MÉDIO | 🟢 BOA | 🟡 REGULAR |
| webhook-uazapi | 🟢 BAIXA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |
| send-whatsapp-message | 🟢 BAIXA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |
| transcribe-audio | 🟢 BAIXA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |
| categorize-transaction | 🟡 MÉDIA | 🟡 MÉDIO | 🟢 BOA | 🟢 BOA |
| extract-receipt-data | 🟢 BAIXA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |
| execute-quick-command | 🟡 MÉDIA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |
| analytics-query | 🟡 MÉDIA | 🟢 BAIXO | 🟢 BOA | 🟡 REGULAR |
| ana-dashboard-insights | 🟡 MÉDIA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |
| send-bill-reminders | 🟡 MÉDIA | 🟡 MÉDIO | 🟢 BOA | 🟢 BOA |
| invoice-automation | 🟢 BAIXA | 🟢 BAIXO | 🟢 BOA | 🟢 BOA |

### Legenda
- 🔴 **ALTA/ALTO**: Requer atenção imediata
- 🟡 **MÉDIA/MÉDIO**: Monitorar
- 🟢 **BAIXA/BAIXO/BOA**: Aceitável

---

## 6. CÓDIGO DUPLICADO IDENTIFICADO

### 6.1 Funções Duplicadas

| Função | Arquivos | Recomendação |
|--------|----------|--------------|
| `getEmojiBanco()` | utils.ts, cartao-credito.ts (13x), context-manager.ts (8x), templates-humanizados.ts (6x), consultas.ts (4x), contas-pagar.ts (3x) | ✅ Já centralizada em utils.ts, outros arquivos importam |
| `bancosConhecidos[]` | index.ts (6x), contas-pagar.ts (2x) | ⚠️ Duplicado - mover para shared/mappings.ts |
| `corsHeaders` | 17 arquivos (100+ ocorrências) | ⚠️ Cada arquivo define seu próprio - criar _shared/cors.ts |
| `extrairPeriodoDoTexto()` | index.ts (4x), consultas.ts (2x) | ✅ Definida em consultas.ts, importada em index.ts |
| `BANCOS_BRASILEIROS[]` | nlp-classifier.ts | ⚠️ Similar a bancosConhecidos - unificar |

### 6.2 Lógica Repetida

| Padrão | Ocorrências | Recomendação |
|--------|-------------|--------------|
| Validação de CORS | Todas as Edge Functions | Criar middleware compartilhado |
| Criação de Supabase Client | Todas as Edge Functions | Criar factory em _shared |
| Validação de Authorization | 15+ funções | Criar middleware de auth |
| Formatação de moeda (BRL) | 10+ arquivos | Criar formatCurrency() em shared |
| Parsing de data | 8+ arquivos | Criar parseDate() em shared |

### 6.3 Imports Desnecessários

| Arquivo | Import | Status |
|---------|--------|--------|
| index.ts | button-sender.ts | ⚠️ Comentado mas ainda importado |
| index.ts | nlp-processor.ts (isAnalyticsQuery) | ⚠️ Função desativada |
| index.ts | nlp-processor.ts (detectarIntencaoConsulta) | ⚠️ Função desativada |

---

## 7. RECOMENDAÇÕES

### 7.1 Críticas (Fazer Agora)

1. **Dividir `contas-pagar.ts`** (4.957 linhas)
   - Separar em: `contas-pagar-crud.ts`, `contas-pagar-consultas.ts`, `contas-pagar-faturas.ts`

2. **Dividir `context-manager.ts`** (3.949 linhas)
   - Separar handlers por domínio: `context-transacao.ts`, `context-cartao.ts`, `context-contas.ts`

3. **Remover código morto**
   - `isAnalyticsQuery()` - desativado
   - `detectarIntencaoConsulta()` - desativado
   - `button-sender.ts` - não usado

### 7.2 Importantes (Próxima Sprint)

1. **Centralizar constantes**
   - Criar `shared/constants.ts` com: BANCOS_BRASILEIROS, CONTA_ALIASES, etc.

2. **Criar middleware de CORS**
   - `_shared/cors.ts` para evitar duplicação

3. **Criar factory de Supabase Client**
   - `_shared/supabase.ts` com createAuthenticatedClient()

### 7.3 Melhorias (Backlog)

1. **Adicionar testes unitários**
   - Prioridade: nlp-classifier.ts, transaction-mapper.ts

2. **Documentar fluxos**
   - Criar diagramas Mermaid para cada módulo

3. **Implementar intents faltantes**
   - CONSULTAR_METAS, CRIAR_META, CRIAR_LEMBRETE, LISTAR_CATEGORIAS

---

## 8. ARQUIVOS AUXILIARES

### 8.1 _shared/

| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| ai.ts | ~200 | getDefaultAIConfig, callChat, callVision |
| period-parser.ts | ~180 | Parsing de períodos (hoje, semana, mês) |

### 8.2 shared/

| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| mappings.ts | 691 | Mapeamentos de categorias, bancos, etc. |
| context-detector.ts | ~120 | Detecção de contexto |
| nlp-validator.ts | ~120 | Validação de entidades NLP |

---

## 9. ESTATÍSTICAS FINAIS

| Métrica | Valor |
|---------|-------|
| **Total de Edge Functions** | 38 |
| **Total de linhas de código** | ~25.000 |
| **Maior arquivo** | contas-pagar.ts (4.957 linhas) |
| **Função mais complexa** | process-whatsapp-message |
| **Intents reconhecidos** | 47 |
| **Tabelas acessadas** | 15+ |
| **APIs externas** | 4 (OpenAI, UAZAPI, Gemini, Claude) |
| **Secrets utilizados** | 8+ |

---

*Gerado automaticamente em 16/12/2025 via análise de código*
