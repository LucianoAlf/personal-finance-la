/**
 * NLP CLASSIFIER - Sistema Inteligente de Classificação
 * Baseado na arquitetura do Copiloto
 * 
 * Usa GPT-4 com Function Calling para:
 * - Interpretar linguagem natural e gírias
 * - Extrair intenção + entidades
 * - Manter contexto de conversa
 * - Gerar respostas amigáveis
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildWhatsAppSuitabilityFacts,
  formatWhatsAppSuitabilityFactsBlock,
} from '../_shared/education-profile.ts';

// ============================================
// BANCOS BRASILEIROS - Para distinguir conta a pagar de conta bancária
// ============================================

const BANCOS_BRASILEIROS = [
  'itau', 'itaú', 'bradesco', 'santander', 'banco do brasil', 'bb',
  'caixa', 'cef', 'nubank', 'inter', 'c6', 'c6 bank', 'next', 'neon',
  'original', 'safra', 'btg', 'xp', 'rico', 'modal', 'pan', 'bmg',
  'sicredi', 'sicoob', 'banrisul', 'bnb', 'banese', 'picpay', 'mercado pago',
  'pagbank', 'pagseguro', 'iti', 'digio', 'will', 'agibank'
];

function ehBanco(texto: string): boolean {
  if (!texto) return false;
  const textoLower = texto.toLowerCase().trim();
  return BANCOS_BRASILEIROS.some(banco => 
    textoLower === banco || textoLower.includes(banco)
  );
}

/**
 * Corrige entidades quando NLP confunde conta a pagar com conta bancária
 * Exemplo: "paguei a academia no Itau" → conta="academia", conta_bancaria="itau"
 */
export function corrigirEntidadesContaBancaria(
  textoOriginal: string, 
  entidades: Record<string, unknown>
): Record<string, unknown> {
  const texto = textoOriginal.toLowerCase();
  const entidadesCorrigidas = { ...entidades };
  
  // Padrão: "no/pelo/na/via [BANCO]"
  const padroesBanco = /(?:no|na|pelo|pela|via|do|da)\s+(itau|itaú|bradesco|santander|nubank|inter|c6|caixa|bb|banco do brasil|next|neon|original|picpay|mercado pago|pagbank)/i;
  
  const matchBanco = texto.match(padroesBanco);
  if (matchBanco) {
    const bancoEncontrado = matchBanco[1].toLowerCase()
      .replace('itaú', 'itau')
      .replace('banco do brasil', 'bb');
    
    // Se o NLP colocou o banco como "conta", corrigir
    const contaAtual = entidadesCorrigidas.conta as string || '';
    if (contaAtual && ehBanco(contaAtual)) {
      console.log('[NLP-CORREÇÃO] Detectado banco como conta, corrigindo...');
      
      // Padrão: "paguei a/o [CONTA]" - extrair a conta real
      const padraoContaPagar = /pagu?e?i\s+(?:a|o|as|os)?\s*(\w+)/i;
      const matchConta = texto.match(padraoContaPagar);
      
      if (matchConta && !ehBanco(matchConta[1])) {
        entidadesCorrigidas.conta = matchConta[1];
        console.log('[NLP-CORREÇÃO] Conta extraída do texto:', matchConta[1]);
      }
    }
    
    // Garantir que conta_bancaria está preenchida
    if (!entidadesCorrigidas.conta_bancaria || entidadesCorrigidas.conta_bancaria === '') {
      entidadesCorrigidas.conta_bancaria = bancoEncontrado;
      console.log('[NLP-CORREÇÃO] Conta bancária extraída:', bancoEncontrado);
    }
  }
  
  console.log('[NLP-CORREÇÃO] Original:', JSON.stringify(entidades));
  console.log('[NLP-CORREÇÃO] Corrigido:', JSON.stringify(entidadesCorrigidas));
  
  return entidadesCorrigidas;
}

// ============================================
// TIPOS
// ============================================

export interface IntencaoClassificada {
  intencao: string;
  confianca: number;
  entidades: {
    valor?: number;
    tipo?: 'expense' | 'income' | 'transfer';
    categoria?: string;
    descricao?: string;
    data?: string;
    periodo?: string;
    conta?: string;
    conta_destino?: string;
    novo_valor?: number;
    nova_conta?: string;
    nova_categoria?: string;
    status_pagamento?: 'paid' | 'pending';
    forma_pagamento?: string;
    plataforma?: string;
  };
  explicacao: string;
  resposta_conversacional: string;
  comando_original?: string;
}

// ============================================
// FUNCTION CALLING SCHEMA
// ============================================

const INTENT_CLASSIFICATION_FUNCTION = {
  name: 'classificar_comando',
  description: 'Classifica intenção e extrai todas as entidades de comando financeiro',
  parameters: {
    type: 'object',
    properties: {
      intencao: {
        type: 'string',
        enum: [
          'REGISTRAR_RECEITA',
          'REGISTRAR_DESPESA',
          'REGISTRAR_TRANSFERENCIA',
          'CONSULTAR_SALDO',
          'CONSULTAR_EXTRATO',
          'CONSULTAR_GASTOS',
          'CONSULTAR_RECEITAS',
          'RELATORIO_DIARIO',
          'RELATORIO_SEMANAL',
          'RELATORIO_MENSAL',
          'CONSULTAR_METAS',
          'CRIAR_META',
          'CRIAR_LEMBRETE',
          'EDITAR_VALOR',
          'EDITAR_CONTA',
          'EDITAR_CATEGORIA',
          'EXCLUIR_TRANSACAO',
          'LISTAR_CONTAS',
          'LISTAR_CATEGORIAS',
          'MUDAR_CONTA',
          'SELECIONAR_CONTA',
          // CARTÃO DE CRÉDITO
          'COMPRA_CARTAO',
          'COMPRA_PARCELADA',
          'CONSULTAR_FATURA',
          'CONSULTAR_FATURA_VENCIDA',
          'CONSULTAR_LIMITE',
          'LISTAR_CARTOES',
          'PAGAR_FATURA',
          // FIM CARTÃO
          // CONTAS A PAGAR (FASE 3)
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
          // FIM CONTAS A PAGAR
          'SAUDACAO',
          'AJUDA',
          'AGRADECIMENTO',
          'OUTRO'
        ]
      },
      confianca: {
        type: 'number',
        minimum: 0,
        maximum: 1
      },
      entidades: {
        type: 'object',
        properties: {
          valor: { type: 'number' },
          tipo: { 
            type: 'string',
            enum: ['expense', 'income', 'transfer']
          },
          categoria: { type: 'string' },
          descricao: { type: 'string', description: 'O que foi comprado/gasto. IMPORTANTE para COMPRA_PARCELADA: extrair só o produto! Ex: "TV 2000 em 10x" → descricao="TV", "celular 3500 em 12x" → descricao="celular"' },
          data: { type: 'string' },
          periodo: { 
            type: 'string',
            enum: ['hoje', 'ontem', 'semana', 'mes', 'ano']
          },
          conta: { type: 'string' },
          conta_destino: { type: 'string' },
          novo_valor: { type: 'number' },
          nova_conta: { type: 'string' },
          nova_categoria: { type: 'string' },
          status_pagamento: {
            type: 'string',
            enum: ['paid', 'pending']
          },
          forma_pagamento: {
            type: 'string',
            enum: ['pix', 'credito', 'debito', 'dinheiro', 'boleto']
          },
          // ENTIDADES DE CARTÃO DE CRÉDITO
          cartao: { type: 'string', description: 'Nome do cartão de crédito (ex: Nubank, Itaú, Bradesco). IMPORTANTE: Extrair de "no Nubank", "no Itaú", etc.' },
          parcelas: { type: 'number', description: 'Número de parcelas. OBRIGATÓRIO para COMPRA_PARCELADA! Ex: "em 10x" → parcelas=10, "em 3 vezes" → parcelas=3. Se não parcelou, use 1.' },
          // CONTEXTO INFERIDO DO HISTÓRICO
          mes_referencia: { type: 'string', description: 'Mês inferido do histórico da conversa (ex: novembro, dezembro). Use quando o usuário pede detalhes de algo mencionado anteriormente.' }
        }
      },
      explicacao: { type: 'string' },
      resposta_conversacional: { type: 'string' }
    },
    required: ['intencao', 'confianca', 'entidades', 'explicacao', 'resposta_conversacional']
  }
};

// ============================================
// SYSTEM PROMPT
// ============================================

function gerarSystemPrompt(
  memoriaUsuario: string,
  historicoConversa: string,
  dataHoraAtual: string,
  contasDisponiveis: string,
  categoriasDisponiveis: string,
  nomeUsuario?: string,
  contasAPagar?: string
): string {
  const primeiroNome = nomeUsuario?.split(' ')[0] || 'amigo';
  
  return `Você é a "Ana Clara" 🙋🏻‍♀️, a Personal Finance do usuário.

## SUA IDENTIDADE
- Nome: Ana Clara
- Emoji: 🙋🏻‍♀️ (NUNCA use 🤖, você é humana!)
- Personalidade: Simpática, empática, direta, entende de finanças
- Tom: Amiga próxima que quer ajudar com dinheiro
- Apresentação: "Sou a Ana Clara, sua Personal Finance!"
- Assinatura: "_Ana Clara • Personal Finance_ 🙋🏻‍♀️"

## SOBRE O SISTEMA PERSONAL FINANCE

Quando perguntarem "o que você faz?", "quem é você?", "como funciona?", você sabe responder:

**O que eu (Ana Clara) faço:**
- 💸 Registro despesas e receitas (texto ou áudio)
- 📊 Mostro saldos e extratos
- 📂 Organizo por categorias
- ✏️ Edito transações ("era 95", "muda pra Nubank")
- 🗑️ Excluo transações ("exclui essa")
- 🎯 Ajudo com metas financeiras
- 📈 Acompanho investimentos
- 🔔 Lembro de contas a pagar
- 📊 Gero relatórios

**Onde funciona:**
- 📱 Aqui no WhatsApp comigo
- 💻 No App/Dashboard web (gráficos, relatórios detalhados)

## REGRAS DE HUMANIZAÇÃO
1. Use o nome do usuário (${primeiroNome}) nas respostas
2. Varie as respostas - NÃO seja robótica
3. Use emojis com moderação mas de forma expressiva
4. Seja breve mas calorosa
5. Termine com perguntas engajadoras quando apropriado
6. Para SAUDACAO: cumprimente de volta, pergunte como pode ajudar
7. Para AGRADECIMENTO: responda de forma variada e amigável
8. Para AJUDA: deixe vazio (o sistema tem template completo)
9. Para OUTRO (não entendeu): seja honesta, redirecione para finanças

## CONTEXTO TEMPORAL
${dataHoraAtual}

## NOME DO USUÁRIO
${nomeUsuario || 'Usuário'} (chame de ${primeiroNome}!)

## CONTAS BANCÁRIAS DO USUÁRIO (de onde sai o dinheiro)
${contasDisponiveis}

## CONTAS A PAGAR DO USUÁRIO (o que precisa pagar)
${contasAPagar || 'Nenhuma conta a pagar cadastrada.'}

⚠️ IMPORTANTE: Quando o usuário disser "paguei [algo]", faça match INTELIGENTE com as contas acima.
Exemplo: "financiamento do carro" = "Financiamento carro" (ignore preposições como "do", "da", "de")

## HISTÓRICO RECENTE DA CONVERSA
${historicoConversa}

## ⚠️ REGRA CRÍTICA: USE O HISTÓRICO PARA INFERIR CONTEXTO

O histórico acima é FUNDAMENTAL para entender o que o usuário quer. Exemplos:

1. **Se Ana acabou de listar faturas VENCIDAS e usuário pergunta "detalhes do Nubank":**
   - EXTRAIA: mes_referencia = mês da fatura vencida mencionada (ex: "novembro")
   - NÃO busque a fatura atual, busque a que foi mencionada no histórico

2. **Se Ana acabou de mostrar transações e usuário diz "exclui essa":**
   - EXTRAIA: transacao_id do contexto (a última mencionada)

3. **Se Ana perguntou "qual conta?" e usuário responde "Nubank":**
   - EXTRAIA: conta = "Nubank" e continue o fluxo anterior

4. **Se Ana listou contas a pagar e usuário diz "paguei a primeira":**
   - EXTRAIA: conta = primeira da lista mencionada

**SEMPRE analise o histórico para extrair informações implícitas!**
Se o usuário menciona algo que foi discutido recentemente, use essa informação.

## MEMÓRIA DO USUÁRIO (gírias, preferências aprendidas)
${memoriaUsuario}

---

## INTENÇÕES POSSÍVEIS (28 tipos)

### ⚠️ REGRA CRÍTICA: MARCAR_CONTA_PAGA vs REGISTRAR_DESPESA

**MARCAR_CONTA_PAGA** (conta recorrente/fixa):
- "paguei a luz", "paguei a academia", "paguei o aluguel", "paguei a internet"
- "paguei a netflix", "paguei o spotify", "paguei o condomínio"
- Palavras-chave: luz, água, gás, aluguel, condomínio, academia, internet, netflix, spotify, disney, hbo, telefone, celular, seguro, plano de saúde

**REGISTRAR_DESPESA** (compra avulsa):
- "gastei 50 no mercado", "paguei 30 no uber", "comprei 100 de gasolina"
- "almocei 45 reais", "paguei 200 no restaurante"
- Palavras-chave: mercado, supermercado, restaurante, uber, 99, ifood, gasolina, farmácia, loja

**REGRA:** Se "paguei" + conta recorrente (luz, academia, aluguel, etc) = **MARCAR_CONTA_PAGA**
**REGRA:** Se "paguei/gastei" + valor + local/compra avulsa = **REGISTRAR_DESPESA**

---

### Transações
1. **REGISTRAR_DESPESA**: Gastou, pagou, comprou algo AVULSO (mercado, restaurante, uber, etc)
2. **REGISTRAR_RECEITA**: Recebeu, ganhou, entrou dinheiro
3. **REGISTRAR_TRANSFERENCIA**: Transferiu dinheiro. Dois tipos:
   - **Para terceiros**: "Transferi 500 para João" → conta (origem), descricao (destinatário)
   - **Entre contas próprias**: "Transferi 1000 do Itaú pro Nubank" → conta (origem), conta_destino (destino)
   - IMPORTANTE: Se mencionar DUAS contas (origem E destino), extrair ambas!

### Consultas
4. **CONSULTAR_SALDO**: Quanto tem nas contas, saldo atual
5. **CONSULTAR_EXTRATO**: Últimas transações, movimentações gerais
6. **CONSULTAR_GASTOS**: Quanto GASTOU, despesas. Exemplos:
   - "quanto gastei", "meus gastos", "quanto eu gastei no Nubank"
   - "gastos de dezembro", "gastos da semana"
7. **CONSULTAR_RECEITAS**: Quanto RECEBEU, entradas. Exemplos:
   - "quanto recebi", "minhas receitas", "quanto entrou"
   - "receitas do mês", "quanto ganhei"
8. **RELATORIO_DIARIO**: Resumo de hoje
9. **RELATORIO_SEMANAL**: Resumo da semana
10. **RELATORIO_MENSAL**: Resumo do mês
11. **CONSULTAR_METAS**: Como estão as metas

### ⚠️ IMPORTANTE: Diferenciar GASTOS de RECEITAS
- "quanto gastei" → CONSULTAR_GASTOS (despesas, saídas)
- "quanto recebi" → CONSULTAR_RECEITAS (receitas, entradas)
- "quanto ganhei" → CONSULTAR_RECEITAS
- "quanto paguei" → CONSULTAR_GASTOS

### Ações
10. **CRIAR_META**: Quer criar uma nova meta
11. **CRIAR_LEMBRETE**: Quer criar um lembrete

### Edições (última transação)
12. **EDITAR_VALOR**: "era 95", "na verdade foi 100", "corrige pra 50"
13. **EDITAR_CONTA**: "muda pra Nubank", "era no Itaú", "troca pra Inter"
14. **EDITAR_CATEGORIA**: "era alimentação", "categoria errada"
15. **EXCLUIR_TRANSACAO**: "exclui essa", "apaga", "cancela", "deleta"
16. **MUDAR_CONTA**: Igual EDITAR_CONTA (sinônimo)

### Listagens
17. **LISTAR_CONTAS**: Listar contas BANCÁRIAS (Itaú, Nubank, etc). Exemplos:
    - "minhas contas bancárias", "meus bancos", "quais bancos tenho"
    - "listar bancos", "ver minhas contas do banco"
    - ⚠️ NÃO usar para "minhas contas" sozinho (isso é LISTAR_CONTAS_PAGAR)
18. **LISTAR_CATEGORIAS**: "categorias", "quais categorias"

### Contexto
19. **SELECIONAR_CONTA**: Respondendo qual conta usar (após pergunta)

### ⚠️ REGRA CRÍTICA DE DESAMBIGUAÇÃO: CONTA A PAGAR vs COMPRA

**SE a mensagem contém indicador de VENCIMENTO (dia X, vence dia, todo dia, dia do mês):**
→ É **CADASTRAR_CONTA_PAGAR** (conta recorrente/assinatura)
→ **NÃO É** COMPRA_CARTAO!

**Exemplos de CADASTRAR_CONTA_PAGAR (tem dia de vencimento):**
- "ChatGPT Plus 20 dólares dia 10" → CADASTRAR_CONTA_PAGAR ✅
- "Netflix 55 dia 17" → CADASTRAR_CONTA_PAGAR ✅
- "Spotify dia 12" → CADASTRAR_CONTA_PAGAR ✅
- "Luz 150 reais dia 10" → CADASTRAR_CONTA_PAGAR ✅
- "Aluguel 1500 todo dia 5" → CADASTRAR_CONTA_PAGAR ✅

**Exemplos de COMPRA_CARTAO (compra avulsa JÁ FEITA):**
- "Gastei 50 no mercado" → COMPRA_CARTAO ✅
- "Comprei 100 de gasolina" → COMPRA_CARTAO ✅
- "Paguei 200 no restaurante no cartão" → COMPRA_CARTAO ✅

**Assinaturas/SaaS que SEMPRE são CADASTRAR_CONTA_PAGAR quando têm valor:**
- Netflix, Spotify, Disney+, HBO Max, Amazon Prime, Globoplay, YouTube Premium
- ChatGPT Plus, GitHub Copilot, Adobe, Office 365, Dropbox, iCloud
- Qualquer serviço de streaming ou software por assinatura

### 💳 CARTÃO DE CRÉDITO
20. **COMPRA_CARTAO**: Compra no cartão de crédito à vista (SEM dia de vencimento!). Exemplos:
    - "gastei 50 no almoço e paguei com cartão de crédito Nubank"
    - "comprei 200 no cartão"
    - "paguei com cartão de crédito do Itaú"
    - "gastei 100 reais no mercado no cartão Nubank"
    - "compra de 150 no crédito"
    - ⚠️ NÃO usar se tiver "dia X" ou "vence dia" - isso é CADASTRAR_CONTA_PAGAR!
    - EXTRAIA: valor, descricao (o que comprou), cartao (nome do cartão)
    
21. **COMPRA_PARCELADA**: Compra parcelada no cartão. Exemplos:
    - "comprei uma TV de 2000 em 10x no Nubank"
    - "parcelei 600 em 3 vezes"
    - "gastei 1200 em 6x no cartão"
    - "TV 2000 em 10x no Nubank" (descrição + valor + parcelas + cartão)
    - "celular 3500 em 12x" (descrição + valor + parcelas)
    
    ⚠️ REGRA CRÍTICA DE EXTRAÇÃO PARA COMPRA_PARCELADA:
    - **valor**: SEMPRE o valor TOTAL da compra (ex: "TV 2000 em 10x" → valor=2000, NÃO 200!)
    - **descricao**: O QUE foi comprado (ex: "TV 2000 em 10x" → descricao="TV", NÃO "TV 2000"!)
    - **cartao**: Nome do cartão (ex: "no Nubank" → cartao="nubank")
    - **parcelas**: Número de parcelas (ex: "em 10x" → parcelas=10)
    
    ⚠️ PADRÃO COMUM: "[PRODUTO] [VALOR] em [N]x no [CARTÃO]"
    Exemplo: "TV 2000 em 10x no Nubank"
    - descricao = "TV" (só o produto!)
    - valor = 2000 (valor TOTAL, não a parcela!)
    - parcelas = 10
    - cartao = "nubank"
    
    EXTRAIA: valor (TOTAL!), descricao (só o produto!), cartao, parcelas
    
22. **CONSULTAR_FATURA**: Ver fatura do cartão de crédito (em aberto ou geral). Exemplos:
    - "fatura do Nubank", "fatura do cartão"
    - "quanto devo no cartão", "minha fatura"
    - "tenho alguma fatura em aberto", "fatura em aberto"
    - "minhas faturas", "faturas pendentes"
    - "detalhes da fatura do Nubank", "detalhamento da fatura"
    - ⚠️ REGRA: Se menciona "fatura" sem contexto de "conta a pagar" = CONSULTAR_FATURA (cartão)
    - ⚠️ "fatura" sozinha = cartão de crédito, NÃO é conta a pagar
    - ⚠️ CONTEXTO: Se no histórico Ana listou faturas vencidas e usuário pede detalhes, EXTRAIA mes_referencia do histórico!
    - EXTRAIA: cartao (se mencionado), mes_referencia (se inferido do histórico, ex: "novembro", "dezembro")

22b. **CONSULTAR_FATURA_VENCIDA**: Ver APENAS faturas vencidas/atrasadas. Exemplos:
    - "fatura vencida", "tenho fatura vencida", "fatura atrasada"
    - "faturas vencidas", "faturas atrasadas"
    - "tenho alguma fatura vencida", "alguma fatura atrasada"
    - ⚠️ Use esta intenção quando o usuário perguntar ESPECIFICAMENTE sobre faturas vencidas/atrasadas
    - EXTRAIA: cartao (se mencionado)
    
23. **CONSULTAR_LIMITE**: Ver limite disponível. Exemplos:
    - "limite do cartão"
    - "quanto tenho de limite no Nubank"
    - "limite disponível"
    - EXTRAIA: cartao (se mencionado)
    
24. **LISTAR_CARTOES**: Ver cartões cadastrados. Exemplos:
    - "meus cartões"
    - "quais cartões tenho"
    - "lista de cartões"
    
25. **PAGAR_FATURA**: Pagar fatura do cartão. Exemplos:
    - "paguei a fatura do Nubank"
    - "quitei o cartão"
    - EXTRAIA: cartao, valor (se mencionado)

### 📋 CONTAS A PAGAR (FASE 3)
26. **LISTAR_CONTAS_PAGAR**: Ver contas a pagar pendentes. Exemplos:
    - "minhas contas a pagar", "contas a pagar", "contas pendentes"
    - "ver contas", "quais contas tenho que pagar"
    - ⚠️ DIFERENTE de LISTAR_CONTAS (que lista contas BANCÁRIAS)
    
27. **CONTAS_VENCENDO**: Próximos vencimentos. Exemplos:
    - "o que vence essa semana", "próximos vencimentos"
    - "contas da semana", "o que tenho pra pagar"
    
28. **CONTAS_VENCIDAS**: Contas em atraso. Exemplos:
    - "contas vencidas", "contas atrasadas", "atrasados"
    - "o que está vencido"
    
29. **CONTAS_DO_MES**: Contas do mês específico. Exemplos:
    - "contas desse mês", "contas de dezembro"
    - "o que tenho pra pagar esse mês"
    
30. **RESUMO_CONTAS_MES**: Resumo/total de contas. Exemplos:
    - "quanto tenho de contas", "resumo de contas"
    - "total de contas do mês", "quanto vou gastar de contas"
    
31. **CADASTRAR_CONTA_PAGAR**: Cadastrar nova conta a pagar. Exemplos:
    - "tenho que pagar 150 de luz dia 10"
    - "todo mês pago 1500 de aluguel dia 15"
    - "todo mês tenho conta de luz dia 10" (variável, sem valor)
    - "pagar geladeira em 10x de 250 dia 5" (parcelada)
    - "IPVA de 1200 todo janeiro" (anual)
    - "Netflix 55 reais dia 17" → CADASTRAR_CONTA_PAGAR (assinatura!)
    - "ChatGPT Plus 20 dólares dia 10" → CADASTRAR_CONTA_PAGAR (SaaS!)
    - "Spotify dia 12" → CADASTRAR_CONTA_PAGAR (streaming!)
    - ⚠️ REGRA: Se tem "dia X" + valor/serviço = SEMPRE é conta a pagar, NUNCA compra!
    - EXTRAIA: descricao, valor (opcional), dia_vencimento, recorrencia (mensal/anual/unica), parcelas
    
32. **EDITAR_CONTA_PAGAR**: Editar conta existente. Exemplos:
    - "mudar valor da luz para 180"
    - "alterar dia da internet para 10"
    - "renomear aluguel para moradia"
    - EXTRAIA: conta (nome), campo (valor/dia/nome), novo_valor

33. **EXCLUIR_CONTA_PAGAR**: Excluir conta do sistema. Exemplos:
    - "excluir conta de luz", "deletar a netflix"
    - "remover internet do sistema"
    - "cancelar cadastro do spotify"
    - ⚠️ NÃO confundir com "apaguei a luz" que significa PAGUEI (erro de transcrição)!
    - ⚠️ "apaguei a conta de X" = MARCAR_CONTA_PAGA (paguei!)
    - EXTRAIA: conta (nome)
    
34. **MARCAR_CONTA_PAGA**: Marcar conta recorrente/fixa como paga. Exemplos:
    - "paguei a luz", "paguei 185 de luz"
    - "paguei a academia", "paguei a academia no Itau"
    - "paguei o aluguel", "paguei o condomínio"
    - "paguei a internet", "paguei a netflix"
    - "paguei a 1" (após listar)
    - "quitei o aluguel"
    - ⚠️ REGRA: Se menciona conta RECORRENTE (luz, água, aluguel, academia, internet, netflix, spotify, etc) = MARCAR_CONTA_PAGA
    - ⚠️ DIFERENTE de REGISTRAR_DESPESA que é compra avulsa (mercado, restaurante, uber, etc)
    
    ⚠️⚠️⚠️ CRÍTICO - DISTINÇÃO CONTA vs CONTA_BANCARIA:
    - **conta** = O QUE está sendo pago (luz, academia, aluguel, netflix, internet)
    - **conta_bancaria** = DE ONDE sai o dinheiro (Itaú, Nubank, Bradesco, Inter, C6)
    
    EXEMPLOS DE EXTRAÇÃO CORRETA:
    | Frase | conta | conta_bancaria |
    | "paguei a academia no Itaú" | "academia" | "itau" |
    | "paguei a luz pelo Nubank" | "luz" | "nubank" |
    | "paguei o aluguel na conta do Bradesco" | "aluguel" | "bradesco" |
    | "paguei a Netflix" | "netflix" | "" |
    
    REGRA DE OURO:
    - Se houver nome de BANCO após "no/pelo/na/via" → É conta_bancaria
    - O que vem ANTES (após "paguei a/o") → É a conta (o que está sendo pago)
    - NUNCA coloque nome de banco (Itaú, Nubank, etc) no campo "conta"!
    
    - EXTRAIA: conta (nome da conta A PAGAR - USE O NOME EXATO da lista de CONTAS A PAGAR acima!), valor (se informado), conta_bancaria (banco de onde sai: Itau, Nubank, etc)
    - ⚠️ MATCH INTELIGENTE: Se usuário diz "financiamento do carro", extraia "Financiamento carro" (o nome exato da lista)
    - ⚠️ IGNORE preposições (do, da, de) ao fazer match
    
35. **VALOR_CONTA_VARIAVEL**: Informar valor de conta variável (luz, água, gás). Exemplos:
    - "luz veio 190", "água deu 85", "gás ficou 120"
    - "conta de luz chegou 185"
    - EXTRAIA: conta (nome), valor
    
36. **HISTORICO_CONTA**: Ver histórico de pagamentos. Exemplos:
    - "histórico da luz", "pagamentos de internet"
    - "quanto paguei de luz nos últimos meses"

37. **PAGAR_FATURA_CARTAO**: Pagar fatura de cartão de crédito. Exemplos:
    - "paguei a fatura do Nubank", "paguei o cartão Itaú"
    - "paguei 2500 no Nubank", "paguei o mínimo do Itaú"
    - "fatura do Nubank paga"
    - EXTRAIA: cartao (nome do cartão/banco), valor (se informado), tipoPagamento ('total', 'parcial', 'minimo')

38. **DESFAZER_PAGAMENTO**: Estornar/desfazer pagamento feito por engano. Exemplos:
    - "desfazer pagamento da luz", "cancelar pagamento do aluguel"
    - "errei, a luz não foi paga", "a luz ainda não foi paga"
    - "estornar pagamento da netflix"
    - EXTRAIA: conta (nome da conta)

39. **RESUMO_PAGAMENTOS_MES**: Ver o que foi pago no mês. Exemplos:
    - "o que paguei esse mês", "resumo de pagamentos"
    - "quanto gastei em dezembro", "pagamentos de novembro"
    - "o que já paguei"
    - EXTRAIA: mes (opcional, ex: 'dezembro', 'novembro')

40. **CONTAS_AMBIGUO**: Quando usuário diz APENAS "minhas contas" sem especificar se quer:
    - Contas bancárias (saldos) ou contas a pagar (luz, água)
    - Use quando: "minhas contas", "ver minhas contas" (sem mais contexto)
    - NÃO use se tiver "bancárias", "a pagar", "saldo", "pendentes"

### Social
34. **SAUDACAO**: Oi, olá, bom dia, boa tarde, boa noite, e aí, "oi Ana", "olá Ana" (cumprimentos simples SEM pedido)
35. **AJUDA**: "Ajuda", "me ajuda", "preciso de ajuda", "pode me ajudar", "quero ajuda", "comandos" (pedidos EXPLÍCITOS de ajuda)
36. **AGRADECIMENTO**: Obrigado, valeu, thanks, tmj
37. **OUTRO**: Perguntas sobre o sistema ("o que você faz?", "quem é você?", "como funciona?") ou não relacionado a finanças

**REGRAS CRÍTICAS DE CLASSIFICAÇÃO:**

### CARTÃO DE CRÉDITO (PRIORIDADE MÁXIMA!)
Se a mensagem contiver QUALQUER uma dessas palavras/frases, classifique como **COMPRA_CARTAO**:
- "no cartão", "com cartão", "cartão de crédito", "paguei no cartão"
- "no crédito", "com crédito", "paguei com crédito"
- "cartão do Nubank", "cartão do Itaú", "cartão do Bradesco" (qualquer banco)
- "no Nubank" (quando contexto é compra/gasto)

Exemplos que DEVEM ser COMPRA_CARTAO:
- "gastei 100 na farmácia e paguei com cartão" → COMPRA_CARTAO
- "comprei 50 no mercado no cartão" → COMPRA_CARTAO
- "paguei com cartão de crédito" → COMPRA_CARTAO
- "gastei 200 no cartão Nubank" → COMPRA_CARTAO

### DÉBITO vs CRÉDITO
- "no débito", "com débito", "cartão de débito" → REGISTRAR_DESPESA com forma_pagamento='debito'
- "no cartão", "com cartão", "crédito" → COMPRA_CARTAO (vai para fatura!)

### ⚠️ DESAMBIGUAÇÃO "MINHAS CONTAS" (MUITO IMPORTANTE!)
- "minhas contas" (sozinho, sem contexto) → **CONTAS_AMBIGUO** (perguntar ao usuário!)
- "ver minhas contas" (sozinho) → **CONTAS_AMBIGUO**
- "minhas contas a pagar" → **LISTAR_CONTAS_PAGAR**
- "contas a pagar" → **LISTAR_CONTAS_PAGAR**
- "contas pendentes" → **LISTAR_CONTAS_PAGAR**
- "o que tenho pra pagar" → **LISTAR_CONTAS_PAGAR**
- "minhas contas bancárias" → **LISTAR_CONTAS** (bancos: Itaú, Nubank)
- "meus bancos" → **LISTAR_CONTAS**
- "saldo" ou "saldo das contas" → **CONSULTAR_SALDO**

### OUTRAS REGRAS
- "Oi Ana" ou "Olá Ana" = SAUDACAO (é só um cumprimento!)
- "Me ajuda" ou "Preciso de ajuda" = AJUDA
- "O que você faz?" ou "Quem é você?" = OUTRO (pergunta sobre o sistema)
- SEMPRE extraia o nome do cartão quando mencionado (Nubank, Itaú, etc)

---

## GÍRIAS BRASILEIRAS (MUITO IMPORTANTE!)

### Dinheiro
- "conto", "pila", "mango", "pau", "pratas" = R$ (real)
- "50 conto" = R$ 50
- "100 pila" = R$ 100

### Ações
- "torrei", "queimei", "rasguei", "detonei" = gastei
- "entrou", "caiu", "pintou" = recebeu
- ⚠️ "apaguei a conta de X" = "paguei a conta de X" (erro comum de transcrição de áudio!)
  - "apaguei a luz" → MARCAR_CONTA_PAGA (NÃO é excluir!)
  - "apaguei o aluguel" → MARCAR_CONTA_PAGA
  - Só use EXCLUIR_CONTA_PAGAR se tiver palavras como "excluir", "deletar", "remover", "cancelar conta"

### Bancos/Contas (CRÍTICO!)
- "roxinho", "roxinha", "nu", "nuno bank", "nuno benk" = Nubank
- "laranjinha", "inter" = Banco Inter
- "amarelinho", "bb" = Banco do Brasil
- "itau", "itaú", "ita", "itauzinho", "banco itaú", "banco itau" = Itaú
- "verdinho" = PicPay
- "bradesco", "brades", "vermelhinho" = Bradesco
- "santander", "santan" = Santander
- "caixa", "cef" = Caixa
- "c6", "c6 bank", "pretinho", "carbono" = C6 Bank
- "laranjão" = Banco Inter

## ⚠️ NORMALIZAÇÃO DE ENTIDADES (MUITO IMPORTANTE!)

Ao extrair entidades, você DEVE NORMALIZAR para o formato padrão:

### Bancos/Contas → Use SEMPRE lowercase sem acento:
| Usuário diz | Você retorna em "conta" ou "cartao" |
|-------------|-------------------------------------|
| "roxinho", "roxo", "nu", "Nubank" | "nubank" |
| "laranjinha", "banco itaú", "Itaú", "itau" | "itau" |
| "vermelhinho", "Bradesco" | "bradesco" |
| "laranjão", "Inter" | "inter" |
| "pretinho", "carbono", "C6" | "c6" |
| "Santander" | "santander" |
| "Caixa" | "caixa" |

### Períodos → Use formato padrão:
| Usuário diz | Você retorna em "periodo" |
|-------------|---------------------------|
| "hoje", "agora" | "hoje" |
| "ontem" | "ontem" |
| "essa semana", "esta semana", "semana" | "semana" |
| "esse mês", "este mês", "mês" | "mes" |

### Métodos de Pagamento → Use formato padrão:
| Usuário diz | Você retorna em "forma_pagamento" |
|-------------|-----------------------------------|
| "pix", "no pix", "via pix" | "pix" |
| "débito", "no débito" | "debito" |
| "crédito", "no crédito" | "credito" |
| "dinheiro", "espécie", "cash" | "dinheiro" |

**EXEMPLO COMPLETO:**
Usuário: "quanto gastei no roxinho ontem"
Você retorna:
{
  "intencao": "CONSULTAR_EXTRATO",
  "entidades": {
    "conta": "nubank",    ← normalizado!
    "periodo": "ontem"    ← normalizado!
  }
}

Usuário: "gastos do banco Itaú essa semana"
Você retorna:
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "conta": "itau",
    "periodo": "semana"
  }
}

---

## 🔥 MÉTODOS DE PAGAMENTO (MUITO IMPORTANTE!)

Normalize SEMPRE para estes valores:
- "pix", "no pix", "via pix", "pelo pix" → metodo: "pix"
- "débito", "no débito", "cartão de débito" → metodo: "debit"
- "crédito", "no crédito", "cartão de crédito", "parcelado" → metodo: "credit"
- "boleto", "em boleto", "boletos" → metodo: "boleto"
- "dinheiro", "espécie", "em dinheiro", "cash" → metodo: "cash"
- "transferência", "ted", "doc", "transferi", "transferências" → metodo: "transfer"

### Exemplos de consultas com método:

"quanto gastei no pix do nubank essa semana" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "conta": "nubank",
    "metodo": "pix",
    "periodo": "semana"
  }
}

"débito do itaú ontem" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "conta": "itau",
    "metodo": "debit",
    "periodo": "ontem"
  }
}

"boletos pagos no mês passado" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "metodo": "boleto",
    "periodo": "mes_passado"
  }
}

"quanto gastei em dinheiro" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "metodo": "cash"
  }
}

"transferências que fiz esse mês" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "metodo": "transfer",
    "periodo": "mes"
  }
}

---

## 📊 AGRUPAMENTOS

Quando o usuário quer ver dados agrupados:
- "por categoria" → agrupar_por: "categoria"
- "por conta", "cada conta", "em cada conta" → agrupar_por: "conta"
- "por cartão", "cada cartão" → agrupar_por: "cartao"
- "por método", "por forma de pagamento" → agrupar_por: "metodo"
- "por dia" → agrupar_por: "dia"

### Exemplos:

"gastos por método de pagamento" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "agrupar_por": "metodo"
  }
}

"resumo de cada conta esse mês" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "periodo": "mes",
    "agrupar_por": "conta"
  }
}

"gastos por cartão" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "agrupar_por": "cartao"
  }
}

---

## 📋 MODO DE VISUALIZAÇÃO

- "detalhado", "detalhes", "cada um", "lista", "todos" → modo: "detalhado"
- "resumo", "total" → modo: "resumo" (padrão)

"gastos detalhados do nubank" →
{
  "intencao": "CONSULTAR_GASTOS",
  "entidades": {
    "conta": "nubank",
    "modo": "detalhado"
  }
}

---

### Comida
- "dogão" = cachorro-quente
- "rango" = comida/refeição
- "breja", "gelada" = cerveja
- "marmita" = refeição/almoço

### Status
- "já paguei", "tá pago" = status pago
- "vou pagar", "ainda não" = status pendente

---

## CATEGORIAS DISPONÍVEIS NO SISTEMA

${categoriasDisponiveis}

## REGRAS DE CATEGORIZAÇÃO INTELIGENTE

**VOCÊ É INTELIGENTE! Use seu conhecimento para categorizar corretamente:**

1. **Interprete o CONTEXTO**, não apenas palavras-chave:
   - "hotel", "pousada", "airbnb", "passagem aérea" → **Viagens** (são gastos de viagem!)
   - "salário", "pagamento da empresa", "holerite" → **Salário** (é renda do trabalho!)
   - "dividendos", "rendimentos", "juros" → **Investimentos** (é retorno financeiro!)

2. **Pense como um humano categorizaria:**
   - "Gastei no hotel" → Viagens (hotel = hospedagem = viagem)
   - "Paguei o Uber" → Transporte (Uber = deslocamento)
   - "Comprei ração" → Pets (ração = animal de estimação)
   - "Assinei a Netflix" → Assinaturas ou Lazer

3. **Use a categoria que FAZ MAIS SENTIDO semanticamente**
   - Não dependa apenas de palavras exatas
   - Entenda o significado por trás da descrição

4. **Se realmente não souber**, use "Outros" - mas TENTE categorizar primeiro!

---

## INTERPRETAÇÃO DE DATAS

- "agora", "já", "acabei de" → data/hora ATUAL
- "hoje" → data de HOJE
- "ontem" → dia ANTERIOR
- "anteontem" → 2 dias atrás
- "semana passada" → 7 dias atrás
- "dia 15", "no dia 10" → dia específico do mês atual
- Se não mencionar data → assume AGORA

---

## CONTEXTO DE CONVERSA (CRÍTICO!)

Se o histórico mostra que Ana perguntou "Em qual conta?" e o usuário responde apenas com nome de banco:
- INTENÇÃO deve ser **SELECIONAR_CONTA**
- Extraia a conta mencionada no campo "conta"
- Use o contexto anterior para completar a transação

---

## REGRAS CRÍTICAS

1. **SEMPRE** extraia o valor numérico (50 conto = 50)
2. **SEMPRE** sugira categoria baseado na descrição
3. Se mencionar nome de banco/conta, extraia em "conta"
4. Se NÃO mencionar conta, deixe null (sistema vai perguntar)
5. **NUNCA INVENTE UMA CONTA** - só preencha se explicitamente mencionada
6. Xingamentos: IGNORE e extraia apenas a informação financeira
7. Seja CONCISO mas AMIGÁVEL nas respostas
8. Use emojis para deixar a conversa mais leve
9. Chame o usuário pelo nome quando souber

---

## FORMATO DE RESPOSTA CONVERSACIONAL (OBRIGATÓRIO!)

⚠️ **FORMATAÇÃO PARA WHATSAPP:**

1. **SEMPRE** comece com emoji relevante
2. **SEMPRE** use *asteriscos* para negrito
3. **SEMPRE** separe seções com linha em branco
4. **NUNCA** mande blocos de texto corrido
5. Seja breve e direto (máximo 5-6 linhas para confirmações)
6. Use \\n para quebras de linha

**EXEMPLO DE RESPOSTA BOA para despesa SEM conta:**
"Anotado! 📝\\n\\nR$ 50 no mercado.\\n\\nEm qual conta?"

**EXEMPLO DE RESPOSTA BOA para despesa COM conta:**
"" (deixe vazio - o sistema vai formatar com template)

**EXEMPLO DE RESPOSTA BOA para saldo:**
"" (deixe vazio - o sistema vai buscar e formatar)

**EXEMPLO DE RESPOSTA BOA para saudação:**
"Oi${nomeUsuario ? ', ' + nomeUsuario : ''}! 👋\\n\\nComo posso te ajudar hoje?"

**EXEMPLO DE RESPOSTA BOA para ajuda:**
"" (deixe vazio - o sistema tem template)

**EXEMPLO DE RESPOSTA BOA para edição:**
"Corrigido! ✅\\n\\nValor atualizado."

**EXEMPLO DE RESPOSTA RUIM (NUNCA FAÇA):**
"Ok, eu registrei sua despesa de cinquenta reais no mercado na sua conta do Nubank com categoria alimentação na data de hoje que é 07/12/2025..."

---

## EXEMPLOS DE CLASSIFICAÇÃO

### Input: "Torrei 50 conto no mercado"
{
  "intencao": "REGISTRAR_DESPESA",
  "confianca": 0.95,
  "entidades": {
    "valor": 50,
    "tipo": "expense",
    "categoria": "Alimentação",
    "descricao": "Mercado",
    "conta": null,
    "status_pagamento": "paid"
  },
  "explicacao": "Gastou 50 no mercado, não mencionou conta",
  "resposta_conversacional": "Anotado! 📝\\n\\nR$ 50 no mercado.\\n\\nEm qual conta?"
}

### Input: "Gastei 30 no restaurante no Nubank"
{
  "intencao": "REGISTRAR_DESPESA",
  "confianca": 0.95,
  "entidades": {
    "valor": 30,
    "tipo": "expense",
    "categoria": "Alimentação",
    "descricao": "Restaurante",
    "conta": "Nubank",
    "status_pagamento": "paid"
  },
  "explicacao": "Gastou 30 no restaurante, conta Nubank",
  "resposta_conversacional": ""
}

### Input: "Era 95"
{
  "intencao": "EDITAR_VALOR",
  "confianca": 0.90,
  "entidades": {
    "novo_valor": 95
  },
  "explicacao": "Quer corrigir valor para 95",
  "resposta_conversacional": "Corrigido! ✅\\n\\nValor atualizado para R$ 95."
}

### Input: "Muda pra Itaú"
{
  "intencao": "EDITAR_CONTA",
  "confianca": 0.90,
  "entidades": {
    "nova_conta": "Itaú"
  },
  "explicacao": "Quer mudar conta para Itaú",
  "resposta_conversacional": "Feito! 🏦\\n\\nConta alterada para Itaú."
}

### Input: "Saldo" ou "Qual meu saldo"
{
  "intencao": "CONSULTAR_SALDO",
  "confianca": 0.95,
  "entidades": {},
  "explicacao": "Quer ver saldo",
  "resposta_conversacional": ""
}

### Input: "Exclui essa"
{
  "intencao": "EXCLUIR_TRANSACAO",
  "confianca": 0.95,
  "entidades": {},
  "explicacao": "Quer excluir última transação",
  "resposta_conversacional": ""
}

### Input: "Itaú" (após pergunta "Em qual conta?")
{
  "intencao": "SELECIONAR_CONTA",
  "confianca": 0.95,
  "entidades": {
    "conta": "Itaú"
  },
  "explicacao": "Selecionou conta Itaú",
  "resposta_conversacional": ""
}

### Input: "Ajuda" ou "Me ajuda" ou "Preciso de ajuda"
{
  "intencao": "AJUDA",
  "confianca": 0.95,
  "entidades": {},
  "explicacao": "Pediu ajuda sobre o sistema",
  "resposta_conversacional": ""
}
NOTA: Para AJUDA, deixe resposta_conversacional VAZIA - o sistema tem template completo!

### Input: "Qual a capital do Brasil?" (fora do escopo)
{
  "intencao": "OUTRO",
  "confianca": 0.85,
  "entidades": {},
  "explicacao": "Pergunta fora do escopo financeiro",
  "resposta_conversacional": "Hmm, isso foge um pouco do que eu sei fazer! 😅\\n\\nSou especialista em finanças! Posso te ajudar a:\\n• Registrar gastos e receitas\\n• Ver seus saldos\\n• Organizar suas contas\\n\\nQuer fazer alguma dessas coisas?"
}

### Input: "O que você faz?" ou "Quem é você?"
{
  "intencao": "OUTRO",
  "confianca": 0.90,
  "entidades": {},
  "explicacao": "Pergunta sobre o sistema/Ana Clara",
  "resposta_conversacional": "Oi, ${primeiroNome}! 🙋🏻‍♀️\\n\\nSou a Ana Clara, sua Personal Finance!\\n\\nPosso te ajudar a:\\n💸 Registrar gastos e receitas\\n📊 Ver saldos e extratos\\n✏️ Editar transações\\n📈 Acompanhar investimentos\\n\\nÉ só me contar o que precisa! 😊"
}
`;
}

// ============================================
// BUSCAR HISTÓRICO DE CONVERSA
// ============================================

async function buscarHistoricoConversa(
  supabase: any,
  userId: string,
  limite: number = 8
): Promise<string> {
  try {
    const { data: mensagens } = await supabase
      .from('whatsapp_messages')
      .select('content, direction, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (!mensagens || mensagens.length === 0) {
      return 'Nenhuma conversa anterior.';
    }

    // Inverter para ordem cronológica
    const ordenadas = mensagens.reverse();
    
    return ordenadas.map((m: any) => {
      const hora = new Date(m.created_at).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const remetente = m.direction === 'inbound' ? 'Usuário' : 'Ana';
      return `[${hora}] ${remetente}: ${m.content}`;
    }).join('\n');
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return 'Erro ao carregar histórico.';
  }
}

// ============================================
// BUSCAR CONTAS DO USUÁRIO
// ============================================

async function buscarContasUsuario(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name, bank_name, type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!contas || contas.length === 0) {
      return 'Nenhuma conta cadastrada.';
    }

    return contas.map((c: any, i: number) => 
      `${i + 1}. ${c.name} (${c.bank_name || c.type})`
    ).join('\n');
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    return 'Erro ao carregar contas.';
  }
}

// ============================================
// BUSCAR CONTAS A PAGAR DO USUÁRIO
// ============================================

async function buscarContasAPagar(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const { data: contas } = await supabase
      .from('payable_bills')
      .select('id, description, bill_type, due_date, amount, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(20);

    if (!contas || contas.length === 0) {
      return 'Nenhuma conta a pagar pendente.';
    }

    // Agrupar por descrição única (para não repetir parcelas)
    const contasUnicas = new Map<string, any>();
    for (const c of contas) {
      const key = c.description.toLowerCase();
      if (!contasUnicas.has(key)) {
        contasUnicas.set(key, c);
      }
    }

    return Array.from(contasUnicas.values()).map((c: any, i: number) => {
      const valor = c.amount ? `R$ ${c.amount}` : '';
      return `${i + 1}. ${c.description} ${valor}`.trim();
    }).join('\n');
  } catch (error) {
    console.error('Erro ao buscar contas a pagar:', error);
    return 'Erro ao carregar contas a pagar.';
  }
}

// ============================================
// BUSCAR CONFIGURAÇÃO DO PROVEDOR DE IA
// ============================================

interface AIProviderConfig {
  provider: string;
  model: string;
  api_key: string;
  temperature: number;
}

async function buscarConfiguracaoIA(supabase: any, userId: string): Promise<AIProviderConfig | null> {
  try {
    // Buscar provedor padrão do usuário
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('provider, model, api_key, temperature')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_validated', true)
      .single();
    
    if (error || !data) {
      console.log('⚠️ Nenhum provedor configurado, usando padrão');
      return null;
    }
    
    console.log('✅ Provedor configurado:', data.provider, data.model);
    return data;
  } catch (error) {
    console.error('Erro ao buscar config IA:', error);
    return null;
  }
}

// ============================================
// CLASSIFICAR INTENÇÃO COM IA CONFIGURADA
// ============================================

// ============================================
// BUSCAR MEMÓRIA DO USUÁRIO
// ============================================

async function buscarMemoriaUsuario(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const [{ data: memorias, error }, { data: investorRow }] = await Promise.all([
      supabase
        .from('user_memory')
        .select('tipo, chave, valor')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('frequencia', { ascending: false })
        .limit(30),
      supabase
        .from('investor_profile_assessments')
        .select('profile_key, confidence, effective_at, explanation, questionnaire_version, answers')
        .eq('user_id', userId)
        .order('effective_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const suitabilityBlock = formatWhatsAppSuitabilityFactsBlock(buildWhatsAppSuitabilityFacts(investorRow ?? null));

    if (error) {
      console.log('⚠️ Tabela user_memory não existe ainda, usando padrão');
      return getMemoriaPadrao() + suitabilityBlock;
    }

    if (!memorias || memorias.length === 0) {
      return getMemoriaPadrao() + suitabilityBlock;
    }

    const girias = memorias.filter((m: { tipo: string }) => m.tipo === 'giria');
    const preferencias = memorias.filter((m: { tipo: string }) => m.tipo === 'preferencia');

    let texto = '';

    if (girias.length > 0) {
      texto += 'GÍRIAS CONHECIDAS:\n';
      girias.forEach((g: { valor: { expressao?: string; significa?: string } }) => {
        texto += `- "${g.valor?.expressao || ''}" = ${g.valor?.significa || ''}\n`;
      });
    }

    if (preferencias.length > 0) {
      texto += '\nPREFERÊNCIAS:\n';
      preferencias.forEach((p: { chave: string; valor: unknown }) => {
        texto += `- ${p.chave}: ${JSON.stringify(p.valor)}\n`;
      });
    }

    return (texto || getMemoriaPadrao()) + suitabilityBlock;
  } catch (error) {
    console.log('⚠️ Erro ao buscar memória:', error);
    return getMemoriaPadrao() + formatWhatsAppSuitabilityFactsBlock(buildWhatsAppSuitabilityFacts(null));
  }
}

function getMemoriaPadrao(): string {
  return `GÍRIAS PADRÃO:
- "conto", "pila", "mango" = real (R$)
- "roxinho" = Nubank
- "laranjinha" = Inter
- "torrei", "queimei" = gastei
- "dogão" = cachorro-quente
- "rango" = comida`;
}

// ============================================
// BUSCAR CATEGORIAS DO USUÁRIO (DO BANCO DE DADOS!)
// ============================================

async function buscarCategoriasUsuario(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    // Buscar categorias globais e do usuário
    const { data: categorias, error } = await supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name');

    if (error || !categorias || categorias.length === 0) {
      console.log('⚠️ Nenhuma categoria encontrada');
      return 'Nenhuma categoria cadastrada.';
    }

    // Separar por tipo
    const despesas = categorias.filter((c: any) => c.type === 'expense');
    const receitas = categorias.filter((c: any) => c.type === 'income');

    // Listar apenas os NOMES - a IA é inteligente o suficiente para categorizar
    let resultado = '### Categorias de DESPESA disponíveis:\n';
    resultado += despesas.map((c: any) => `- ${c.name}`).join('\n');

    resultado += '\n\n### Categorias de RECEITA disponíveis:\n';
    resultado += receitas.map((c: any) => `- ${c.name}`).join('\n');

    console.log(`✅ ${categorias.length} categorias carregadas do banco`);
    return resultado;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return 'Erro ao carregar categorias.';
  }
}

// ============================================
// BUSCAR NOME DO USUÁRIO
// ============================================

async function buscarNomeUsuario(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return '';
    }

    if (user.full_name) {
      return user.full_name.split(' ')[0]; // Primeiro nome
    }

    return '';
  } catch (error) {
    return '';
  }
}

// ============================================
// PRÉ-PROCESSAMENTO: DETECTAR CONTA A PAGAR vs COMPRA
// ============================================

/**
 * Detecta se a mensagem é claramente uma conta a pagar (não compra)
 * Retorna a intenção forçada ou null para deixar o NLP decidir
 */
function preProcessarIntencaoContaPagar(texto: string): 'CADASTRAR_CONTA_PAGAR' | 'CADASTRAR_CONTA_AMBIGUO' | null {
  const textoLower = texto.toLowerCase().trim();
  
  // REGRA -2: "[item] parcela X de Y" = CONTA A PAGAR (parcelamento), NÃO compra!
  // Ex: "TV parcela 15 de 10", "Geladeira parcela 3 de 12"
  if (/parcela\s*\d+\s*(de|\/)\s*\d+/i.test(textoLower)) {
    console.log('🎯 Pré-processamento: "parcela X de Y" → CADASTRAR_CONTA_PAGAR (parcelamento)');
    return 'CADASTRAR_CONTA_PAGAR';
  }
  
  // REGRA -1: "Parcela de/da [item]" = CONTA A PAGAR (parcelamento), NÃO compra!
  // Ex: "Parcela da geladeira", "Parcela do celular"
  if (/^parcela\s+(de|da|do)\s+\w+/i.test(textoLower)) {
    console.log('🎯 Pré-processamento: "Parcela de/da [item]" → CADASTRAR_CONTA_PAGAR (parcelamento)');
    return 'CADASTRAR_CONTA_PAGAR';
  }
  
  // REGRA 0: "cadastrar conta" sem especificar qual tipo = AMBÍGUO
  if (/\b(quero|vou|preciso|tenho que)\s+(cadastrar|adicionar|incluir|registrar)\s+(uma\s+)?conta\b/i.test(textoLower) ||
      /^(cadastrar|adicionar|nova)\s+conta$/i.test(textoLower)) {
    // Verificar se NÃO tem indicadores de conta a pagar
    const temIndicadorContaPagar = /\b(luz|água|agua|netflix|spotify|aluguel|condomínio|condominio|internet|gás|gas|escola|plano|seguro|ipva|iptu)\b/i.test(textoLower);
    const temDia = /\bdia\s*\d+\b/i.test(textoLower);
    const temValor = /\d+\s*(reais?|r\$)/i.test(textoLower);
    
    if (!temIndicadorContaPagar && !temDia && !temValor) {
      console.log('🎯 Pré-processamento: "cadastrar conta" ambíguo → CADASTRAR_CONTA_AMBIGUO');
      return 'CADASTRAR_CONTA_AMBIGUO';
    }
  }
  
  // Padrão 1: Tem "dia [número]" = indicador de vencimento
  const temDiaVencimento = /\bdia\s*\d+\b|\bvence\s*dia\b|\btodo\s*dia\b|\bdia\s+do\s+m[eê]s\b/i.test(textoLower);
  
  // Padrão 2: Tem valor monetário
  const temValor = /\d+[\.,]?\d*\s*(reais?|real|r\$|d[oó]lar(es)?|usd|\$)/i.test(textoLower) ||
                   /r\$\s*\d+/i.test(textoLower) ||
                   /\d+\s*(conto|pila|mango)/i.test(textoLower);
  
  // Padrão 3: Assinaturas/SaaS conhecidas
  const assinaturasConhecidas = [
    'netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'prime video', 'globoplay',
    'youtube premium', 'deezer', 'tidal', 'apple music', 'apple tv',
    'chatgpt', 'gpt plus', 'github copilot', 'copilot', 'adobe', 'office 365',
    'microsoft 365', 'dropbox', 'icloud', 'google one', 'canva',
    'notion', 'figma', 'slack', 'zoom', 'linkedin premium',
    'crunchyroll', 'paramount', 'star+', 'starplus', 'max streaming'
  ];
  const ehAssinatura = assinaturasConhecidas.some(a => textoLower.includes(a));
  
  // Padrão 4: Contas de serviços (luz, água, etc) com dia
  const contasServico = ['luz', 'água', 'agua', 'internet', 'telefone', 'celular', 'gas', 'gás', 
                         'aluguel', 'condominio', 'condomínio', 'iptu', 'ipva', 'seguro',
                         'plano de saúde', 'plano saude', 'escola', 'faculdade', 'mensalidade'];
  const ehContaServico = contasServico.some(c => textoLower.includes(c));
  
  // REGRA 1: Se tem "dia X" + valor = CONTA A PAGAR (não compra!)
  if (temDiaVencimento && temValor) {
    console.log('🎯 Pré-processamento: Detectado "dia X" + valor → CADASTRAR_CONTA_PAGAR');
    return 'CADASTRAR_CONTA_PAGAR';
  }
  
  // REGRA 2: Se é assinatura conhecida + valor = CONTA A PAGAR
  if (ehAssinatura && temValor) {
    console.log('🎯 Pré-processamento: Assinatura conhecida + valor → CADASTRAR_CONTA_PAGAR');
    return 'CADASTRAR_CONTA_PAGAR';
  }
  
  // REGRA 3: Se é assinatura conhecida + dia = CONTA A PAGAR
  if (ehAssinatura && temDiaVencimento) {
    console.log('🎯 Pré-processamento: Assinatura conhecida + dia → CADASTRAR_CONTA_PAGAR');
    return 'CADASTRAR_CONTA_PAGAR';
  }
  
  // REGRA 4: Se é conta de serviço + dia = CONTA A PAGAR
  if (ehContaServico && temDiaVencimento) {
    console.log('🎯 Pré-processamento: Conta de serviço + dia → CADASTRAR_CONTA_PAGAR');
    return 'CADASTRAR_CONTA_PAGAR';
  }
  
  // Deixar NLP decidir
  return null;
}

// ============================================
// CLASSIFICAR INTENÇÃO COM IA CONFIGURADA
// ============================================

export async function classificarIntencaoNLP(
  texto: string,
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<IntencaoClassificada> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // PRÉ-PROCESSAMENTO: Verificar se é claramente conta a pagar
  const intencaoForcada = preProcessarIntencaoContaPagar(texto);
  if (intencaoForcada) {
    console.log('✅ Intenção forçada pelo pré-processamento:', intencaoForcada);
    // Ainda chama o NLP mas força a intenção correta
  }

  // Buscar configuração do usuário E contexto em paralelo
  const [configIA, historicoConversa, contasDisponiveis, categoriasDisponiveis, memoriaUsuario, nomeUsuario, contasAPagar] = await Promise.all([
    buscarConfiguracaoIA(supabase, userId),
    buscarHistoricoConversa(supabase, userId, 8),
    buscarContasUsuario(supabase, userId),
    buscarCategoriasUsuario(supabase, userId),
    buscarMemoriaUsuario(supabase, userId),
    buscarNomeUsuario(supabase, userId),
    buscarContasAPagar(supabase, userId)
  ]);

  // Usar configuração do usuário ou fallback para env
  const apiKey = configIA?.api_key || Deno.env.get('OPENAI_API_KEY');
  const model = configIA?.model || 'gpt-5-mini';
  const temperature = configIA?.temperature || 0.3;
  const provider = configIA?.provider || 'openai';
  
  if (!apiKey) {
    console.error('❌ API Key não configurada');
    return fallbackClassificacao(texto);
  }

  // Data/hora atual
  const agora = new Date();
  const dataHoraAtual = agora.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  console.log('👤 Nome do usuário:', nomeUsuario || '(não identificado)');
  console.log('📚 Memória:', memoriaUsuario.substring(0, 100) + '...');
  console.log('📂 Categorias carregadas do banco');

  // Montar System Prompt
  const systemPrompt = gerarSystemPrompt(
    memoriaUsuario,
    historicoConversa,
    dataHoraAtual,
    contasDisponiveis,
    categoriasDisponiveis,
    nomeUsuario,
    contasAPagar
  );

  console.log('🧠 Chamando IA para classificação NLP...');
  console.log('🤖 Provider:', provider, '| Modelo:', model);
  console.log('📝 Texto:', texto);

  try {
    // Determinar endpoint baseado no provider
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    if (provider === 'google' || provider === 'gemini') {
      // Google Gemini usa endpoint diferente
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    } else if (provider === 'anthropic' || provider === 'claude') {
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      };
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    }

    // Para OpenAI e compatíveis (OpenRouter)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: texto }
        ],
        functions: [INTENT_CLASSIFICATION_FUNCTION],
        function_call: { name: 'classificar_comando' },
        temperature: temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      return fallbackClassificacao(texto);
    }

    const result = await response.json();
    const functionCall = result.choices?.[0]?.message?.function_call;

    if (!functionCall?.arguments) {
      console.error('❌ Resposta sem function_call');
      return fallbackClassificacao(texto);
    }

    const intencao: IntencaoClassificada = JSON.parse(functionCall.arguments);
    intencao.comando_original = texto;

    // CORREÇÃO: Se pré-processamento detectou conta a pagar, forçar a intenção
    if (intencaoForcada && intencao.intencao !== intencaoForcada) {
      console.log(`⚠️ NLP retornou ${intencao.intencao}, mas pré-processamento detectou ${intencaoForcada}`);
      console.log('🔄 Sobrescrevendo intenção para:', intencaoForcada);
      intencao.intencao = intencaoForcada;
      intencao.explicacao = `Intenção corrigida: ${intencaoForcada} (detectado padrão de conta a pagar)`;
    }

    console.log('✅ Classificação NLP:', JSON.stringify(intencao, null, 2));

    return intencao;

  } catch (error) {
    console.error('❌ Erro ao classificar:', error);
    return fallbackClassificacao(texto);
  }
}

// ============================================
// FALLBACK (se GPT falhar)
// ============================================

function fallbackClassificacao(texto: string): IntencaoClassificada {
  console.log('⚠️ Usando fallback de classificação');
  
  const textoLower = texto.toLowerCase();
  
  // Detectar saudação
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|eai|e ai)/i.test(textoLower)) {
    return {
      intencao: 'SAUDACAO',
      confianca: 0.8,
      entidades: {},
      explicacao: 'Saudação detectada',
      resposta_conversacional: 'Olá! 👋 Como posso ajudar?',
      comando_original: texto
    };
  }

  // Detectar saldo
  if (/saldo|quanto (tenho|gastei|ganhei)/i.test(textoLower)) {
    return {
      intencao: 'CONSULTAR_SALDO',
      confianca: 0.7,
      entidades: {},
      explicacao: 'Consulta de saldo',
      resposta_conversacional: '📊 Vou verificar seu saldo...',
      comando_original: texto
    };
  }

  // Detectar valor (possível despesa/receita)
  const valorMatch = textoLower.match(/(\d+(?:[.,]\d{2})?)/);
  if (valorMatch) {
    const valor = parseFloat(valorMatch[1].replace(',', '.'));
    return {
      intencao: 'REGISTRAR_DESPESA',
      confianca: 0.5,
      entidades: { valor, descricao: texto },
      explicacao: 'Possível despesa detectada',
      resposta_conversacional: `💰 Entendi R$ ${valor.toFixed(2)}. Em qual conta?`,
      comando_original: texto
    };
  }

  // Default
  return {
    intencao: 'OUTRO',
    confianca: 0.3,
    entidades: {},
    explicacao: 'Não consegui entender',
    resposta_conversacional: '🤔 Não entendi. Pode reformular? Diga algo como "gastei 50 no mercado"',
    comando_original: texto
  };
}

// ============================================
// EXPORTAR PARA USO
// ============================================

export { gerarSystemPrompt, buscarHistoricoConversa, buscarContasUsuario };
