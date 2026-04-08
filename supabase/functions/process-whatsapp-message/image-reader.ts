// ============================================
// IMAGE-READER.TS - Leitura de Imagens com GPT-4 Vision
// Personal Finance - Ana Clara
// ============================================

import { getSupabase } from './utils.ts';
import { callVision, getDefaultAIConfig, type NormalizedAIConfig } from '../_shared/ai.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL');
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');

// ============================================
// TIPOS
// ============================================

export type TipoImagem = 
  | 'nota_fiscal'           // Cupom de mercado, farmácia, restaurante
  | 'comprovante_pix'       // Print de transferência PIX
  | 'comprovante_pagamento' // Shell Box, Uber, 99, estacionamento
  | 'ifood'                 // Print do iFood/Rappi
  | 'recibo'                // Recibo genérico
  | 'outro';

export interface DeteccaoTipoImagem {
  tipo: TipoImagem;
  confianca: 'alta' | 'media' | 'baixa';
}

export interface LeituraNotaFiscal {
  sucesso: boolean;
  dados?: {
    valor_total: number;
    estabelecimento?: string;
    categoria?: string;
    data?: string;
    itens?: string[];
  };
  confianca?: 'alta' | 'media' | 'baixa';
  erro?: string;
}

export interface LeituraComprovantePix {
  sucesso: boolean;
  dados?: {
    valor: number;
    tipo: 'enviado' | 'recebido';
    destinatario?: string;
    remetente?: string;
    banco?: string;
    data?: string;
  };
  confianca?: 'alta' | 'media' | 'baixa';
  erro?: string;
}

export interface LeituraIFood {
  sucesso: boolean;
  dados?: {
    valor_total: number;
    restaurante?: string;
    itens?: string[];
    taxa_entrega?: number;
    data?: string;
  };
  confianca?: 'alta' | 'media' | 'baixa';
  erro?: string;
}

export interface LeituraComprovantePagamento {
  sucesso: boolean;
  dados?: {
    valor_total: number;
    estabelecimento?: string;
    tipo_servico: 'combustivel' | 'corrida' | 'estacionamento' | 'pedagio' | 'outro';
    produto?: string;
    quantidade?: string;
    preco_unitario?: number;
    forma_pagamento?: string;
    data?: string;
    categoria?: string;
  };
  confianca?: 'alta' | 'media' | 'baixa';
  erro?: string;
}

async function resolveVisionConfig(userId?: string): Promise<NormalizedAIConfig | null> {
  if (userId) {
    const configured = await getDefaultAIConfig(getSupabase(), userId);
    if (configured?.apiKey) {
      return {
        ...configured,
        temperature: Math.max(0.1, Math.min(configured.temperature || 0.2, 1)),
        maxTokens: Math.max(500, configured.maxTokens || 1000),
      };
    }
  }

  if (!OPENAI_API_KEY) {
    return null;
  }

  return {
    provider: 'openai',
    model: 'gpt-5-mini',
    apiKey: OPENAI_API_KEY,
    temperature: 0.1,
    maxTokens: 1000,
  };
}

function parseVisionJson(content: string): Record<string, any> {
  const jsonStr = content
    ?.replace(/```json\n?/g, '')
    ?.replace(/```\n?/g, '')
    ?.trim();

  return JSON.parse(jsonStr || '{}');
}

async function runVisionJson(
  messageId: string,
  userId: string | undefined,
  systemPrompt: string,
  userText: string,
  maxTokens = 400,
): Promise<Record<string, any>> {
  const imagem = await baixarImagemUAZAPI(messageId);

  if (!imagem || !imagem.base64) {
    throw new Error('Não foi possível baixar a imagem');
  }

  const config = await resolveVisionConfig(userId);
  if (!config?.apiKey) {
    throw new Error('Nenhuma configuração de IA disponível para leitura de imagem');
  }

  const dataUrl = `data:${imagem.mimetype};base64,${imagem.base64}`;
  const content = await callVision(
    { ...config, maxTokens: Math.max(maxTokens, config.maxTokens || maxTokens) },
    dataUrl,
    systemPrompt,
    userText,
  );

  return parseVisionJson(content);
}

// ============================================
// BAIXAR IMAGEM VIA UAZAPI
// ============================================
// ⚠️ CRÍTICO: URLs do WhatsApp são protegidas!
// Precisamos baixar via UAZAPI que tem acesso autenticado
// ============================================

export async function baixarImagemUAZAPI(messageId: string): Promise<{ base64: string; mimetype: string } | null> {
  try {
    console.log('[IMAGE] 📥 Baixando imagem via UAZAPI:', messageId);
    
    const response = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN!
      },
      body: JSON.stringify({
        id: messageId,
        return_base64: true,
        return_link: false
      })
    });
    
    if (!response.ok) {
      console.error('[IMAGE] ❌ Erro ao baixar:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    const base64 = data.base64Data || data.base64;
    const mimetype = data.mimetype || 'image/jpeg';
    
    if (!base64) {
      console.error('[IMAGE] ❌ Base64 não retornado:', JSON.stringify(data));
      return null;
    }
    
    console.log('[IMAGE] ✅ Imagem baixada. Tamanho:', base64.length);
    
    return { base64, mimetype };
    
  } catch (error) {
    console.error('[IMAGE] ❌ Erro:', error);
    return null;
  }
}

// ============================================
// DETECTAR TIPO DE IMAGEM
// ============================================

export async function detectarTipoImagem(messageId: string, userId?: string): Promise<DeteccaoTipoImagem> {
  try {
    const parsed = await runVisionJson(
      messageId,
      userId,
      `Classifique o tipo de imagem financeira:

TIPOS (em ordem de prioridade):
- "comprovante_pagamento": comprovante de app de pagamento (Shell Box, Uber, 99, estacionamento, pedágio, Sem Parar). Geralmente mostra "Pagamento aprovado" de um app.
- "ifood": print do iFood, Rappi, 99Food - pedido de DELIVERY de comida
- "nota_fiscal": cupom fiscal impresso, nota de mercado, farmácia, restaurante, loja física
- "comprovante_pix": transferência PIX (mostra chave PIX, QR code PIX, "Pix enviado/recebido")
- "recibo": recibo de pagamento genérico
- "outro": qualquer outra imagem não financeira

IMPORTANTE:
- Se mostrar "Pagamento aprovado" de app de combustível/posto → comprovante_pagamento
- Se mostrar Shell Box, Uber, 99, Sem Parar → comprovante_pagamento
- Se mostrar "Pedido concluído" de delivery de comida → ifood
- Se mostrar chave PIX ou "Pix enviado" → comprovante_pix
{"tipo": "comprovante_pagamento", "confianca": "alta"}`,
      'Classifique esta imagem financeira.',
      120,
    );
    
    console.log('[IMAGE] 🔍 Tipo detectado:', parsed.tipo, '| Confiança:', parsed.confianca);
    
    return {
      tipo: parsed.tipo || 'outro',
      confianca: parsed.confianca || 'baixa'
    };
    
  } catch (error) {
    console.error('[IMAGE] ❌ Erro ao detectar tipo:', error);
    return { tipo: 'outro', confianca: 'baixa' };
  }
}

// ============================================
// LER NOTA FISCAL / CUPOM
// ============================================

export async function lerNotaFiscal(messageId: string, userId?: string): Promise<LeituraNotaFiscal> {
  try {
    const parsed = await runVisionJson(
      messageId,
      userId,
      `Você é um especialista em ler cupons e notas fiscais brasileiras.
Analise a imagem e extraia as informações da compra.

INFORMAÇÕES A EXTRAIR:
- valor_total: valor total pago (número em reais, ex: 156.80)
- estabelecimento: nome da loja/mercado/farmácia
- categoria: uma dessas opções EXATAS:
  * "Alimentação" (mercado, restaurante, padaria)
  * "Saúde" (farmácia, drogaria)
  * "Transporte" (posto de gasolina)
  * "Vestuário" (loja de roupa)
  * "Lazer" (cinema, bar)
  * "Outros" (se não souber)
- data: data da compra (formato YYYY-MM-DD)
- itens: lista dos principais itens (máximo 5 strings)

RESPONDA APENAS em JSON válido:
{
  "valor_total": 156.80,
  "estabelecimento": "Supermercado Extra",
  "categoria": "Alimentação",
  "data": "2025-12-07",
  "itens": ["arroz", "feijão", "carne"],
  "confianca": "alta"
}

Se NÃO conseguir ler:
{"erro": "motivo", "confianca": null}`,
      'Extraia os dados desta nota fiscal.',
      600,
    );
    
    console.log('[IMAGE] 📄 Nota fiscal lida:', JSON.stringify(parsed));
    
    if (parsed.erro) {
      return { sucesso: false, erro: parsed.erro };
    }
    
    if (parsed.valor_total) {
      return {
        sucesso: true,
        dados: {
          valor_total: parsed.valor_total,
          estabelecimento: parsed.estabelecimento,
          categoria: parsed.categoria,
          data: parsed.data,
          itens: parsed.itens
        },
        confianca: parsed.confianca || 'media'
      };
    }
    
    return { sucesso: false, erro: 'Não foi possível identificar o valor' };
    
  } catch (error) {
    console.error('[IMAGE] ❌ Erro ao ler nota:', error);
    return { sucesso: false, erro: 'Erro ao processar imagem' };
  }
}

// ============================================
// LER COMPROVANTE PIX
// ============================================

export async function lerComprovantePix(messageId: string, userId?: string): Promise<LeituraComprovantePix> {
  try {
    const parsed = await runVisionJson(
      messageId,
      userId,
      `Você é um especialista em ler comprovantes de transferência PIX.
Analise a imagem e extraia as informações.

INFORMAÇÕES A EXTRAIR:
- valor: valor transferido (número em reais)
- tipo: "enviado" ou "recebido"
- destinatario: nome de quem recebeu (se foi enviado)
- remetente: nome de quem enviou (se foi recebido)
- banco: banco da transação (Nubank, Itaú, etc)
- data: data da transferência (formato YYYY-MM-DD)

RESPONDA APENAS em JSON válido:
{
  "valor": 500.00,
  "tipo": "enviado",
  "destinatario": "João Silva",
  "banco": "Nubank",
  "data": "2025-12-07",
  "confianca": "alta"
}

Se NÃO conseguir ler:
{"erro": "motivo", "confianca": null}`,
      'Extraia os dados deste comprovante PIX.',
      500,
    );
    
    console.log('[IMAGE] 💸 Comprovante PIX lido:', JSON.stringify(parsed));
    
    if (parsed.erro) {
      return { sucesso: false, erro: parsed.erro };
    }
    
    if (parsed.valor) {
      return {
        sucesso: true,
        dados: {
          valor: parsed.valor,
          tipo: parsed.tipo,
          destinatario: parsed.destinatario,
          remetente: parsed.remetente,
          banco: parsed.banco,
          data: parsed.data
        },
        confianca: parsed.confianca || 'media'
      };
    }
    
    return { sucesso: false, erro: 'Não foi possível identificar o valor' };
    
  } catch (error) {
    console.error('[IMAGE] ❌ Erro ao ler PIX:', error);
    return { sucesso: false, erro: 'Erro ao processar imagem' };
  }
}

// ============================================
// LER PEDIDO IFOOD/DELIVERY
// ============================================

export async function lerPedidoIFood(messageId: string, userId?: string): Promise<LeituraIFood> {
  try {
    const parsed = await runVisionJson(
      messageId,
      userId,
      `Você é um especialista em ler prints de pedidos do iFood, Rappi, 99Food.
Analise a imagem e extraia as informações do pedido.

INFORMAÇÕES A EXTRAIR:
- valor_total: valor total do pedido (número em reais)
- restaurante: nome do restaurante
- itens: lista dos itens pedidos (máximo 5 strings)
- taxa_entrega: taxa de entrega (se houver)
- data: data do pedido (formato YYYY-MM-DD)

RESPONDA APENAS em JSON válido:
{
  "valor_total": 45.90,
  "restaurante": "McDonald's",
  "itens": ["Big Mac", "McFritas", "Coca-Cola"],
  "taxa_entrega": 5.99,
  "data": "2025-12-07",
  "confianca": "alta"
}

Se NÃO conseguir ler:
{"erro": "motivo", "confianca": null}`,
      'Extraia os dados deste pedido de delivery.',
      600,
    );
    
    console.log('[IMAGE] 🍔 Pedido iFood lido:', JSON.stringify(parsed));
    
    if (parsed.erro) {
      return { sucesso: false, erro: parsed.erro };
    }
    
    if (parsed.valor_total) {
      return {
        sucesso: true,
        dados: {
          valor_total: parsed.valor_total,
          restaurante: parsed.restaurante,
          itens: parsed.itens,
          taxa_entrega: parsed.taxa_entrega,
          data: parsed.data
        },
        confianca: parsed.confianca || 'media'
      };
    }
    
    return { sucesso: false, erro: 'Não foi possível identificar o valor' };
    
  } catch (error) {
    console.error('[IMAGE] ❌ Erro ao ler iFood:', error);
    return { sucesso: false, erro: 'Erro ao processar imagem' };
  }
}

// ============================================
// LER COMPROVANTE DE PAGAMENTO (Shell Box, Uber, 99, etc.)
// ============================================

export async function lerComprovantePagamento(messageId: string, userId?: string): Promise<LeituraComprovantePagamento> {
  try {
    const parsed = await runVisionJson(
      messageId,
      userId,
      `Você é um especialista em ler comprovantes de pagamento de apps brasileiros.
Analise a imagem e extraia as informações do pagamento.

TIPOS DE SERVIÇO:
- "combustivel": Shell Box, Ipiranga, BR, posto de gasolina
- "corrida": Uber, 99, inDrive, táxi
- "estacionamento": Estapar, Zona Azul, estacionamento
- "pedagio": Sem Parar, ConectCar, pedágio
- "outro": outros serviços

INFORMAÇÕES A EXTRAIR:
- valor_total: valor final pago (número em reais)
- estabelecimento: nome do posto/loja/serviço
- tipo_servico: combustivel, corrida, estacionamento, pedagio, outro
- produto: nome do produto (ex: "Etanol Comum", "Gasolina Aditivada")
- quantidade: quantidade (ex: "42.12 LT", "15 km")
- preco_unitario: preço por unidade (ex: 4.74)
- forma_pagamento: crédito, débito, pix, dinheiro
- data: data do pagamento (formato YYYY-MM-DD)

RESPONDA APENAS em JSON válido:
{
  "valor_total": 191.23,
  "estabelecimento": "Auto Posto Magarça Ltda",
  "tipo_servico": "combustivel",
  "produto": "Etanol Comum",
  "quantidade": "42.12 LT",
  "preco_unitario": 4.74,
  "forma_pagamento": "crédito",
  "data": "2025-12-05",
  "confianca": "alta"
}

Se NÃO conseguir ler:
{"erro": "motivo", "confianca": null}`,
      'Extraia os dados deste comprovante de pagamento.',
      600,
    );
    
    console.log('[IMAGE] ⛽ Comprovante pagamento lido:', JSON.stringify(parsed));
    
    if (parsed.erro) {
      return { sucesso: false, erro: parsed.erro };
    }
    
    if (parsed.valor_total) {
      // Mapear categoria baseado no tipo de serviço
      const categoriaMap: Record<string, string> = {
        'combustivel': 'Transporte',
        'corrida': 'Transporte',
        'estacionamento': 'Transporte',
        'pedagio': 'Transporte',
        'outro': 'Outros'
      };
      
      return {
        sucesso: true,
        dados: {
          valor_total: parsed.valor_total,
          estabelecimento: parsed.estabelecimento,
          tipo_servico: parsed.tipo_servico || 'outro',
          produto: parsed.produto,
          quantidade: parsed.quantidade,
          preco_unitario: parsed.preco_unitario,
          forma_pagamento: parsed.forma_pagamento,
          data: parsed.data,
          categoria: categoriaMap[parsed.tipo_servico] || 'Outros'
        },
        confianca: parsed.confianca || 'media'
      };
    }
    
    return { sucesso: false, erro: 'Não foi possível identificar o valor' };
    
  } catch (error) {
    console.error('[IMAGE] ❌ Erro ao ler comprovante:', error);
    return { sucesso: false, erro: 'Erro ao processar imagem' };
  }
}
