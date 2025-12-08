# 🤖 Contexto para Claude - Personal Finance Ana Clara

**Última Atualização:** 08 de Dezembro de 2025  
**Versão:** v187

---

## 📌 O que é este projeto?

A **Ana Clara** é uma assistente financeira inteligente via WhatsApp que permite aos usuários gerenciar suas finanças pessoais através de mensagens de texto e áudio.

### Stack Tecnológico
- **Backend:** Supabase Edge Functions (Deno/TypeScript)
- **Banco de Dados:** PostgreSQL (Supabase)
- **NLP:** GPT-4 (OpenAI) para classificação de intenções
- **Mensageria:** WhatsApp Business API (Z-API)
- **Áudio:** OpenAI Whisper para transcrição

---

## ✅ O QUE ESTÁ PRONTO E FUNCIONANDO

### Fase 1 - Sistema Base

#### Registro de Transações
- ✅ Registrar despesa por texto ("gastei 50 no almoço")
- ✅ Registrar receita por texto ("recebi 5000 de salário")
- ✅ Registrar por áudio (transcrição via Whisper)
- ✅ Categorização automática via NLP
- ✅ Detecção de conta/banco ("no nubank", "no itaú")
- ✅ Apelidos de bancos ("roxinho" → Nubank, "laranjinha" → Itaú)

#### Consultas Básicas
- ✅ Consultar saldo ("qual meu saldo", "quanto tenho")
- ✅ Listar contas ("minhas contas")
- ✅ Listar categorias ("categorias")
- ✅ Listar cartões ("meus cartões")

#### Cartão de Crédito
- ✅ Registrar compra no cartão ("comprei 100 no cartão nubank")
- ✅ Compras parceladas ("parcelei 600 em 6x")
- ✅ Consultar fatura ("fatura do nubank")

#### Edições
- ✅ Editar valor ("era 95", "na verdade foi 120")
- ✅ Editar conta ("muda pra nubank")
- ✅ Editar categoria ("era transporte")
- ✅ Excluir transação ("exclui essa", "apaga")

### Fase 2 - Sistema Avançado de Consultas

#### Períodos Avançados
- ✅ Hoje, ontem, semana atual, semana passada
- ✅ Mês atual, mês passado
- ✅ Últimos X dias ("últimos 7 dias")
- ✅ Últimos X meses ("últimos 3 meses")
- ✅ Mês específico ("gastos de novembro")

#### Métodos de Pagamento
- ✅ PIX ("quanto gastei no pix")
- ✅ Débito ("gastos no débito")
- ✅ Crédito ("gastos no crédito")
- ✅ Boleto ("boletos pagos")
- ✅ Dinheiro ("gastos em dinheiro")
- ✅ Transferência ("transferências que fiz")

#### Agrupamentos
- ✅ Por categoria ("gastos por categoria")
- ✅ Por conta ("gastos por conta")
- ✅ Por cartão ("gastos por cartão")
- ✅ Por método ("gastos por método de pagamento")
- ✅ Por dia ("gastos por dia")

#### Modos de Visualização
- ✅ Resumo (padrão)
- ✅ Detalhado ("gastos detalhados")

#### Separação Gastos vs Receitas
- ✅ CONSULTAR_GASTOS ("quanto gastei")
- ✅ CONSULTAR_RECEITAS ("quanto recebi")

#### Consultas Combinadas
- ✅ "PIX do Nubank essa semana"
- ✅ "débito do Itaú ontem"
- ✅ "gastos por método nos últimos 30 dias"
- ✅ "quanto recebi de PIX em novembro"

---

## 📁 Estrutura de Arquivos Principais

```
supabase/functions/process-whatsapp-message/
├── index.ts                 # Handler principal (~1400 linhas)
├── nlp-classifier.ts        # Classificação de intenções GPT-4
├── consultas.ts             # Sistema de consultas unificado
├── cartao-credito.ts        # Operações de cartão de crédito
├── command-handlers.ts      # Handlers de comandos específicos
├── audio-handler.ts         # Transcrição de áudio (Whisper)
└── ...outros arquivos auxiliares
```

---

## 🔧 Funções Principais

### consultas.ts
```typescript
// Consulta principal unificada
consultarFinancasUnificada(userId, config: ConfigConsultaCompleta)

// Extração de entidades do texto
extrairPeriodoDoTexto(texto)      // Extrai período
extrairMetodoDoTexto(texto)       // Extrai método de pagamento
extrairModoDoTexto(texto)         // Extrai modo e agrupamento
extrairConfigConsulta(texto)      // Extrai tudo

// Cálculo de período
calcularPeriodoAvancado(periodo: PeriodoConfig)

// Consultas específicas
consultarSaldo(userId)
consultarGastosComFiltros(userId, filtros)
consultarReceitasComFiltros(userId, filtros)
```

### Tipos Principais
```typescript
interface ConfigConsultaCompleta {
  periodo?: PeriodoConfig;
  conta?: string;
  cartao?: string;
  metodo?: 'pix' | 'debit' | 'credit' | 'boleto' | 'cash' | 'transfer';
  tipo?: 'expense' | 'income';
  modo?: 'resumo' | 'detalhado';
  agrupar_por?: 'categoria' | 'conta' | 'cartao' | 'metodo' | 'dia';
}

interface PeriodoConfig {
  tipo: 'hoje' | 'ontem' | 'semana_atual' | 'semana_passada' | 
        'mes_atual' | 'mes_passado' | 'ultimos_dias' | 'ultimos_meses' | 
        'mes_especifico' | 'intervalo';
  quantidade?: number;
  mes?: number;
}
```

---

## 🎯 Intenções NLP Suportadas

| Intenção | Exemplos |
|----------|----------|
| REGISTRAR_DESPESA | "gastei 50 no almoço" |
| REGISTRAR_RECEITA | "recebi 5000 de salário" |
| CONSULTAR_SALDO | "qual meu saldo" |
| CONSULTAR_GASTOS | "quanto gastei", "meus gastos" |
| CONSULTAR_RECEITAS | "quanto recebi", "minhas receitas" |
| CONSULTAR_EXTRATO | "extrato", "movimentações" |
| COMPRA_CARTAO | "comprei no cartão" |
| COMPRA_PARCELADA | "parcelei em 6x" |
| EDITAR_VALOR | "era 95" |
| EDITAR_CONTA | "muda pra nubank" |
| EXCLUIR_TRANSACAO | "exclui essa" |
| LISTAR_CONTAS | "minhas contas" |
| LISTAR_CATEGORIAS | "categorias" |

---

## 📊 Tabelas do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| users | Usuários do sistema |
| accounts | Contas bancárias |
| credit_cards | Cartões de crédito |
| transactions | Transações (despesas/receitas) |
| credit_card_transactions | Compras no cartão |
| categories | Categorias de transação |
| whatsapp_messages | Mensagens recebidas |

---

## ⚠️ O QUE AINDA PRECISA SER TESTADO

A suíte de testes E2E está em `docs/SUITE_TESTES_E2E.md` com 92 casos de teste:
- 32 testes da Fase 1
- 53 testes da Fase 2
- 7 testes adicionais (áudio e erros)

---

## 🚀 Próximos Passos (Fase 3 - Futuro)

1. **Metas Financeiras** - Criar e acompanhar metas
2. **Lembretes** - Notificações de contas a pagar
3. **Análises Avançadas** - Comparativos e previsões
4. **Open Finance** - Integração com bancos

---

## 📝 Notas Importantes

1. **Erros de Lint no IDE** - Erros como "Cannot find module 'https://esm.sh/...'" são esperados no ambiente local. O código funciona corretamente no Supabase Edge Functions (Deno).

2. **Deploy** - Usar `npx supabase functions deploy process-whatsapp-message --no-verify-jwt`

3. **Logs** - Acessar via Supabase Dashboard > Functions > Logs

---

**Este documento serve como contexto para o Claude continuar o desenvolvimento.**
