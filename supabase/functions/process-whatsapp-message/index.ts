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
import { getSupabase, normalizeMessageType, corsHeaders, enviarViaEdgeFunction, buscarUltimaInteracao, getEmojiBanco } from './utils.ts';
import { buscarContexto, isContextoAtivo, processarNoContexto, salvarContexto } from './context-manager.ts';
import { processarBotao } from './button-handler.ts';
import { isComandoRapido, processarComandoRapido } from './quick-commands.ts';
import { templateErroGenerico, templateComandoNaoReconhecido } from './response-templates.ts';
import { isPrimeiraInteracaoDia } from './humanization.ts';
import { 
  templateBoasVindas,
  templateSaudacaoPrimeiraVez,
  templateSaudacaoRetorno,
  templateAjuda,
  templateSobreSistema,
  templateAgradecimento,
  templateErro,
  templateUsuarioNaoCadastrado
} from './templates-humanizados.ts';
import { classificarIntencao, isAnalyticsQuery, isComandoEdicao, isComandoExclusao, extrairEntidadesEdicao } from './nlp-processor.ts';
import { classificarIntencaoNLP, IntencaoClassificada } from './nlp-classifier.ts';
import { processarIntencaoTransacao, processarEdicao, processarExclusao } from './transaction-mapper.ts';
// Botões desativados - 100% conversacional
// import { enviarConfirmacaoComBotoes, extrairButtonId, parsearButtonId } from './button-sender.ts';
import { isAudioPTT, extrairMessageId, processarAudioPTT, extrairInfoAudio } from './audio-handler.ts';
import { excluirUltimaTransacao, mudarContaUltimaTransacao, consultarSaldo, listarContas, extrairNomeConta } from './command-handlers.ts';
import * as imageReader from './image-reader.ts';
import { detectarIntencaoConsulta, processarConsulta } from './consultas.ts';
import { detectarIntencaoCartao, processarIntencaoCartao } from './cartao-credito.ts';

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
    // ✅ Content pode estar vazio para imagens, então verificar from_number
    const isInternalPayload = payload.message_id && payload.user_id && payload.from_number;
    
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
      
      // ✅ Se é IMAGEM, também popular messageData
      if (payload.message_type === 'image' && payload.raw_payload) {
        console.log('📷 [IMAGE] Imagem detectada no payload interno');
        messageData = payload.raw_payload.message || {};
        messageData.messageid = payload.whatsapp_message_id;
        messageData.messageType = 'media';
        messageData.mediaType = 'image';
        console.log('📷 [IMAGE] MessageId:', payload.whatsapp_message_id);
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
    
    // ============================================
    // DETECTAR IMAGEM
    // ============================================
    const rawMessageType = messageData?.messageType || messageData?.type || '';
    const rawMediaType = messageData?.mediaType || '';
    // Detectar imagem: via messageData OU via payload interno (message_type === 'image')
    const isImage = (
      (rawMessageType === 'media' || rawMessageType === 'image') && 
      (rawMediaType === 'image' || rawMediaType === 'photo' || rawMessageType === 'image')
    ) || (isInternalPayload && payload.message_type === 'image');
    
    // MessageId: tentar várias fontes
    const imageMessageId = messageData?.messageid || messageData?.messageId || 
                           payload?.message?.messageid || payload?.whatsapp_message_id;
    const imageCaption = (messageData as any)?.content?.caption || (messageData as any)?.caption || '';
    console.log('📷 É imagem?', isImage, '| MessageId:', imageMessageId, '| isInternal:', isInternalPayload);
    
    // Validação
    if (!phone && !userId) {
      console.log('⚠️ Telefone e userId não encontrados');
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    
    // Permitir conteúdo vazio se for áudio (será transcrito) ou imagem (será processada)
    if (!content && !isAudio && !isImage) {
      console.log('⚠️ Conteúdo vazio e não é áudio nem imagem');
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
    // 3.1 RASTREAR INTERAÇÃO - ANA CLARA HUMANIZADA
    // ============================================
    const ultimaInteracao = await buscarUltimaInteracao(user.id);
    const primeiraVezAbsoluta = ultimaInteracao === null; // NUNCA falou com Ana Clara
    const primeiraVezHoje = isPrimeiraInteracaoDia(ultimaInteracao);
    const nomeUsuario = user.full_name?.split(' ')[0] || 'amigo';
    
    console.log('🙋🏻‍♀️ Primeira vez ABSOLUTA?', primeiraVezAbsoluta);
    console.log('🙋🏻‍♀️ Primeira vez hoje?', primeiraVezHoje);
    console.log('🙋🏻‍♀️ Nome:', nomeUsuario);
    
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
    // 5. BOTÕES DESATIVADOS - 100% CONVERSACIONAL
    // ============================================
    // Botões interativos removidos para simplificar a experiência
    // Usuário edita/exclui via texto: "era 95", "muda pra Nubank", "exclui essa"
    
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
    // 5.2 PROCESSAR IMAGEM
    // ============================================
    if (isImage && imageMessageId) {
      console.log('📷 [IMAGE] Processando imagem...');
      
      // 1. Buscar contas do usuário ANTES de processar
      const { data: contasUsuario } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (!contasUsuario || contasUsuario.length === 0) {
        await enviarViaEdgeFunction(phone, '❌ Você não tem contas cadastradas. Cadastre uma conta no app primeiro.');
        return new Response(JSON.stringify({ success: true, type: 'no_accounts' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // 2. Detectar tipo de imagem
      const tipoImagem = await imageReader.detectarTipoImagem(imageMessageId);
      console.log('📷 [IMAGE] Tipo detectado:', tipoImagem.tipo, '| Confiança:', tipoImagem.confianca);
      
      // Helper: montar lista de contas (usa getEmojiBanco de utils.ts)
      const montarListaContas = () => {
        let lista = `\n🏦 *Em qual conta foi pago?*\n\n`;
        contasUsuario.forEach((acc: any, i: number) => {
          const emoji = getEmojiBanco(acc.name);
          lista += `${i + 1}. ${emoji} ${acc.name}\n`;
        });
        lista += `\n_Responda com número/nome ou "cancelar"_`;
        return lista;
      };
      
      // Helper: salvar contexto com contas
      const salvarContextoImagem = async (dadosImagem: any) => {
        await salvarContexto(user.id, 'confirming_action', {
          step: 'awaiting_image_account',
          phone,
          dados_imagem: dadosImagem,
          contas: contasUsuario.map((c: any) => ({ id: c.id, name: c.name }))
        }, phone);
      };
      
      // 3. Processar baseado no tipo
      if (tipoImagem.tipo === 'nota_fiscal') {
        const leitura = await imageReader.lerNotaFiscal(imageMessageId);
        
        if (leitura.sucesso && leitura.dados) {
          const dados = leitura.dados;
          
          // Montar mensagem unificada: dados + contas
          let msg = `🧾 *Nota Fiscal Lida!*\n\n`;
          msg += `💰 *Valor:* R$ ${dados.valor_total.toFixed(2).replace('.', ',')}\n`;
          if (dados.estabelecimento) msg += `🏪 *Local:* ${dados.estabelecimento}\n`;
          msg += `🏷️ *Categoria:* ${dados.categoria || 'Alimentação'}\n`;
          if (dados.data) msg += `📅 *Data:* ${dados.data}\n`;
          if (dados.itens && dados.itens.length > 0) {
            msg += `📝 *Itens:* ${dados.itens.join(', ')}\n`;
          }
          msg += montarListaContas();
          
          await salvarContextoImagem({
            tipo: 'nota_fiscal',
            valor: dados.valor_total,
            descricao: dados.estabelecimento || 'Compra',
            categoria: dados.categoria || 'Alimentação',
            data: dados.data
          });
          
          await enviarViaEdgeFunction(phone, msg);
          
          await supabase.from('whatsapp_messages').update({
            processing_status: 'completed',
            intent: 'image_nota_fiscal',
            processed_at: new Date().toISOString()
          }).eq('id', message.id);
          
          return new Response(JSON.stringify({ success: true, type: 'image_nota_fiscal' }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        } else {
          await enviarViaEdgeFunction(phone, 
            `🤔 Não consegui ler essa nota fiscal.\n\n` +
            `💡 Tente enviar uma foto mais nítida ou me diga o valor:\n` +
            `_"Gastei 50 no mercado"_`
          );
          return new Response(JSON.stringify({ success: true, type: 'image_failed' }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }
      
      if (tipoImagem.tipo === 'ifood') {
        const leitura = await imageReader.lerPedidoIFood(imageMessageId);
        
        if (leitura.sucesso && leitura.dados) {
          const dados = leitura.dados;
          
          // Montar mensagem unificada: dados + contas
          let msg = `🍔 *Pedido de Delivery Lido!*\n\n`;
          msg += `💰 *Valor:* R$ ${dados.valor_total.toFixed(2).replace('.', ',')}\n`;
          if (dados.restaurante) msg += `🍽️ *Restaurante:* ${dados.restaurante}\n`;
          if (dados.itens && dados.itens.length > 0) {
            msg += `🍕 *Itens:* ${dados.itens.join(', ')}\n`;
          }
          if (dados.taxa_entrega) msg += `🛵 *Taxa de entrega:* R$ ${dados.taxa_entrega.toFixed(2).replace('.', ',')}\n`;
          msg += `🏷️ *Categoria:* Alimentação\n`;
          msg += montarListaContas();
          
          await salvarContextoImagem({
            tipo: 'ifood',
            valor: dados.valor_total,
            descricao: dados.restaurante || 'iFood',
            categoria: 'Alimentação',
            data: dados.data
          });
          
          await enviarViaEdgeFunction(phone, msg);
          
          await supabase.from('whatsapp_messages').update({
            processing_status: 'completed',
            intent: 'image_ifood',
            processed_at: new Date().toISOString()
          }).eq('id', message.id);
          
          return new Response(JSON.stringify({ success: true, type: 'image_ifood' }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }
      
      if (tipoImagem.tipo === 'comprovante_pagamento') {
        const leitura = await imageReader.lerComprovantePagamento(imageMessageId);
        
        if (leitura.sucesso && leitura.dados) {
          const dados = leitura.dados;
          
          // Emoji baseado no tipo de serviço
          const emojiServico: Record<string, string> = {
            'combustivel': '⛽',
            'corrida': '🚗',
            'estacionamento': '🅿️',
            'pedagio': '🛣️',
            'outro': '💳'
          };
          const emoji = emojiServico[dados.tipo_servico] || '💳';
          
          // Subcategoria baseada no tipo
          const subcategoriaMap: Record<string, string> = {
            'combustivel': 'Combustível',
            'corrida': 'Uber/99',
            'estacionamento': 'Estacionamento',
            'pedagio': 'Pedágio',
            'outro': ''
          };
          const subcategoria = subcategoriaMap[dados.tipo_servico] || '';
          
          // Montar mensagem unificada
          let msg = `${emoji} *Comprovante de Pagamento Lido!*\n\n`;
          msg += `💰 *Valor:* R$ ${dados.valor_total.toFixed(2).replace('.', ',')}\n`;
          if (dados.estabelecimento) msg += `🏪 *Local:* ${dados.estabelecimento}\n`;
          if (dados.produto && dados.quantidade) {
            msg += `${emoji} *${dados.produto}:* ${dados.quantidade}\n`;
          }
          if (dados.preco_unitario) {
            msg += `📊 *Preço unitário:* R$ ${dados.preco_unitario.toFixed(2).replace('.', ',')}\n`;
          }
          if (dados.forma_pagamento) msg += `💳 *Pagamento:* ${dados.forma_pagamento}\n`;
          msg += `🏷️ *Categoria:* ${dados.categoria}${subcategoria ? ' > ' + subcategoria : ''}\n`;
          msg += montarListaContas();
          
          await salvarContextoImagem({
            tipo: 'comprovante_pagamento',
            valor: dados.valor_total,
            descricao: dados.estabelecimento || dados.produto || 'Pagamento',
            categoria: dados.categoria || 'Transporte',
            data: dados.data
          });
          
          await enviarViaEdgeFunction(phone, msg);
          
          await supabase.from('whatsapp_messages').update({
            processing_status: 'completed',
            intent: 'image_comprovante_pagamento',
            processed_at: new Date().toISOString()
          }).eq('id', message.id);
          
          return new Response(JSON.stringify({ success: true, type: 'image_comprovante_pagamento' }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }
      
      if (tipoImagem.tipo === 'comprovante_pix') {
        const leitura = await imageReader.lerComprovantePix(imageMessageId);
        
        if (leitura.sucesso && leitura.dados) {
          const dados = leitura.dados;
          const tipoTransacao = dados.tipo === 'enviado' ? 'expense' : 'income';
          const emoji = dados.tipo === 'enviado' ? '📤' : '📥';
          const categoriaTexto = dados.tipo === 'enviado' ? 'Transferência' : 'Receita';
          
          // Montar mensagem unificada: dados + contas
          let msg = `💸 *Transferência PIX Lida!*\n\n`;
          msg += `💰 *Valor:* R$ ${dados.valor.toFixed(2).replace('.', ',')}\n`;
          msg += `${emoji} *Tipo:* ${dados.tipo === 'enviado' ? 'Enviado' : 'Recebido'}\n`;
          if (dados.destinatario) msg += `👤 *Para:* ${dados.destinatario}\n`;
          if (dados.remetente) msg += `👤 *De:* ${dados.remetente}\n`;
          if (dados.banco) msg += `🏦 *Banco origem:* ${dados.banco}\n`;
          msg += `🏷️ *Categoria:* ${categoriaTexto}\n`;
          msg += montarListaContas();
          
          await salvarContextoImagem({
            tipo: 'pix',
            valor: dados.valor,
            descricao: dados.tipo === 'enviado' 
              ? `PIX para ${dados.destinatario || 'transferência'}` 
              : `PIX de ${dados.remetente || 'transferência'}`,
            categoria: categoriaTexto,
            tipo_transacao: tipoTransacao,
            data: dados.data
          });
          
          await enviarViaEdgeFunction(phone, msg);
          
          await supabase.from('whatsapp_messages').update({
            processing_status: 'completed',
            intent: 'image_pix',
            processed_at: new Date().toISOString()
          }).eq('id', message.id);
          
          return new Response(JSON.stringify({ success: true, type: 'image_pix' }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      }
      
      // Imagem não reconhecida
      if (imageCaption) {
        // Tem legenda, processar como texto
        console.log('📷 [IMAGE] Processando legenda:', imageCaption);
        content = imageCaption;
        // Continua fluxo normal
      } else {
        await enviarViaEdgeFunction(phone, 
          `📷 Recebi sua imagem!\n\n` +
          `💡 Para registrar, me diga o que é:\n` +
          `• _"Gastei 50 no mercado"_\n` +
          `• _"Recebi 100 de PIX"_\n\n` +
          `Ou envie uma foto de nota fiscal, cupom ou comprovante que eu leio automaticamente! 🧾`
        );
        
        await supabase.from('whatsapp_messages').update({
          processing_status: 'completed',
          intent: 'image_unknown',
          processed_at: new Date().toISOString()
        }).eq('id', message.id);
        
        return new Response(JSON.stringify({ success: true, type: 'image_unknown' }), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
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
    // 6.4 CARTÃO DE CRÉDITO - MOVIDO PARA NLP (linha ~1020)
    // Agora o GPT-4 interpreta as mensagens de cartão
    // ============================================
    
    // ============================================
    // 6.5 CONSULTAS FINANCEIRAS - DESATIVADO (MOVIDO PARA NLP)
    // ============================================
    // ⚠️ REMOVIDO: O handler de regex estava interceptando ANTES do NLP
    // Agora TODAS as consultas passam pelo GPT-4 (linha ~864)
    // que normaliza apelidos: "roxinho" → "nubank"
    // 
    // Código antigo removido em 08/12/2025:
    // const intencaoConsulta = detectarIntencaoConsulta(content);
    // if (intencaoConsulta) { ... processarConsulta() ... }
    
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
    
    // Comando: Saldo (mais flexível para variações)
    if (/^(saldo|quanto\s+tenho|minhas?\s+contas?|meu\s+saldo|qual\s+(é\s+)?(o\s+)?meu\s+saldo|ver\s+saldo|mostrar?\s+saldo)\??$/i.test(textoLower)) {
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
    // 10. CONSULTA ANALÍTICA - DESATIVADO (MOVIDO PARA NLP)
    // ============================================
    // ⚠️ REMOVIDO em 08/12/2025: O handler de analytics estava interceptando
    // consultas de saldo ANTES do NLP ser chamado.
    // "Qual o saldo no roxinho?" → isAnalyticsQuery() → analytics-query → ERRO
    // 
    // Agora TODAS as consultas passam pelo GPT-4 que:
    // 1. Normaliza apelidos: "roxinho" → "nubank"
    // 2. Classifica corretamente: CONSULTAR_SALDO
    // 3. Extrai entidades: { conta: "nubank" }
    //
    // Código antigo removido:
    // if (isAnalyticsQuery(command)) { ... fetch analytics-query ... }
    
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
    
    // ============================================
    // ARQUITETURA HÍBRIDA: TEMPLATE vs CONVERSACIONAL
    // ============================================
    
    // GRUPO 1: Intenções que DEVEM usar TEMPLATE (dados estruturados)
    const INTENCOES_COM_TEMPLATE = [
      'AJUDA',
      'CONSULTAR_SALDO',
      'CONSULTAR_EXTRATO',
      'LISTAR_CONTAS',
      'LISTAR_CATEGORIAS',
      'RELATORIO_DIARIO',
      'RELATORIO_SEMANAL',
      'RELATORIO_MENSAL',
      'CONSULTAR_METAS',
      'EXCLUIR_TRANSACAO',
      'EDITAR_VALOR',
      'EDITAR_CONTA',
      'EDITAR_CATEGORIA'
    ];
    
    // GRUPO 2: Intenções que usam RESPOSTA CONVERSACIONAL do GPT
    const INTENCOES_CONVERSACIONAIS = [
      'SAUDACAO',
      'AGRADECIMENTO',
      'OUTRO'
    ];
    
    // GRUPO 3: Transações usam TEMPLATE para confirmação
    const INTENCOES_TRANSACAO = [
      'REGISTRAR_DESPESA',
      'REGISTRAR_RECEITA',
      'REGISTRAR_TRANSFERENCIA'
    ];
    
    // GRUPO 4: Intenções de CARTÃO DE CRÉDITO
    const INTENCOES_CARTAO = [
      'COMPRA_CARTAO',
      'COMPRA_PARCELADA',
      'CONSULTAR_FATURA',
      'CONSULTAR_LIMITE',
      'LISTAR_CARTOES',
      'PAGAR_FATURA'
    ];
    
    // ============================================
    // VALIDAÇÃO DE CONFIANÇA BAIXA
    // ============================================
    if (intencaoNLP.confianca < 0.6 && !INTENCOES_CONVERSACIONAIS.includes(intencaoNLP.intencao)) {
      console.log('⚠️ Confiança baixa:', intencaoNLP.confianca, '- Pedindo clarificação');
      
      const respostaClarificacao = `🤔 Não tenho certeza se entendi bem...

Você quis:
• Registrar um gasto ou receita?
• Ver seu saldo?
• Outra coisa?

Me explica melhor que eu te ajudo! 😊

_Ana Clara • Personal Finance_ 🙋🏻‍♀️`;
      
      await enviarViaEdgeFunction(phone, respostaClarificacao);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'low_confidence_clarification',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'clarification' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    console.log('🎯 Tipo de processamento:', 
      INTENCOES_COM_TEMPLATE.includes(intencaoNLP.intencao) ? 'TEMPLATE' :
      INTENCOES_CONVERSACIONAIS.includes(intencaoNLP.intencao) ? 'CONVERSACIONAL' :
      INTENCOES_TRANSACAO.includes(intencaoNLP.intencao) ? 'TRANSAÇÃO' : 'OUTRO'
    );
    
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
    
    // ============================================
    // PROCESSAMENTO DE CARTÃO DE CRÉDITO VIA NLP
    // ============================================
    if (INTENCOES_CARTAO.includes(intencaoNLP.intencao)) {
      console.log('💳 Intenção de cartão detectada via NLP:', intencaoNLP.intencao);
      console.log('💳 Entidades:', JSON.stringify(intencaoNLP.entidades));
      
      // Converter intenção NLP para formato do processador de cartão
      const tipoCartao = intencaoNLP.intencao === 'COMPRA_CARTAO' ? 'compra_cartao' :
                         intencaoNLP.intencao === 'COMPRA_PARCELADA' ? 'compra_parcelada' :
                         intencaoNLP.intencao === 'CONSULTAR_FATURA' ? 'consulta_fatura' :
                         intencaoNLP.intencao === 'CONSULTAR_LIMITE' ? 'consulta_limite' :
                         intencaoNLP.intencao === 'LISTAR_CARTOES' ? 'listar_cartoes' :
                         intencaoNLP.intencao === 'PAGAR_FATURA' ? 'pagar_fatura' : 'compra_cartao';
      
      const entidadesAny = intencaoNLP.entidades as any;
      const intencaoCartao = {
        tipo: tipoCartao as any,
        valor: entidadesAny.valor,
        cartao: entidadesAny.cartao,
        parcelas: entidadesAny.parcelas || 1,
        descricao: entidadesAny.descricao
      };
      
      console.log('💳 Intenção convertida:', JSON.stringify(intencaoCartao));
      
      const resultado = await processarIntencaoCartao(intencaoCartao, user.id, phone);
      
      if (resultado.precisaConfirmacao && resultado.dados) {
        // Salvar contexto para escolha do cartão
        await salvarContexto(user.id, 'confirming_action', {
          step: 'awaiting_card_selection',
          phone,
          dados_cartao: resultado.dados
        }, phone);
      }
      
      await enviarViaEdgeFunction(phone, resultado.mensagem);
      
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: `cartao_${tipoCartao}`,
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      
      return new Response(JSON.stringify({ success: true, type: 'cartao_nlp', intencao: tipoCartao }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é SAUDACAO, responder com template humanizado
    if (intencaoNLP.intencao === 'SAUDACAO') {
      let resposta: string;
      
      if (primeiraVezAbsoluta) {
        // ONBOARDING - Primeira vez que fala com Ana Clara
        resposta = templateBoasVindas(nomeUsuario);
        console.log('🎉 ONBOARDING - Primeira vez absoluta!');
      } else if (primeiraVezHoje) {
        // Primeira vez do dia
        resposta = templateSaudacaoPrimeiraVez(nomeUsuario);
      } else {
        // Retorno no mesmo dia
        resposta = templateSaudacaoRetorno(nomeUsuario);
      }
      
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'saudacao',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'greeting' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é AJUDA, responder com template humanizado
    if (intencaoNLP.intencao === 'AJUDA') {
      const resposta = templateAjuda(nomeUsuario, primeiraVezHoje);
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'ajuda',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'help' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é CONSULTAR_SALDO, usar função de saldo
    if (intencaoNLP.intencao === 'CONSULTAR_SALDO') {
      console.log('💰 Intenção CONSULTAR_SALDO detectada via NLP');
      console.log('📋 Entidades:', JSON.stringify(intencaoNLP.entidades));
      
      // Verificar se há filtro de conta nas entidades do NLP
      let contaFiltro = intencaoNLP.entidades?.conta;
      
      // 🔧 FALLBACK: Se NLP não extraiu conta, tentar detectar no texto
      if (!contaFiltro) {
        const textoLower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bancosConhecidos = [
          { nome: 'nubank', aliases: ['nubank', 'roxinho', 'roxo', 'nu'] },
          { nome: 'itau', aliases: ['itau', 'itaú', 'laranjinha'] },
          { nome: 'bradesco', aliases: ['bradesco', 'brades'] },
          { nome: 'santander', aliases: ['santander', 'san'] },
          { nome: 'inter', aliases: ['inter', 'banco inter'] },
          { nome: 'c6', aliases: ['c6', 'c6 bank'] },
          { nome: 'caixa', aliases: ['caixa', 'cef'] },
          { nome: 'bb', aliases: ['bb', 'banco do brasil', 'brasil'] },
          { nome: 'original', aliases: ['original'] },
          { nome: 'next', aliases: ['next'] },
          { nome: 'picpay', aliases: ['picpay'] },
          { nome: 'mercadopago', aliases: ['mercadopago', 'mercado pago'] },
        ];
        
        for (const banco of bancosConhecidos) {
          for (const alias of banco.aliases) {
            if (textoLower.includes(alias)) {
              contaFiltro = banco.nome;
              console.log('🔄 [FALLBACK] Banco detectado no texto:', banco.nome);
              break;
            }
          }
          if (contaFiltro) break;
        }
      }
      
      let resposta: string;
      if (contaFiltro) {
        // Saldo de conta específica
        console.log('🏦 Filtro de conta detectado:', contaFiltro);
        const { consultarSaldoEspecifico } = await import('./consultas.ts');
        resposta = await consultarSaldoEspecifico(user.id, contaFiltro);
      } else {
        // Saldo de todas as contas
        resposta = await consultarSaldo(user.id);
      }
      
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'consultar_saldo',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'balance' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ✅ CONSULTA DE RECEITAS - "quanto recebi", "minhas receitas", etc.
    if (intencaoNLP.intencao === 'CONSULTAR_RECEITAS') {
      console.log('💰 Intenção de RECEITAS detectada');
      
      const { 
        extrairPeriodoDoTexto, 
        extrairModoDoTexto, 
        extrairMetodoDoTexto,
        consultarFinancasUnificada 
      } = await import('./consultas.ts');
      
      // 1. Extrair período do texto
      const periodoConfig = extrairPeriodoDoTexto(content);
      console.log('📅 Período para receitas:', JSON.stringify(periodoConfig));
      
      // 2. Extrair modo e agrupamento
      const { modo, agrupar_por } = extrairModoDoTexto(content);
      
      // 3. Extrair método de pagamento
      const entidadesNLP = intencaoNLP.entidades as any;
      const metodoNLP = entidadesNLP?.metodo;
      const metodoTexto = extrairMetodoDoTexto(content);
      const metodo = metodoNLP || metodoTexto;
      
      // 4. Extrair conta
      let contaFiltro: string | undefined = entidadesNLP?.conta?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '');
      
      // 5. Fallback - detectar banco no texto
      if (!contaFiltro) {
        const textoLower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bancosConhecidos = ['nubank', 'itau', 'bradesco', 'inter', 'c6', 'santander', 'caixa', 'bb', 'roxinho', 'roxo'];
        
        for (const banco of bancosConhecidos) {
          if (textoLower.includes(banco)) {
            contaFiltro = banco;
            console.log('🔄 [RECEITAS-FALLBACK] Banco detectado no texto:', banco);
            break;
          }
        }
      }
      
      console.log('💰 [RECEITAS] Filtros finais:', { contaFiltro, metodo, periodo: periodoConfig });
      
      // 🔥 USAR CONSULTA UNIFICADA COM TIPO INCOME
      const resposta = await consultarFinancasUnificada(user.id, {
        periodo: periodoConfig,
        conta: contaFiltro,
        metodo: metodo as any,
        tipo: 'income',  // ← RECEITAS
        modo: entidadesNLP?.modo || modo,
        agrupar_por: entidadesNLP?.agrupar_por || agrupar_por
      });
      
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'consultar_receitas',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'income' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // ✅ CONSULTA DE GASTOS - Trata TODAS as intenções equivalentes
    // CONSULTAR_EXTRATO, RELATORIO_DIARIO, RELATORIO_SEMANAL, RELATORIO_MENSAL, etc.
    const INTENCOES_GASTOS = [
      'CONSULTAR_EXTRATO',
      'CONSULTAR_GASTOS', 
      'RELATORIO_DIARIO',
      'RELATORIO_SEMANAL', 
      'RELATORIO_MENSAL',
      'VER_GASTOS',
      'MEUS_GASTOS'
    ];
    
    if (INTENCOES_GASTOS.includes(intencaoNLP.intencao)) {
      console.log('📊 Intenção de GASTOS detectada:', intencaoNLP.intencao);
      
      // ============================================
      // 🔥 SISTEMA DE CONSULTAS UNIFICADO
      // Suporta: método, período, conta, agrupamento
      // ============================================
      
      const { 
        extrairPeriodoDoTexto, 
        extrairModoDoTexto, 
        extrairMetodoDoTexto,
        consultarFinancasUnificada 
      } = await import('./consultas.ts');
      
      // 1. Extrair período estruturado do texto
      const periodoConfig = extrairPeriodoDoTexto(content);
      console.log('📅 Período extraído:', JSON.stringify(periodoConfig));
      
      // 2. Extrair modo de visualização e agrupamento
      const { modo, agrupar_por } = extrairModoDoTexto(content);
      console.log('📊 Modo:', modo || 'resumo', '| Agrupar por:', agrupar_por || 'categoria');
      
      // 3. Extrair método de pagamento
      const entidadesNLP = intencaoNLP.entidades as any;
      const metodoNLP = entidadesNLP?.metodo;
      const metodoTexto = extrairMetodoDoTexto(content);
      const metodo = metodoNLP || metodoTexto;
      console.log('💳 Método:', metodo || 'todos');
      
      // 4. Extrair conta/cartão
      let contaFiltro: string | undefined = entidadesNLP?.conta?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '');
      let cartaoFiltro: string | undefined = entidadesNLP?.cartao?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '');
      
      // 5. Fallback - detectar banco no texto
      if (!contaFiltro && !cartaoFiltro) {
        const textoLower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bancosConhecidos = ['nubank', 'itau', 'bradesco', 'inter', 'c6', 'santander', 'caixa', 'bb', 'roxinho', 'roxo'];
        
        for (const banco of bancosConhecidos) {
          if (textoLower.includes(banco)) {
            contaFiltro = banco;
            console.log('🔄 [FALLBACK] Banco detectado no texto:', banco);
            break;
          }
        }
      }
      
      // Log final dos filtros
      console.log('🔍 FILTROS FINAIS:', JSON.stringify({
        conta: contaFiltro,
        cartao: cartaoFiltro,
        metodo,
        periodo: periodoConfig,
        modo,
        agrupar_por
      }));
      
      // 🔥 USAR CONSULTA UNIFICADA
      console.log('✅ Usando consultarFinancasUnificada');
      const resposta = await consultarFinancasUnificada(user.id, {
        periodo: periodoConfig,
        conta: contaFiltro,
        cartao: cartaoFiltro,
        metodo: metodo as any,
        tipo: 'expense',
        modo: entidadesNLP?.modo || modo,
        agrupar_por: entidadesNLP?.agrupar_por || agrupar_por
      });
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'consultar_gastos',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'expenses' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é LISTAR_CONTAS, usar função de listar contas
    if (intencaoNLP.intencao === 'LISTAR_CONTAS') {
      console.log('🏦 Intenção LISTAR_CONTAS detectada via NLP');
      const resposta = await listarContas(user.id);
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'listar_contas',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'list_accounts' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é EXCLUIR_TRANSACAO, usar função de excluir
    if (intencaoNLP.intencao === 'EXCLUIR_TRANSACAO') {
      console.log('🗑️ Intenção EXCLUIR_TRANSACAO detectada via NLP');
      const resposta = await excluirUltimaTransacao(user.id);
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'excluir_transacao',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'delete' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é EDITAR_VALOR, usar função de editar
    if (intencaoNLP.intencao === 'EDITAR_VALOR' && intencaoNLP.entidades.novo_valor) {
      console.log('✏️ Intenção EDITAR_VALOR detectada via NLP:', intencaoNLP.entidades.novo_valor);
      const resultado = await processarEdicao(user.id, { valor: intencaoNLP.entidades.novo_valor });
      const resposta = intencaoNLP.resposta_conversacional || resultado.mensagem;
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'editar_valor',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'edit_value' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é EDITAR_TRANSACAO com valor (compatibilidade)
    if (intencaoNLP.intencao === 'EDITAR_TRANSACAO' && intencaoNLP.entidades.valor) {
      console.log('✏️ Intenção EDITAR_TRANSACAO detectada via NLP');
      const resultado = await processarEdicao(user.id, { valor: intencaoNLP.entidades.valor });
      await enviarViaEdgeFunction(phone, resultado.mensagem);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'editar_transacao',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'edit' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é EDITAR_CONTA, usar função de mudar conta
    if (intencaoNLP.intencao === 'EDITAR_CONTA' && intencaoNLP.entidades.nova_conta) {
      console.log('🏦 Intenção EDITAR_CONTA detectada via NLP:', intencaoNLP.entidades.nova_conta);
      const resposta = await mudarContaUltimaTransacao(user.id, intencaoNLP.entidades.nova_conta);
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'editar_conta',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'edit_account' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é MUDAR_CONTA, usar função de mudar conta
    if (intencaoNLP.intencao === 'MUDAR_CONTA' && intencaoNLP.entidades.conta) {
      console.log('🏦 Intenção MUDAR_CONTA detectada via NLP');
      const resposta = await mudarContaUltimaTransacao(user.id, intencaoNLP.entidades.conta);
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'mudar_conta',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'change_account' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é AGRADECIMENTO, responder com template humanizado
    if (intencaoNLP.intencao === 'AGRADECIMENTO') {
      const resposta = templateAgradecimento(nomeUsuario);
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: 'agradecimento',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: 'thanks' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Se é OUTRO ou não reconhecido pelo NLP
    if (intencaoNLP.intencao === 'OUTRO') {
      console.log('❓ Intenção OUTRO detectada');
      
      // Detectar se é pergunta sobre o sistema (usar TEMPLATE bonito)
      const contentLower = content.toLowerCase();
      const isPerguntaSobreSistema = 
        contentLower.includes('o que você faz') ||
        contentLower.includes('o que vc faz') ||
        contentLower.includes('quem é você') ||
        contentLower.includes('quem é vc') ||
        contentLower.includes('como funciona') ||
        contentLower.includes('como você funciona') ||
        contentLower.includes('o que você pode fazer') ||
        contentLower.includes('me apresenta') ||
        contentLower.includes('se apresenta');
      
      let resposta: string;
      
      if (isPerguntaSobreSistema) {
        // Usar TEMPLATE bonito para perguntas sobre o sistema
        console.log('📋 Pergunta sobre o sistema - usando template');
        resposta = templateSobreSistema(nomeUsuario);
      } else {
        // Usar resposta conversacional do NLP ou fallback
        resposta = intencaoNLP.resposta_conversacional || 
          `Oi, ${nomeUsuario}! 😊\n\nNão entendi bem o que você quis dizer.\n\nPosso te ajudar com:\n• Registrar gastos e receitas\n• Consultar saldo\n• Ver extrato\n• Relatórios\n\nÉ só me contar! 🙋🏻‍♀️`;
      }
      
      await enviarViaEdgeFunction(phone, resposta);
      await supabase.from('whatsapp_messages').update({
        processing_status: 'completed',
        intent: isPerguntaSobreSistema ? 'sobre_sistema' : 'outro',
        processed_at: new Date().toISOString()
      }).eq('id', message.id);
      return new Response(JSON.stringify({ success: true, type: isPerguntaSobreSistema ? 'about' : 'outro' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Processar transações (receita/despesa)
    console.log('🎯 Verificando se é transação:', intencao.intencao);
    if (intencao.intencao === 'REGISTRAR_RECEITA' || intencao.intencao === 'REGISTRAR_DESPESA') {
      const resultado = await processarIntencaoTransacao(intencao, user.id, phone);
      
      // Se precisa confirmação (escolher conta ou método de pagamento), salvar contexto
      if (resultado.precisaConfirmacao) {
        await enviarViaEdgeFunction(phone, resultado.mensagem);
        
        // Verificar qual tipo de confirmação é necessária
        const step = (resultado.dados?.step as string) || 'awaiting_account';
        
        await salvarContexto(user.id, 'creating_transaction', {
          step,
          intencao_pendente: intencao,
          dados_transacao: resultado.dados,
          phone
        }, phone);
        
        console.log('💾 Contexto salvo:', { step, dados: resultado.dados });
      } else {
        // Enviar confirmação como texto simples (100% conversacional)
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
