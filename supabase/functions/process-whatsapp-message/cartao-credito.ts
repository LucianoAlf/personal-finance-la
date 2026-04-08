// ============================================
// CARTAO-CREDITO.TS - Gestão de Cartões via WhatsApp
// Personal Finance - Ana Clara
// FASE 2: Cartão de Crédito
// ============================================

import { getSupabase, getEmojiBanco } from './utils.ts';
import { detectarCategoriaAutomatica } from './transaction-mapper.ts';
import { getDefaultAIConfig } from '../_shared/ai.ts';
import { buildIntentRequest, parseIntentResponse } from './_shared/structured-intent.ts';

// ============================================
// TIPOS
// ============================================

export type TipoIntencaoCartao = 
  | 'compra_cartao'           // "gastei 200 no cartão"
  | 'compra_parcelada'        // "comprei 600 em 3x"
  | 'consulta_fatura'         // "fatura do nubank"
  | 'consulta_fatura_vencida' // "fatura vencida"
  | 'consulta_limite'         // "limite do cartão"
  | 'listar_cartoes'          // "meus cartões"
  | 'listar_compras_cartao'   // "ver todas compras"
  | 'consulta_gasto_especifico' // "quanto gastei de ifood"
  | 'comparar_meses'          // "comparar meses"
  | null;

export interface IntencaoCartao {
  tipo: TipoIntencaoCartao;
  valor?: number;
  parcelas?: number;
  cartao?: string;           // Nome do cartão mencionado
  descricao?: string;
  mes_referencia?: string;   // Mês inferido do contexto (ex: "novembro")
}

export interface DadosCompraCartao {
  valor: number;
  parcelas: number;
  cartao_id: string;
  descricao: string;
  categoria_id?: string;
  data_compra: string;
}

// ============================================
// ARQUITETURA DE 3 CAMADAS - CARTÕES DE CRÉDITO
// ============================================
// CAMADA 1: GPT-4 Inteligente (Match Semântico)
// CAMADA 2: Validação Anti-Alucinação
// CAMADA 3: Busca Fuzzy (4 estratégias)
// ============================================

// ============================================
// ALIASES DE CARTÕES (CAMADA 3)
// ============================================
const ALIASES_CARTAO: Record<string, string[]> = {
  'nubank': ['roxinho', 'nu', 'cartão roxo', 'cartao roxo', 'roxo'],
  'itau': ['itaú', 'personnalite', 'uniclass', 'iti'],
  'bradesco': ['bra', 'bradescard', 'next'],
  'santander': ['san', 'free', 'santander free'],
  'inter': ['laranjinha', 'cartão laranja', 'cartao laranja', 'banco inter'],
  'c6': ['c6 bank', 'c6bank', 'c6 carbon'],
  'bb': ['banco do brasil', 'ourocard', 'banco brasil'],
  'caixa': ['caixa economica', 'cef'],
  'picpay': ['pic pay', 'picpay card'],
  'mercado pago': ['mercadopago', 'mp', 'mercado livre'],
  'will': ['will bank', 'willbank'],
  'neon': ['neon bank'],
  'original': ['banco original'],
  'pan': ['banco pan'],
  'btg': ['btg pactual'],
  'xp': ['xp investimentos', 'xp card'],
};

// ✅ CORREÇÃO BUG #7: Função para detectar cartão por alias em qualquer texto
// Retorna o nome padronizado do cartão se encontrar um alias no texto
function detectarCartaoPorAlias(texto: string): string | null {
  const textoNorm = texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Verificar cada cartão e seus aliases
  for (const [cartaoPadrao, aliases] of Object.entries(ALIASES_CARTAO)) {
    // Verificar se o texto contém o nome padrão do cartão
    if (textoNorm.includes(cartaoPadrao)) {
      return cartaoPadrao;
    }
    // Verificar se o texto contém algum alias
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (textoNorm.includes(aliasNorm)) {
        console.log('[CARTAO-ALIAS] Detectado:', alias, '→', cartaoPadrao);
        return cartaoPadrao;
      }
    }
  }
  
  return null;
}

// ============================================
// ALIASES DE CATEGORIAS (CAMADA 3)
// ============================================
const ALIASES_CATEGORIA: Record<string, string[]> = {
  'alimentação': ['alimentacao', 'comida', 'refeição', 'refeicao', 'restaurante', 'lanche', 'almoço', 'almoco', 'jantar', 'café', 'cafe', 'ifood', 'rappi', 'uber eats'],
  'transporte': ['uber', '99', 'corrida', 'taxi', 'táxi', 'combustível', 'combustivel', 'gasolina', 'etanol', 'posto'],
  'lazer': ['entretenimento', 'diversão', 'diversao', 'cinema', 'show', 'festa', 'bar'],
  'saúde': ['saude', 'farmácia', 'farmacia', 'médico', 'medico', 'hospital', 'consulta', 'remédio', 'remedio'],
  'educação': ['educacao', 'curso', 'escola', 'faculdade', 'livro', 'material'],
  'assinaturas': ['assinatura', 'streaming', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'youtube'],
  'compras': ['shopping', 'loja', 'roupa', 'eletrônico', 'eletronico'],
  'vestuário': ['vestuario', 'roupa', 'calçado', 'calcado', 'tênis', 'tenis', 'sapato'],
  'beleza': ['salão', 'salao', 'cabelo', 'unha', 'estética', 'estetica', 'maquiagem'],
  'viagem': ['hotel', 'hospedagem', 'passagem', 'avião', 'aviao', 'aeroporto'],
  'pets': ['pet', 'cachorro', 'gato', 'veterinário', 'veterinario', 'ração', 'racao'],
};

// ============================================
// INTERFACE PARA RESULTADO DA CLASSIFICAÇÃO
// ============================================
export interface ClassificacaoCartaoIA {
  intencao: TipoIntencaoCartao;
  cartao?: string;           // Nome do cartão (pode ser alias)
  valor?: number;
  parcelas?: number;
  descricao?: string;
  mes?: number;              // 0-11 para mês específico
  periodo?: 'semana' | 'hoje' | 'mes' | null;  // Período de filtro
  termo?: string;            // Para consulta de gasto específico (categoria/estabelecimento)
  confianca: number;         // 0-1
}

interface ClassificacaoCartaoIAResponse {
  intencao?: string | null;
  cartao?: string | null;
  valor?: number | null;
  parcelas?: number | null;
  mes?: number | null;
  periodo?: 'semana' | 'hoje' | 'mes' | null;
  termo?: string | null;
  confianca?: number | null;
}

// ============================================
// CAMADA 2: VALIDAÇÃO ANTI-ALUCINAÇÃO
// ============================================
export interface ResultadoValidacaoCartao {
  valido: boolean;
  cartaoExato?: { id: string; name: string };
  sugestoes?: { id: string; name: string }[];
  erro?: string;
}

export function validarCartaoExtraido(
  nomeExtraido: string | undefined,
  cartoesUsuario: { id: string; name: string }[]
): ResultadoValidacaoCartao {
  console.log('[CAMADA 2] Validando cartão extraído:', nomeExtraido);
  console.log('[CAMADA 2] Cartões do usuário:', cartoesUsuario.map(c => c.name));
  
  if (!nomeExtraido || !cartoesUsuario.length) {
    return { valido: false, erro: 'Nome ou lista vazia' };
  }
  
  const nomeNorm = nomeExtraido.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Match exato (case-insensitive)
  const matchExato = cartoesUsuario.find(c => {
    const cartaoNorm = c.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return cartaoNorm === nomeNorm;
  });
  
  if (matchExato) {
    console.log('[CAMADA 2] ✅ Match exato encontrado:', matchExato.name);
    return { valido: true, cartaoExato: matchExato };
  }
  
  // Match parcial (contém/está contido)
  const matchParcial = cartoesUsuario.find(c => {
    const cartaoNorm = c.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
  });
  
  if (matchParcial) {
    console.log('[CAMADA 2] ✅ Match parcial encontrado:', matchParcial.name);
    return { valido: true, cartaoExato: matchParcial };
  }
  
  console.log('[CAMADA 2] ❌ Nenhum match direto, indo para Camada 3');
  return { valido: false, sugestoes: cartoesUsuario.slice(0, 5) };
}

// ============================================
// CAMADA 3: BUSCA FUZZY (4 ESTRATÉGIAS)
// ============================================
export interface ResultadoBuscaFuzzy {
  encontrado: boolean;
  cartao?: { id: string; name: string };
  estrategia?: string;
  confianca?: number;
}

export function buscarCartaoFuzzy(
  textoOriginal: string,
  cartoesUsuario: { id: string; name: string }[]
): ResultadoBuscaFuzzy {
  console.log('[CAMADA 3] Busca fuzzy para:', textoOriginal);
  
  if (!textoOriginal || !cartoesUsuario.length) {
    return { encontrado: false };
  }
  
  const textoNorm = textoOriginal.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // ESTRATÉGIA 1: Match por aliases conhecidos
  console.log('[CAMADA 3] Estratégia 1: Aliases');
  for (const [cartaoPadrao, aliases] of Object.entries(ALIASES_CARTAO)) {
    // Verificar se o texto contém algum alias
    const aliasEncontrado = aliases.some(alias => 
      textoNorm.includes(alias.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    ) || textoNorm.includes(cartaoPadrao);
    
    if (aliasEncontrado) {
      // Buscar cartão do usuário que corresponda ao padrão
      const cartaoUsuario = cartoesUsuario.find(c => {
        const nomeNorm = c.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nomeNorm.includes(cartaoPadrao) || 
               aliases.some(a => nomeNorm.includes(a.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
      });
      
      if (cartaoUsuario) {
        console.log('[CAMADA 3] ✅ Alias encontrado:', cartaoPadrao, '→', cartaoUsuario.name);
        return { encontrado: true, cartao: cartaoUsuario, estrategia: 'alias', confianca: 0.9 };
      }
    }
  }
  
  // ESTRATÉGIA 2: Extrair palavras principais e buscar melhor score
  console.log('[CAMADA 3] Estratégia 2: Melhor score');
  const stopWords = ['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'um', 'uma', 'no', 'na', 'em', 'e', 'ou', 'que', 'para', 'com', 'meu', 'minha', 'cartao', 'cartão', 'fatura', 'quanto', 'devo', 'gastei'];
  const palavras = textoNorm.split(/\s+/).filter(p => p.length > 2 && !stopWords.includes(p));
  
  let melhorScore = 0;
  let melhorCartao: { id: string; name: string } | null = null;
  
  for (const cartao of cartoesUsuario) {
    const cartaoNorm = cartao.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    let score = 0;
    for (const palavra of palavras) {
      if (cartaoNorm.includes(palavra)) {
        score += 2; // Palavra encontrada no nome do cartão
      }
      // Verificar aliases
      for (const [padrao, aliases] of Object.entries(ALIASES_CARTAO)) {
        if (aliases.some(a => a.includes(palavra) || palavra.includes(a.substring(0, 3)))) {
          if (cartaoNorm.includes(padrao)) {
            score += 1;
          }
        }
      }
    }
    
    if (score > melhorScore) {
      melhorScore = score;
      melhorCartao = cartao;
    }
  }
  
  if (melhorCartao && melhorScore >= 1) {
    console.log('[CAMADA 3] ✅ Melhor score:', melhorCartao.name, 'score:', melhorScore);
    return { encontrado: true, cartao: melhorCartao, estrategia: 'score', confianca: Math.min(0.8, melhorScore * 0.3) };
  }
  
  // ESTRATÉGIA 3: Substring simples
  console.log('[CAMADA 3] Estratégia 3: Substring');
  for (const palavra of palavras) {
    if (palavra.length >= 3) {
      const cartaoSubstring = cartoesUsuario.find(c => {
        const nomeNorm = c.name.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nomeNorm.includes(palavra) || palavra.includes(nomeNorm.substring(0, 4));
      });
      
      if (cartaoSubstring) {
        console.log('[CAMADA 3] ✅ Substring encontrado:', palavra, '→', cartaoSubstring.name);
        return { encontrado: true, cartao: cartaoSubstring, estrategia: 'substring', confianca: 0.6 };
      }
    }
  }
  
  // ESTRATÉGIA 4: Se só tem 1 cartão, usar ele
  if (cartoesUsuario.length === 1) {
    console.log('[CAMADA 3] ✅ Único cartão disponível:', cartoesUsuario[0].name);
    return { encontrado: true, cartao: cartoesUsuario[0], estrategia: 'unico', confianca: 0.5 };
  }
  
  console.log('[CAMADA 3] ❌ Nenhuma estratégia funcionou');
  return { encontrado: false };
}

// ============================================
// CAMADA 3: BUSCA FUZZY PARA CATEGORIAS
// ============================================
export function buscarCategoriaFuzzy(termo: string): string {
  const termoNorm = termo.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Buscar categoria pelo termo ou alias
  for (const [categoria, aliases] of Object.entries(ALIASES_CATEGORIA)) {
    const categoriaNorm = categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (termoNorm === categoriaNorm || aliases.some(a => 
      termoNorm.includes(a.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ||
      a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoNorm)
    )) {
      // Retornar categoria com acento correto
      return categoria.charAt(0).toUpperCase() + categoria.slice(1);
    }
  }
  
  // Se não encontrou, retornar o termo capitalizado
  return termo.charAt(0).toUpperCase() + termo.slice(1);
}

// ============================================
// CAMADA 1: GPT-4 INTELIGENTE
// ============================================
export async function classificarIntencaoCartaoIA(
  mensagem: string,
  cartoesUsuario: { id: string; name: string }[],
  userId: string,
): Promise<ClassificacaoCartaoIA | null> {
  console.log('[CAMADA 1] Classificando com GPT-4:', mensagem);
  console.log('[CAMADA 1] Cartões disponíveis:', cartoesUsuario.map(c => c.name));
  
  try {
    const supabase = getSupabase();
    const configuredAI = await getDefaultAIConfig(supabase, userId);
    const aiConfig = configuredAI ?? {
      provider: 'openai' as const,
      model: 'gpt-5-mini',
      apiKey: Deno.env.get('OPENAI_API_KEY'),
      temperature: 0.1,
      maxTokens: 200,
    };

    if (!aiConfig.apiKey) {
      console.error('[CAMADA 1] Nenhuma API Key configurada para classificar intenção de cartão');
      return null;
    }
    
    const listaCartoes = cartoesUsuario.map(c => c.name).join(', ') || 'Nenhum cartão cadastrado';

    const request = buildIntentRequest(
      {
        ...aiConfig,
        apiKey: aiConfig.apiKey!,
        temperature: Math.min(0.3, Math.max(0, aiConfig.temperature || 0.1)),
        maxTokens: Math.min(400, aiConfig.maxTokens || 200),
      },
      `Você é um classificador de intenções para um chatbot financeiro de cartões de crédito.

CARTÕES DO USUÁRIO: [${listaCartoes}]

ALIASES CONHECIDOS:
- nubank = roxinho, nu, cartão roxo
- itau/itaú = personnalite, uniclass
- inter = laranjinha, cartão laranja
- bradesco = bradescard, next
- santander = free

CATEGORIAS DE GASTOS:
- Alimentação = comida, ifood, rappi, restaurante, almoço, jantar
- Transporte = uber, 99, combustível, gasolina
- Lazer = entretenimento, cinema, bar
- Saúde = farmácia, médico, hospital
- Assinaturas = netflix, spotify, streaming

INTENÇÕES POSSÍVEIS:
- CONSULTAR_FATURA: quer saber valor da fatura (quanto devo, fatura, valor total)
- LISTAR_COMPRAS: quer ver compras/transações do cartão (inclui períodos: essa semana, este mês, hoje)
- GASTO_ESPECIFICO: quer saber quanto gastou em categoria/estabelecimento ESPECÍFICO (ex: alimentação, iFood, Uber)
- COMPARAR_MESES: quer histórico ou comparar faturas de meses diferentes
- COMPRA_CARTAO: registrar uma compra no cartão
- COMPRA_PARCELADA: registrar compra parcelada
- LISTAR_CARTOES: quer ver seus cartões
- CONSULTAR_LIMITE: quer saber limite disponível

REGRAS IMPORTANTES:
1. Se mencionar alias (roxinho, laranjinha), retorne o nome EXATO da lista de cartões
2. "quanto gastei essa semana/hoje/este mês" SEM categoria = LISTAR_COMPRAS (não é GASTO_ESPECIFICO!)
3. "quanto gastei de/em [categoria]" COM categoria = GASTO_ESPECIFICO
4. Extraia o mês se mencionado (janeiro=0, fevereiro=1, ..., dezembro=11)
5. Para GASTO_ESPECIFICO, o termo é OBRIGATÓRIO (categoria ou estabelecimento)
6. Se perguntar "quanto gastei no cartão X" sem categoria, é CONSULTAR_FATURA
7. Extraia o período se mencionado: "essa semana" = semana, "hoje" = hoje, "este mês" = mes

JSON esperado:
{
  "intencao": "NOME_DA_INTENCAO",
  "cartao": "Nome exato do cartão da lista ou null",
  "valor": número ou null,
  "parcelas": número ou null,
  "mes": 0-11 ou null,
  "periodo": "semana" | "hoje" | "mes" | null,
  "termo": "categoria ou estabelecimento" ou null,
  "confianca": 0.0 a 1.0
}`,
      mensagem,
    );

    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    });
    
    if (!response.ok) {
      console.error('[CAMADA 1] Erro na API:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    const parsed = parseIntentResponse(aiConfig.provider, data) as unknown as ClassificacaoCartaoIAResponse;
    
    // Mapear intenção para tipo interno
    const mapIntencao: Record<string, TipoIntencaoCartao> = {
      'CONSULTAR_FATURA': 'consulta_fatura',
      'LISTAR_COMPRAS': 'listar_compras_cartao',
      'GASTO_ESPECIFICO': 'consulta_gasto_especifico',
      'COMPARAR_MESES': 'comparar_meses',
      'COMPRA_CARTAO': 'compra_cartao',
      'COMPRA_PARCELADA': 'compra_parcelada',
      'LISTAR_CARTOES': 'listar_cartoes',
      'CONSULTAR_LIMITE': 'consulta_limite',
    };
    
    return {
      intencao: mapIntencao[String(parsed.intencao ?? '')] || null,
      cartao: parsed.cartao ?? undefined,
      valor: parsed.valor ?? undefined,
      parcelas: parsed.parcelas ?? undefined,
      mes: parsed.mes ?? undefined,
      periodo: parsed.periodo ?? undefined,
      termo: parsed.termo ?? undefined,
      confianca: parsed.confianca ?? 0.5,
    };
    
  } catch (error) {
    console.error('[CAMADA 1] Erro:', error);
    return null;
  }
}

// ============================================
// FUNÇÃO PRINCIPAL: PROCESSAR COM 3 CAMADAS
// ============================================
export async function processarMensagemCartao3Camadas(
  mensagem: string,
  userId: string
): Promise<{ intencao: IntencaoCartao | null; cartao: { id: string; name: string } | null; termo?: string; mes?: number }> {
  const supabase = getSupabase();
  
  // Buscar cartões do usuário
  const { data: cartoes } = await supabase
    .from('credit_cards')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  const cartoesUsuario = cartoes || [];
  console.log('[3 CAMADAS] Cartões do usuário:', cartoesUsuario.map((c: any) => c.name));
  
  // CAMADA 1: GPT-4 Inteligente
  const classificacao = await classificarIntencaoCartaoIA(mensagem, cartoesUsuario, userId);
  
  if (!classificacao || !classificacao.intencao) {
    console.log('[3 CAMADAS] Camada 1 falhou, retornando null');
    return { intencao: null, cartao: null };
  }
  
  console.log('[3 CAMADAS] Camada 1 retornou:', classificacao);
  
  // Montar intenção
  const intencao: IntencaoCartao = {
    tipo: classificacao.intencao,
    valor: classificacao.valor,
    parcelas: classificacao.parcelas,
    cartao: classificacao.cartao || undefined,
    descricao: classificacao.termo
  };
  
  // Se não precisa de cartão específico, retornar
  if (['listar_cartoes'].includes(classificacao.intencao)) {
    return { intencao, cartao: null, termo: classificacao.termo, mes: classificacao.mes };
  }
  
  // CAMADA 2: Validação Anti-Alucinação
  if (classificacao.cartao) {
    const validacao = validarCartaoExtraido(classificacao.cartao, cartoesUsuario);
    
    if (validacao.valido && validacao.cartaoExato) {
      console.log('[3 CAMADAS] Camada 2 validou:', validacao.cartaoExato.name);
      return { 
        intencao, 
        cartao: validacao.cartaoExato, 
        termo: classificacao.termo ? buscarCategoriaFuzzy(classificacao.termo) : undefined,
        mes: classificacao.mes 
      };
    }
    
    // CAMADA 3: Busca Fuzzy
    console.log('[3 CAMADAS] Indo para Camada 3...');
    const fuzzy = buscarCartaoFuzzy(mensagem, cartoesUsuario);
    
    if (fuzzy.encontrado && fuzzy.cartao) {
      console.log('[3 CAMADAS] Camada 3 encontrou:', fuzzy.cartao.name, 'via', fuzzy.estrategia);
      return { 
        intencao, 
        cartao: fuzzy.cartao, 
        termo: classificacao.termo ? buscarCategoriaFuzzy(classificacao.termo) : undefined,
        mes: classificacao.mes 
      };
    }
  } else {
    // Não mencionou cartão, tentar busca fuzzy na mensagem
    const fuzzy = buscarCartaoFuzzy(mensagem, cartoesUsuario);
    
    if (fuzzy.encontrado && fuzzy.cartao) {
      console.log('[3 CAMADAS] Camada 3 encontrou sem menção explícita:', fuzzy.cartao.name);
      return { 
        intencao, 
        cartao: fuzzy.cartao, 
        termo: classificacao.termo ? buscarCategoriaFuzzy(classificacao.termo) : undefined,
        mes: classificacao.mes 
      };
    }
  }
  
  // Nenhuma camada encontrou cartão específico
  console.log('[3 CAMADAS] Nenhum cartão encontrado, retornando sem cartão');
  return { 
    intencao, 
    cartao: cartoesUsuario.length === 1 ? cartoesUsuario[0] : null,
    termo: classificacao.termo ? buscarCategoriaFuzzy(classificacao.termo) : undefined,
    mes: classificacao.mes 
  };
}

// ============================================
// HELPERS
// ============================================

function formatarMoeda(valor: number): string {
  const absValor = Math.abs(valor);
  const formatted = absValor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return valor < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

function obterNomeMes(data: Date): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[data.getMonth()];
}

function calcularDataFatura(diaFechamento: number, dataCompra: Date): Date {
  const ano = dataCompra.getFullYear();
  const mes = dataCompra.getMonth();
  const dia = dataCompra.getDate();
  
  // Se a compra foi antes do fechamento, entra na fatura do mês atual
  // Se foi depois, entra na fatura do próximo mês
  if (dia <= diaFechamento) {
    return new Date(ano, mes, 1);
  } else {
    return new Date(ano, mes + 1, 1);
  }
}

// ============================================
// BUSCAR OU CRIAR FATURA DO MÊS
// ============================================

async function buscarOuCriarFatura(
  supabase: any,
  userId: string,
  cartaoId: string,
  closingDay: number,
  dueDay: number,
  dataCompra: Date
): Promise<string | null> {
  try {
    // Calcular o mês de referência da fatura
    const referenceMonth = calcularDataFatura(closingDay, dataCompra);
    const referenceMonthStr = referenceMonth.toISOString().split('T')[0];
    
    console.log('[FATURA] Buscando fatura para:', { cartaoId, referenceMonthStr });
    
    // Buscar fatura existente
    const { data: faturaExistente, error: buscaError } = await supabase
      .from('credit_card_invoices')
      .select('id')
      .eq('credit_card_id', cartaoId)
      .eq('user_id', userId)
      .eq('reference_month', referenceMonthStr)
      .single();
    
    if (faturaExistente && !buscaError) {
      console.log('[FATURA] Fatura existente encontrada:', faturaExistente.id);
      return faturaExistente.id;
    }
    
    // Criar nova fatura
    const closingDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), closingDay);
    const dueDate = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), dueDay);
    
    // Se o dia de vencimento é menor que o dia de fechamento, a fatura vence no mês seguinte
    if (dueDay < closingDay) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    const { data: novaFatura, error: criarError } = await supabase
      .from('credit_card_invoices')
      .insert({
        credit_card_id: cartaoId,
        user_id: userId,
        reference_month: referenceMonthStr,
        closing_date: closingDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: 0,
        paid_amount: 0,
        status: 'open'
      })
      .select('id')
      .single();
    
    if (criarError) {
      console.error('[FATURA] Erro ao criar fatura:', criarError);
      return null;
    }
    
    console.log('[FATURA] Nova fatura criada:', novaFatura.id);
    return novaFatura.id;
    
  } catch (error) {
    console.error('[FATURA] Erro:', error);
    return null;
  }
}

// ============================================
// DETECTAR INTENÇÃO DE CARTÃO
// ============================================

export function detectarIntencaoCartao(msg: string): IntencaoCartao | null {
  const msgLower = msg.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // ✅ NOVO PADRÃO: "TV 2000 em 10x no Nubank" - descrição + valor + parcelas + cartão
  // Captura: DESCRIÇÃO VALOR em Xx [no CARTÃO]
  const matchDescricaoValorParcelado = msgLower.match(
    /^(.+?)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:em|de)\s+(\d+)\s*(?:x|vezes|parcelas?)(?:\s+(?:no|na|do|da)\s+(?:cartao\s+)?(.+))?$/
  );
  if (matchDescricaoValorParcelado) {
    const descricao = matchDescricaoValorParcelado[1]?.trim();
    const valor = parseFloat(matchDescricaoValorParcelado[2].replace(',', '.'));
    const parcelas = parseInt(matchDescricaoValorParcelado[3]);
    const cartao = matchDescricaoValorParcelado[4]?.trim();
    
    // Validar que a descrição não é um verbo de ação (evitar conflito com outros padrões)
    const verbosAcao = ['comprei', 'gastei', 'paguei', 'compra'];
    if (!verbosAcao.some(v => descricao.toLowerCase().startsWith(v))) {
      console.log('[CARTAO-PARSE] Padrão "DESC VALOR em Xx": desc=', descricao, 'valor=', valor, 'parcelas=', parcelas, 'cartao=', cartao);
      return { 
        tipo: 'compra_parcelada', 
        valor, 
        parcelas,
        cartao,
        descricao: descricao.charAt(0).toUpperCase() + descricao.slice(1)
      };
    }
  }
  
  // COMPRA PARCELADA: "comprei 600 em 3x", "gastei 1200 em 6 vezes no cartão"
  const matchParcelado = msgLower.match(
    /(?:comprei|gastei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:em|de)\s+(\d+)\s*(?:x|vezes|parcelas?)(?:\s+(?:no|na|do|da)\s+(?:cartao\s+)?(.+))?/
  );
  if (matchParcelado) {
    const valor = parseFloat(matchParcelado[1].replace(',', '.'));
    const parcelas = parseInt(matchParcelado[2]);
    const cartao = matchParcelado[3]?.trim();
    return { 
      tipo: 'compra_parcelada', 
      valor, 
      parcelas,
      cartao
    };
  }
  
  // COMPRA SIMPLES NO CARTÃO: "gastei 200 no cartão", "compra de 150 no nubank", "comprei 200 no cartão nubank"
  const matchCompraCartao = msgLower.match(
    /(?:comprei|gastei|paguei|compra\s+de)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:no|na|do|da)\s+(?:cartao\s+)?(.+)/
  );
  if (matchCompraCartao) {
    const valor = parseFloat(matchCompraCartao[1].replace(',', '.'));
    const cartaoOuLocal = matchCompraCartao[2]?.trim();
    
    // Verificar se menciona cartão explicitamente ou é nome de cartão conhecido
    const cartoesConhecidos = ['nubank', 'itau', 'itaú', 'bradesco', 'santander', 'inter', 'c6', 'visa', 'mastercard', 'cartao', 'cartão'];
    const isCartao = cartoesConhecidos.some(c => cartaoOuLocal.includes(c));
    
    if (isCartao) {
      // Extrair nome do cartão removendo "cartao" e variações
      let nomeCartao = cartaoOuLocal
        .replace(/cartao\s*/gi, '')
        .replace(/cartão\s*/gi, '')
        .replace(/de\s+credito/gi, '')
        .replace(/de\s+crédito/gi, '')
        .trim();
      
      // Se sobrou algo, usar como nome do cartão
      if (nomeCartao && nomeCartao.length > 0) {
        return { 
          tipo: 'compra_cartao', 
          valor, 
          parcelas: 1,
          cartao: nomeCartao
        };
      }
      
      // Se não sobrou nome, retorna sem cartão (vai perguntar)
      return { 
        tipo: 'compra_cartao', 
        valor, 
        parcelas: 1
      };
    }
  }
  
  // Padrão alternativo: "no cartão gastei 200"
  const matchCartaoGastei = msgLower.match(
    /(?:no|na)\s+(?:cartao|cartão)\s+(?:gastei|comprei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/
  );
  if (matchCartaoGastei) {
    const valor = parseFloat(matchCartaoGastei[1].replace(',', '.'));
    return { tipo: 'compra_cartao', valor, parcelas: 1 };
  }
  
  // PADRÃO COMPLETO: "gastei 50 no almoço e paguei com cartão de crédito no nubank"
  // Também captura: "gastei 50 no almoço e paguei com cartão de crédito nubank" (sem "no")
  // Captura: valor + descrição + cartão (opcional)
  const matchPagueiCartao = msgLower.match(
    /(?:gastei|comprei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:reais\s+)?(?:no|na|em|de)\s+(.+?)\s+(?:e\s+)?(?:paguei\s+)?(?:com\s+)?(?:o\s+)?(?:cartao|cartão)(?:\s+de\s+credito)?(?:\s+(?:no|na|do|da)?\s*(.+))?/
  );
  if (matchPagueiCartao) {
    const valor = parseFloat(matchPagueiCartao[1].replace(',', '.'));
    const descricao = matchPagueiCartao[2]?.trim();
    let cartao = matchPagueiCartao[3]?.trim();
    
    // Limpar pontuação final do cartão
    if (cartao) {
      cartao = cartao.replace(/[.,!?]+$/, '').trim();
    }
    
    // Se capturou um cartão válido
    if (cartao && cartao.length > 0) {
      return { 
        tipo: 'compra_cartao', 
        valor, 
        parcelas: 1,
        cartao,
        descricao: descricao ? descricao.charAt(0).toUpperCase() + descricao.slice(1) : undefined
      };
    }
  }
  
  // PADRÃO: menciona "cartão" ou "crédito" em qualquer lugar + valor
  // "almoço 50 reais no cartão", "paguei 100 no crédito"
  if (/\b(cartao|cartão|credito|crédito)\b/.test(msgLower)) {
    const matchValor = msgLower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
    if (matchValor) {
      const valor = parseFloat(matchValor[1].replace(',', '.'));
      // ✅ CORREÇÃO BUG #7: Usar detectarCartaoPorAlias para reconhecer aliases como "roxinho"
      const cartaoDetectado = detectarCartaoPorAlias(msgLower);
      return { 
        tipo: 'compra_cartao', 
        valor, 
        parcelas: 1,
        cartao: cartaoDetectado || undefined
      };
    }
  }
  
  // ✅ CORREÇÃO BUG #7: Detectar compra quando menciona alias de cartão diretamente
  // "TV 2000 em 10x no roxinho", "comprei 500 no laranjinha"
  const cartaoAlias = detectarCartaoPorAlias(msgLower);
  if (cartaoAlias) {
    const matchValor = msgLower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
    if (matchValor) {
      const valor = parseFloat(matchValor[1].replace(',', '.'));
      // Verificar se tem parcelas
      const matchParcelas = msgLower.match(/(\d+)\s*(?:x|vezes|parcelas?)/i);
      const parcelas = matchParcelas ? parseInt(matchParcelas[1]) : 1;
      
      return { 
        tipo: parcelas > 1 ? 'compra_parcelada' : 'compra_cartao', 
        valor, 
        parcelas,
        cartao: cartaoAlias
      };
    }
  }
  
  // CONSULTA FATURA: "fatura do nubank", "minha fatura", "fatura do cartão"
  if (/\b(fatura|faturas)\b/.test(msgLower)) {
    const matchFatura = msgLower.match(/fatura\s+(?:do|da|de)\s+(.+)/);
    return { 
      tipo: 'consulta_fatura',
      cartao: matchFatura?.[1]?.replace('cartao', '').replace('cartão', '').trim()
    };
  }
  
  // CONSULTA LIMITE: "limite do cartão", "meu limite", "limite disponível"
  if (/\b(limite|limites)\b/.test(msgLower)) {
    const matchLimite = msgLower.match(/limite\s+(?:do|da|de)\s+(.+)/);
    return { 
      tipo: 'consulta_limite',
      cartao: matchLimite?.[1]?.replace('cartao', '').replace('cartão', '').trim()
    };
  }
  
  // LISTAR CARTÕES: "meus cartões", "cartões"
  if (/\b(meus\s+cartoes|meus\s+cartões|cartoes|cartões)\b/.test(msgLower)) {
    return { tipo: 'listar_cartoes' };
  }
  
  // ✅ CORREÇÃO BUG #6: Detectar apenas nome/alias de cartão (ex: "Nu", "Nubank", "Itau")
  // Quando o usuário digita apenas o nome do cartão, assume que quer ver a fatura
  const aliasesCartao: Record<string, string[]> = {
    'nubank': ['nu', 'nubank', 'roxinho', 'roxo'],
    'itau': ['itau', 'itaú', 'iti'],
    'bradesco': ['bradesco', 'brades', 'brad'],
    'santander': ['santander', 'santan', 'sant'],
    'inter': ['inter', 'laranja'],
    'c6': ['c6', 'c6bank'],
    'picpay': ['picpay', 'pic'],
    'will': ['will', 'willbank'],
    'neon': ['neon'],
    'next': ['next'],
  };
  
  const msgTrimmed = msgLower.trim();
  for (const [cartaoPadrao, aliases] of Object.entries(aliasesCartao)) {
    if (aliases.includes(msgTrimmed) || msgTrimmed === cartaoPadrao) {
      console.log('[CARTAO] Detectado nome/alias de cartão:', msgTrimmed, '→', cartaoPadrao);
      return { 
        tipo: 'consulta_fatura',
        cartao: cartaoPadrao
      };
    }
  }
  
  // VER TODAS COMPRAS DO CARTÃO: "ver todas compras", "todas as compras", "listar compras"
  if (/\b(ver\s+todas?\s+(?:as\s+)?compras?|todas?\s+(?:as\s+)?compras?|listar\s+compras?)\b/.test(msgLower)) {
    const matchCartao = msgLower.match(/(?:do|da|de)\s+(nubank|itau|itaú|bradesco|santander|inter|c6|picpay)/i);
    return { 
      tipo: 'listar_compras_cartao',
      cartao: matchCartao?.[1]
    };
  }
  
  // CONSULTA POR ESTABELECIMENTO/CATEGORIA: "quanto gastei de ifood", "quanto gastei de uber no nubank"
  const matchGastoEspecifico = msgLower.match(
    /(?:quanto|qual)\s+(?:gastei|foi|paguei)\s+(?:de|em|no|na|com)\s+(.+?)(?:\s+(?:no|na|do|da)\s+(?:cartao\s+)?(.+?))?(?:\s+(?:esse|este|nesse|neste)\s+mes)?$/
  );
  if (matchGastoEspecifico) {
    const termo = matchGastoEspecifico[1]?.trim();
    const cartao = matchGastoEspecifico[2]?.trim();
    
    // Verificar se é um termo válido (estabelecimento ou categoria)
    const termosValidos = ['ifood', 'uber', 'rappi', 'spotify', 'netflix', 'amazon', 'mercado', 'supermercado',
      'alimentacao', 'alimentação', 'transporte', 'lazer', 'saude', 'saúde', 'educacao', 'educação',
      'assinaturas', 'compras', 'vestuario', 'vestuário', 'beleza', 'viagem', 'pets'];
    
    const termoNorm = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isTermoValido = termosValidos.some(t => termoNorm.includes(t) || t.includes(termoNorm));
    
    if (isTermoValido || termo.length >= 3) {
      return { 
        tipo: 'consulta_gasto_especifico',
        descricao: termo,
        cartao: cartao
      };
    }
  }
  
  // COMPARAR MESES: "comparar meses", "comparar fatura", "historico"
  if (/\b(comparar\s+(?:meses|faturas?)|historico|histórico|vs\s+mes\s+passado)\b/.test(msgLower)) {
    const matchCartao = msgLower.match(/(?:do|da|de)\s+(nubank|itau|itaú|bradesco|santander|inter|c6|picpay)/i);
    return { 
      tipo: 'comparar_meses',
      cartao: matchCartao?.[1]
    };
  }
  
  return null;
}

// ============================================
// BUSCAR CARTÕES DO USUÁRIO
// ============================================

export async function buscarCartoesUsuario(userId: string): Promise<any[]> {
  const supabase = getSupabase();
  
  const { data: cartoes, error } = await supabase
    .from('credit_cards')
    .select('id, name, brand, last_four_digits, credit_limit, available_limit, closing_day, due_day, color')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    console.error('[CARTAO] Erro ao buscar cartões:', error);
    return [];
  }
  
  return cartoes || [];
}

// ============================================
// LISTAR CARTÕES
// ============================================

export async function listarCartoes(userId: string): Promise<string> {
  const cartoes = await buscarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    return `💳 Você não tem cartões cadastrados.\n\n💡 _Cadastre seus cartões no app para controlar suas faturas!_`;
  }
  
  let mensagem = `💳 *Seus Cartões de Crédito*\n\n`;
  
  for (const cartao of cartoes) {
    const emoji = getEmojiBanco(cartao.name);
    const limiteUsado = cartao.credit_limit - cartao.available_limit;
    const percentualUsado = ((limiteUsado / cartao.credit_limit) * 100).toFixed(0);
    
    mensagem += `${emoji} *${cartao.name}*`;
    if (cartao.last_four_digits) {
      mensagem += ` (****${cartao.last_four_digits})`;
    }
    mensagem += `\n`;
    mensagem += `   💰 Limite: ${formatarMoeda(cartao.credit_limit)}\n`;
    mensagem += `   ✅ Disponível: ${formatarMoeda(cartao.available_limit)}\n`;
    mensagem += `   📊 Usado: ${percentualUsado}%\n`;
    mensagem += `   📅 Fecha dia ${cartao.closing_day} | Vence dia ${cartao.due_day}\n\n`;
  }
  
  return mensagem;
}

// ============================================
// CONSULTAR LIMITE
// ============================================

// Função auxiliar para gerar barra de progresso visual
function gerarBarraProgresso(percentual: number): string {
  const total = 20;
  const preenchido = Math.round((percentual / 100) * total);
  const vazio = total - preenchido;
  return '█'.repeat(preenchido) + '░'.repeat(vazio);
}

export async function consultarLimite(userId: string, nomeCartao?: string): Promise<string> {
  const supabase = getSupabase();
  const cartoes = await buscarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    return `💳 Você não tem cartões cadastrados.`;
  }
  
  // Se especificou cartão, usar busca fuzzy para encontrar por alias
  let cartoesParaMostrar = cartoes;
  if (nomeCartao) {
    const fuzzyResult = buscarCartaoFuzzy(nomeCartao, cartoes);
    if (fuzzyResult.encontrado && fuzzyResult.cartao) {
      cartoesParaMostrar = [fuzzyResult.cartao];
    } else {
      // Fallback para busca simples
      const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      cartoesParaMostrar = cartoes.filter((c: any) => {
        const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
      });
      
      if (cartoesParaMostrar.length === 0) {
        let lista = `❓ Não encontrei o cartão "${nomeCartao}".\n\n📋 *Seus cartões:*\n`;
        cartoes.forEach((c: any) => { lista += `• ${c.name}\n`; });
        return lista;
      }
    }
  }
  
  // LIMITE INDIVIDUAL (detalhado)
  if (cartoesParaMostrar.length === 1) {
    const c = cartoesParaMostrar[0];
    const emoji = getEmojiBanco(c.name);
    const limiteUsado = c.credit_limit - c.available_limit;
    const percentualUsado = c.credit_limit > 0 ? ((limiteUsado / c.credit_limit) * 100) : 0;
    const percentualDisponivel = 100 - percentualUsado;
    
    // Buscar fatura mais recente (pode ser do mês atual ou anterior)
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    // Buscar fatura mais recente do cartão (ordenar por ano e mês decrescente)
    const { data: faturaAtual } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', c.id)
      .order('reference_year', { ascending: false })
      .order('reference_month', { ascending: false })
      .limit(1)
      .single();
    
    // Calcular dias até fechamento usando closing_day do cartão
    const closingDay = c.closing_day || 1;
    let proximoFechamento: Date;
    if (hoje.getDate() < closingDay) {
      proximoFechamento = new Date(anoAtual, hoje.getMonth(), closingDay);
    } else {
      proximoFechamento = new Date(anoAtual, hoje.getMonth() + 1, closingDay);
    }
    const diasAteFechamento = Math.ceil((proximoFechamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    let mensagem = `${emoji} *Limite ${c.name}*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `📊 *RESUMO*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `💳 Limite Total: ${formatarMoeda(c.credit_limit)}\n`;
    mensagem += `✅ Disponível: ${formatarMoeda(c.available_limit)} (${percentualDisponivel.toFixed(0)}%)\n`;
    mensagem += `💸 Usado: ${formatarMoeda(limiteUsado)} (${percentualUsado.toFixed(0)}%)\n`;
    
    // Adicionar info da fatura ANTES da barra de progresso
    // Se existe fatura cadastrada, usar ela; senão, mostrar valor usado como fatura
    const nomeMes = meses[mesAtual];
    
    if (faturaAtual) {
      const mesFatura = faturaAtual.reference_month || mesAtual;
      const nomeMesFatura = meses[mesFatura] || nomeMes;
      
      // Determinar status visual
      let statusEmoji = '🟡';
      let statusTexto = 'Pendente';
      if (faturaAtual.status === 'paid') {
        statusEmoji = '🟢';
        statusTexto = 'Paga';
      } else if (faturaAtual.status === 'overdue' || (faturaAtual.due_date && new Date(faturaAtual.due_date) < hoje)) {
        statusEmoji = '🔴';
        statusTexto = 'Atrasada';
      } else if (faturaAtual.status === 'partial') {
        statusEmoji = '🟠';
        statusTexto = 'Parcial';
      }
      
      mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
      mensagem += `📅 *FATURA ATUAL* (${nomeMesFatura})\n`;
      mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
      mensagem += `• Valor: ${formatarMoeda(faturaAtual.total_amount || 0)}\n`;
      if (faturaAtual.due_date) {
        const venc = new Date(faturaAtual.due_date);
        mensagem += `• Vencimento: ${venc.toLocaleDateString('pt-BR')}\n`;
      }
      mensagem += `• Status: ${statusEmoji} ${statusTexto}\n`;
    } else if (limiteUsado > 0) {
      // Se não tem fatura cadastrada mas tem limite usado, mostrar como fatura atual
      const dueDay = c.due_day || 10;
      const dataVencimento = new Date(anoAtual, hoje.getMonth(), dueDay);
      if (dataVencimento < hoje) {
        dataVencimento.setMonth(dataVencimento.getMonth() + 1);
      }
      
      mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
      mensagem += `📅 *FATURA ATUAL* (${nomeMes})\n`;
      mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
      mensagem += `• Valor: ${formatarMoeda(limiteUsado)}\n`;
      mensagem += `• Vencimento: ${dataVencimento.toLocaleDateString('pt-BR')}\n`;
      mensagem += `• Status: 🟡 Pendente\n`;
    }
    
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `📈 *USO DO LIMITE*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `[${gerarBarraProgresso(percentualUsado)}] ${percentualUsado.toFixed(0)}%\n`;
    
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `💡 *DICAS*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `• Você pode gastar mais ${formatarMoeda(c.available_limit)}\n`;
    if (diasAteFechamento > 0) {
      mensagem += `• Próxima fatura fecha em ${diasAteFechamento} dias\n`;
    }
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `⚡ *AÇÕES RÁPIDAS*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `• _"fatura ${c.name.toLowerCase()}"_ - Ver compras\n`;
    mensagem += `• _"comprei X no ${c.name.toLowerCase()}"_ - Registrar`;
    
    return mensagem;
  }
  
  // MÚLTIPLOS CARTÕES (resumo)
  let mensagem = `💳 *Limites dos Cartões*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  let totalLimite = 0;
  let totalDisponivel = 0;
  
  for (const c of cartoesParaMostrar) {
    const emoji = getEmojiBanco(c.name);
    const limiteUsado = c.credit_limit - c.available_limit;
    const percentualUsado = c.credit_limit > 0 ? ((limiteUsado / c.credit_limit) * 100) : 0;
    
    mensagem += `${emoji} *${c.name}*\n`;
    mensagem += `├ Total: ${formatarMoeda(c.credit_limit)}\n`;
    mensagem += `├ Disponível: ${formatarMoeda(c.available_limit)}\n`;
    mensagem += `├ Usado: ${percentualUsado.toFixed(0)}%\n`;
    mensagem += `└ [${gerarBarraProgresso(percentualUsado)}]\n\n`;
    
    totalLimite += c.credit_limit || 0;
    totalDisponivel += c.available_limit || 0;
  }
  
  const totalUsado = totalLimite - totalDisponivel;
  const percentualTotalUsado = totalLimite > 0 ? ((totalUsado / totalLimite) * 100) : 0;
  
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `📊 *RESUMO GERAL*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💳 Limite Total: ${formatarMoeda(totalLimite)}\n`;
  mensagem += `✅ Disponível: ${formatarMoeda(totalDisponivel)} (${(100 - percentualTotalUsado).toFixed(0)}%)\n`;
  mensagem += `💸 Usado: ${formatarMoeda(totalUsado)} (${percentualTotalUsado.toFixed(0)}%)\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💡 Digite _"limite [cartão]"_ para detalhes`;
  
  return mensagem;
}

// ============================================
// LISTAR APENAS FATURAS VENCIDAS
// ============================================

export async function listarFaturasVencidas(userId: string, phone?: string): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  // Buscar APENAS faturas vencidas (due_date < hoje e não pagas)
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      due_date,
      total_amount,
      paid_amount,
      remaining_amount,
      status,
      reference_month,
      credit_card_id,
      credit_cards!inner(id, name, issuing_bank)
    `)
    .eq('user_id', userId)
    .lt('due_date', hojeStr)
    .not('status', 'eq', 'paid')
    .order('due_date', { ascending: true });
  
  if (!faturas || faturas.length === 0) {
    return `✅ *Parabéns!*\n\nVocê não tem faturas vencidas! 🎉\n\n_Todos os cartões estão em dia._`;
  }
  
  let mensagem = `🔴 *Faturas Vencidas* (${faturas.length})\n\n`;
  let totalGeral = 0;
  let idx = 1;
  
  // Preparar dados para salvar no contexto
  const faturasContexto: any[] = [];
  
  for (const f of faturas as any[]) {
    const valorRestante = f.remaining_amount ?? (f.total_amount - (f.paid_amount || 0));
    const diasAtraso = Math.ceil((hoje.getTime() - new Date(f.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const emoji = getEmojiBanco(f.credit_cards.name);
    const mesRef = new Date(f.reference_month + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    mensagem += `${idx}. ${emoji} ${f.credit_cards.name} (${mesRef}) - ${formatarMoeda(valorRestante)} — _há ${diasAtraso}d_\n`;
    totalGeral += Number(valorRestante);
    
    // Adicionar ao contexto
    faturasContexto.push({
      fatura_id: f.id,
      cartao_id: f.credit_card_id,
      cartao_nome: f.credit_cards.name,
      reference_month: f.reference_month,
      valor_restante: valorRestante
    });
    
    idx++;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total em atraso:* ${formatarMoeda(totalGeral)}\n\n`;
  mensagem += `⚠️ _Regularize o quanto antes para evitar juros!_\n\n`;
  mensagem += `💡 _"paguei a fatura do Nubank"_ ou _"detalhes da fatura do Itau"_`;
  
  // Salvar contexto das faturas vencidas para próximas perguntas
  if (phone) {
    // Deletar contexto antigo
    await supabase
      .from('conversation_context')
      .delete()
      .eq('user_id', userId)
      .eq('context_type', 'faturas_vencidas_context');
    
    // Inserir novo contexto
    await supabase
      .from('conversation_context')
      .insert({
        user_id: userId,
        phone: phone,
        context_type: 'faturas_vencidas_context',
        context_data: {
          faturas: faturasContexto,
          ultima_consulta: new Date().toISOString()
        },
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      });
    
    console.log('[FATURAS_VENCIDAS] Contexto salvo com', faturasContexto.length, 'faturas para user:', userId);
  }
  
  return mensagem;
}

// ============================================
// LISTAR TODAS AS FATURAS PENDENTES (em aberto + vencidas)
// ============================================

export async function listarFaturasPendentes(userId: string): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  // Buscar TODAS as faturas não pagas
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      due_date,
      total_amount,
      paid_amount,
      remaining_amount,
      status,
      reference_month,
      credit_cards!inner(name, issuing_bank)
    `)
    .eq('user_id', userId)
    .not('status', 'eq', 'paid')
    .order('due_date', { ascending: true });
  
  if (!faturas || faturas.length === 0) {
    return `✅ *Parabéns!*\n\nVocê não tem faturas pendentes! 🎉\n\n_Todos os cartões estão em dia._`;
  }
  
  // Separar vencidas e em aberto
  const vencidas = faturas.filter((f: any) => f.due_date < hojeStr);
  const emAberto = faturas.filter((f: any) => f.due_date >= hojeStr);
  
  let mensagem = `💳 *Suas Faturas*\n`;
  let totalGeral = 0;
  let idx = 1;
  
  // Faturas VENCIDAS
  if (vencidas.length > 0) {
    mensagem += `\n🔴 *VENCIDAS* (${vencidas.length})\n`;
    for (const f of vencidas as any[]) {
      const valorRestante = f.remaining_amount ?? (f.total_amount - (f.paid_amount || 0));
      const diasAtraso = Math.ceil((hoje.getTime() - new Date(f.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const emoji = getEmojiBanco(f.credit_cards.name);
      const mesRef = new Date(f.reference_month).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      mensagem += `${idx}. ${emoji} ${f.credit_cards.name} (${mesRef}) - ${formatarMoeda(valorRestante)} — _há ${diasAtraso}d_\n`;
      totalGeral += Number(valorRestante);
      idx++;
    }
  }
  
  // Faturas EM ABERTO
  if (emAberto.length > 0) {
    mensagem += `\n🟡 *EM ABERTO* (${emAberto.length})\n`;
    for (const f of emAberto as any[]) {
      const valorRestante = f.remaining_amount ?? (f.total_amount - (f.paid_amount || 0));
      const diasParaVencer = Math.ceil((new Date(f.due_date).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const emoji = getEmojiBanco(f.credit_cards.name);
      const dataVenc = new Date(f.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const mesRef = new Date(f.reference_month).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      mensagem += `${idx}. ${emoji} ${f.credit_cards.name} (${mesRef}) - ${dataVenc}: ${formatarMoeda(valorRestante)} — _em ${diasParaVencer}d_\n`;
      totalGeral += Number(valorRestante);
      idx++;
    }
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total:* ${formatarMoeda(totalGeral)}\n`;
  
  if (vencidas.length > 0) {
    mensagem += `\n⚠️ _Regularize as faturas vencidas para evitar juros!_`;
  }
  
  mensagem += `\n\n💡 _"paguei a fatura do Nubank"_`;
  
  return mensagem;
}

// ============================================
// CONSULTAR FATURA
// ============================================

export async function consultarFatura(userId: string, nomeCartao?: string, salvarContexto: boolean = true, phone?: string, mesReferencia?: string): Promise<string> {
  const supabase = getSupabase();
  
  // Se não especificou cartão, mostrar todas as faturas pendentes
  if (!nomeCartao) {
    return await listarFaturasPendentes(userId);
  }
  
  const cartoes = await buscarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    return `💳 Você não tem cartões cadastrados.`;
  }
  
  // Filtrar cartão se especificado
  let cartaoSelecionado = cartoes[0];
  if (nomeCartao) {
    const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encontrado = cartoes.find((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
    });
    
    if (!encontrado) {
      let lista = `❓ Não encontrei o cartão "${nomeCartao}".\n\n📋 *Seus cartões:*\n`;
      cartoes.forEach((c: any) => { lista += `• ${c.name}\n`; });
      return lista;
    }
    cartaoSelecionado = encontrado;
  }
  
  const emoji = getEmojiBanco(cartaoSelecionado.name);
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  
  // ============================================
  // VERIFICAR CONTEXTO DE FATURAS VENCIDAS
  // Se o usuário acabou de perguntar sobre faturas vencidas e agora quer detalhes
  // de um cartão específico, buscar a fatura vencida desse cartão
  // ============================================
  let faturaId: string | null = null;
  
  const { data: contextoVencidas } = await supabase
    .from('conversation_context')
    .select('context_data')
    .eq('user_id', userId)
    .eq('context_type', 'faturas_vencidas_context')
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (contextoVencidas?.context_data?.faturas) {
    // Procurar se há uma fatura vencida desse cartão no contexto
    const faturaVencida = contextoVencidas.context_data.faturas.find((f: any) => {
      const nomeContexto = f.cartao_nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nomeContexto.includes(nomeNorm) || nomeNorm.includes(nomeContexto);
    });
    
    if (faturaVencida) {
      console.log('[CONTEXTO] Usando fatura vencida do contexto:', faturaVencida.fatura_id);
      faturaId = faturaVencida.fatura_id;
    }
  }
  
  // Buscar fatura - prioridade: 1) mesReferencia do NLP, 2) contexto vencidas, 3) fatura atual
  let fatura: any = null;
  
  // Se o NLP extraiu um mês de referência do histórico, buscar essa fatura específica
  if (mesReferencia) {
    console.log('[FATURA] Buscando fatura do mês:', mesReferencia);
    
    // Converter nome do mês para número
    const mesesMap: Record<string, number> = {
      'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
      'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7, 'setembro': 8,
      'outubro': 9, 'novembro': 10, 'dezembro': 11
    };
    
    const mesNum = mesesMap[mesReferencia.toLowerCase()];
    if (mesNum !== undefined) {
      // Determinar o ano (se mês > atual, provavelmente é ano passado)
      const anoRef = mesNum > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
      const mesRefDate = new Date(anoRef, mesNum, 1);
      const mesRefStr = mesRefDate.toISOString().split('T')[0];
      
      const { data: faturaRef } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', cartaoSelecionado.id)
        .eq('user_id', userId)
        .eq('reference_month', mesRefStr)
        .single();
      
      if (faturaRef) {
        console.log('[FATURA] Encontrada fatura do mês', mesReferencia, ':', faturaRef.id);
        fatura = faturaRef;
      }
    }
  }
  
  // Se não encontrou por mesReferencia, tentar pelo contexto de faturas vencidas
  if (!fatura && faturaId) {
    const { data: faturaContexto } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('id', faturaId)
      .eq('user_id', userId)
      .single();
    fatura = faturaContexto;
  }
  
  // Se ainda não encontrou, buscar fatura atual (comportamento original)
  if (!fatura) {
    const { data: faturaAtual } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', cartaoSelecionado.id)
      .eq('user_id', userId)
      .gte('reference_month', mesAtual.toISOString().split('T')[0])
      .order('reference_month', { ascending: true })
      .limit(1)
      .single();
    fatura = faturaAtual;
  }
  
  // Determinar período para buscar transações
  // Se temos fatura do contexto, usar o reference_month dela
  let periodoInicio: Date;
  let periodoFim: Date;
  
  if (fatura?.reference_month) {
    const refMonth = new Date(fatura.reference_month + 'T12:00:00');
    periodoInicio = new Date(refMonth.getFullYear(), refMonth.getMonth(), 1);
    periodoFim = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1);
  } else {
    periodoInicio = mesAtual;
    periodoFim = proximoMes;
  }
  
  // Buscar TODAS as transações do período (sem limite)
  const { data: transacoes } = await supabase
    .from('credit_card_transactions')
    .select(`
      amount, description, purchase_date,
      total_installments, installment_number,
      category:categories(name)
    `)
    .eq('credit_card_id', cartaoSelecionado.id)
    .eq('user_id', userId)
    .gte('purchase_date', periodoInicio.toISOString().split('T')[0])
    .lt('purchase_date', periodoFim.toISOString().split('T')[0])
    .order('purchase_date', { ascending: false });
  
  // Dados do cartão
  const limite = cartaoSelecionado.credit_limit || 0;
  const diaFechamento = cartaoSelecionado.closing_day || 1;
  const diaVencimento = cartaoSelecionado.due_day || 10;
  
  // Calcular data de fechamento
  let dataFechamento = new Date(hoje.getFullYear(), hoje.getMonth(), diaFechamento);
  if (hoje.getDate() > diaFechamento) {
    dataFechamento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaFechamento);
  }
  
  // Calcular total da fatura
  const totalFatura = fatura?.total_amount || 
    (transacoes?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0);
  
  const limiteDisponivel = limite - totalFatura;
  const percentualUsado = limite > 0 ? Math.round((totalFatura / limite) * 100) : 0;
  const percentualDisponivel = 100 - percentualUsado;
  
  // Calcular data de vencimento
  let dataVencimento = fatura?.due_date 
    ? new Date(fatura.due_date) 
    : new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  
  if (!fatura?.due_date && hoje.getDate() > diaFechamento) {
    dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
  }
  
  // Calcular dias para vencer
  const diasParaVencer = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const diasAteFechamento = Math.ceil((dataFechamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  // ============================================
  // BUSCAR FATURA DO MÊS ANTERIOR PARA COMPARAÇÃO
  // ============================================
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const { data: faturaAnterior } = await supabase
    .from('credit_card_invoices')
    .select('total_amount')
    .eq('credit_card_id', cartaoSelecionado.id)
    .eq('user_id', userId)
    .gte('reference_month', mesAnterior.toISOString().split('T')[0])
    .lt('reference_month', mesAtual.toISOString().split('T')[0])
    .single();
  
  // Buscar transações do mês anterior para comparar categorias
  const { data: transacoesAnterior } = await supabase
    .from('credit_card_transactions')
    .select(`amount, category:categories(name)`)
    .eq('credit_card_id', cartaoSelecionado.id)
    .eq('user_id', userId)
    .gte('purchase_date', mesAnterior.toISOString().split('T')[0])
    .lt('purchase_date', mesAtual.toISOString().split('T')[0]);
  
  // ============================================
  // FUNÇÃO PARA STATUS VISUAL DINÂMICO
  // ============================================
  function getStatusVisual(): string {
    const status = fatura?.status || 'open';
    
    // PAGA
    if (status === 'paid') {
      if (fatura?.paid_at) {
        const dataPagamento = new Date(fatura.paid_at);
        const diasAntecipado = Math.ceil((dataVencimento.getTime() - dataPagamento.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAntecipado > 0) {
          return `🟢 PAGA ✓ em ${dataPagamento.toLocaleDateString('pt-BR')} (${diasAntecipado} dias antes!)`;
        }
        return `🟢 PAGA ✓ em ${dataPagamento.toLocaleDateString('pt-BR')}`;
      }
      return `🟢 PAGA ✓`;
    }
    
    // VENCIDA
    if (status === 'overdue' || diasParaVencer < 0) {
      return `🔴 VENCIDA há ${Math.abs(diasParaVencer)} dias ⚠️`;
    }
    
    // FUTURA (mais de 30 dias ou status future)
    if (status === 'future' || diasParaVencer > 30) {
      return `⚪ FUTURA • Fecha em ${diasAteFechamento > 0 ? diasAteFechamento : 'breve'} dias`;
    }
    
    // ABERTA
    if (diasParaVencer <= 3 && diasParaVencer >= 0) {
      return `🟡 ABERTA • Vence em ${diasParaVencer} dias ⚠️`;
    }
    
    return `🟡 ABERTA • Vence em ${diasParaVencer} dias`;
  }
  
  // ============================================
  // MONTAR TEMPLATE EXPANDIDO
  // ============================================
  
  const statusVisual = getStatusVisual();
  const statusAtual = fatura?.status || 'open';
  
  let mensagem = `${emoji} *Fatura ${cartaoSelecionado.name}*\n`;
  mensagem += `📅 ${obterNomeMes(hoje)}\n\n`;
  
  // ━━━ STATUS VISUAL DESTACADO ━━━
  mensagem += `${statusVisual}\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // ━━━ VALORES ━━━
  if (statusAtual === 'paid') {
    mensagem += `💰 *Valor pago:* ${formatarMoeda(fatura?.paid_amount || totalFatura)}\n`;
    mensagem += `📆 *Vencimento:* ${dataVencimento.toLocaleDateString('pt-BR')}\n`;
    if (fatura?.paid_at) {
      mensagem += `✅ *Pago em:* ${new Date(fatura.paid_at).toLocaleDateString('pt-BR')}\n`;
    }
  } else if (statusAtual === 'overdue' || diasParaVencer < 0) {
    mensagem += `💰 *Valor:* ${formatarMoeda(totalFatura)}\n`;
    // Calcular juros estimados (2.5% ao mês = ~0.08% ao dia)
    const diasAtraso = Math.abs(diasParaVencer);
    const jurosEstimado = totalFatura * (0.0008 * diasAtraso);
    const totalComJuros = totalFatura + jurosEstimado;
    const percentualJuros = ((jurosEstimado / totalFatura) * 100).toFixed(1);
    mensagem += `💸 *Com juros:* ${formatarMoeda(totalComJuros)} (+${percentualJuros}%)\n`;
    mensagem += `📆 *Venceu em:* ${dataVencimento.toLocaleDateString('pt-BR')}\n\n`;
    mensagem += `⚠️ *ATENÇÃO:* Juros de ~14% ao mês!\n`;
    mensagem += `💡 Pague o quanto antes para evitar\n   mais encargos.\n`;
  } else {
    mensagem += `💰 *Valor atual:* ${formatarMoeda(totalFatura)}\n`;
    mensagem += `📆 *Vencimento:* ${dataVencimento.toLocaleDateString('pt-BR')}\n`;
    mensagem += `📅 *Fechamento:* ${dataFechamento.toLocaleDateString('pt-BR')}\n`;
  }
  
  mensagem += `\n`;
  
  // ━━━ LIMITE ━━━
  if (limite > 0) {
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `💳 *LIMITE*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `📊 Total: ${formatarMoeda(limite)}\n`;
    mensagem += `✅ Disponível: ${formatarMoeda(limiteDisponivel)} (${percentualDisponivel}%)\n`;
    mensagem += `💸 Usado: ${formatarMoeda(totalFatura)} (${percentualUsado}%)\n\n`;
  }
  
  // ━━━ COMPRAS ━━━
  // Agrupar compras parceladas: mostrar apenas 1 linha por compra com parcela atual
  interface CompraUnica {
    descricao: string;
    valor: number;
    parcelaAtual: number;
    totalParcelas: number;
    purchase_date: string;
  }
  
  const comprasUnicas: CompraUnica[] = [];
  const jaProcessado = new Set<string>();
  
  if (transacoes && transacoes.length > 0) {
    for (const t of transacoes) {
      // Extrair nome base (sem parcela)
      const nomeBase = t.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
      
      // Chave única: nome base + total parcelas (agrupa todas as parcelas da mesma compra)
      const chave = `${nomeBase}|${t.total_installments || 1}`;
      
      if (jaProcessado.has(chave)) continue;
      jaProcessado.add(chave);
      
      // Pegar a primeira parcela encontrada (menor número)
      const todasParcelas = transacoes.filter((p: any) => {
        const pNomeBase = p.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        return pNomeBase === nomeBase && 
               (p.total_installments || 1) === (t.total_installments || 1);
      });
      
      // Ordenar por número da parcela e pegar a primeira
      todasParcelas.sort((a: any, b: any) => (a.installment_number || 1) - (b.installment_number || 1));
      const primeiraParcela = todasParcelas[0];
      
      comprasUnicas.push({
        descricao: nomeBase,
        valor: Number(primeiraParcela.amount), // Valor da parcela, não soma
        parcelaAtual: primeiraParcela.installment_number || 1,
        totalParcelas: primeiraParcela.total_installments || 1,
        purchase_date: primeiraParcela.purchase_date
      });
    }
  }
  
  const qtdComprasUnicas = comprasUnicas.length;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `🛒 *COMPRAS DESTA FATURA* (${qtdComprasUnicas})\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (comprasUnicas.length > 0) {
    // Agrupar por data
    const comprasPorData: Record<string, CompraUnica[]> = {};
    for (const c of comprasUnicas) {
      if (!comprasPorData[c.purchase_date]) {
        comprasPorData[c.purchase_date] = [];
      }
      comprasPorData[c.purchase_date].push(c);
    }
    
    // Ordenar datas (mais recente primeiro)
    const datasOrdenadas = Object.keys(comprasPorData).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    let numeroCompra = 1;
    
    for (const dataKey of datasOrdenadas) {
      const comprasDoDia = comprasPorData[dataKey];
      const dataObj = new Date(dataKey);
      const dataFormatada = `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // Cabeçalho do dia
      mensagem += `📅 *${dataFormatada}* ─────────────\n`;
      
      for (const c of comprasDoDia) {
        // Formatar descrição com parcela atual
        let descricao = c.descricao;
        if (c.totalParcelas > 1) {
          descricao += ` (${c.parcelaAtual}/${c.totalParcelas})`;
        }
        
        // Truncar descrição para alinhamento (18 chars max)
        const descTruncada = descricao.length > 18 ? descricao.substring(0, 16) + '..' : descricao;
        
        // Formatar valor (valor da parcela)
        const valorStr = formatarMoeda(c.valor);
        
        // Calcular pontos para que R$ fique sempre na mesma coluna
        // Posição fixa do R$: coluna 22 (após "X. " que tem ~3 chars)
        const prefixo = `${numeroCompra}. `;
        const posicaoFixaRS = 25; // R$ sempre começa aqui
        const espacoUsado = prefixo.length + descTruncada.length;
        const pontos = Math.max(1, posicaoFixaRS - espacoUsado);
        
        mensagem += `${prefixo}${descTruncada} ${'·'.repeat(pontos)} ${valorStr}\n`;
        numeroCompra++;
      }
      
      mensagem += `\n`;
    }
    
    // Total destacado
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `💰 *TOTAL:* ${formatarMoeda(totalFatura)}\n\n`;
  } else {
    mensagem += `✨ _Nenhuma compra neste período_\n\n`;
  }
  
  // ━━━ ANÁLISE ━━━
  if (transacoes && transacoes.length > 0) {
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `📈 *ANÁLISE*\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // ── COMPARATIVO COM MÊS ANTERIOR ──
    const totalAnterior = (transacoesAnterior || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    
    mensagem += `📊 *COMPARATIVO*\n`;
    mensagem += `• Este mês: ${formatarMoeda(totalFatura)}\n`;
    
    if (totalAnterior > 0) {
      const diferenca = totalFatura - totalAnterior;
      const variacao = ((diferenca) / totalAnterior) * 100;
      const seta = diferenca > 0 ? '⬆️' : diferenca < 0 ? '⬇️' : '➡️';
      const sinal = diferenca > 0 ? '+' : '';
      mensagem += `• Mês anterior: ${formatarMoeda(totalAnterior)}\n`;
      mensagem += `• Variação: ${seta} ${sinal}${variacao.toFixed(1)}% (${sinal}${formatarMoeda(Math.abs(diferenca))})\n`;
    } else {
      mensagem += `• Mês anterior: _sem dados_\n`;
    }
    mensagem += `\n`;
    
    // ── TOP 3 CATEGORIAS ──
    const porCategoria: Record<string, number> = {};
    for (const t of transacoes) {
      const cat = (t.category as any)?.name || 'Outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.amount);
    }
    
    const categoriasOrdenadas = Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (categoriasOrdenadas.length > 0) {
      mensagem += `🏆 *TOP ${categoriasOrdenadas.length} CATEGORIAS*\n`;
      let posicao = 1;
      for (const [cat, valor] of categoriasOrdenadas) {
        const percentual = ((valor / totalFatura) * 100).toFixed(0);
        const emoji = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : '🥉';
        mensagem += `${emoji} ${cat}: ${formatarMoeda(valor)} (${percentual}%)\n`;
        posicao++;
      }
      mensagem += `\n`;
    }
    
    // ── ESTATÍSTICAS ──
    mensagem += `📈 *ESTATÍSTICAS*\n`;
    
    // Média por compra
    const mediaCompra = totalFatura / transacoes.length;
    mensagem += `• Média/compra: ${formatarMoeda(mediaCompra)}\n`;
    
    // Maior e menor compra
    const valores = transacoes.map((t: any) => ({ desc: t.description, valor: Number(t.amount) }));
    const maiorCompra = valores.reduce((max: any, t: any) => t.valor > max.valor ? t : max, valores[0]);
    const menorCompra = valores.reduce((min: any, t: any) => t.valor < min.valor ? t : min, valores[0]);
    
    const descMaior = maiorCompra.desc.length > 15 ? maiorCompra.desc.substring(0, 13) + '..' : maiorCompra.desc;
    const descMenor = menorCompra.desc.length > 15 ? menorCompra.desc.substring(0, 13) + '..' : menorCompra.desc;
    
    mensagem += `• Maior: ${descMaior} (${formatarMoeda(maiorCompra.valor)})\n`;
    mensagem += `• Menor: ${descMenor} (${formatarMoeda(menorCompra.valor)})\n`;
    
    // Compras parceladas
    const parceladas = transacoes.filter((t: any) => t.total_installments > 1);
    if (parceladas.length > 0) {
      const totalParcelado = parceladas.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      mensagem += `• Parceladas: ${parceladas.length} (${formatarMoeda(totalParcelado)})\n`;
    }
    mensagem += `\n`;
    
    // ── MELHOR DATA PARA COMPRAR ──
    const diaAposFechamento = diaFechamento + 1;
    mensagem += `📅 *MELHOR DATA P/ COMPRAR*\n`;
    mensagem += `• Dias ${diaAposFechamento} a ${diaVencimento} _(próxima fatura)_\n\n`;
    
    // ── ALERTAS ──
    const alertas: string[] = [];
    
    // Alerta de limite
    if (percentualUsado >= 80) {
      alertas.push(`🔴 Você já usou *${percentualUsado}%* do limite`);
    } else if (percentualUsado >= 60) {
      alertas.push(`🟡 Você já usou *${percentualUsado}%* do limite`);
    }
    
    // Alertas de categorias que subiram
    if (transacoesAnterior && transacoesAnterior.length > 0) {
      const porCategoriaAnterior: Record<string, number> = {};
      for (const t of transacoesAnterior) {
        const cat = (t.category as any)?.name || 'Outros';
        porCategoriaAnterior[cat] = (porCategoriaAnterior[cat] || 0) + Number(t.amount);
      }
      
      for (const [categoria, valorAtual] of Object.entries(porCategoria)) {
        const valorAnterior = porCategoriaAnterior[categoria] || 0;
        if (valorAnterior > 0) {
          const variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100;
          if (variacao >= 30) {
            alertas.push(`⚠️ *${categoria}* subiu ${Math.round(variacao)}% vs mês passado`);
          }
        }
      }
    }
    
    if (alertas.length > 0) {
      mensagem += `🚨 *ALERTAS*\n`;
      for (const alerta of alertas.slice(0, 3)) {
        mensagem += `${alerta}\n`;
      }
      mensagem += `\n`;
    }
  }
  
  // ━━━ DICAS ━━━
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💡 *DICAS*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (diasAteFechamento > 0) {
    mensagem += `• Compras até ${dataFechamento.toLocaleDateString('pt-BR')} entram nesta fatura\n`;
    mensagem += `• Faltam *${diasAteFechamento} dias* para o fechamento\n`;
  } else {
    mensagem += `• Fatura já fechada\n`;
  }
  
  // Próxima fatura
  const proximaFaturaData = new Date(dataFechamento);
  proximaFaturaData.setMonth(proximaFaturaData.getMonth() + 1);
  const mesProximo = proximaFaturaData.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  mensagem += `• Após dia ${diaFechamento}, vai para ${mesProximo}\n\n`;
  
  // ━━━ AÇÕES RÁPIDAS ━━━
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `⚡ *AÇÕES RÁPIDAS*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `• _"ver todas compras"_ - Lista completa\n`;
  mensagem += `• _"comparar meses"_ - Histórico\n`;
  mensagem += `• _"quanto gastei de iFood"_ - Gasto específico`;
  
  // Salvar contexto do cartão para ações rápidas
  if (salvarContexto && phone) {
    // Primeiro, tentar deletar contexto antigo do mesmo tipo
    await supabase
      .from('conversation_context')
      .delete()
      .eq('user_id', userId)
      .eq('context_type', 'credit_card_context');
    
    // Inserir novo contexto
    await supabase
      .from('conversation_context')
      .insert({
        user_id: userId,
        phone: phone,
        context_type: 'credit_card_context',
        context_data: {
          cartao_id: cartaoSelecionado.id,
          cartao_nome: cartaoSelecionado.name,
          ultima_consulta: new Date().toISOString()
        },
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      });
    
    console.log('[CARTAO] Contexto salvo:', cartaoSelecionado.name, 'para user:', userId);
  }
  
  return mensagem;
}

// ============================================
// LISTAR TODAS AS COMPRAS DO CARTÃO
// ============================================

// Mapeamento de nomes de meses para números (0-11)
const MESES_MAP: Record<string, number> = {
  'janeiro': 0, 'jan': 0,
  'fevereiro': 1, 'fev': 1,
  'marco': 2, 'março': 2, 'mar': 2,
  'abril': 3, 'abr': 3,
  'maio': 4, 'mai': 4,
  'junho': 5, 'jun': 5,
  'julho': 6, 'jul': 6,
  'agosto': 7, 'ago': 7,
  'setembro': 8, 'set': 8,
  'outubro': 9, 'out': 9,
  'novembro': 10, 'nov': 10,
  'dezembro': 11, 'dez': 11
};

// Extrair mês de uma string
function extrairMes(texto: string): number | null {
  const textoNorm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [nome, numero] of Object.entries(MESES_MAP)) {
    const nomeNorm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (textoNorm.includes(nomeNorm)) {
      return numero;
    }
  }
  return null;
}

// Tipo de período para filtro de compras
type PeriodoFiltro = 'semana' | 'hoje' | 'mes' | null;

// Dias da semana em português
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Emojis por categoria de gasto
const EMOJI_CATEGORIA: Record<string, string> = {
  'alimentação': '🍽️',
  'alimentacao': '🍽️',
  'transporte': '🚗',
  'lazer': '🎬',
  'saúde': '💊',
  'saude': '💊',
  'educação': '📚',
  'educacao': '📚',
  'moradia': '🏠',
  'assinaturas': '📺',
  'compras': '🛍️',
  'outros': '📦',
  'default': '•'
};

function getEmojiCategoria(categoria: string | null): string {
  if (!categoria) return EMOJI_CATEGORIA['default'];
  const catNorm = categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return EMOJI_CATEGORIA[catNorm] || EMOJI_CATEGORIA['default'];
}

export async function listarComprasCartao(
  userId: string, 
  nomeCartao?: string, 
  mesEspecifico?: number,
  periodo?: PeriodoFiltro
): Promise<string> {
  console.log(`[LISTAR-COMPRAS] ========================================`);
  console.log(`[LISTAR-COMPRAS] ENTRADA: userId=${userId}`);
  console.log(`[LISTAR-COMPRAS] ENTRADA: nomeCartao=${nomeCartao}`);
  console.log(`[LISTAR-COMPRAS] ENTRADA: mesEspecifico=${mesEspecifico}`);
  console.log(`[LISTAR-COMPRAS] ENTRADA: periodo=${periodo}`);
  console.log(`[LISTAR-COMPRAS] ========================================`);
  
  const supabase = getSupabase();
  
  // Se não especificou cartão, buscar do contexto
  let cartaoId: string | null = null;
  let cartaoNome: string | null = null;
  
  if (!nomeCartao) {
    const { data: contexto } = await supabase
      .from('conversation_context')
      .select('context_data')
      .eq('user_id', userId)
      .eq('context_type', 'credit_card_context')
      .single();
    
    if (contexto?.context_data) {
      cartaoId = contexto.context_data.cartao_id;
      cartaoNome = contexto.context_data.cartao_nome;
    }
  }
  
  // Se especificou cartão, buscar pelo nome
  if (nomeCartao) {
    const cartoes = await buscarCartoesUsuario(userId);
    const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encontrado = cartoes.find((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
    });
    
    if (encontrado) {
      cartaoId = encontrado.id;
      cartaoNome = encontrado.name;
    }
  }
  
  // Se ainda não tem cartão, pegar o primeiro
  if (!cartaoId) {
    const cartoes = await buscarCartoesUsuario(userId);
    if (cartoes.length === 0) {
      return `💳 Você não tem cartões cadastrados.`;
    }
    cartaoId = cartoes[0].id;
    cartaoNome = cartoes[0].name;
  }
  
  const hoje = new Date();
  let dataInicio: Date;
  let dataFim: Date;
  let subtituloPeriodo: string;
  
  // Determinar período de busca
  if (periodo === 'hoje') {
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    subtituloPeriodo = 'Hoje';
  } else if (periodo === 'semana') {
    // Início da semana (domingo)
    const diaSemana = hoje.getDay();
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diaSemana);
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    subtituloPeriodo = 'Esta semana';
  } else if (mesEspecifico !== undefined && mesEspecifico !== null) {
    // Mês específico
    const ano = mesEspecifico > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
    dataInicio = new Date(ano, mesEspecifico, 1);
    dataFim = new Date(ano, mesEspecifico + 1, 1);
    subtituloPeriodo = obterNomeMes(dataInicio);
  } else {
    // Mês atual (padrão)
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    subtituloPeriodo = obterNomeMes(dataInicio);
  }
  
  console.log(`[CARTAO-DEBUG] ========================================`);
  console.log(`[CARTAO-DEBUG] Período recebido: ${periodo}`);
  console.log(`[CARTAO-DEBUG] cartaoId: ${cartaoId}`);
  console.log(`[CARTAO-DEBUG] cartaoNome: ${cartaoNome}`);
  console.log(`[CARTAO-DEBUG] userId: ${userId}`);
  console.log(`[CARTAO-DEBUG] dataInicio: ${dataInicio.toISOString().split('T')[0]}`);
  console.log(`[CARTAO-DEBUG] dataFim: ${dataFim.toISOString().split('T')[0]}`);
  console.log(`[CARTAO-DEBUG] ========================================`);
  
  // Buscar TODAS as transações do período
  const { data: transacoes, error: transacoesError } = await supabase
    .from('credit_card_transactions')
    .select(`
      amount, description, purchase_date,
      total_installments, installment_number,
      category:categories(name)
    `)
    .eq('credit_card_id', cartaoId)
    .eq('user_id', userId)
    .gte('purchase_date', dataInicio.toISOString().split('T')[0])
    .lt('purchase_date', dataFim.toISOString().split('T')[0])
    .order('purchase_date', { ascending: false });
  
  if (transacoesError) {
    console.error(`[CARTAO-DEBUG] ERRO na query:`, transacoesError);
  }
  console.log(`[CARTAO-DEBUG] Transações encontradas: ${transacoes?.length || 0}`);
  
  const emoji = getEmojiBanco(cartaoNome || 'Cartão');
  
  // Header (estilo original)
  let mensagem = `${emoji} *Compras ${cartaoNome}*\n`;
  mensagem += `📅 ${subtituloPeriodo}\n\n`;
  
  if (!transacoes || transacoes.length === 0) {
    // Sem transações no cartão de crédito
    mensagem += `✨ _Nenhuma compra no cartão neste período_\n\n`;
    mensagem += `💡 Para registrar compras no cartão:\n`;
    mensagem += `   _"50 reais ifood no ${cartaoNome}"_`;
    return mensagem;
  }
  
  // Agrupar compras parceladas: mostrar apenas 1 linha por compra com parcela atual
  interface CompraUnica {
    descricao: string;
    valor: number;
    parcelaAtual: number;
    totalParcelas: number;
    purchase_date: string;
    categoria: string | null;
  }
  
  const comprasUnicas: CompraUnica[] = [];
  const jaProcessado = new Set<string>();
  let totalGeral = 0;
  const porCategoria: Record<string, number> = {};
  
  for (const t of transacoes) {
    totalGeral += Number(t.amount);
    
    // Contabilizar por categoria
    const cat = (t as any).category?.name || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.amount);
    
    // Extrair nome base (sem parcela)
    const nomeBase = t.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
    
    // Chave única: nome base + total parcelas
    const chave = `${nomeBase}|${t.total_installments || 1}`;
    
    if (jaProcessado.has(chave)) continue;
    jaProcessado.add(chave);
    
    // Pegar a primeira parcela encontrada (menor número)
    const todasParcelas = transacoes.filter((p: any) => {
      const pNomeBase = p.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
      return pNomeBase === nomeBase && 
             (p.total_installments || 1) === (t.total_installments || 1);
    });
    
    // Ordenar por número da parcela e pegar a primeira
    todasParcelas.sort((a: any, b: any) => (a.installment_number || 1) - (b.installment_number || 1));
    const primeiraParcela = todasParcelas[0];
    
    comprasUnicas.push({
      descricao: nomeBase,
      valor: Number(primeiraParcela.amount),
      parcelaAtual: primeiraParcela.installment_number || 1,
      totalParcelas: primeiraParcela.total_installments || 1,
      purchase_date: primeiraParcela.purchase_date,
      categoria: (primeiraParcela.category as any)?.name || null
    });
  }
  
  // Seção de compras (estilo original)
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `🛒 *TODAS AS COMPRAS* (${comprasUnicas.length})\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Agrupar por data
  const comprasPorData: Record<string, CompraUnica[]> = {};
  for (const c of comprasUnicas) {
    if (!comprasPorData[c.purchase_date]) {
      comprasPorData[c.purchase_date] = [];
    }
    comprasPorData[c.purchase_date].push(c);
  }
  
  // Ordenar datas (mais recente primeiro)
  const datasOrdenadas = Object.keys(comprasPorData).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  let numeroCompra = 1;
  
  for (const dataKey of datasOrdenadas) {
    const comprasDoDia = comprasPorData[dataKey];
    const dataObj = new Date(dataKey + 'T12:00:00'); // Evitar problema de timezone
    const dataFormatada = `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`;
    const diaSemana = DIAS_SEMANA[dataObj.getDay()];
    
    // Cabeçalho do dia com dia da semana (estilo original + dia da semana)
    mensagem += `📅 *${dataFormatada}* _(${diaSemana})_ ─────────────\n`;
    
    for (const c of comprasDoDia) {
      // Formatar descrição com parcela atual
      let descricao = c.descricao;
      if (c.totalParcelas > 1) {
        descricao += ` (${c.parcelaAtual}/${c.totalParcelas})`;
      }
      
      // Truncar descrição para alinhamento (18 chars max)
      const descTruncada = descricao.length > 18 ? descricao.substring(0, 16) + '..' : descricao;
      
      // Formatar valor (valor da parcela)
      const valorStr = formatarMoeda(c.valor);
      
      // Calcular pontos para que R$ fique sempre na mesma coluna
      const prefixo = `${numeroCompra}. `;
      const posicaoFixaRS = 25;
      const espacoUsado = prefixo.length + descTruncada.length;
      const pontos = Math.max(1, posicaoFixaRS - espacoUsado);
      
      mensagem += `${prefixo}${descTruncada} ${'·'.repeat(pontos)} ${valorStr}\n`;
      numeroCompra++;
    }
    
    mensagem += `\n`;
  }
  
  // Resumo (estilo original)
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total:* ${formatarMoeda(totalGeral)}\n`;
  mensagem += `📊 *Qtd:* ${comprasUnicas.length} | *Média:* ${formatarMoeda(totalGeral / comprasUnicas.length)}\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Top 3 Categorias (seção adicional relevante)
  const categoriasOrdenadas = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (categoriasOrdenadas.length > 0) {
    mensagem += `🏆 *TOP CATEGORIAS*\n`;
    const medalhas = ['🥇', '🥈', '🥉'];
    categoriasOrdenadas.forEach(([cat, valor], i) => {
      const pct = Math.round((valor / totalGeral) * 100);
      mensagem += `${medalhas[i]} ${cat}: ${formatarMoeda(valor)} (${pct}%)\n`;
    });
    mensagem += `\n`;
  }
  
  // Buscar período anterior para comparativo (sempre, exceto "hoje")
  // Usar subtituloPeriodo para determinar se é semana (mais confiável que periodo)
  const ehSemana = periodo === 'semana' || subtituloPeriodo === 'Esta semana';
  
  if (periodo !== 'hoje') {
    try {
      let dataInicioAnterior: Date;
      let dataFimAnterior: Date;
      let periodoLabel: string;
      
      if (ehSemana) {
        // Semana anterior
        dataInicioAnterior = new Date(dataInicio.getTime() - 7 * 24 * 60 * 60 * 1000);
        dataFimAnterior = new Date(dataInicio.getTime());
        periodoLabel = 'semana';
      } else {
        // Mês anterior (padrão)
        dataInicioAnterior = new Date(dataInicio.getFullYear(), dataInicio.getMonth() - 1, 1);
        dataFimAnterior = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
        periodoLabel = 'mês';
      }
      
      console.log(`[CARTAO] Comparativo: ${dataInicioAnterior.toISOString()} até ${dataFimAnterior.toISOString()}`);
      
      const { data: transacoesAnteriores } = await supabase
        .from('credit_card_transactions')
        .select('amount')
        .eq('credit_card_id', cartaoId)
        .eq('user_id', userId)
        .gte('purchase_date', dataInicioAnterior.toISOString().split('T')[0])
        .lt('purchase_date', dataFimAnterior.toISOString().split('T')[0]);
      
      console.log(`[CARTAO] Transações anteriores encontradas: ${transacoesAnteriores?.length || 0}`);
      
      mensagem += `📈 *COMPARATIVO*\n`;
      
      if (transacoesAnteriores && transacoesAnteriores.length > 0) {
        const totalAnterior = transacoesAnteriores.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        const variacao = ((totalGeral - totalAnterior) / totalAnterior) * 100;
        const diferencaAbs = Math.abs(totalGeral - totalAnterior);
        
        mensagem += `• Este ${periodoLabel}: ${formatarMoeda(totalGeral)}\n`;
        mensagem += `• ${periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)} anterior: ${formatarMoeda(totalAnterior)}\n`;
        
        if (variacao > 0) {
          mensagem += `• Variação: ⬆️ +${Math.round(variacao)}% (R$ ${diferencaAbs.toFixed(2)})\n`;
        } else if (variacao < 0) {
          mensagem += `• Variação: ⬇️ ${Math.round(variacao)}% (R$ ${diferencaAbs.toFixed(2)})\n`;
        } else {
          mensagem += `• Variação: ➡️ Igual ao anterior\n`;
        }
      } else {
        mensagem += `• Este ${periodoLabel}: ${formatarMoeda(totalGeral)}\n`;
        mensagem += `• ${periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)} anterior: _sem dados_\n`;
      }
      mensagem += `\n`;
    } catch (e) {
      console.log('[CARTAO] Erro ao buscar comparativo:', e);
    }
  }
  
  // Dica final (estilo original)
  mensagem += `💡 _"fatura ${cartaoNome?.toLowerCase()}"_ para ver resumo completo`;
  
  return mensagem;
}

// ============================================
// CONSULTA GASTO ESPECÍFICO (iFood, Uber, categoria)
// ============================================

export async function consultarGastoEspecifico(userId: string, termo: string, nomeCartao?: string, mesEspecifico?: number): Promise<string> {
  const supabase = getSupabase();
  
  console.log('[GASTO-ESPECIFICO] Consultando:', { termo, nomeCartao, mesEspecifico });
  
  // Buscar cartão do contexto ou especificado
  let cartaoId: string | null = null;
  let cartaoNome: string | null = null;
  
  if (nomeCartao) {
    const cartoes = await buscarCartoesUsuario(userId);
    const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encontrado = cartoes.find((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
    });
    if (encontrado) {
      cartaoId = encontrado.id;
      cartaoNome = encontrado.name;
    }
  }
  
  // Se não especificou, buscar do contexto
  if (!cartaoId) {
    const { data: contexto } = await supabase
      .from('conversation_context')
      .select('context_data')
      .eq('user_id', userId)
      .eq('context_type', 'credit_card_context')
      .single();
    
    if (contexto?.context_data) {
      cartaoId = contexto.context_data.cartao_id;
      cartaoNome = contexto.context_data.cartao_nome;
    }
  }
  
  const hoje = new Date();
  
  // Se especificou mês, usar ele; senão, usar mês atual
  let mesParaBuscar: Date;
  let proximoMes: Date;
  
  if (mesEspecifico !== undefined && mesEspecifico !== null) {
    // Se o mês especificado é maior que o atual, provavelmente é do ano passado
    const ano = mesEspecifico > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
    mesParaBuscar = new Date(ano, mesEspecifico, 1);
    proximoMes = new Date(ano, mesEspecifico + 1, 1);
    console.log(`[GASTO-ESPECIFICO] Buscando mês específico: ${mesEspecifico + 1}/${ano}`);
  } else {
    mesParaBuscar = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  }
  
  const mesAnterior = new Date(mesParaBuscar.getFullYear(), mesParaBuscar.getMonth() - 1, 1);
  
  // Normalizar termo de busca (remover acentos e caracteres especiais)
  const termoNorm = termo.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.,;:'"]/g, '')
    .trim();
  
  // Mapear categorias
  const categoriaMap: Record<string, string> = {
    'alimentacao': 'Alimentação',
    'transporte': 'Transporte',
    'lazer': 'Lazer',
    'saude': 'Saúde',
    'educacao': 'Educação',
    'assinaturas': 'Assinaturas',
    'compras': 'Compras',
    'vestuario': 'Vestuário',
    'beleza': 'Beleza',
    'viagem': 'Viagem',
    'pets': 'Pets'
  };
  
  const categoriaFiltro = categoriaMap[termoNorm];
  
  // Buscar transações do mês especificado (ou atual)
  let query = supabase
    .from('credit_card_transactions')
    .select(`amount, description, purchase_date, category:categories(name)`)
    .eq('user_id', userId)
    .gte('purchase_date', mesParaBuscar.toISOString().split('T')[0])
    .lt('purchase_date', proximoMes.toISOString().split('T')[0]);
  
  if (cartaoId) {
    query = query.eq('credit_card_id', cartaoId);
  }
  
  const { data: transacoes } = await query.order('purchase_date', { ascending: false });
  
  // Filtrar por termo (descrição ou categoria)
  const transacoesFiltradas = (transacoes || []).filter((t: any) => {
    const descNorm = t.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catNome = (t.category as any)?.name || '';
    
    // Buscar por descrição
    if (descNorm.includes(termoNorm) || termoNorm.includes(descNorm.split(' ')[0])) {
      return true;
    }
    
    // Buscar por categoria
    if (categoriaFiltro && catNome === categoriaFiltro) {
      return true;
    }
    
    return false;
  });
  
  // Buscar transações do mês anterior para comparação
  let queryAnterior = supabase
    .from('credit_card_transactions')
    .select(`amount, description, category:categories(name)`)
    .eq('user_id', userId)
    .gte('purchase_date', mesAnterior.toISOString().split('T')[0])
    .lt('purchase_date', mesParaBuscar.toISOString().split('T')[0]);
  
  if (cartaoId) {
    queryAnterior = queryAnterior.eq('credit_card_id', cartaoId);
  }
  
  const { data: transacoesAnterior } = await queryAnterior;
  
  const transacoesAnteriorFiltradas = (transacoesAnterior || []).filter((t: any) => {
    const descNorm = t.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catNome = (t.category as any)?.name || '';
    
    if (descNorm.includes(termoNorm) || termoNorm.includes(descNorm.split(' ')[0])) {
      return true;
    }
    if (categoriaFiltro && catNome === categoriaFiltro) {
      return true;
    }
    return false;
  });
  
  // Calcular totais
  const totalAtual = transacoesFiltradas.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const totalAnterior = transacoesAnteriorFiltradas.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  // Calcular variação
  let variacaoTexto = '';
  if (totalAnterior > 0) {
    const variacao = ((totalAtual - totalAnterior) / totalAnterior) * 100;
    if (variacao > 0) {
      variacaoTexto = `📈 +${Math.round(variacao)}% vs mês passado`;
    } else if (variacao < 0) {
      variacaoTexto = `📉 ${Math.round(variacao)}% vs mês passado`;
    } else {
      variacaoTexto = `➡️ Igual ao mês passado`;
    }
  }
  
  const emoji = cartaoNome ? getEmojiBanco(cartaoNome) : '💳';
  const termoCapitalizado = termo.charAt(0).toUpperCase() + termo.slice(1);
  
  let mensagem = `${emoji} *Gastos com ${termoCapitalizado}*\n`;
  if (cartaoNome) {
    mensagem += `💳 ${cartaoNome}\n`;
  }
  mensagem += `📅 ${obterNomeMes(hoje)}\n\n`;
  
  if (transacoesFiltradas.length === 0) {
    mensagem += `✨ _Nenhum gasto com "${termo}" este mês_\n\n`;
    if (totalAnterior > 0) {
      mensagem += `📊 Mês passado: ${formatarMoeda(totalAnterior)}`;
    }
    return mensagem;
  }
  
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total:* ${formatarMoeda(totalAtual)}\n`;
  mensagem += `📊 *Compras:* ${transacoesFiltradas.length}\n`;
  if (variacaoTexto) {
    mensagem += `${variacaoTexto}\n`;
  }
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Listar compras (máximo 5)
  mensagem += `🛒 *Detalhes:*\n`;
  for (const t of transacoesFiltradas.slice(0, 5)) {
    const dataCompra = new Date(t.purchase_date);
    const dataFormatada = `${dataCompra.getDate().toString().padStart(2, '0')}/${(dataCompra.getMonth() + 1).toString().padStart(2, '0')}`;
    mensagem += `• ${t.description}: ${formatarMoeda(Number(t.amount))} (${dataFormatada})\n`;
  }
  
  if (transacoesFiltradas.length > 5) {
    mensagem += `_... e mais ${transacoesFiltradas.length - 5}_\n`;
  }
  
  // Comparação com mês anterior
  if (totalAnterior > 0) {
    mensagem += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `📆 *Mês passado:* ${formatarMoeda(totalAnterior)} (${transacoesAnteriorFiltradas.length} compras)\n`;
  }
  
  return mensagem;
}

// ============================================
// COMPARAR MESES (histórico de faturas)
// ============================================

export async function compararMeses(userId: string, nomeCartao?: string): Promise<string> {
  const supabase = getSupabase();
  
  // Buscar cartão
  let cartaoId: string | null = null;
  let cartaoNome: string | null = null;
  
  if (nomeCartao) {
    const cartoes = await buscarCartoesUsuario(userId);
    const nomeNorm = nomeCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const encontrado = cartoes.find((c: any) => {
      const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
    });
    if (encontrado) {
      cartaoId = encontrado.id;
      cartaoNome = encontrado.name;
    }
  }
  
  // Se não especificou, buscar do contexto
  if (!cartaoId) {
    const { data: contexto } = await supabase
      .from('conversation_context')
      .select('context_data')
      .eq('user_id', userId)
      .eq('context_type', 'credit_card_context')
      .single();
    
    if (contexto?.context_data) {
      cartaoId = contexto.context_data.cartao_id;
      cartaoNome = contexto.context_data.cartao_nome;
    }
  }
  
  // Se ainda não tem, pegar o primeiro
  if (!cartaoId) {
    const cartoes = await buscarCartoesUsuario(userId);
    if (cartoes.length === 0) {
      return `💳 Você não tem cartões cadastrados.`;
    }
    cartaoId = cartoes[0].id;
    cartaoNome = cartoes[0].name;
  }
  
  // Buscar últimas 6 faturas
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select('reference_month, total_amount, status')
    .eq('credit_card_id', cartaoId)
    .eq('user_id', userId)
    .order('reference_month', { ascending: false })
    .limit(6);
  
  const emoji = getEmojiBanco(cartaoNome || 'Cartão');
  
  let mensagem = `${emoji} *Histórico ${cartaoNome}*\n`;
  mensagem += `📊 Últimos 6 meses\n\n`;
  
  if (!faturas || faturas.length === 0) {
    mensagem += `✨ _Nenhuma fatura encontrada_\n\n`;
    mensagem += `💡 Registre compras no cartão para\n   ver o histórico aqui.`;
    return mensagem;
  }
  
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  const statusEmoji: Record<string, string> = {
    'open': '🟡',
    'closed': '🟠',
    'paid': '🟢',
    'overdue': '🔴'
  };
  
  let maiorFatura = 0;
  let menorFatura = Infinity;
  let totalGeral = 0;
  
  for (const f of faturas) {
    const mes = new Date(f.reference_month);
    const mesNome = mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
    const valor = Number(f.total_amount) || 0;
    
    totalGeral += valor;
    if (valor > maiorFatura) maiorFatura = valor;
    if (valor < menorFatura && valor > 0) menorFatura = valor;
    
    const statusIcon = statusEmoji[f.status] || '⚪';
    mensagem += `${statusIcon} *${mesNome}:* ${formatarMoeda(valor)}\n`;
  }
  
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Estatísticas
  const media = totalGeral / faturas.length;
  
  mensagem += `📈 *ESTATÍSTICAS*\n`;
  mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `📊 Média mensal: ${formatarMoeda(media)}\n`;
  mensagem += `🔺 Maior fatura: ${formatarMoeda(maiorFatura)}\n`;
  if (menorFatura !== Infinity) {
    mensagem += `🔻 Menor fatura: ${formatarMoeda(menorFatura)}\n`;
  }
  
  // Tendência
  if (faturas.length >= 2) {
    const atual = Number(faturas[0].total_amount) || 0;
    const anterior = Number(faturas[1].total_amount) || 0;
    if (anterior > 0) {
      const variacao = ((atual - anterior) / anterior) * 100;
      if (variacao > 10) {
        mensagem += `\n⚠️ Gastos subiram ${Math.round(variacao)}% este mês`;
      } else if (variacao < -10) {
        mensagem += `\n✅ Gastos caíram ${Math.abs(Math.round(variacao))}% este mês`;
      }
    }
  }
  
  return mensagem;
}

// Helper getEmojiCategoria já definido acima (linha ~1452)

// ============================================
// REGISTRAR COMPRA NO CARTÃO
// ============================================

export async function registrarCompraCartao(
  userId: string,
  dados: DadosCompraCartao
): Promise<{ sucesso: boolean; mensagem: string; transactionId?: string }> {
  const supabase = getSupabase();
  
  try {
    // Buscar cartão
    const { data: cartao, error: cartaoError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', dados.cartao_id)
      .eq('user_id', userId)
      .single();
    
    if (cartaoError || !cartao) {
      return { sucesso: false, mensagem: '❌ Cartão não encontrado.' };
    }
    
    const dataCompra = new Date(dados.data_compra);
    const valorParcela = dados.valor / dados.parcelas;
    
    // Buscar ou criar fatura do mês
    const invoiceId = await buscarOuCriarFatura(
      supabase,
      userId,
      dados.cartao_id,
      cartao.closing_day,
      cartao.due_day,
      dataCompra
    );
    
    console.log('[CARTAO] Fatura associada:', invoiceId);
    
    // ✅ DETECTAR CATEGORIA AUTOMATICAMENTE
    let categoriaId: string | undefined = dados.categoria_id;
    if (!categoriaId && dados.descricao) {
      console.log('[CARTAO] ========================================');
      console.log('[CARTAO] Detectando categoria para descrição:', dados.descricao);
      console.log('[CARTAO] Descrição lowercase:', dados.descricao.toLowerCase());
      console.log('[CARTAO] Valor:', dados.valor);
      // ✅ Passar o valor para contexto (ex: água < R$20 = Alimentação)
      const catDetectada = await detectarCategoriaAutomatica(userId, dados.descricao, 'expense', dados.valor);
      categoriaId = catDetectada || undefined;
      console.log('[CARTAO] Categoria detectada ID:', categoriaId);
      console.log('[CARTAO] ========================================');
    }
    
    // ✅ CORREÇÃO: Criar apenas 1 registro PAI para parcelamentos
    // O frontend gera as parcelas virtuais dinamicamente
    const installmentGroupId = dados.parcelas > 1 ? crypto.randomUUID() : null;
    
    const transacaoUnica = {
      user_id: userId,
      credit_card_id: dados.cartao_id,
      invoice_id: invoiceId,
      category_id: categoriaId || null,
      amount: valorParcela, // Valor da parcela mensal
      description: dados.descricao, // Sem sufixo (1/5) - frontend adiciona
      purchase_date: dados.data_compra,
      is_installment: dados.parcelas > 1,
      total_installments: dados.parcelas,
      installment_number: 1, // Sempre 1 (registro pai)
      installment_group_id: installmentGroupId,
      is_parent_installment: dados.parcelas > 1, // Marca como pai
      total_amount: dados.valor, // Valor total da compra
      source: 'whatsapp'
    };
    
    const { data: insertedData, error: insertError } = await supabase
      .from('credit_card_transactions')
      .insert([transacaoUnica])
      .select('id')
      .single();
    
    // Atualizar total da fatura
    if (invoiceId) {
      const { data: faturaAtual } = await supabase
        .from('credit_card_invoices')
        .select('total_amount')
        .eq('id', invoiceId)
        .single();
      
      const novoTotal = (faturaAtual?.total_amount || 0) + dados.valor;
      
      await supabase
        .from('credit_card_invoices')
        .update({ total_amount: novoTotal })
        .eq('id', invoiceId);
      
      console.log('[CARTAO] Fatura atualizada, novo total:', novoTotal);
    }
    
    if (insertError) {
      console.error('[CARTAO] Erro ao inserir transações:', insertError);
      return { sucesso: false, mensagem: '❌ Erro ao registrar compra.' };
    }
    
    // ✅ CORREÇÃO: Criar parcelas em payable_bills para aparecer em Contas a Pagar
    if (dados.parcelas > 1 && installmentGroupId) {
      console.log('[CARTAO] Criando parcelas em payable_bills para Contas a Pagar...');
      
      const parcelasPayable = [];
      for (let i = 1; i <= dados.parcelas; i++) {
        // Calcular data de vencimento de cada parcela (mês a mês)
        const dataVencimento = new Date(dataCompra);
        dataVencimento.setMonth(dataVencimento.getMonth() + i - 1);
        // Usar dia de vencimento do cartão se disponível
        if (cartao.due_day) {
          dataVencimento.setDate(cartao.due_day);
        }
        
        parcelasPayable.push({
          user_id: userId,
          description: dados.descricao,
          amount: valorParcela,
          due_date: dataVencimento.toISOString().split('T')[0],
          bill_type: 'installment',
          status: 'pending',
          is_recurring: false,
          is_installment: true,
          installment_number: i,
          installment_total: dados.parcelas,
          installment_group_id: installmentGroupId,
          original_purchase_amount: dados.valor,
          payment_method: 'credit_card',
          credit_card_id: dados.cartao_id,
          category_id: categoriaId || null
        });
      }
      
      const { error: payableError } = await supabase
        .from('payable_bills')
        .insert(parcelasPayable);
      
      if (payableError) {
        console.error('[CARTAO] Erro ao criar parcelas em payable_bills:', payableError);
        // Não falha a operação, apenas loga o erro
      } else {
        console.log('[CARTAO] ✅ Criadas', dados.parcelas, 'parcelas em payable_bills');
      }
    }
    
    // Atualizar limite disponível
    const novoLimiteDisponivel = cartao.available_limit - dados.valor;
    await supabase
      .from('credit_cards')
      .update({ available_limit: novoLimiteDisponivel })
      .eq('id', dados.cartao_id);
    
    // Buscar nome da categoria
    let nomeCategoria = 'Outros';
    if (categoriaId) {
      const { data: cat } = await supabase
        .from('categories')
        .select('name, icon')
        .eq('id', categoriaId)
        .single();
      if (cat) {
        nomeCategoria = cat.name;
      }
    }
    
    // Montar resposta no mesmo padrão do templateTransacaoRegistrada
    const emoji = getEmojiBanco(cartao.name);
    const dataFormatada = dataCompra.toLocaleDateString('pt-BR');
    
    // Frase motivacional
    const frases = [
      'Compra registrada! 💳',
      'Anotado no cartão! 📝',
      'Lançado na fatura! 💳'
    ];
    const frase = frases[Math.floor(Math.random() * frases.length)];
    
    let mensagem = `${frase}\n\n`;
    mensagem += `⭐ *Transação Registrada!* ⭐\n\n`;
    mensagem += `📝 *Descrição:* ${dados.descricao}\n`;
    mensagem += `💰 *Valor:* ${formatarMoeda(dados.valor)}\n`;
    mensagem += `🔴 *Tipo:* Despesa (Cartão)\n`;
    mensagem += `📂 *Categoria:* ${nomeCategoria}\n`;
    mensagem += `${emoji} *Cartão:* ${cartao.name}\n`;
    
    if (dados.parcelas > 1) {
      mensagem += `📊 *Parcelas:* ${dados.parcelas}x de ${formatarMoeda(valorParcela)}\n`;
    }
    
    mensagem += `📅 *Data:* ${dataFormatada}\n`;
    mensagem += `💳 *Vai na fatura de:* ${obterNomeMes(dataCompra)}\n\n`;
    mensagem += `✔️ *Status:* Pendente (fatura)\n`;
    mensagem += `✅ *Limite disponível:* ${formatarMoeda(novoLimiteDisponivel)}\n`;
    
    // Dica se limite baixo
    const percentualUsado = ((cartao.credit_limit - novoLimiteDisponivel) / cartao.credit_limit) * 100;
    if (percentualUsado > 80) {
      mensagem += `\n⚠️ _Atenção: você já usou ${percentualUsado.toFixed(0)}% do limite!_\n`;
    }
    
    mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
    mensagem += `💡 *Quer alterar algo?*\n`;
    mensagem += `• Valor → "era 95"\n`;
    mensagem += `• Excluir → "exclui essa"`;
    
    // ✅ Retornar ID da transação para salvar no contexto
    return { 
      sucesso: true, 
      mensagem,
      transactionId: insertedData?.id 
    };
    
  } catch (error) {
    console.error('[CARTAO] Erro:', error);
    return { sucesso: false, mensagem: '❌ Erro ao processar compra.' };
  }
}

// ============================================
// PROCESSAR INTENÇÃO DE CARTÃO (FUNÇÃO PRINCIPAL)
// ============================================

export async function processarIntencaoCartao(
  intencao: IntencaoCartao,
  userId: string,
  _phone: string
): Promise<{ mensagem: string; precisaConfirmacao: boolean; dados?: any }> {
  console.log('[CARTAO] Processando:', intencao.tipo, '| Valor:', intencao.valor, '| Cartão:', intencao.cartao, '| Descrição:', intencao.descricao);
  
  switch (intencao.tipo) {
    case 'listar_cartoes':
      return { 
        mensagem: await listarCartoes(userId), 
        precisaConfirmacao: false 
      };
    
    case 'consulta_limite':
      return { 
        mensagem: await consultarLimite(userId, intencao.cartao), 
        precisaConfirmacao: false 
      };
    
    case 'consulta_fatura':
      return { 
        mensagem: await consultarFatura(userId, intencao.cartao, true, _phone, intencao.mes_referencia), 
        precisaConfirmacao: false 
      };
    
    case 'consulta_fatura_vencida':
      return { 
        mensagem: await listarFaturasVencidas(userId, _phone), 
        precisaConfirmacao: false 
      };
    
    case 'listar_compras_cartao':
      return { 
        mensagem: await listarComprasCartao(userId, intencao.cartao), 
        precisaConfirmacao: false 
      };
    
    case 'consulta_gasto_especifico':
      return { 
        mensagem: await consultarGastoEspecifico(userId, intencao.descricao || '', intencao.cartao), 
        precisaConfirmacao: false 
      };
    
    case 'comparar_meses':
      return { 
        mensagem: await compararMeses(userId, intencao.cartao), 
        precisaConfirmacao: false 
      };
    
    case 'compra_cartao':
    case 'compra_parcelada': {
      const cartoes = await buscarCartoesUsuario(userId);
      
      console.log('[COMPRA-CARTAO] Cartão mencionado:', intencao.cartao);
      console.log('[COMPRA-CARTAO] Cartões do usuário:', cartoes.map((c: any) => c.name));
      
      if (cartoes.length === 0) {
        return {
          mensagem: '💳 Você não tem cartões cadastrados.\n\n💡 _Cadastre seus cartões no app!_',
          precisaConfirmacao: false
        };
      }
      
      // Se só tem um cartão ou especificou qual
      let cartaoSelecionado = null;
      
      if (intencao.cartao) {
        const nomeNorm = intencao.cartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        console.log('[COMPRA-CARTAO] Nome normalizado:', nomeNorm);
        
        cartaoSelecionado = cartoes.find((c: any) => {
          const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const match = cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
          console.log(`[COMPRA-CARTAO] Comparando "${nomeNorm}" com "${cartaoNorm}": ${match}`);
          return match;
        });
        
        console.log('[COMPRA-CARTAO] Cartão encontrado:', cartaoSelecionado?.name || 'NENHUM');
      } else if (cartoes.length === 1) {
        cartaoSelecionado = cartoes[0];
        console.log('[COMPRA-CARTAO] Único cartão, usando:', cartaoSelecionado.name);
      }
      
      if (cartaoSelecionado) {
        // ✅ Se já tem descrição específica (não genérica), registrar direto
        // Mínimo 2 chars para aceitar "TV", "PC", etc.
        const descricaoEspecifica = intencao.descricao && 
          intencao.descricao.toLowerCase() !== 'compra' &&
          intencao.descricao.toLowerCase() !== 'compra no cartão' &&
          intencao.descricao.length >= 2;
        
        console.log('[COMPRA-CARTAO] Descrição:', intencao.descricao, '| Específica:', descricaoEspecifica, '| Parcelas:', intencao.parcelas);
        
        if (descricaoEspecifica) {
          // Registrar direto - usuário já informou o que comprou
          const resultado = await registrarCompraCartao(userId, {
            valor: intencao.valor!,
            parcelas: intencao.parcelas || 1,
            cartao_id: cartaoSelecionado.id,
            descricao: intencao.descricao!,
            data_compra: new Date().toISOString().split('T')[0]
          });
          
          // ✅ CORREÇÃO: Retornar transactionId para salvar no contexto
          return {
            mensagem: resultado.mensagem,
            precisaConfirmacao: false,
            dados: resultado.transactionId ? {
              transacao_id: resultado.transactionId,
              transacao_tipo: 'credit_card_transaction'
            } : undefined
          };
        }
        
        // ❓ Perguntar o que comprou e se parcelou
        const msg = `💳 *Compra de ${formatarMoeda(intencao.valor!)}* no ${cartaoSelecionado.name}

📝 *O que você comprou?*
_Ex: "almoço", "gasolina", "mercado"_

💳 *Parcelou?* Se sim, informe as parcelas.
_Ex: "mercado em 3x", "celular 12x"_`;
        
        return {
          mensagem: msg,
          precisaConfirmacao: true,
          dados: {
            tipo: 'compra_cartao_aguardando_descricao',
            valor: intencao.valor,
            cartao_id: cartaoSelecionado.id,
            cartao_nome: cartaoSelecionado.name
          }
        };
      }
      
      // Precisa escolher cartão
      let msg = `💳 *Compra de ${formatarMoeda(intencao.valor!)}*`;
      if (intencao.parcelas && intencao.parcelas > 1) {
        msg += ` em ${intencao.parcelas}x`;
      }
      msg += `\n\n🏦 *Em qual cartão?*\n\n`;
      
      cartoes.forEach((c: any, i: number) => {
        const emoji = getEmojiBanco(c.name);
        msg += `${i + 1}. ${emoji} ${c.name}\n`;
      });
      
      msg += `\n_Responda com número/nome ou "cancelar"_`;
      
      return {
        mensagem: msg,
        precisaConfirmacao: true,
        dados: {
          tipo: 'compra_cartao',
          valor: intencao.valor,
          parcelas: intencao.parcelas || 1,
          descricao: intencao.descricao || 'Compra no cartão',
          cartoes: cartoes.map((c: any) => ({ id: c.id, name: c.name }))
        }
      };
    }
    
    default:
      return { 
        mensagem: '❓ Não entendi o que você quer fazer com o cartão.', 
        precisaConfirmacao: false 
      };
  }
}
