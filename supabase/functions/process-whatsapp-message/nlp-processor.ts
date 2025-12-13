// ============================================
// NLP PROCESSOR V2 - Sistema NLP Inteligente
// Arquitetura Padrão Copiloto - Dezembro 2025
// ============================================
//
// Features:
// - System Prompt Universal gigante e detalhado
// - Function Calling com 22 intenções
// - Memória do usuário (gírias, preferências)
// - Histórico de conversa para contexto
// - Respostas conversacionais formatadas
//
// ============================================

import { getSupabase } from './utils.ts';

// ============================================
// TIPOS
// ============================================

export type IntencaoTipo =
  | 'REGISTRAR_DESPESA'
  | 'REGISTRAR_RECEITA'
  | 'REGISTRAR_TRANSFERENCIA'
  | 'REGISTRAR_INVESTIMENTO'
  | 'CONSULTAR_SALDO'
  | 'CONSULTAR_EXTRATO'
  | 'RELATORIO_DIARIO'
  | 'RELATORIO_SEMANAL'
  | 'RELATORIO_MENSAL'
  | 'CONSULTAR_METAS'
  | 'CRIAR_META'
  | 'CRIAR_LEMBRETE'
  | 'EDITAR_VALOR'
  | 'EDITAR_CONTA'
  | 'EDITAR_CATEGORIA'
  | 'EXCLUIR_TRANSACAO'
  | 'LISTAR_CONTAS'
  | 'LISTAR_CATEGORIAS'
  | 'MUDAR_CONTA'
  | 'SAUDACAO'
  | 'AJUDA'
  | 'AGRADECIMENTO'
  | 'MARCAR_CONTA_PAGA'
  | 'OUTRO';

export interface EntidadesExtraidas {
  valor?: number;
  tipo?: 'expense' | 'income' | 'transfer' | 'investment';
  categoria?: string;
  descricao?: string;
  conta?: string;
  conta_destino?: string;
  conta_bancaria?: string;
  data?: string;
  periodo?: 'hoje' | 'ontem' | 'semana' | 'mes' | 'ano';
  novo_valor?: number;
  nova_conta?: string;
  nova_categoria?: string;
  is_recorrente?: boolean;
  recorrencia_tipo?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  status_pagamento?: 'paid' | 'pending';
  forma_pagamento?: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'boleto';
}

export interface IntencaoClassificada {
  intencao: IntencaoTipo;
  confianca: number;
  entidades: EntidadesExtraidas;
  explicacao?: string;
  resposta_conversacional: string;
  comando_original: string;
}

// ============================================
// FUNCTION CALLING SCHEMA (22 INTENÇÕES)
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
          'REGISTRAR_DESPESA',
          'REGISTRAR_RECEITA',
          'REGISTRAR_TRANSFERENCIA',
          'REGISTRAR_INVESTIMENTO',
          'CONSULTAR_SALDO',
          'CONSULTAR_EXTRATO',
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
            enum: ['expense', 'income', 'transfer', 'investment']
          },
          categoria: { type: 'string' },
          descricao: { type: 'string' },
          conta: { type: 'string' },
          conta_destino: { type: 'string' },
          data: { type: 'string' },
          periodo: {
            type: 'string',
            enum: ['hoje', 'ontem', 'semana', 'mes', 'ano']
          },
          novo_valor: { type: 'number' },
          nova_conta: { type: 'string' },
          nova_categoria: { type: 'string' },
          is_recorrente: { type: 'boolean' },
          recorrencia_tipo: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'yearly']
          },
          status_pagamento: {
            type: 'string',
            enum: ['paid', 'pending']
          },
          forma_pagamento: {
            type: 'string',
            enum: ['pix', 'credito', 'debito', 'dinheiro', 'boleto']
          }
        }
      },
      explicacao: { type: 'string' },
      resposta_conversacional: { type: 'string' }
    },
    required: ['intencao', 'confianca', 'entidades', 'resposta_conversacional']
  }
};

// ============================================
// SYSTEM PROMPT UNIVERSAL (O CORAÇÃO DO SISTEMA)
// ============================================

function gerarSystemPromptUniversal(
  memoriaUsuario: string,
  historicoConversa: string,
  contasUsuario: string,
  categoriasUsuario: string,
  dataHoraAtual: string,
  nomeUsuario: string
): string {
  return `Você é a "Ana Clara", a Personal Finance do usuário.
Você é amigável, empática, direta e entende gírias brasileiras.
Seu tom é de uma amiga que entende de finanças e quer ajudar.

## SOBRE O SISTEMA PERSONAL FINANCE

O Personal Finance é um sistema COMPLETO de gestão financeira pessoal.

**Funciona em DOIS lugares:**
1. **WhatsApp (eu, Ana Clara!)** - Registros rápidos por texto ou áudio
2. **App/Dashboard** - Gráficos, metas, relatórios detalhados, investimentos

### 💰 TRANSAÇÕES
- **Despesas**: Gastos do dia a dia (mercado, restaurante, transporte)
- **Receitas**: Entradas de dinheiro (salário, freelance, vendas)
- **Transferências**: Entre contas próprias
- **Investimentos**: Aportes em investimentos

### 🏦 CONTAS
O usuário pode ter múltiplas contas (Nubank, Itaú, carteira, etc.)
Se não mencionar conta, PERGUNTE qual conta usar.

### 📂 CATEGORIAS
Cada transação tem uma categoria para organização.
Se não souber, sugira baseado na descrição.

### 🎯 METAS
- Metas de economia (juntar X até data Y)
- Metas de limite de gastos por categoria

### 🔔 LEMBRETES
- Contas a pagar
- Cobranças recorrentes

---

## CONTEXTO TEMPORAL
${dataHoraAtual}

## NOME DO USUÁRIO
${nomeUsuario || 'Usuário'}
(Use o primeiro nome dele para personalizar as respostas quando apropriado!)

## CONTAS DO USUÁRIO
${contasUsuario}

## CATEGORIAS DISPONÍVEIS
${categoriasUsuario}

## HISTÓRICO RECENTE DA CONVERSA
${historicoConversa}

## MEMÓRIA DO USUÁRIO (gírias, preferências aprendidas)
${memoriaUsuario}

---

## INTENÇÕES POSSÍVEIS

### Transações
1. **REGISTRAR_DESPESA**: Gastou, pagou, comprou algo
2. **REGISTRAR_RECEITA**: Recebeu, ganhou, entrou dinheiro
3. **REGISTRAR_TRANSFERENCIA**: Transferiu entre contas próprias
4. **REGISTRAR_INVESTIMENTO**: Aplicou, investiu dinheiro

### Consultas
5. **CONSULTAR_SALDO**: Quanto tem nas contas, saldo atual
6. **CONSULTAR_EXTRATO**: Últimas transações, movimentações
7. **RELATORIO_DIARIO**: Resumo de hoje
8. **RELATORIO_SEMANAL**: Resumo da semana
9. **RELATORIO_MENSAL**: Resumo do mês
10. **CONSULTAR_METAS**: Como estão as metas

### Ações
11. **CRIAR_META**: Quer criar uma nova meta
12. **CRIAR_LEMBRETE**: Quer criar um lembrete

### Edições (última transação)
13. **EDITAR_VALOR**: "era 95", "na verdade foi 100", "corrige pra 50"
14. **EDITAR_CONTA**: "muda pra Nubank", "era no Itaú", "troca pra Inter"
15. **EDITAR_CATEGORIA**: "era alimentação", "categoria errada"
16. **EXCLUIR_TRANSACAO**: "exclui essa", "apaga", "cancela", "deleta"
17. **MUDAR_CONTA**: Igual EDITAR_CONTA (sinônimo)

### Listagens
18. **LISTAR_CONTAS**: "minhas contas bancárias", "meus bancos", "quais bancos tenho"
19. **LISTAR_CATEGORIAS**: "categorias", "quais categorias"

### Social
20. **SAUDACAO**: Oi, olá, bom dia, boa tarde, boa noite, e aí
21. **AJUDA**: Ajuda, comandos, o que você faz, como funciona
22. **AGRADECIMENTO**: Obrigado, valeu, thanks, tmj
23. **OUTRO**: Não relacionado a finanças ou não entendeu

---

## GÍRIAS BRASILEIRAS (MUITO IMPORTANTE!)

### Dinheiro
- "conto", "pila", "mango", "pau", "pratas" = R$ (real)
- "50 conto" = R$ 50
- "100 pila" = R$ 100

### Ações
- "torrei", "queimei", "rasguei", "detonei" = gastei
- "entrou", "caiu", "pintou" = recebeu

### Bancos/Contas
- "roxinho", "nubank" = Nubank
- "laranjinha", "inter" = Banco Inter
- "amarelinho", "bb" = Banco do Brasil
- "itau", "itauzinho" = Itaú
- "verdinho" = PicPay

### Comida
- "dogão" = cachorro-quente
- "rango" = comida/refeição
- "breja", "gelada" = cerveja
- "marmita" = refeição/almoço

### Status
- "já paguei", "tá pago" = status pago
- "vou pagar", "ainda não" = status pendente

---

## CATEGORIAS DE DESPESA (sugira baseado na descrição)

| Palavras-chave | Categoria |
|----------------|-----------|
| mercado, supermercado, feira, açougue | Alimentação |
| restaurante, almoço, jantar, lanche, café, ifood, uber eats, rappi | Alimentação |
| uber, 99, taxi, gasolina, estacionamento, combustível, pedágio | Transporte |
| farmácia, remédio, médico, consulta, exame, dentista | Saúde |
| curso, livro, escola, faculdade, mensalidade | Educação |
| aluguel, condomínio, luz, água, gás, internet, IPTU | Moradia |
| cinema, netflix, spotify, show, bar, festa, streaming | Lazer |
| roupa, sapato, shopping, acessório, tênis | Vestuário |
| presente, doação | Presentes |
| pet, ração, veterinário | Pet |
| assinatura, plano, premium | Assinaturas |
| outros, geral | Outros |

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

## INTERPRETAÇÃO DE RECORRÊNCIA

- "todo mês", "mensalmente", "mensal" → recorrente mensal
- "toda semana", "semanalmente" → recorrente semanal
- "todo dia" → recorrente diário
- "todo ano", "anualmente" → recorrente anual
- Se não mencionar → pagamento único

---

## INTERPRETAÇÃO DE STATUS

- "paguei", "já paguei", "pago" → status: paid
- "vou pagar", "tenho que pagar", "a pagar" → status: pending
- Se não mencionar → assume paid para despesas passadas

---

## REGRAS CRÍTICAS

1. **SEMPRE** extraia o valor numérico (50 conto = 50)
2. **SEMPRE** sugira categoria baseado na descrição
3. Se mencionar nome de banco/conta, extraia em "conta"
4. Se NÃO mencionar conta, deixe null (sistema vai perguntar)
5. Xingamentos: IGNORE e extraia apenas a informação financeira
6. Seja CONCISO mas AMIGÁVEL nas respostas
7. Use emojis para deixar a conversa mais leve
8. Chame o usuário pelo nome quando souber

---

## FORMATO DE RESPOSTA CONVERSACIONAL (OBRIGATÓRIO!)

⚠️ **FORMATAÇÃO PARA WHATSAPP:**

1. **SEMPRE** comece com emoji relevante
2. **SEMPRE** use *asteriscos* para negrito
3. **SEMPRE** separe seções com linha em branco
4. **NUNCA** mande blocos de texto corrido
5. Seja breve e direto (máximo 5-6 linhas para confirmações)
6. Para relatórios, use estrutura clara com emojis
7. Use \\n para quebras de linha

**EXEMPLO DE RESPOSTA BOA para despesa:**
"Anotado! 📝\\n\\nRegistrei R$ 50 no mercado.\\n\\nEm qual conta?"

**EXEMPLO DE RESPOSTA BOA para saldo:**
"" (deixe vazio - o sistema vai formatar)

**EXEMPLO DE RESPOSTA BOA para saudação:**
"Oi, ${nomeUsuario || 'tudo bem'}! 👋\\n\\nComo posso te ajudar hoje?"

**EXEMPLO DE RESPOSTA BOA para ajuda:**
"Claro! 💡\\n\\n*O que posso fazer:*\\n\\n💰 Registrar gastos e receitas\\n📊 Mostrar seu saldo\\n📈 Relatórios\\n\\nÉ só me dizer!"

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
    "status_pagamento": "paid"
  },
  "resposta_conversacional": "Anotado! 📝\\n\\nR$ 50 no mercado.\\n\\nEm qual conta?"
}

### Input: "Recebi 1000 de freelance"
{
  "intencao": "REGISTRAR_RECEITA",
  "confianca": 0.95,
  "entidades": {
    "valor": 1000,
    "tipo": "income",
    "categoria": "Freelance",
    "descricao": "Freelance",
    "status_pagamento": "paid"
  },
  "resposta_conversacional": "Ótimo! 💰\\n\\nR$ 1.000 de freelance.\\n\\nEm qual conta caiu?"
}

### Input: "Era 95"
{
  "intencao": "EDITAR_VALOR",
  "confianca": 0.90,
  "entidades": {
    "novo_valor": 95
  },
  "resposta_conversacional": "Corrigido! ✅\\n\\nValor atualizado para R$ 95."
}

### Input: "Muda pra Itaú"
{
  "intencao": "EDITAR_CONTA",
  "confianca": 0.90,
  "entidades": {
    "nova_conta": "Itaú"
  },
  "resposta_conversacional": "Feito! 🏦\\n\\nConta alterada para Itaú."
}

### Input: "Saldo" ou "Qual meu saldo"
{
  "intencao": "CONSULTAR_SALDO",
  "confianca": 0.95,
  "entidades": {},
  "resposta_conversacional": ""
}

### Input: "Exclui essa"
{
  "intencao": "EXCLUIR_TRANSACAO",
  "confianca": 0.95,
  "entidades": {},
  "resposta_conversacional": ""
}

### Input: "Oi" ou "Bom dia"
{
  "intencao": "SAUDACAO",
  "confianca": 0.95,
  "entidades": {},
  "resposta_conversacional": "Oi! 👋\\n\\nComo posso te ajudar hoje?"
}

### Input: "Ajuda" ou "O que você faz"
{
  "intencao": "AJUDA",
  "confianca": 0.95,
  "entidades": {},
  "resposta_conversacional": ""
}
`;
}

// ============================================
// BUSCAR MEMÓRIA DO USUÁRIO
// ============================================

async function buscarMemoriaUsuario(userId: string): Promise<string> {
  const supabase = getSupabase();

  try {
    // Buscar memórias do usuário + globais (user_id IS NULL)
    const { data: memorias, error } = await supabase
      .from('user_memory')
      .select('tipo, chave, valor')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('frequencia', { ascending: false })
      .limit(30);

    if (error) {
      console.log('⚠️ Tabela user_memory não existe ainda, usando padrão');
      return getMemoriaPadrao();
    }

    if (!memorias || memorias.length === 0) {
      return getMemoriaPadrao();
    }

    const girias = memorias.filter((m: { tipo: string }) => m.tipo === 'giria');
    const preferencias = memorias.filter((m: { tipo: string }) => m.tipo === 'preferencia');
    const apelidos = memorias.filter((m: { tipo: string }) => m.tipo === 'apelido');

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

    if (apelidos.length > 0) {
      texto += '\nAPELIDOS:\n';
      apelidos.forEach((a: { valor: { nome?: string } }) => {
        texto += `- Chame o usuário de: ${a.valor?.nome || ''}\n`;
      });
    }

    return texto || getMemoriaPadrao();
  } catch (error) {
    console.log('⚠️ Erro ao buscar memória:', error);
    return getMemoriaPadrao();
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
// BUSCAR HISTÓRICO DE CONVERSA
// ============================================

async function buscarHistoricoConversa(userId: string, limite: number = 8): Promise<string> {
  const supabase = getSupabase();

  try {
    const { data: mensagens, error } = await supabase
      .from('whatsapp_messages')
      .select('content, direction, created_at')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error || !mensagens || mensagens.length === 0) {
      return 'Primeira conversa com este usuário.';
    }

    return mensagens
      .reverse()
      .map((m: { created_at: string; direction: string; content?: string }) => {
        const hora = new Date(m.created_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });
        const autor = m.direction === 'inbound' ? 'Usuário' : 'Ana Clara';
        const conteudo = m.content?.substring(0, 100) || '';
        return `[${hora}] ${autor}: ${conteudo}`;
      })
      .join('\n');
  } catch (error) {
    console.log('⚠️ Erro ao buscar histórico:', error);
    return 'Primeira conversa com este usuário.';
  }
}

// ============================================
// BUSCAR CONTAS DO USUÁRIO
// ============================================

async function buscarContasUsuario(userId: string): Promise<string> {
  const supabase = getSupabase();

  try {
    const { data: contas, error } = await supabase
      .from('accounts')
      .select('name, current_balance, type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');

    if (error || !contas || contas.length === 0) {
      return 'Nenhuma conta cadastrada.';
    }

    return contas
      .map((c: { name: string; type: string; current_balance?: number }) =>
        `- ${c.name} (${c.type}): R$ ${parseFloat(String(c.current_balance || 0)).toFixed(2)}`
      )
      .join('\n');
  } catch (error) {
    console.log('⚠️ Erro ao buscar contas:', error);
    return 'Erro ao buscar contas.';
  }
}

// ============================================
// BUSCAR CATEGORIAS DO USUÁRIO
// ============================================

async function buscarCategoriasUsuario(userId: string): Promise<string> {
  const supabase = getSupabase();

  try {
    const { data: categorias, error } = await supabase
      .from('categories')
      .select('name, type')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('name');

    if (error || !categorias || categorias.length === 0) {
      return 'Categorias padrão: Alimentação, Transporte, Saúde, Educação, Moradia, Lazer, Outros';
    }

    const despesas = categorias.filter((c: { type: string }) => c.type === 'expense').map((c: { name: string }) => c.name);
    const receitas = categorias.filter((c: { type: string }) => c.type === 'income').map((c: { name: string }) => c.name);

    let texto = '';
    if (despesas.length > 0) {
      texto += `Despesas: ${despesas.join(', ')}\n`;
    }
    if (receitas.length > 0) {
      texto += `Receitas: ${receitas.join(', ')}`;
    }

    return texto || 'Categorias padrão disponíveis.';
  } catch (error) {
    console.log('⚠️ Erro ao buscar categorias:', error);
    return 'Categorias padrão disponíveis.';
  }
}

// ============================================
// BUSCAR NOME DO USUÁRIO
// ============================================

async function buscarNomeUsuario(userId: string): Promise<string> {
  const supabase = getSupabase();

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
// CLASSIFICAR INTENÇÃO COM GPT-4 (PRINCIPAL)
// ============================================

export async function classificarIntencaoInteligente(
  texto: string,
  userId: string
): Promise<IntencaoClassificada> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurada');
    return criarRespostaFallback(texto);
  }

  try {
    console.log('🧠 ======================================');
    console.log('🧠 INICIANDO CLASSIFICAÇÃO NLP COM GPT-4');
    console.log('🧠 UserId:', userId);
    console.log('📝 Texto:', texto);

    // Buscar contexto em paralelo
    const [memoriaUsuario, historicoConversa, contasUsuario, categoriasUsuario, nomeUsuario] = await Promise.all([
      buscarMemoriaUsuario(userId),
      buscarHistoricoConversa(userId, 8),
      buscarContasUsuario(userId),
      buscarCategoriasUsuario(userId),
      buscarNomeUsuario(userId)
    ]);

    console.log('📚 Histórico:', historicoConversa.substring(0, 200) + '...');
    console.log('👤 Nome:', nomeUsuario || '(não identificado)');

    // Data/hora atual
    const agora = new Date();
    const dataHoraAtual = agora.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    // Montar System Prompt
    const systemPrompt = gerarSystemPromptUniversal(
      memoriaUsuario,
      historicoConversa,
      contasUsuario,
      categoriasUsuario,
      dataHoraAtual,
      nomeUsuario
    );

    console.log('🤖 Chamando GPT-4 para classificação...');

    // Chamar OpenAI com Function Calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: texto }
        ],
        functions: [INTENT_CLASSIFICATION_FUNCTION],
        function_call: { name: 'classificar_comando' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI erro:', response.status, errorText);
      return criarRespostaFallback(texto);
    }

    const result = await response.json();
    const functionCall = result.choices?.[0]?.message?.function_call;

    if (!functionCall?.arguments) {
      console.error('❌ Resposta sem function_call');
      return criarRespostaFallback(texto);
    }

    const intencao = JSON.parse(functionCall.arguments) as IntencaoClassificada;
    intencao.comando_original = texto;

    console.log('✅ Classificação NLP:', JSON.stringify(intencao, null, 2));
    console.log('🧠 ======================================');

    return intencao;

  } catch (error) {
    console.error('❌ Erro na classificação:', error);
    return criarRespostaFallback(texto);
  }
}

// ============================================
// FALLBACK (SE GPT FALHAR)
// ============================================

function criarRespostaFallback(texto: string): IntencaoClassificada {
  const textoLower = texto.toLowerCase();
  
  // Extrair valor
  const valorMatch = texto.match(/(\d+(?:[.,]\d{2})?)/);
  const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : undefined;

  let intencao: IntencaoTipo = 'OUTRO';
  let resposta = '';

  // Detectar intenção por regex
  if (/gastei|paguei|comprei|torrei|queimei/i.test(textoLower)) {
    intencao = 'REGISTRAR_DESPESA';
    resposta = valor ? `Anotado! 📝\n\nR$ ${valor} registrado.\n\nEm qual conta?` : '';
  } else if (/ganhei|recebi|entrou|caiu/i.test(textoLower)) {
    intencao = 'REGISTRAR_RECEITA';
    resposta = valor ? `Ótimo! 💰\n\nR$ ${valor} registrado.\n\nEm qual conta caiu?` : '';
  } else if (/saldo|quanto\s+tenho/i.test(textoLower)) {
    intencao = 'CONSULTAR_SALDO';
  } else if (/era\s+\d/i.test(textoLower)) {
    intencao = 'EDITAR_VALOR';
    const novoValor = texto.match(/era\s+(?:R\$\s*)?([\d.,]+)/i);
    return {
      intencao,
      confianca: 0.7,
      entidades: { novo_valor: novoValor ? parseFloat(novoValor[1].replace(',', '.')) : undefined },
      resposta_conversacional: '',
      comando_original: texto
    };
  } else if (/muda\s+pra|troca\s+pra/i.test(textoLower)) {
    intencao = 'EDITAR_CONTA';
    const novaConta = texto.match(/(?:muda|troca)\s+(?:pra|para)\s+(\w+)/i);
    return {
      intencao,
      confianca: 0.7,
      entidades: { nova_conta: novaConta ? novaConta[1] : undefined },
      resposta_conversacional: '',
      comando_original: texto
    };
  } else if (/exclui|apaga|deleta|remove/i.test(textoLower)) {
    intencao = 'EXCLUIR_TRANSACAO';
  } else if (/(?:paguei|quitei|pago)\s+(?:a|o|da|do)?\s*(?:conta\s+(?:de|da|do)?\s*)?(luz|água|agua|gás|gas|aluguel|condomínio|condominio|academia|internet|netflix|spotify|disney|hbo|telefone|celular|seguro|plano|escola|faculdade|empréstimo|emprestimo|financiamento)/i.test(textoLower)) {
    // FALLBACK: Detectar pagamento de conta recorrente
    intencao = 'MARCAR_CONTA_PAGA';
    const matchConta = textoLower.match(/(?:paguei|quitei|pago)\s+(?:a|o|da|do)?\s*(?:conta\s+(?:de|da|do)?\s*)?(luz|água|agua|gás|gas|aluguel|condomínio|condominio|academia|internet|netflix|spotify|disney|hbo|telefone|celular|seguro|plano|escola|faculdade|empréstimo|emprestimo|financiamento)/i);
    const contaNome = matchConta ? matchConta[1] : '';
    
    // Extrair conta bancária se mencionada (no/na + banco)
    const matchBanco = textoLower.match(/(?:no|na|pelo|pela|com)\s+(nubank|itau|itaú|bradesco|santander|inter|c6|caixa|bb|picpay|mercado\s*pago)/i);
    const contaBancaria = matchBanco ? matchBanco[1] : undefined;
    
    return {
      intencao,
      confianca: 0.85,
      entidades: { conta: contaNome, conta_bancaria: contaBancaria },
      resposta_conversacional: '',
      comando_original: texto
    };
  } else if (/^(oi|olá|ola|bom\s+dia|boa\s+tarde|boa\s+noite|opa|eai|e\s+ai)/i.test(textoLower)) {
    intencao = 'SAUDACAO';
    resposta = 'Oi! 👋\n\nComo posso te ajudar hoje?';
  } else if (/ajuda|help|comandos/i.test(textoLower)) {
    intencao = 'AJUDA';
  } else if (/obrigad|valeu|thanks|tmj/i.test(textoLower)) {
    intencao = 'AGRADECIMENTO';
    resposta = 'Por nada! 😊\n\nSe precisar, é só chamar!';
  }
  // NOTA: "minhas contas" removido - agora tratado pelo NLP como CONTAS_AMBIGUO

  return {
    intencao,
    confianca: 0.5,
    entidades: { valor },
    resposta_conversacional: resposta,
    comando_original: texto
  };
}

// ============================================
// FUNÇÕES AUXILIARES EXPORTADAS (COMPATIBILIDADE)
// ============================================

// Manter compatibilidade com código existente
export async function classificarIntencao(
  texto: string,
  userId: string
): Promise<IntencaoClassificada> {
  return classificarIntencaoInteligente(texto, userId);
}

export function isAnalyticsQuery(texto: string): boolean {
  return /quanto\s+(?:gastei|ganhei|recebi|paguei)|qual\s+(?:o\s+)?(?:meu\s+)?(?:saldo|gasto|receita|total)/i.test(texto.toLowerCase());
}

export function detectarConta(texto: string): string | null {
  const textoLower = texto.toLowerCase();
  const contas: Record<string, RegExp> = {
    nubank: /nubank|roxinho|nu\b/i,
    itau: /itau|itaú|iti\b/i,
    bradesco: /bradesco/i,
    santander: /santander/i,
    caixa: /caixa/i,
    inter: /inter|banco\s+inter|laranjinha/i,
    c6: /c6|c6\s*bank/i,
    picpay: /picpay|verdinho/i,
    mercadopago: /mercado\s*pago|mp\b/i,
    bb: /banco\s+do\s+brasil|bb\b|amarelinho/i,
  };

  for (const [conta, pattern] of Object.entries(contas)) {
    if (pattern.test(textoLower)) {
      return conta;
    }
  }

  return null;
}

export function detectarCategoria(texto: string): string | null {
  const textoLower = texto.toLowerCase();
  const categorias: Record<string, RegExp> = {
    alimentacao: /mercado|supermercado|ifood|uber\s*eats|rappi|restaurante|almo[çc]o|jantar|lanche|comida|pizza|hamburguer|padaria|rango|dogao/i,
    transporte: /uber|99|taxi|gasolina|combust[ií]vel|estacionamento|ped[aá]gio|corrida/i,
    saude: /farm[aá]cia|m[eé]dico|hospital|consulta|rem[eé]dio|drogaria|exame|dentista/i,
    educacao: /curso|escola|faculdade|livro|mensalidade/i,
    moradia: /aluguel|condom[ií]nio|luz|energia|[aá]gua|g[aá]s|internet|iptu/i,
    lazer: /cinema|netflix|spotify|amazon|disney|hbo|streaming|show|ingresso|bar|balada|festa|breja|gelada/i,
    vestuario: /roupa|cal[çc]ado|sapato|t[eê]nis|camisa|shopping/i,
  };

  for (const [categoria, pattern] of Object.entries(categorias)) {
    if (pattern.test(textoLower)) {
      return categoria;
    }
  }

  return null;
}

export function extrairValor(texto: string): number | null {
  const match = texto.match(/(?:R\$\s*)?([\d]+(?:[.,]\d{1,2})?)/);
  if (match) {
    const valor = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(valor) && valor > 0 && valor < 1000000) {
      return valor;
    }
  }
  return null;
}

export function isComandoEdicao(texto: string): boolean {
  const t = texto.toLowerCase();
  return /era\s+(?:R\$\s*)?\d/.test(t) || /muda\s+(?:pra|pro|para)\s+\w+/.test(t);
}

export function isComandoExclusao(texto: string): boolean {
  const t = texto.toLowerCase();
  return /(?:exclui|deleta|apaga|remove)/.test(t);
}

export function extrairEntidadesEdicao(texto: string): { valor?: number; conta?: string } {
  const entidades: { valor?: number; conta?: string } = {};

  const matchValor = texto.match(/era\s+(?:R\$\s*)?([\d.,]+)/i);
  if (matchValor) {
    const valorStr = matchValor[1].replace(',', '.');
    const valor = parseFloat(valorStr);
    if (!isNaN(valor) && valor > 0) {
      entidades.valor = valor;
    }
  }

  const matchConta = texto.match(/muda\s+(?:pra|pro|para)\s+(\w+)/i);
  if (matchConta) {
    entidades.conta = matchConta[1];
  }

  return entidades;
}
