/**
 * EDGE FUNCTION: extract-receipt-data
 * Responsabilidade: Extrair dados de nota fiscal usando GPT-4 Vision API
 * 
 * Fluxo:
 * 1. Recebe URL da imagem
 * 2. Faz download da imagem
 * 3. Converte para Base64
 * 4. Envia para GPT-4 Vision
 * 5. Parse dos dados extraídos
 * 6. Retorna dados estruturados
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDefaultAIConfig, callVision } from '../_shared/ai.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ExtractRequest {
  image_url: string;
  image_format?: string;
  user_id?: string;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { image_url, image_format, user_id }: ExtractRequest = await req.json();
    
    console.log('📸 Extraindo dados de nota fiscal:', image_url);
    
    // Download da imagem
    const imageResponse = await fetch(image_url);
    
    if (!imageResponse.ok) {
      throw new Error('Falha ao baixar imagem');
    }
    
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Determinar MIME type
    const mimeType = image_format || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    
    // Prompt para extração (pode ser prefixado por system_prompt do usuário)
    const baseSystemPrompt = `Você é um assistente especializado em extrair dados de notas fiscais brasileiras.
Analise a imagem e extraia os seguintes dados:
- merchant_name (nome do estabelecimento)
- merchant_cnpj (CNPJ se disponível)
- amount (valor total da nota, apenas número)
- date (data da compra no formato YYYY-MM-DD)
- items (array de itens com: name, quantity, unit_price, total_price)
- payment_method (forma de pagamento se disponível)
- receipt_number (número da nota se disponível)

Retorne APENAS um JSON válido com esses campos, sem texto adicional.
Se algum campo não estiver disponível, use null.`;
    
    // Buscar configuração do usuário (se user_id fornecido)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const aiConfig = user_id ? await getDefaultAIConfig(supabase, user_id) : null;

    let content: string;
    try {
      if (aiConfig) {
        const combinedSystem = (aiConfig.systemPrompt ? aiConfig.systemPrompt + '\n\n' : '') + baseSystemPrompt;
        content = await callVision(
          {
            provider: aiConfig.provider,
            model: aiConfig.model,
            apiKey: aiConfig.apiKey,
            temperature: Math.max(0.1, aiConfig.temperature || 0.2),
            maxTokens: Math.max(500, aiConfig.maxTokens || 1500),
          },
          dataUrl,
          combinedSystem,
          'Extraia os dados desta nota fiscal:'
        );
      } else {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada e nenhum provedor padrão definido');
        // Fallback para OpenAI Vision
        content = await callVision(
          {
            provider: 'openai',
            model: 'gpt-5-mini',
            apiKey: OPENAI_API_KEY,
            temperature: 0.2,
            maxTokens: 1500,
          },
          dataUrl,
          baseSystemPrompt,
          'Extraia os dados desta nota fiscal:'
        );
      }
    } catch (e) {
      // Fallback para OpenAI Vision caso provider do usuário não suporte
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (OPENAI_API_KEY) {
        const fallback = await callVision(
          {
            provider: 'openai',
            model: 'gpt-5-mini',
            apiKey: OPENAI_API_KEY,
            temperature: 0.2,
            maxTokens: 1500,
          },
          dataUrl,
          baseSystemPrompt,
          'Extraia os dados desta nota fiscal:'
        );
        content = fallback;
      } else {
        throw new Error(`Falha na análise de imagem: ${e.message || e}`);
      }
    }
    
    console.log('📝 Resposta do GPT-4 Vision:', content);
    
    // Parse JSON
    let extractedData;
    try {
      // Remover markdown code blocks se presentes
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (e) {
      throw new Error('Falha ao parsear resposta do GPT-4 Vision');
    }
    
    // Validar e enriquecer dados
    const validatedData = validateAndEnrichData(extractedData);
    
    console.log('✅ Dados extraídos com sucesso');
    
    return new Response(
      JSON.stringify({
        success: true,
        data: validatedData,
        confidence: calculateConfidence(validatedData),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Erro ao extrair dados:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Valida e enriquece dados extraídos
 */
function validateAndEnrichData(data: any) {
  // Garantir que amount seja número
  if (data.amount) {
    data.amount = parseFloat(String(data.amount).replace(',', '.'));
  }
  
  // Inferir categoria baseado no merchant_name
  if (data.merchant_name) {
    data.category = inferCategory(data.merchant_name);
  }
  
  // Adicionar tipo (sempre expense para notas fiscais)
  data.type = 'expense';
  
  // Gerar descrição se não houver
  if (!data.description && data.merchant_name) {
    data.description = `Compra em ${data.merchant_name}`;
  }
  
  // Validar data
  if (data.date) {
    try {
      new Date(data.date);
    } catch (e) {
      data.date = new Date().toISOString().split('T')[0];
    }
  } else {
    data.date = new Date().toISOString().split('T')[0];
  }
  
  // Processar items
  if (data.items && Array.isArray(data.items)) {
    data.items = data.items.map((item: any) => ({
      name: item.name || 'Item',
      quantity: parseFloat(item.quantity) || 1,
      unit_price: parseFloat(String(item.unit_price || 0).replace(',', '.')),
      total_price: parseFloat(String(item.total_price || 0).replace(',', '.')),
    }));
  }
  
  return data;
}

/**
 * Infere categoria baseado no nome do estabelecimento
 */
function inferCategory(merchantName: string): string {
  const name = merchantName.toLowerCase();
  
  // Alimentação
  if (
    name.includes('restaurante') ||
    name.includes('lanchonete') ||
    name.includes('padaria') ||
    name.includes('mercado') ||
    name.includes('supermercado') ||
    name.includes('açougue') ||
    name.includes('hortifruti') ||
    name.includes('bar') ||
    name.includes('café') ||
    name.includes('pizzaria') ||
    name.includes('hamburgueria')
  ) {
    return 'food';
  }
  
  // Transporte
  if (
    name.includes('posto') ||
    name.includes('combustível') ||
    name.includes('uber') ||
    name.includes('99') ||
    name.includes('taxi')
  ) {
    return 'transport';
  }
  
  // Saúde
  if (
    name.includes('farmácia') ||
    name.includes('drogaria') ||
    name.includes('clínica') ||
    name.includes('hospital') ||
    name.includes('laboratório')
  ) {
    return 'health';
  }
  
  // Educação
  if (
    name.includes('livraria') ||
    name.includes('papelaria') ||
    name.includes('escola') ||
    name.includes('curso')
  ) {
    return 'education';
  }
  
  // Lazer
  if (
    name.includes('cinema') ||
    name.includes('teatro') ||
    name.includes('shopping') ||
    name.includes('parque')
  ) {
    return 'entertainment';
  }
  
  // Shopping
  if (
    name.includes('loja') ||
    name.includes('magazine') ||
    name.includes('boutique') ||
    name.includes('calçados') ||
    name.includes('roupas')
  ) {
    return 'shopping';
  }
  
  // Default
  return 'other';
}

/**
 * Calcula confiança da extração (0-1)
 */
function calculateConfidence(data: any): number {
  let score = 0;
  let total = 0;
  
  // Campos obrigatórios
  if (data.merchant_name) { score++; total++; } else { total++; }
  if (data.amount && data.amount > 0) { score++; total++; } else { total++; }
  if (data.date) { score++; total++; } else { total++; }
  
  // Campos opcionais
  if (data.merchant_cnpj) score += 0.5;
  if (data.items && data.items.length > 0) score += 0.5;
  if (data.payment_method) score += 0.5;
  if (data.receipt_number) score += 0.5;
  
  total += 2; // Peso dos opcionais
  
  return Math.min(score / total, 1);
}
