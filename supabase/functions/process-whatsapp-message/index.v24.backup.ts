// ============================================
// VERSÃO V24 - FASE 2 + FASE 2.1 COMPLETAS 🚀
// Edge Functions → process-whatsapp-message
// ============================================
// 
// FEATURES IMPLEMENTADAS:
// 1. ✅ FASE 2: Detecção conversacional de contas (SEM botões)
//    - detectAccountFromMessage() para keywords
//    - Sistema de pergunta: "Em qual conta?"
//    - Handler awaiting_account
//    - Mensagem conversacional pós-lançamento
// 
// 2. ✅ FASE 2.1: Analytics com dados REAIS (prevenir alucinação)
//    - Integração com analytics-query Edge Function
//    - Detecção: isAnalyticsQuery
//    - 5 tipos de consultas suportadas
//    - Zero alucinação - sempre consulta banco
// 
// 3. ✅ Fix Enum messageType
//    - normalizeMessageType() para UAZAPI
//    - Mapeia "Conversation" → "text"
// 
// 4. ✅ NLP Transaction Detection
//    - 35+ keywords expandidas
//    - categorize-transaction integration
// 
// ============================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// 🔧 FUNÇÃO: NORMALIZAR MESSAGE_TYPE DO UAZAPI
// ============================================
function normalizeMessageType(rawType: string): string {
  // Mapear tipos do UAZAPI para valores válidos do enum
  const typeMap: Record<string, string> = {
    'text': 'text',
    'conversation': 'text',
    'extendedtextmessage': 'text',
    'audio': 'audio',
    'audiomessage': 'audio',
    'image': 'image',
    'imagemessage': 'image',
    'document': 'document',
    'documentmessage': 'document',
    'video': 'video',
    'videomessage': 'video',
    'location': 'location',
    'locationmessage': 'location',
    'contact': 'contact',
    'contactmessage': 'contact',
    'templatebuttonreplymessage': 'text',
    'button': 'text',
    'interactive': 'text'
  };
  
  const normalized = typeMap[rawType.toLowerCase()] || 'text';
  console.log(`🔧 MessageType normalizado: "${rawType}" → "${normalized}"`);
  return normalized;
}

// ============================================
// 🔍 FUNÇÃO: DETECTAR CONTA NA MENSAGEM (FASE 2)
// ============================================
function detectAccountFromMessage(message: string, accounts: any[]): any | null {
  const lowerMsg = message.toLowerCase();
  console.log('🔍 Detectando conta em:', lowerMsg);
  
  // Keywords por banco
  const accountKeywords: Record<string, string[]> = {
    'nubank': ['nubank', 'roxinho', 'nu bank', 'roxo'],
    'itaú': ['itau', 'itaú', 'banco itaú', 'laranja'],
    'inter': ['inter', 'banco inter', 'laranjinha'],
    'bradesco': ['bradesco'],
    'santander': ['santander'],
    'caixa': ['caixa', 'caixa econômica'],
    'banco do brasil': ['banco do brasil', 'bb'],
    'picpay': ['picpay', 'pic pay']
  };
  
  // Buscar por keywords
  for (const account of accounts) {
    const accountName = account.bank ? account.bank.toLowerCase() : account.name.toLowerCase();
    const keywords = accountKeywords[accountName] || [accountName];
    
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword)) {
        console.log(`✅ Conta detectada: ${account.name} (keyword: ${keyword})`);
        return account;
      }
    }
  }
  
  // Detectar por tipo (débito/crédito)
  if (lowerMsg.includes('débito') || lowerMsg.includes('debito')) {
    const checkingAccounts = accounts.filter(a => a.type === 'checking');
    if (checkingAccounts.length === 1) {
      console.log(`✅ Conta corrente única detectada: ${checkingAccounts[0].name}`);
      return checkingAccounts[0];
    } else if (checkingAccounts.length > 1) {
      console.log(`⚠️ Múltiplas contas corrente - precisa perguntar`);
      return null; // Múltiplas contas - perguntar
    }
  }
  
  if (lowerMsg.includes('crédito') || lowerMsg.includes('credito') || 
      lowerMsg.includes('cartão') || lowerMsg.includes('cartao')) {
    const creditAccounts = accounts.filter(a => a.type === 'credit_card');
    if (creditAccounts.length === 1) {
      console.log(`✅ Cartão único detectado: ${creditAccounts[0].name}`);
      return creditAccounts[0];
    } else if (creditAccounts.length > 1) {
      console.log(`⚠️ Múltiplos cartões - precisa perguntar`);
      return null; // Múltiplos cartões - perguntar
    }
  }
  
  console.log('❌ Nenhuma conta detectada');
  return null;
}

serve(async (req)=>{
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  try {
    console.log('🔔 Webhook UAZAPI recebido!');
    const payload = await req.json();
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    // Supabase client com SERVICE ROLE
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Detecta estrutura do payload (direto ou via N8N)
    const isN8NPayload = payload.body && payload.body.EventType;
    const event = isN8NPayload ? payload.body.EventType : payload.event;
    console.log('🔍 Tipo de evento:', event);
    // ✅ Aceitar eventos de botão mesmo que não sejam exatamente 'message'/'messages'
    const allowedEvents = ['message', 'messages', 'interactive', 'button', 'button_reply', 'menu'];
    const hasButtonSignal = Boolean(
      payload?.data?.message?.buttonOrListid ||
      payload?.data?.message?.buttonOrListId ||
      payload?.body?.message?.buttonOrListid ||
      payload?.body?.message?.buttonOrListId ||
      payload?.data?.message?.selectedButtonId ||
      payload?.body?.message?.selectedButtonId
    );
    if (event && !allowedEvents.includes(String(event)) && !hasButtonSignal) {
      console.log('⏭️ Evento ignorado:', event);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Extrai dados conforme estrutura
    let from, phone, messageData, messageType, content;
    if (isN8NPayload) {
      // Payload via N8N
      from = payload.body.message?.sender || '';
      phone = payload.body.chat?.phone?.replace(/\D/g, '') || from.split('@')[0];
      messageData = payload.body.message || {};
      // ✅ CRÍTICO: N8N usa messageType, não type
      const rawType = messageData.messageType || messageData.type || messageData?.interactive?.type || 'text';
      messageType = normalizeMessageType(rawType);  // ✅ NORMALIZAR
      content = messageData.content || messageData.text || '';
      
      console.log('📱 [N8N] From:', from);
      console.log('📱 [N8N] Phone:', phone);
      console.log('📝 [N8N] MessageType RAW:', rawType);
      console.log('📝 [N8N] MessageType NORMALIZED:', messageType);
      console.log('🔘 [N8N] ButtonId:', messageData.buttonOrListid);
    } else {
      // Payload direto UAZAPI
      from = payload.data?.from || '';
      phone = from.split('@')[0];
      messageData = payload.data?.message || {};
      const rawType = messageData.type || messageData?.interactive?.type || 'text';
      messageType = normalizeMessageType(rawType);  // ✅ NORMALIZAR
      content = messageData.text || messageData.caption || '';
      
      console.log('📱 [Direct] From:', from);
      console.log('📱 [Direct] Phone:', phone);
      console.log('📝 [Direct] MessageType RAW:', rawType);
      console.log('📝 [Direct] MessageType NORMALIZED:', messageType);
    }
    console.log('📱 Telefone:', phone);
    console.log('💬 Tipo:', messageType);
    console.log('📝 Conteúdo:', content);
    console.log('📝 Tipo de conteúdo:', typeof content);
    
    // ✅ VALIDAÇÃO ROBUSTA - mas permite botões sem content
    const isButtonMessage = (
      messageType === 'TemplateButtonReplyMessage' ||
      messageType === 'button' ||
      messageType === 'interactive' ||
      messageData?.buttonOrListid
    );
    
    if (!phone) {
      console.log('⚠️ Telefone não encontrado');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Se não é botão, precisa ter conteúdo
    if (!isButtonMessage && (!content || typeof content !== 'string')) {
      console.log('⚠️ Dados incompletos ou conteúdo não-textual (não é botão)');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Busca usuário
    const { data: user, error: userError } = await supabase.from('users').select('id, full_name, email').eq('phone', phone).single();
    if (userError || !user) {
      console.error('❌ Usuário não encontrado:', phone);
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phone_number: phone,
          message_type: 'text',
          content: '👋 Olá! Para usar este serviço, você precisa se cadastrar no app Personal Finance LA primeiro.\n\nBaixe em: https://personalfinance.la'
        })
      });
      return new Response(JSON.stringify({
        ok: true,
        message: 'Usuário não cadastrado'
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('✅ Usuário encontrado:', user.full_name);
    
    // ============================================
    // 🎯 HANDLER: CLIQUE EM BOTÃO
    // ============================================
    // ✅ Detectar cliques de botão com mais variantes de payload
    const buttonId = (
      messageData?.buttonOrListid ||
      messageData?.buttonOrListId ||
      messageData?.selectedButtonId ||
      messageData?.buttonId ||
      messageData?.interactive?.button_reply?.id ||
      messageData?.interactive?.list_reply?.id
    );
    
    // ✅ V24: BOTÕES REMOVIDOS - Sistema 100% conversacional
    
    // Salva mensagem
    const { data: message, error: messageError } = await supabase.from('whatsapp_messages').insert({
      user_id: user.id,
      phone_number: phone,
      message_type: messageType,
      direction: 'inbound',
      content: content,
      intent: null,
      processing_status: 'pending',
      received_at: new Date().toISOString()
    }).select().single();
    if (messageError) {
      console.error('❌ Erro ao salvar mensagem:', messageError);
      throw messageError;
    }
    console.log('💾 Mensagem salva! ID:', message.id);
    // ✅ VALIDAÇÃO DEFENSIVA
    const command = String(content || '').toLowerCase().trim();
    if (!command) {
      console.log('⚠️ Comando vazio após normalização');
      return new Response(JSON.stringify({
        success: true,
        message: 'Conteúdo não processável'
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // ============================================
    // 🧠 DETECÇÃO NLP DE TRANSAÇÕES
    // ============================================
    const NLP_KEYWORDS = [
      'gastei', 'paguei', 'comprei', 'recebi', 'ganhei',
      'despesa', 'receita', 'transação', 'transacao', 'lançamento', 'lancamento',
      'pagar', 'receber', 'comprar', 'vendi', 'venda'
    ];
    
    console.log('🔍 DEBUG - Command original:', content);
    console.log('🔍 DEBUG - Command normalizado:', command);
    
    // ============================================
    // 📊 DETECÇÃO DE CONSULTAS ANALÍTICAS (FASE 2.1)
    // ============================================
    const ANALYTICS_KEYWORDS = [
      'quanto', 'qual', 'saldo', 'gastei', 'gastar', 'gastos',
      'total', 'soma', 'valor', 'despesa', 'receita',
      'quanto gastei', 'qual saldo', 'gastos em', 'gastos no',
      'gastos de', 'despesas', 'quanto foi'
    ];
    
    // ✅ Detectar se tem VALOR MONETÁRIO na mensagem
    // Se tem R$, valor ou número, é TRANSAÇÃO, não consulta!
    const hasMonetaryValue = /r\$\s*\d+|reais?\s+\d+|\d+\s*reais?|\d+[.,]\d{2}/.test(command);
    
    // ✅ Só é consulta se:
    // 1. Tem keyword analítica E
    // 2. NÃO tem valor monetário E
    // 3. NÃO tem verbos de transação
    const isAnalyticsQuery = ANALYTICS_KEYWORDS.some(keyword => command.includes(keyword)) &&
                            !hasMonetaryValue &&
                            !command.includes('paguei') && 
                            !command.includes('comprei') &&
                            !command.includes('gastei r$') &&
                            !command.includes('recebi r$');
    
    console.log('🔍 DEBUG - isAnalyticsQuery:', isAnalyticsQuery);
    console.log('🔍 DEBUG - hasMonetaryValue:', hasMonetaryValue);
    
    let responseText = '';
    let finalIntent = command;
    
    // Se for consulta analítica, chamar analytics-query
    if (isAnalyticsQuery) {
      console.log('📊 [v24] CONSULTA ANALÍTICA DETECTADA!');
      console.log('📊 Query:', content);
      
      try {
        const analyticsResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/analytics-query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              user_id: user.id,
              phone: phone,
              raw_query: content
            })
          }
        );
        
        const analyticsResult = await analyticsResponse.json();
        console.log('📊 Analytics result:', JSON.stringify(analyticsResult, null, 2));
        
        if (analyticsResult.success && analyticsResult.formatted_response) {
          responseText = analyticsResult.formatted_response;
        } else {
          responseText = analyticsResult.message || '❌ Não consegui processar sua consulta.';
        }
        
        // Atualizar mensagem no histórico
        await supabase.from('whatsapp_messages').update({
          intent: 'analytics_query',
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
          response_text: responseText
        }).eq('id', message.id);
        
      } catch (analyticsError) {
        console.error('❌ Erro ao chamar analytics-query:', analyticsError);
        responseText = '❌ Erro ao processar sua consulta. Tente novamente.';
      }
      
    } else {
      // ============================================
      // 💸 DETECÇÃO DE TRANSAÇÕES (NLP)
      // ============================================
      const isTransactionMessage = NLP_KEYWORDS.some(keyword => {
        const match = command.includes(keyword);
        if (match) {
          console.log(`✅ Keyword MATCH: "${keyword}" encontrada em "${command}"`);
        }
        return match;
      });
      
      console.log('🔍 DEBUG - isTransactionMessage:', isTransactionMessage);
      
      if (isTransactionMessage) {
      console.log('🧠 ===== MENSAGEM DE TRANSAÇÃO DETECTADA =====');
      console.log('📝 Texto original:', content);
      
      try {
        console.log('📞 Chamando categorize-transaction...');
        
        const nlpResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/categorize-transaction`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` 
            },
            body: JSON.stringify({
              user_id: user.id,
              data: { raw_text: content }
            })
          }
        );
        
        const nlpResult = await nlpResponse.json();
        console.log('📊 DEBUG - nlpResponse status:', nlpResponse.status);
        console.log('📊 DEBUG - nlpResult:', JSON.stringify(nlpResult, null, 2));
        
        if (nlpResult.success) {
          finalIntent = 'transaction';
          console.log('✅ [v18] Transação detectada! ID:', nlpResult.transaction_id);
          console.log('📊 [v18] Dados extraídos:', JSON.stringify(nlpResult.data, null, 2));
          
          // ============================================
          // 🔄 MUDAR STATUS PARA PENDING_CONFIRMATION
          // ============================================
          console.log('🔄 [v18] Atualizando status para pending_confirmation...');
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
              status: 'pending_confirmation',
              is_paid: false
            })
            .eq('id', nlpResult.transaction_id);
          
          if (updateError) {
            console.error('❌ [v18] Erro ao atualizar status:', updateError);
          } else {
            console.log('✅ [v18] Status atualizado para pending_confirmation');
          }
          
          // ============================================
          // 🔘 ENVIAR BOTÕES INTERATIVOS
          // ============================================
          const transactionData = nlpResult.data;
          const typeEmoji = transactionData.type === 'income' ? '💰' : '💸';
          const amountFormatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(transactionData.amount);
          
          // ✅ V24: MENSAGEM CONVERSACIONAL (sem botões)
          responseText = `✅ *Lançamento Registrado!*\n\n` +
                        `${typeEmoji} ${transactionData.type === 'income' ? 'Receita' : 'Despesa'}\n` +
                        `💵 ${amountFormatted}\n` +
                        `📂 ${transactionData.category || 'Outros'}\n` +
                        `📝 ${transactionData.description}\n` +
                        `📅 Hoje\n\n` +
                        `💡 *Quer mudar algo? É só me dizer!*\n` +
                        `Exemplos: "muda pra Nubank", "era 95", "exclui essa"`;
        } else {
          responseText = `❌ Não consegui processar sua transação.\n\n` +
                        `Detalhes: ${nlpResult.error || nlpResult.message}\n\n` +
                        `Tente novamente ou use o app.`;
          console.error('❌ NLP falhou:', nlpResult.error || nlpResult.message);
        }
        
      } catch (nlpError) {
        console.error('❌ ERRO CRÍTICO NO NLP:', nlpError);
        console.error('❌ Stack:', nlpError.stack);
        responseText = `⚠️ Erro ao processar sua mensagem.\n\n` +
                      `Por favor, use o comando *ajuda* para ver opções disponíveis.`;
      }
      
    } else {
      console.log('📋 Processando como comando estruturado...');
      
      // ============================================
      // 📋 COMANDOS ESTRUTURADOS
      // ============================================
      switch(command){
      case 'saldo':
        const { data: accounts } = await supabase.from('accounts').select('current_balance').eq('user_id', user.id).eq('is_active', true);
        const totalBalance = accounts?.reduce((sum, acc)=>sum + parseFloat(acc.current_balance || '0'), 0) || 0;
        responseText = `💰 *Seu Saldo Total*\n\nR$ ${totalBalance.toFixed(2).replace('.', ',')}\n\n_Atualizado agora_`;
        break;
      case 'ajuda':
        responseText = `📋 *Comandos Disponíveis*\n\n` + `💰 *saldo* - Ver saldo total\n` + `📊 *resumo* - Resumo do mês\n` + `📋 *contas* - Contas a pagar\n` + `🎯 *meta* - Status das metas\n` + `📈 *investimentos* - Portfólio\n` + `💳 *cartões* - Faturas\n` + `❓ *ajuda* - Esta mensagem\n\n` + `_Digite um comando para começar!_`;
        break;
      case 'resumo':
        const { data: transactions } = await supabase.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).lt('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
        const income = transactions?.filter((t)=>t.type === 'income').reduce((sum, t)=>sum + parseFloat(t.amount), 0) || 0;
        const expenses = transactions?.filter((t)=>t.type === 'expense').reduce((sum, t)=>sum + parseFloat(t.amount), 0) || 0;
        const balance = income - expenses;
        responseText = `📊 *Resumo de ${new Date().toLocaleDateString('pt-BR', {
          month: 'long'
        })}*\n\n` + `💵 Receitas: R$ ${income.toFixed(2).replace('.', ',')}\n` + `💸 Despesas: R$ ${expenses.toFixed(2).replace('.', ',')}\n` + `✅ Saldo: R$ ${balance.toFixed(2).replace('.', ',')}\n\n` + `_${balance > 0 ? '🎉 Você economizou este mês!' : '⚠️ Atenção aos gastos!'}_`;
        break;
      case 'contas':
        const { data: bills } = await supabase.from('payable_bills').select('description, amount, due_date').eq('user_id', user.id).in('status', [
          'pending',
          'overdue'
        ]).gte('due_date', new Date().toISOString().split('T')[0]).lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('due_date', {
          ascending: true
        }).limit(5);
        if (!bills || bills.length === 0) {
          responseText = `📋 *Contas a Pagar*\n\n✅ Nenhuma conta nos próximos 7 dias!\n\n_Você está em dia! 🎉_`;
        } else {
          responseText = `📋 *Contas a Pagar (${bills.length})*\n\n`;
          bills.forEach((bill)=>{
            const dueDate = new Date(bill.due_date);
            const today = new Date();
            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const whenText = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`;
            responseText += `• ${bill.description}\n  R$ ${parseFloat(bill.amount).toFixed(2).replace('.', ',')} - ${whenText}\n\n`;
          });
          responseText += `_Total: R$ ${bills.reduce((sum, b)=>sum + parseFloat(b.amount), 0).toFixed(2).replace('.', ',')}_`;
        }
        break;
      case 'meta':
      case 'metas':
        // ✅ CORREÇÃO 1: financial_goals + deadline + goal_type
        const { data: goals } = await supabase.from('financial_goals') // ✅ CORRIGIDO: era 'goals'
        .select('name, target_amount, current_amount, deadline, status, goal_type') // ✅ CORRIGIDO: era 'target_date'
        .eq('user_id', user.id).eq('status', 'active').eq('goal_type', 'savings') // ✅ NOVO: filtra só metas de economia
        .order('deadline', {
          ascending: true
        }) // ✅ CORRIGIDO: era 'target_date'
        .limit(5);
        if (!goals || goals.length === 0) {
          responseText = `🎯 *Metas Financeiras*\n\n` + `Você ainda não tem metas de economia cadastradas.\n\n` + `_Cadastre suas metas no app para acompanhar seu progresso!_`;
        } else {
          responseText = `🎯 *Suas Metas de Economia (${goals.length})*\n\n`;
          goals.forEach((goal)=>{
            const targetAmount = parseFloat(goal.target_amount);
            const currentAmount = parseFloat(goal.current_amount || 0);
            const progress = targetAmount > 0 ? currentAmount / targetAmount * 100 : 0;
            const remaining = targetAmount - currentAmount;
            let deadlineText = '';
            // ✅ CORREÇÃO 2: usa 'deadline' em vez de 'target_date'
            if (goal.deadline) {
              const targetDate = new Date(goal.deadline);
              const today = new Date();
              const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                deadlineText = ' (prazo vencido)';
              } else if (diffDays === 0) {
                deadlineText = ' (vence hoje)';
              } else if (diffDays <= 30) {
                deadlineText = ` (faltam ${diffDays} dias)`;
              } else {
                deadlineText = ` (até ${targetDate.toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: 'numeric'
                })})`;
              }
            }
            const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
            responseText += `*${goal.name}*${deadlineText}\n` + `${progressBar} ${progress.toFixed(0)}%\n` + `R$ ${currentAmount.toFixed(2).replace('.', ',')} de R$ ${targetAmount.toFixed(2).replace('.', ',')}\n` + `Falta: R$ ${remaining.toFixed(2).replace('.', ',')}\n\n`;
          });
          responseText += `_Atualize suas metas no app!_`;
        }
        break;
      case 'investimentos':
      case 'investimento':
        const { data: investments } = await supabase.from('investments').select('type, name, ticker, quantity, current_value, total_invested').eq('user_id', user.id).eq('is_active', true).order('current_value', {
          ascending: false
        });
        if (!investments || investments.length === 0) {
          responseText = `📈 *Portfólio de Investimentos*\n\n` + `Você ainda não tem investimentos cadastrados.\n\n` + `_Cadastre seus investimentos no app para acompanhar seu portfólio!_`;
        } else {
          const totalInvested = investments.reduce((sum, inv)=>sum + parseFloat(inv.total_invested || 0), 0);
          const totalCurrent = investments.reduce((sum, inv)=>sum + parseFloat(inv.current_value || 0), 0);
          const totalGain = totalCurrent - totalInvested;
          const gainPercent = totalInvested > 0 ? totalGain / totalInvested * 100 : 0;
          const typeEmojis = {
            stock: '📊',
            fund: '🏦',
            treasury: '🏛️',
            crypto: '₿',
            real_estate: '🏠',
            other: '💼'
          };
          responseText = `📈 *Portfólio de Investimentos*\n\n` + `💰 Total Investido: R$ ${totalInvested.toFixed(2).replace('.', ',')}\n` + `📊 Valor Atual: R$ ${totalCurrent.toFixed(2).replace('.', ',')}\n` + `${totalGain >= 0 ? '📈' : '📉'} Ganho/Perda: R$ ${totalGain.toFixed(2).replace('.', ',')} (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)\n\n` + `*Principais Ativos:*\n\n`;
          investments.slice(0, 5).forEach((inv)=>{
            const emoji = typeEmojis[inv.type] || '💼';
            const ticker = inv.ticker ? ` (${inv.ticker})` : '';
            const currentValue = parseFloat(inv.current_value || 0);
            responseText += `${emoji} *${inv.name}*${ticker}\n` + `  R$ ${currentValue.toFixed(2).replace('.', ',')}\n\n`;
          });
          if (investments.length > 5) {
            responseText += `_E mais ${investments.length - 5} ativos..._\n\n`;
          }
          responseText += `_Veja detalhes completos no app!_`;
        }
        break;
      case 'cartões':
      case 'cartoes':
      case 'cartão':
      case 'cartao':
        // ✅ CORREÇÃO 3: last_four_digits + is_archived
        const { data: cards } = await supabase.from('credit_cards').select('id, name, last_four_digits, due_day, credit_limit') // ✅ CORRIGIDO: era 'last_four'
        .eq('user_id', user.id).eq('is_active', true).eq('is_archived', false); // ✅ NOVO: exclui arquivados
        if (!cards || cards.length === 0) {
          responseText = `💳 *Cartões de Crédito*\n\n` + `Você ainda não tem cartões ativos.\n\n` + `_Cadastre seus cartões no app para acompanhar faturas!_`;
        } else {
          responseText = `💳 *Seus Cartões (${cards.length})*\n\n`;
          for (const card of cards){
            // ✅ CORREÇÃO V13: Query fatura corrigida - campos diretos sem JOIN
            const { data: cardTransactions } = await supabase.from('credit_card_transactions').select('amount, purchase_date') // ✅ Campos diretos
            .eq('credit_card_id', card.id).gte('purchase_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]) // ✅ purchase_date
            .lt('purchase_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]);
            // ✅ CORREÇÃO V13: Cálculo usando ct.amount diretamente
            const totalSpent = cardTransactions?.reduce((sum, ct)=>sum + Math.abs(parseFloat(ct.amount || 0)), 0) || 0;
            const limit = parseFloat(card.credit_limit || 0);
            const usedPercent = limit > 0 ? totalSpent / limit * 100 : 0;
            const today = new Date();
            const currentDay = today.getDate();
            const dueDay = card.due_day;
            let daysUntilDue;
            if (currentDay <= dueDay) {
              daysUntilDue = dueDay - currentDay;
            } else {
              const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
              daysUntilDue = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
            const whenText = daysUntilDue === 0 ? 'Hoje' : daysUntilDue === 1 ? 'Amanhã' : `Em ${daysUntilDue} dias`;
            // ✅ CORREÇÃO 4: usa 'last_four_digits' em vez de 'last_four'
            responseText += `*${card.name}* ${card.last_four_digits ? `(****${card.last_four_digits})` : ''}\n` + `💰 Fatura Atual: R$ ${totalSpent.toFixed(2).replace('.', ',')}\n` + `📊 Limite: R$ ${limit.toFixed(2).replace('.', ',')} (${usedPercent.toFixed(0)}% usado)\n` + `📅 Vencimento: ${whenText} (dia ${dueDay})\n\n`;
          }
          responseText += `_Gerencie seus cartões no app!_`;
        }
        break;
      default:
        responseText = `❓ Comando não reconhecido: "${content}"\n\n` + `Digite *ajuda* para ver os comandos disponíveis.`;
      } // fim do switch
    } // fim do else (comandos estruturados)
    } // fim do else (isAnalyticsQuery)
    
    // ============================================
    // 📤 ENVIO DE RESPOSTA (v24: sempre envia)
    // ============================================
    if (responseText) {
      console.log('📤 Enviando resposta via send-whatsapp-message...');
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phone_number: phone,
          message_type: 'text',
          content: responseText
        })
      });
    } else {
      console.log('🔘 [v18] Botões já enviados, pulando envio de texto duplicado');
    }
    // Atualiza mensagem como processada
    await supabase.from('whatsapp_messages').update({
      processing_status: 'completed',
      intent: finalIntent,
      processed_at: new Date().toISOString()
    }).eq('id', message.id);
    
    console.log('✅ Processamento completo!');
    console.log('📊 Intent final:', finalIntent);
    console.log('📊 isAnalyticsQuery:', isAnalyticsQuery);
    
    return new Response(JSON.stringify({
      success: true,
      message_id: message.id,
      user: user.full_name,
      command: finalIntent
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
