import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Detecta estrutura do payload (direto ou via N8N)
    const isN8NPayload = payload.body && payload.body.EventType;
    const event = isN8NPayload ? payload.body.EventType : payload.event;
    
    console.log('🔍 Tipo de evento:', event);

    if (!event || (event !== 'message' && event !== 'messages')) {
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
      messageType = messageData.type || 'text';
      content = messageData.content || messageData.text || '';
    } else {
      // Payload direto UAZAPI
      from = payload.data?.from || '';
      phone = from.split('@')[0];
      messageData = payload.data?.message || {};
      messageType = messageData.type || 'text';
      content = messageData.text || messageData.caption || '';
    }

    console.log('📱 Telefone:', phone);
    console.log('💬 Tipo:', messageType);
    console.log('📝 Conteúdo:', content);
    console.log('📝 Tipo de conteúdo:', typeof content);

    // ✅ VALIDAÇÃO ROBUSTA
    if (!phone || !content || typeof content !== 'string') {
      console.log('⚠️ Dados incompletos ou conteúdo não-textual');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Busca usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('phone', phone)
      .single();

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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Usuário encontrado:', user.full_name);

    // Salva mensagem
    const { data: message, error: messageError } = await supabase
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

    console.log('💾 Mensagem salva! ID:', message.id);

    // ✅ VALIDAÇÃO DEFENSIVA
    const command = String(content || '').toLowerCase().trim();
    
    if (!command) {
      console.log('⚠️ Comando vazio após normalização');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Conteúdo não processável' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let responseText = '';

    switch (command) {
      case 'saldo':
        const { data: accounts } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        const totalBalance = accounts?.reduce((sum, acc) => sum + parseFloat(acc.current_balance || '0'), 0) || 0;
        responseText = `💰 *Seu Saldo Total*\n\nR$ ${totalBalance.toFixed(2).replace('.', ',')}\n\n_Atualizado agora_`;
        break;

      case 'ajuda':
        responseText = `📋 *Comandos Disponíveis*\n\n` +
          `💰 *saldo* - Ver saldo total\n` +
          `📊 *resumo* - Resumo do mês\n` +
          `📋 *contas* - Contas a pagar\n` +
          `🎯 *meta* - Status das metas\n` +
          `📈 *investimentos* - Portfólio\n` +
          `💳 *cartões* - Faturas\n` +
          `❓ *ajuda* - Esta mensagem\n\n` +
          `_Digite um comando para começar!_`;
        break;

      case 'resumo':
        const { data: transactions } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .lt('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
        
        const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        const balance = income - expenses;
        
        responseText = `📊 *Resumo de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}*\n\n` +
          `💵 Receitas: R$ ${income.toFixed(2).replace('.', ',')}\n` +
          `💸 Despesas: R$ ${expenses.toFixed(2).replace('.', ',')}\n` +
          `✅ Saldo: R$ ${balance.toFixed(2).replace('.', ',')}\n\n` +
          `_${balance > 0 ? '🎉 Você economizou este mês!' : '⚠️ Atenção aos gastos!'}_`;
        break;

      case 'contas':
        const { data: bills } = await supabase
          .from('payable_bills')
          .select('description, amount, due_date')
          .eq('user_id', user.id)
          .in('status', ['pending', 'overdue'])
          .gte('due_date', new Date().toISOString().split('T')[0])
          .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .limit(5);
        
        if (!bills || bills.length === 0) {
          responseText = `📋 *Contas a Pagar*\n\n✅ Nenhuma conta nos próximos 7 dias!\n\n_Você está em dia! 🎉_`;
        } else {
          responseText = `📋 *Contas a Pagar (${bills.length})*\n\n`;
          bills.forEach(bill => {
            const dueDate = new Date(bill.due_date);
            const today = new Date();
            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const whenText = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`;
            responseText += `• ${bill.description}\n  R$ ${parseFloat(bill.amount).toFixed(2).replace('.', ',')} - ${whenText}\n\n`;
          });
          responseText += `_Total: R$ ${bills.reduce((sum, b) => sum + parseFloat(b.amount), 0).toFixed(2).replace('.', ',')}_`;
        }
        break;

      case 'meta':
      case 'metas':
        // ✅ CORREÇÃO 1: financial_goals + deadline + goal_type
        const { data: goals } = await supabase
          .from('financial_goals') // ✅ CORRETO
          .select('name, target_amount, current_amount, deadline, status, goal_type') // ✅ deadline
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('goal_type', 'savings') // ✅ só metas de economia
          .order('deadline', { ascending: true }) // ✅ deadline
          .limit(5);
        
        if (!goals || goals.length === 0) {
          responseText = `🎯 *Metas Financeiras*\n\n` +
            `Você ainda não tem metas de economia cadastradas.\n\n` +
            `_Cadastre suas metas no app para acompanhar seu progresso!_`;
        } else {
          responseText = `🎯 *Suas Metas de Economia (${goals.length})*\n\n`;
          goals.forEach(goal => {
            const targetAmount = parseFloat(goal.target_amount);
            const currentAmount = parseFloat(goal.current_amount || 0);
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const remaining = targetAmount - currentAmount;
            
            let deadlineText = '';
            // ✅ CORREÇÃO 2: deadline em vez de target_date
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
                deadlineText = ` (até ${targetDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`;
              }
            }
            
            const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
            
            responseText += `*${goal.name}*${deadlineText}\n` +
              `${progressBar} ${progress.toFixed(0)}%\n` +
              `R$ ${currentAmount.toFixed(2).replace('.', ',')} de R$ ${targetAmount.toFixed(2).replace('.', ',')}\n` +
              `Falta: R$ ${remaining.toFixed(2).replace('.', ',')}\n\n`;
          });
          responseText += `_Atualize suas metas no app!_`;
        }
        break;

      case 'investimentos':
      case 'investimento':
        const { data: investments } = await supabase
          .from('investments')
          .select('type, name, ticker, quantity, current_value, total_invested')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('current_value', { ascending: false });
        
        if (!investments || investments.length === 0) {
          responseText = `📈 *Portfólio de Investimentos*\n\n` +
            `Você ainda não tem investimentos cadastrados.\n\n` +
            `_Cadastre seus investimentos no app para acompanhar seu portfólio!_`;
        } else {
          const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.total_invested || 0), 0);
          const totalCurrent = investments.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
          const totalGain = totalCurrent - totalInvested;
          const gainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
          
          const typeEmojis: Record<string, string> = {
            stock: '📊',
            fund: '🏦',
            treasury: '🏛️',
            crypto: '₿',
            real_estate: '🏠',
            other: '💼'
          };
          
          responseText = `📈 *Portfólio de Investimentos*\n\n` +
            `💰 Total Investido: R$ ${totalInvested.toFixed(2).replace('.', ',')}\n` +
            `📊 Valor Atual: R$ ${totalCurrent.toFixed(2).replace('.', ',')}\n` +
            `${totalGain >= 0 ? '📈' : '📉'} Ganho/Perda: R$ ${totalGain.toFixed(2).replace('.', ',')} (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)\n\n` +
            `*Principais Ativos:*\n\n`;
          
          investments.slice(0, 5).forEach(inv => {
            const emoji = typeEmojis[inv.type] || '💼';
            const ticker = inv.ticker ? ` (${inv.ticker})` : '';
            const currentValue = parseFloat(inv.current_value || 0);
            responseText += `${emoji} *${inv.name}*${ticker}\n  R$ ${currentValue.toFixed(2).replace('.', ',')}\n\n`;
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
        const { data: cards } = await supabase
          .from('credit_cards')
          .select('id, name, last_four_digits, due_day, credit_limit') // ✅ last_four_digits
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('is_archived', false); // ✅ exclui arquivados
        
        if (!cards || cards.length === 0) {
          responseText = `💳 *Cartões de Crédito*\n\n` +
            `Você ainda não tem cartões ativos.\n\n` +
            `_Cadastre seus cartões no app para acompanhar faturas!_`;
        } else {
          responseText = `💳 *Seus Cartões (${cards.length})*\n\n`;
          
          for (const card of cards) {
            const { data: cardTransactions } = await supabase
              .from('credit_card_transactions')
              .select(`
                transaction_id,
                transactions!inner(amount, description, transaction_date)
              `)
              .eq('credit_card_id', card.id)
              .gte('transactions.transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
              .lt('transactions.transaction_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
            
            const totalSpent = cardTransactions?.reduce((sum, ct) => sum + Math.abs(parseFloat(ct.transactions.amount)), 0) || 0;
            const limit = parseFloat(card.credit_limit || 0);
            const usedPercent = limit > 0 ? (totalSpent / limit) * 100 : 0;
            
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
            
            // ✅ CORREÇÃO 4: last_four_digits em vez de last_four
            responseText += `*${card.name}* ${card.last_four_digits ? `(****${card.last_four_digits})` : ''}\n` +
              `💰 Fatura Atual: R$ ${totalSpent.toFixed(2).replace('.', ',')}\n` +
              `📊 Limite: R$ ${limit.toFixed(2).replace('.', ',')} (${usedPercent.toFixed(0)}% usado)\n` +
              `📅 Vencimento: ${whenText} (dia ${dueDay})\n\n`;
          }
          
          responseText += `_Gerencie seus cartões no app!_`;
        }
        break;

      default:
        responseText = `❓ Comando não reconhecido: "${content}"\n\n` +
          `Digite *ajuda* para ver os comandos disponíveis.`;
    }

    // Envia resposta
    console.log('📤 Enviando resposta...');
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

    // Atualiza mensagem como processada
    await supabase
      .from('whatsapp_messages')
      .update({
        processing_status: 'completed',
        intent: command,
        processed_at: new Date().toISOString()
      })
      .eq('id', message.id);

    console.log('✅ Processamento completo!');

    return new Response(JSON.stringify({ 
      success: true,
      message_id: message.id,
      user: user.full_name,
      command: command
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
