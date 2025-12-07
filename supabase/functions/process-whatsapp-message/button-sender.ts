// ============================================
// BUTTON SENDER - Envio de Botões Interativos
// ============================================
// 
// Endpoint UAZAPI: POST {UAZAPI_BASE_URL}/send/interactive
// Tipo: "button" (máximo 3 botões)
// Formato choices: "Texto do Botão|id_do_botao"
// 
// ============================================

// ============================================
// TIPOS
// ============================================

export interface BotaoOpcao {
  texto: string;           // Texto exibido no botão
  id: string;              // ID único para identificar resposta
  tipo?: 'resposta' | 'url' | 'chamada' | 'copia';
  valor?: string;          // Para URL, número ou código PIX
}

export interface EnviarBotoesResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// ============================================
// FUNÇÃO PRINCIPAL: ENVIAR MENU INTERATIVO
// ============================================

export async function enviarMensagemComBotoes(
  phone: string,
  texto: string,
  botoes: BotaoOpcao[],
  footerText?: string,
  imageUrl?: string
): Promise<EnviarBotoesResult> {
  
  const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
  const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");
  
  // 🔍 DEBUG 1: Variáveis de ambiente
  console.log('📤 [Botões] ========== INICIANDO ENVIO ==========');
  console.log('📤 [Botões] URL:', UAZAPI_BASE_URL);
  console.log('📤 [Botões] Token existe:', !!UAZAPI_TOKEN);
  console.log('📤 [Botões] Token primeiros chars:', UAZAPI_TOKEN?.substring(0, 10));
  console.log('📤 [Botões] Phone:', phone);
  console.log('📤 [Botões] Texto:', texto.substring(0, 100) + '...');
  console.log('📤 [Botões] Qtd Botões:', botoes.length);
  
  if (!UAZAPI_BASE_URL || !UAZAPI_TOKEN) {
    console.error('❌ [Botões] Variáveis de ambiente não configuradas!');
    return { success: false, error: 'Configuração UAZAPI ausente' };
  }
  
  if (!phone) {
    console.error('❌ [Botões] Phone está vazio/undefined!');
    return { success: false, error: 'Phone não informado' };
  }
  
  try {
    // ⚠️ Máximo 3 botões para type: button
    if (botoes.length > 3) {
      console.warn('📤 [Botões] ⚠️ Máximo de 3 botões permitidos. Truncando...');
      botoes = botoes.slice(0, 3);
    }
    
    // Formatar choices: "Texto do Botão|id_do_botao"
    const choices = botoes.map(botao => {
      switch (botao.tipo) {
        case 'url':
          return `${botao.texto}|${botao.valor}`;
        case 'chamada':
          return `${botao.texto}|call:${botao.valor}`;
        case 'copia':
          return `${botao.texto}|copy:${botao.valor}`;
        case 'resposta':
        default:
          return `${botao.texto}|${botao.id}`;
      }
    });
    
    console.log('📤 [Botões] Choices formatados:', JSON.stringify(choices));
    
    // Payload UAZAPI
    const payload: Record<string, unknown> = {
      number: phone,
      type: "button",
      text: texto,
      choices: choices,
    };
    
    if (footerText) payload.footerText = footerText;
    if (imageUrl) payload.imageButton = imageUrl;
    
    // 🔍 DEBUG 2: Payload completo
    console.log('📤 [Botões] Payload completo:', JSON.stringify(payload, null, 2));
    console.log('📤 [Botões] Endpoint:', `${UAZAPI_BASE_URL}/send/interactive`);
    
    // Chamar endpoint UAZAPI - CORRIGIDO: /send/interactive
    const response = await fetch(`${UAZAPI_BASE_URL}/send/interactive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    
    // 🔍 DEBUG 3: Resposta completa
    const responseText = await response.text();
    console.log('📤 [Botões] Status HTTP:', response.status);
    console.log('📤 [Botões] Resposta UAZAPI:', responseText);
    
    if (!response.ok) {
      console.error('❌ [Botões] UAZAPI retornou erro:', response.status, responseText);
      return { success: false, error: `UAZAPI error: ${response.status} - ${responseText}` };
    }
    
    console.log('✅ [Botões] Botões enviados com sucesso!');
    console.log('📤 [Botões] ========== FIM ENVIO ==========');
    
    // Tentar extrair messageId da resposta
    try {
      const result = JSON.parse(responseText);
      return { success: true, messageId: result.messageId || result.id };
    } catch {
      return { success: true };
    }
    
  } catch (error) {
    console.error('❌ [Botões] Exceção:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// HELPER: CONFIRMAÇÃO COM BOTÕES EDITAR/EXCLUIR
// ============================================

export async function enviarConfirmacaoComBotoes(
  phone: string,
  mensagemPrincipal: string,
  transacaoId: string
): Promise<EnviarBotoesResult> {
  
  console.log('🔘 [enviarConfirmacaoComBotoes] Iniciando...');
  console.log('📱 Phone:', phone);
  console.log('📝 Mensagem:', mensagemPrincipal.substring(0, 50) + '...');
  console.log('🆔 TransacaoId:', transacaoId);
  
  const botoes: BotaoOpcao[] = [
    { texto: '✏️ Editar', id: `editar_${transacaoId}`, tipo: 'resposta' },
    { texto: '🗑️ Excluir', id: `excluir_${transacaoId}`, tipo: 'resposta' }
  ];
  
  const resultado = await enviarMensagemComBotoes(
    phone, 
    mensagemPrincipal, 
    botoes, 
    'Escolha uma ação'
  );
  
  console.log('🔘 [enviarConfirmacaoComBotoes] Resultado:', JSON.stringify(resultado));
  return resultado;
}

// ============================================
// HELPER: CONFIRMAÇÃO SIM/NÃO
// ============================================

export async function enviarConfirmacaoSimNao(
  phone: string,
  pergunta: string,
  contextoId: string
): Promise<EnviarBotoesResult> {
  
  const botoes: BotaoOpcao[] = [
    { texto: '✅ Sim', id: `confirmar_${contextoId}`, tipo: 'resposta' },
    { texto: '❌ Não', id: `cancelar_${contextoId}`, tipo: 'resposta' }
  ];
  
  return await enviarMensagemComBotoes(phone, pergunta, botoes);
}

// ============================================
// HELPER: SELEÇÃO DE CONTA
// ============================================

export async function enviarSelecaoContas(
  phone: string,
  contas: Array<{ id: string; name: string; icon?: string }>,
  mensagem: string
): Promise<EnviarBotoesResult> {
  
  // Máximo 3 contas (limite de botões)
  const contasLimitadas = contas.slice(0, 3);
  
  const botoes: BotaoOpcao[] = contasLimitadas.map(conta => ({
    texto: `${conta.icon || '🏦'} ${conta.name}`,
    id: `conta_${conta.id}`,
    tipo: 'resposta' as const
  }));
  
  return await enviarMensagemComBotoes(
    phone, 
    mensagem, 
    botoes, 
    'Selecione a conta'
  );
}

// ============================================
// HELPER: OPÇÕES DE EDIÇÃO
// ============================================

export async function enviarOpcoesEdicao(
  phone: string,
  transacaoId: string
): Promise<EnviarBotoesResult> {
  
  const mensagem = `✏️ *O que deseja editar?*

Escolha o campo que deseja alterar:`;

  const botoes: BotaoOpcao[] = [
    { texto: '💰 Valor', id: `edit_valor_${transacaoId}`, tipo: 'resposta' },
    { texto: '📂 Categoria', id: `edit_categoria_${transacaoId}`, tipo: 'resposta' },
    { texto: '🏦 Conta', id: `edit_conta_${transacaoId}`, tipo: 'resposta' }
  ];
  
  return await enviarMensagemComBotoes(phone, mensagem, botoes);
}

// ============================================
// FALLBACK: ENVIAR TEXTO SIMPLES SE BOTÕES FALHAREM
// ============================================

export async function enviarComFallback(
  phone: string,
  texto: string,
  botoes: BotaoOpcao[],
  footerText?: string
): Promise<EnviarBotoesResult> {
  
  // Tentar enviar com botões
  const resultado = await enviarMensagemComBotoes(phone, texto, botoes, footerText);
  
  if (resultado.success) {
    return resultado;
  }
  
  console.warn('[ButtonSender] ⚠️ Fallback para texto simples');
  
  // Fallback: enviar texto puro com instruções
  const textoFallback = `${texto}

💡 _Responda com:_
${botoes.map((b, i) => `${i + 1}. ${b.texto}`).join('\n')}`;
  
  // Usar send-whatsapp-message como fallback
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        phone_number: phone,
        message_type: 'text',
        content: textoFallback
      })
    });
    
    return { success: response.ok, error: response.ok ? undefined : 'Fallback também falhou' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// EXTRAIR BUTTON ID DO PAYLOAD
// ============================================

export function extrairButtonId(payload: Record<string, unknown>): string | null {
  const message = payload.message as Record<string, unknown> | undefined;
  if (!message) return null;
  
  const content = message.content as Record<string, unknown> | undefined;
  if (!content) return null;
  
  const buttonResponse = content.buttonResponse as Record<string, unknown> | undefined;
  if (!buttonResponse) return null;
  
  return (buttonResponse.id as string) || null;
}

// ============================================
// PARSEAR BUTTON ID
// ============================================

export interface ParsedButtonId {
  acao: 'editar' | 'excluir' | 'confirmar' | 'cancelar' | 'conta' | 'edit_valor' | 'edit_categoria' | 'edit_conta' | 'outro';
  id: string;
  raw: string;
}

export function parsearButtonId(buttonId: string): ParsedButtonId {
  const prefixos = [
    'editar_',
    'excluir_',
    'confirmar_',
    'cancelar_',
    'conta_',
    'edit_valor_',
    'edit_categoria_',
    'edit_conta_'
  ];
  
  for (const prefixo of prefixos) {
    if (buttonId.startsWith(prefixo)) {
      const acao = prefixo.replace(/_$/, '') as ParsedButtonId['acao'];
      const id = buttonId.replace(prefixo, '');
      return { acao, id, raw: buttonId };
    }
  }
  
  return { acao: 'outro', id: buttonId, raw: buttonId };
}
