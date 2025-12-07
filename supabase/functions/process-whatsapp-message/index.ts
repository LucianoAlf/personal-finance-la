// ============================================
// VERSÃO V26 - MODULARIZADO COMPLETO 🚀
// Edge Functions → process-whatsapp-message
// ============================================
// 
// ARQUITETURA MODULAR:
// - types.ts             → Interfaces TypeScript
// - utils.ts             → Funções utilitárias
// - context-manager.ts   → Gerenciamento de contexto
// - button-handler.ts    → Processamento de botões
// - quick-commands.ts    → Comandos rápidos
// - response-templates.ts → Templates de resposta
// - nlp-processor.ts     → Classificação de intenções ✨ NOVO
// - transaction-mapper.ts → CRUD de transações ✨ NOVO
// 
// ============================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabase, normalizeMessageType, corsHeaders, enviarViaEdgeFunction } from './utils.ts';
import { buscarContexto, isContextoAtivo, processarNoContexto, salvarContexto } from './context-manager.ts';
import { processarBotao } from './button-handler.ts';
import { isComandoRapido, processarComandoRapido } from './quick-commands.ts';
import { templateUsuarioNaoCadastrado, templateErroGenerico, templateComandoNaoReconhecido } from './response-templates.ts';
import { classificarIntencao, isAnalyticsQuery, isComandoEdicao, isComandoExclusao, extrairEntidadesEdicao } from './nlp-processor.ts';
import { classificarIntencaoNLP, IntencaoClassificada } from './nlp-classifier.ts';
import { processarIntencaoTransacao, processarEdicao, processarExclusao } from './transaction-mapper.ts';
import { enviarConfirmacaoComBotoes, extrairButtonId, parsearButtonId } from './button-sender.ts';
import { isAudioPTT, extrairMessageId, processarAudioPTT, extrairInfoAudio } from './audio-handler.ts';
import { excluirUltimaTransacao, mudarContaUltimaTransacao, consultarSaldo, listarContas, extrairNomeConta } from './command-handlers.ts';

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req: Request) => {
  console.log('🚀 [process-whatsapp-message] FUNÇÃO INICIADA!');
  
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    console.log('📥 [process-whatsapp-message] Processando request...');
    
    const payload = await req.json();
    console.log('📦 Payload recebido:', JSON.stringify(payload).substring(0, 500));
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const supabase = getSupabase();
    
    // ============================================
    // 1. DETECTAR TIPO DE PAYLOAD
    // ============================================
    // Payload do webhook-uazapi (já processado):
    // { message_id, user_id, content, from_number }
    const isInternalPayload = payload.message_id && payload.user_id && payload.content;
    
    // Payload direto UAZAPI ou N8N
    const isN8NPayload = payload.body && payload.body.EventType;
    const event = isN8NPayload ? payload.body.EventType : payload.event;
    
    let phone: string;
    let userId: string;
    let content: string;
    let messageId: string | null = null;
    let messageType = 'text';
    let messageData: Record<string, unknown> = {};
    
    // ============================================
    // 2. EXTRAIR DADOS CONFORME TIPO
    // ============================================
    if (isInternalPayload) {
      // Payload do webhook-uazapi (mensagem já salva)
      console.log('📨 Payload interno (webhook-uazapi)');
      phone = payload.from_number;
      userId = payload.user_id;
      content = payload.content;
      messageId = payload.message_id;
      messageType = payload.message_type || 'text';
      
      // Se é áudio, usar raw_payload para transcrição
      if (payload.is_audio && payload.raw_payload) {
        console.log('🎤 Áudio detectado no payload interno');
        messageData = payload.raw_payload.message || {};
        // Guardar whatsapp_message_id para transcrição
        messageData.messageid = payload.whatsapp_message_id;
      }
    } else if (isN8NPayload) {
      // Payload via N8N
      console.log('📨 Payload N8N');
      const from = payload.body.message?.sender || '';
      phone = payload.body.chat?.phone?.replace(/\D/g, '') || from.split('@')[0];
      messageData = payload.body.message || {};
      const rawType = (messageData.messageType || messageData.type || 'text') as string;
      messageType = normalizeMessageType(rawType);
      content = (messageData.content || messageData.text || '') as string;
      userId = ''; // Será buscado abaixo
    } else {
      // Payload direto UAZAPI
      console.log('📨 Payload direto UAZAPI');
      const from = payload.data?.from || '';
      phone = from.split('@')[0];
      messageData = payload.data?.message || {};
      const rawType = (messageData.type || 'text') as string;
      messageType = normalizeMessageType(rawType);
      content = (messageData.text || messageData.caption || '') as string;
      userId = ''; // Será buscado abaixo
      
      // Eventos permitidos
      const allowedEvents = ['message', 'messages', 'interactive', 'button', 'button_reply', 'menu'];
      const hasButtonSignal = Boolean(payload?.data?.message?.buttonOrListid);
      
      if (event && !allowedEvents.includes(String(event)) && !hasButtonSignal) {
        console.log('⏭️ Evento ignorado:', event);
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    console.log('📱 Telefone:', phone);
    console.log('📝 Conteúdo:', content);
    console.log('🎵 Tipo mensagem:', messageType);
    console.log('🆔 UserId:', userId || '(será buscado)');
    
    // ============================================
    // DETECTAR ÁUDIO PTT
    // ============================================
    const isAudio = isAudioPTT(payload, messageType, messageData);
    console.log('🎤 É áudio PTT?', isAudio);
    
    // Validação
    if (!phone && !userId) {
      console.log('⚠️ Telefone e userId não encontrados');
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Permitir conteúdo vazio se for áudio (será transcrito)
    if (!content && !isAudio) {
      console.log('⚠️ Conteúdo vazio e não é áudio');
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // ============================================
    // 3. BUSCAR USUÁRIO (se não veio no payload)
    // ============================================
    let user: { id: string; full_name: string; email: string };
    
    if (userId) {
      // Já temos o userId do payload interno
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        console.error('❌ Usuário não encontrado por ID:', userId);
        return new Response(JSON.stringify({ ok: false, error: 'User not found' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      user = userData;
    } else {
      // Buscar por telefone
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('phone', phone)
        .single();
      
      if (userError || !userData) {
        console.error('❌ Usuário não encontrado:', phone);
        await enviarViaEdgeFunction(phone, templateUsuarioNaoCadastrado());
        return new Response(JSON.stringify({ ok: true, message: 'Usuário não cadastrado' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      user = userData;
    }
    
    console.log('✅ Usuário:', user.full_name);
    
    // ============================================
    // 4. SALVAR MENSAGEM (se não veio do webhook-uazapi)
    // ============================================
    let message: { id: string };
    
    if (messageId) {
      // Mensagem já foi salva pelo webhook-uazapi
      message = { id: messageId };
      console.log('💾 Mensagem já salva:', messageId);
    } else {
      // Salvar nova mensagem
      const { data: newMessage, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          user_id: user.id,
          phone_number: phone,
          message_type: messageType,
          direction: 'inbound',
          content: content,
          intent: null,
          processing_status: 'pending',
          received_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (messageError) {
        console.error('❌ Erro ao salvar mensagem:', messageError);
        throw messageError;
      }
      message = newMessage;
      console.log('💾 Mensagem salva:', message.id);
    }
    
    // ============================================
    // 5. PROCESSAR BOTÃO INTERATIVO (UAZAPI)
    // ============================================
    // Detectar clique em botão (formato UAZAPI: type=interactive, content.buttonResponse)
    const buttonIdFromInteractive = extrairButtonId(payload) || 
      extrairButtonId({ message: messageData });
    
    const buttonIdLegacy = (
      messageData?.buttonOrListid ||
      messageData?.buttonOrListId ||
      messageData?.selectedButtonId
    ) as string | undefined;
    
    const buttonId = buttonIdFromInteractive || buttonIdLegacy;
    
    if (buttonId) {
      console.log('🔘 Botão clicado:', buttonId);
      
      const parsed = parsearButtonId(buttonId);
      console.log('📋 Ação:', parsed.acao, '| ID:', parsed.id);
      
      // Processar ações de editar/excluir
      if (parsed.acao === 'editar') {
        // Iniciar fluxo de edição
        await salvarContexto(user.id, 'editing_transaction', {
          transacao_id: parsed.id,
          phone
        }, phone);
        await enviarViaEdgeFunction(phone, `✏️ *O que deseja editar?*\n\nResponda com:\n• "valor 50" para mudar o valor\n• "categoria alimentação" para mudar categoria\n• "conta nubank" para mudar a conta\n• "cancelar" para cancelar`);
      } else if (parsed.acao === 'excluir') {
        // Pedir confirmação de exclusão
        await salvarContexto(user.id, 'confirming_action', {
          step: 'awaiting_delete_confirmation',
          transacao_id: parsed.id,
          phone
        }, phone);
        await enviarViaEdgeFunction(phone, `⚠️ *Confirma exclusão?*\n\nResponda "sim" para confirmar ou "não" para cancelar.`);
      } else if (parsed.acao === 'confirmar') {
        // Executar exclusão
        const resultado = await processarExclusao(user.id);
        await enviarViaEdgeFunction(phone, resultado.mensagem);
      } else if (parsed.acao === 'cancelar') {
        await enviarViaEdgeFunction(phone, '✅ Ação cancelada.');
      } else {
        // Fallback para handler antigo
        await processarBotao(buttonId, user.id, phone);
      }
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'button_click',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'button', acao: parsed.acao }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 5.1 PROCESSAR ÁUDIO PTT
    // ============================================
    if (isAudio) {
      console.log('🎤 Processando áudio PTT...');
      
      // PRIMEIRO: Verificar se já veio transcrito do webhook-uazapi
      // O webhook já transcreve e passa o texto no campo content
      if (content && content.trim() && !content.startsWith('[ÁUDIO')) {
        console.log('✅ Áudio já veio transcrito do webhook:', content);
        // Atualizar mensagem com flag de transcrição
        await supabase.from('whatsapp_messages').update({
          message_type: 'audio_transcribed',
          metadata: { 
            original_type: 'audio',
            transcription: content
          }
        }).eq('id', message.id);
        // Continuar fluxo normal com o texto já transcrito
      } else {
        // Áudio não veio transcrito, tentar transcrever aqui
        console.log('📥 Áudio sem transcrição, tentando via UAZAPI...');
        
        // Extrair messageId do áudio
        const audioMessageId = extrairMessageId(payload, messageData);
        
        if (!audioMessageId) {
          console.error('❌ messageId do áudio não encontrado no payload');
          await enviarViaEdgeFunction(phone, '⚠️ Erro ao processar áudio. Tente novamente ou envie texto.');
          return new Response(JSON.stringify({ ok: true, error: 'messageId not found' }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        
        // Feedback imediato ao usuário
        await enviarViaEdgeFunction(phone, '🎤 Processando seu áudio...');
        
        // Transcrever via UAZAPI + Whisper
        const transcricao = await processarAudioPTT(payload, audioMessageId);
        
        if (!transcricao.success || !transcricao.texto) {
          console.error('❌ Falha na transcrição:', transcricao.erro);
          await enviarViaEdgeFunction(phone, '⚠️ Não consegui entender o áudio. Pode repetir ou digitar?');
          
          await supabase.from('whatsapp_messages').update({
            processing_status: 'failed',
            intent: 'audio_transcription_failed',
            processed_at: new Date().toISOString()
          }).eq('id', message.id);
          
          return new Response(JSON.stringify({ ok: true, error: transcricao.erro }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        
        // ✨ Substituir content pelo texto transcrito
        content = transcricao.texto;
        console.log('📝 Áudio transcrito via UAZAPI:', content);
        
        // Atualizar mensagem com transcrição
        await supabase.from('whatsapp_messages').update({
          content: content,
          message_type: 'audio_transcribed',
          metadata: { 
            original_type: 'audio',
            duracao: transcricao.duracao,
            transcription: content
          }
        }).eq('id', message.id);
      }
      
      // Continuar fluxo normal com o texto transcrito (não retornar aqui!)
    }
    
    // ============================================
    // 5. VERIFICAR CONTEXTO ATIVO
    // ============================================
    const contexto = await buscarContexto(user.id);
    
    if (isContextoAtivo(contexto)) {
      console.log('🔄 Processando no contexto:', contexto!.context_type);
      const resposta = await processarNoContexto(content, contexto!, user.id, phone);
      
      // Se resposta for null, significa que já enviamos mensagem com botões
      if (resposta !== null) {
        await enviarViaEdgeFunction(phone, resposta);
      }
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'context_response',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'context' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 6. COMANDO RÁPIDO
    // ============================================
    const command = content.toLowerCase().trim();
    
    if (!command) {
      console.log('⚠️ Comando vazio');
      return new Response(JSON.stringify({ success: true, message: 'Conteúdo vazio' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (isComandoRapido(command)) {
      console.log('⚡ Comando rápido detectado:', command);
      await processarComandoRapido(command, user.id, phone);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'quick_command',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'quick_command', command }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 7. EDIÇÃO DE TRANSAÇÃO
    // ============================================
    if (isComandoEdicao(command)) {
      console.log('✏️ Comando de edição detectado:', command);
      const entidades = extrairEntidadesEdicao(command);
      console.log('📋 Entidades extraídas:', entidades);
      const resultado = await processarEdicao(user.id, entidades);
      await enviarViaEdgeFunction(phone, resultado.mensagem);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'edit_transaction',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'edit' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 8. EXCLUSÃO DE TRANSAÇÃO
    // ============================================
    if (isComandoExclusao(command)) {
      console.log('🗑️ Comando de exclusão detectado');
      const resultado = await processarExclusao(user.id);
      await enviarViaEdgeFunction(phone, resultado.mensagem);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'delete_transaction',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'delete' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 9. COMANDOS CONVERSACIONAIS RÁPIDOS
    // ============================================
    const textoLower = content.toLowerCase().trim();
    
    // Comando: Excluir
    if (/^(exclui|apaga|deleta|remove|cancela)\s*(essa|este|isso)?$/i.test(textoLower)) {
      console.log('🗑️ Comando: Excluir última transação');
      const resposta = await excluirUltimaTransacao(user.id);
      await enviarViaEdgeFunction(phone, resposta);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'delete_quick_command',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'delete_quick' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Comando: Mudar conta
    const matchMudarConta = textoLower.match(/^(?:muda|troca|transfere)\s+(?:pra|pro|para)\s+(\w+)$/i);
    if (matchMudarConta) {
      const nomeConta = matchMudarConta[1];
      console.log('🏦 Comando: Mudar conta para', nomeConta);
      const resposta = await mudarContaUltimaTransacao(user.id, nomeConta);
      await enviarViaEdgeFunction(phone, resposta);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'change_account_quick_command',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'change_account_quick' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Comando: Saldo
    if (/^(saldo|quanto\s+tenho|minhas?\s+contas?|meu\s+saldo)$/i.test(textoLower)) {
      console.log('💰 Comando: Consultar saldo');
      const resposta = await consultarSaldo(user.id);
      await enviarViaEdgeFunction(phone, resposta);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'balance_quick_command',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'balance_quick' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Comando: Listar contas
    if (/^(contas|quais\s+contas|minhas\s+contas)$/i.test(textoLower)) {
      console.log('🏦 Comando: Listar contas');
      const resposta = await listarContas(user.id);
      await enviarViaEdgeFunction(phone, resposta);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'list_accounts_quick_command',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'list_accounts_quick' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 10. CONSULTA ANALÍTICA
    // ============================================
    if (isAnalyticsQuery(command)) {
      console.log('📊 Consulta analítica detectada');
      
      try {
        const analyticsResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/analytics-query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ user_id: user.id, phone, raw_query: content })
          }
        );
        
        const result = await analyticsResponse.json();
        const responseText = result.success && result.formatted_response 
          ? result.formatted_response 
          : '❌ Não consegui processar sua consulta.';
        
        await enviarViaEdgeFunction(phone, responseText);
        
        await supabase.from('whatsapp_messages').update({
          processing_status: 'completed',
          intent: 'analytics_query',
          processed_at: new Date().toISOString()
        }).eq('id', message.id);
        
      } catch (err) {
        console.error('❌ Erro analytics:', err);
        await enviarViaEdgeFunction(phone, '❌ Erro ao processar consulta.');
      }
      
      return new Response(JSON.stringify({ success: true, type: 'analytics' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 10. CLASSIFICAR INTENÇÃO (NLP INTELIGENTE COM GPT-4)
    // ============================================
    console.log('🧠 ========================================');
    console.log('🧠 INICIANDO CLASSIFICAÇÃO NLP COM GPT-4');
    console.log('🧠 Texto:', content);
    console.log('🧠 UserId:', user.id);
    console.log('🧠 ========================================');
    
    // Usar o novo classificador com GPT-4 + Function Calling
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const intencaoNLP = await classificarIntencaoNLP(
      content, 
      user.id, 
      SUPABASE_URL, 
      SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('📋 ========================================');
    console.log('📋 RESULTADO NLP:');
    console.log('📋 Intenção:', intencaoNLP.intencao);
    console.log('📋 Confiança:', intencaoNLP.confianca);
    console.log('📋 Entidades:', JSON.stringify(intencaoNLP.entidades));
    console.log('📋 Explicação:', intencaoNLP.explicacao);
    console.log('📋 Resposta:', intencaoNLP.resposta_conversacional);
    console.log('📋 ========================================');
    
    // Converter para formato esperado pelo sistema atual
    const intencao = {
      intencao: intencaoNLP.intencao,
      confianca: intencaoNLP.confianca,
      entidades: {
        valor: intencaoNLP.entidades.valor,
        categoria: intencaoNLP.entidades.categoria,
        descricao: intencaoNLP.entidades.descricao,
        conta: intencaoNLP.entidades.conta,
        data: intencaoNLP.entidades.data
      },
      comando_original: content,
      texto_original: content,
      resposta_conversacional: intencaoNLP.resposta_conversacional
    } as any; // Cast para compatibilidade com tipos existentes
    
    // Se é SELECIONAR_CONTA, processar no contexto
    if (intencaoNLP.intencao === 'SELECIONAR_CONTA' && intencaoNLP.entidades.conta) {
      console.log('🏦 Seleção de conta detectada via NLP:', intencaoNLP.entidades.conta);
      // Buscar contexto e processar
      const contextoAtual = await buscarContexto(user.id);
      if (contextoAtual && contextoAtual.context_type === 'creating_transaction') {
        const resposta = await processarNoContexto(intencaoNLP.entidades.conta, contextoAtual, user.id, phone);
        if (resposta) {
          await enviarViaEdgeFunction(phone, resposta);
        }
        return new Response(JSON.stringify({ success: true, type: 'account_selection' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Se é SAUDACAO, responder diretamente
    if (intencaoNLP.intencao === 'SAUDACAO') {
      await enviarViaEdgeFunction(phone, intencaoNLP.resposta_conversacional);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'saudacao',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'greeting' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é AJUDA, responder diretamente
    if (intencaoNLP.intencao === 'AJUDA') {
      await enviarViaEdgeFunction(phone, intencaoNLP.resposta_conversacional);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'ajuda',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'help' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é OUTRO ou não reconhecido pelo NLP, usar resposta conversacional
    if (intencaoNLP.intencao === 'OUTRO' && intencaoNLP.resposta_conversacional) {
      console.log('❓ Intenção OUTRO - usando resposta do NLP');
      await enviarViaEdgeFunction(phone, intencaoNLP.resposta_conversacional);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'outro',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'outro' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Processar transações (receita/despesa)
    console.log('🎯 Verificando se é transação:', intencao.intencao);
    if (intencao.intencao === 'REGISTRAR_RECEITA' || intencao.intencao === 'REGISTRAR_DESPESA') {
      const resultado = await processarIntencaoTransacao(intencao, user.id, phone);
      
      // Se precisa confirmação (escolher conta), salvar contexto e enviar texto
      if (resultado.precisaConfirmacao) {
        await enviarViaEdgeFunction(phone, resultado.mensagem);
        await salvarContexto(user.id, 'creating_transaction', {
          step: 'awaiting_account',
          intencao_pendente: intencao,
          phone
        }, phone);
      } 
      // Se transação foi registrada com sucesso, enviar com botões
      else if (resultado.success && resultado.transacao_id && resultado.enviarBotoes) {
        console.log('🔘 Enviando confirmação com botões...');
        const botoesResult = await enviarConfirmacaoComBotoes(
          phone, 
          resultado.mensagem, 
          resultado.transacao_id
        );
        
        // Fallback para texto simples se botões falharem
        if (!botoesResult.success) {
          console.warn('⚠️ Botões falharam, enviando texto simples');
          await enviarViaEdgeFunction(phone, resultado.mensagem + '\n\n💡 _Quer mudar algo? É só me dizer!_\n_Exemplos: "muda pra Nubank", "era 95", "exclui essa"_');
        }
      } else {
        await enviarViaEdgeFunction(phone, resultado.mensagem);
      }
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: intencao.intencao.toLowerCase(),
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'transaction', intencao: intencao.intencao }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ============================================
    // 11. COMANDO NÃO RECONHECIDO
    // ============================================
    console.log('❓ Comando não reconhecido:', command);
    await enviarViaEdgeFunction(phone, templateComandoNaoReconhecido(content));
    
    await supabase.from('whatsapp_messages').update({
      processing_status: 'completed',
      intent: 'unknown',
      processed_at: new Date().toISOString()
    }).eq('id', message.id);
    
    return new Response(JSON.stringify({ success: true, type: 'unknown' }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
