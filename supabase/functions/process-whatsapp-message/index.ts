// ============================================
// VERSÃO V18 - BOTÕES INTERATIVOS ✨🔘
// Edge Functions → process-whatsapp-message → Editar
// ============================================
// 
// MUDANÇAS APLICADAS:
// 1. Comando 'meta': goals → financial_goals, target_date → deadline, +goal_type filter (v12)
// 2. Comando 'cartões': last_four → last_four_digits, +is_archived filter (v12)
// 3. Comando 'cartões': Query fatura corrigida - campos diretos sem JOIN (v13)
// 4. ✨ Detecção NLP de transações via keywords (v17)
//    - Array de 15 keywords para detectar mensagens de transação
//    - Integração com categorize-transaction Edge Function
//    - Logs DEBUG detalhados para troubleshooting
//    - Intent tracking: 'transaction' para NLP, command para estruturados
// 5. 🔘 BOTÕES INTERATIVOS (v18)
//    - Confirmação interativa via botões UAZAPI
//    - Status pending_confirmation antes de salvar
//    - Handler para cliques [✅ Confirmar] [✏️ Corrigir]
//    - Logs detalhados do fluxo de botões
// 
// ============================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// 🔘 FUNÇÃO: ENVIAR BOTÕES INTERATIVOS UAZAPI (v19: Editar/Excluir)
// ============================================
async function sendInteractiveButtons(to: string, options: any) {
  console.log('🚨🚨🚨 [v19] FUNÇÃO sendInteractiveButtons CHAMADA! 🚨🚨🚨');
  console.log('🔘 Para:', to);
  console.log('🔘 Options:', JSON.stringify(options, null, 2));
  
  const uazapiUrl = 'https://lamusic.uazapi.com';
  const uazapiToken = Deno.env.get('UAZAPI_TOKEN') || '0a5d59d3-f368-419b-b9e8-701375814522';
  
  // Montar choices no formato UAZAPI: "Texto Botão|id_botao"
  // v19: Mudança de [Confirmar/Corrigir] para [Editar/Excluir]
  const choices = [
    `✏️ Editar|edit_${options.transactionId}`,
    `🗑️ Excluir|delete_${options.transactionId}`
  ];
  
  const payload = {
    number: to,
    type: 'button',
    text: options.text,
    choices: choices,
    footerText: options.footer || 'Ana Clara - Personal Finance'
  };
  
  console.log('📦 [v19] Payload botões:', JSON.stringify(payload, null, 2));
  console.log('🌐 [v19] URL:', `${uazapiUrl}/send/menu`);
  
  try {
    const response = await fetch(`${uazapiUrl}/send/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': uazapiToken
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    console.log('📊 [v19] Status UAZAPI:', response.status);
    console.log('📄 [v19] Resposta UAZAPI:', responseText);
    
    if (!response.ok) {
      console.error('❌ [v19] Erro UAZAPI:', responseText);
      return { success: false, error: responseText };
    }
    
    return { success: true, data: responseText };
  } catch (error) {
    console.error('❌ [v19] Erro crítico ao enviar botões:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// 🎯 FUNÇÃO: PROCESSAR CLIQUE NO BOTÃO (v19: Editar/Excluir)
// ============================================
// ============================================
// FUNÇÕES DE CONTEXTO CONVERSACIONAL (v20)
// ============================================
async function saveContext(userId: string, phone: string, contextType: string, contextData: any, supabase: any) {
  const payload = {
    user_id: userId,
    phone: phone,
    context_type: contextType,
    context_data: contextData,
    last_interaction: new Date().toISOString(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('conversation_context')
      .upsert(payload, { onConflict: 'user_id,phone' });

    if (error) throw error;
    console.log('💾 [v20] Contexto salvo/atualizado com upsert');
  } catch (err: any) {
    console.error('❌ Erro ao salvar contexto (upsert):', err);
    // Fallback quando UNIQUE não existe: 42P10
    if (err?.code === '42P10') {
      console.log('🛟 [v20] Fallback saveContext: realizando update/insert manual sem UNIQUE');
      const { data: existing, error: selError } = await supabase
        .from('conversation_context')
        .select('id')
        .eq('user_id', userId)
        .eq('phone', phone)
        .maybeSingle();

      if (selError) {
        console.error('❌ [v20] Erro ao buscar contexto (fallback):', selError);
        return;
      }

      if (existing) {
        const { error: updError } = await supabase
          .from('conversation_context')
          .update(payload)
          .eq('id', existing.id);
        if (updError) console.error('❌ [v20] Erro no update de contexto (fallback):', updError);
        else console.log('💾 [v20] Contexto atualizado (fallback)');
      } else {
        const { error: insError } = await supabase
          .from('conversation_context')
          .insert(payload);
        if (insError) console.error('❌ [v20] Erro no insert de contexto (fallback):', insError);
        else console.log('💾 [v20] Contexto inserido (fallback)');
      }
    }
  }
}

async function getActiveContext(userId: string, phone: string, supabase: any) {
  console.log('🔍 [v20] Buscando contexto para:', { userId, phone });
  console.log('🔍 [v20] Timestamp atual:', new Date().toISOString());
  
  const { data, error } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('user_id', userId)
    .eq('phone', phone)
    .gt('expires_at', new Date().toISOString())
    .order('last_interaction', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  console.log('📊 [v20] Resultado da busca de contexto:');
  console.log('  - Dados:', JSON.stringify(data, null, 2));
  console.log('  - Erro:', error);
  
  if (error) console.error('❌ Erro ao buscar contexto:', error);
  if (!data) console.log('📭 [v20] Nenhum contexto ativo encontrado');
  if (data) console.log('📬 [v20] CONTEXTO ENCONTRADO!', data.context_type);
  
  return data;
}

async function clearContext(userId: string, phone: string, supabase: any) {
  await supabase
    .from('conversation_context')
    .delete()
    .eq('user_id', userId)
    .eq('phone', phone);
}

function extractMessageText(messageData: any): string {
  const candidates = [
    messageData?.text,
    messageData?.content,
    messageData?.caption,
    messageData?.conversation,
    messageData?.body,
    messageData?.extendedTextMessage,
    messageData?.message,
    messageData?.message?.conversation,
    messageData?.message?.text
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === 'string') {
      return candidate;
    }

    if (typeof candidate === 'object') {
      if (typeof candidate?.text === 'string') return candidate.text;
      if (typeof candidate?.body === 'string') return candidate.body;
      if (typeof candidate?.caption === 'string') return candidate.caption;
      if (typeof candidate?.conversation === 'string') return candidate.conversation;
    }
  }

  return '';
}

async function handleButtonClick(buttonId: string, userId: string, phone: string, supabase: any) {
  console.log('🎯 [v20] Processando clique no botão:', buttonId);
  console.log('👤 [v20] User ID:', userId);
  
  // Extrair ação e transaction_id do buttonId
  // v20: Formato: "edit_69e4b43f..." ou "delete_69e4b43f..."
  const parts = buttonId.split('_');
  const action = parts[0];
  const transactionId = parts.slice(1).join('_'); // UUID completo
  
  console.log('🔍 [v20] Ação:', action);
  console.log('🔍 [v20] Transaction ID:', transactionId);
  
  // ============================================
  // AÇÃO: EXCLUIR
  // ============================================
  if (action === 'delete') {
    // Buscar transação antes de excluir
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*, categories(name), accounts:accounts!transactions_account_id_fkey(name)')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !transaction) {
      console.error('❌ [v19] Erro ao buscar transação:', fetchError);
      return `❌ Transação não encontrada.`;
    }
    
    // Soft delete (mudar status para cancelled)
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ [v19] Erro ao excluir:', error);
      return `❌ Erro ao excluir transação: ${error.message}`;
    }
    
    console.log('🗑️ [v19] Transação excluída (soft delete)');
    
    // Mensagem de confirmação
    const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
    const typeText = transaction.type === 'income' ? 'Receita' : 'Despesa';
    const amountFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(transaction.amount);
    const categoryName = transaction.categories?.name || 'Outros';
    
    return `🗑️ *Transação Excluída*\n\n` +
           `${typeEmoji} *Tipo:* ${typeText}\n` +
           `💵 *Valor:* ${amountFormatted}\n` +
           `📂 *Categoria:* ${categoryName}\n` +
           `📝 *Descrição:* ${transaction.description}\n` +
           `🏦 *Cartão:* ${transaction.accounts?.name || 'N/A'}\n\n` +
           `✅ *Registro removido com sucesso!*\n\n` +
           `_Digite "saldo" para ver seu saldo atualizado._`;
  }
  
  // ============================================
  // AÇÃO: EDITAR
  // ============================================
  if (action === 'edit') {
    // Buscar transação completa
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*, categories(name), accounts:accounts!transactions_account_id_fkey(name)')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !transaction) {
      console.error('❌ [v20] Erro ao buscar transação:', fetchError);
      return `❌ Transação não encontrada.`;
    }
    
    console.log('✏️ [v20] Salvando contexto de edição');
    
    // 🆕 SALVAR CONTEXTO CONVERSACIONAL (v20)
    await saveContext(userId, phone, 'editing_transaction', {
      transaction_id: transactionId,
      current_data: {
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.categories?.name,
        category_id: transaction.category_id,
        date: transaction.transaction_date,
        account: transaction.accounts?.name
      }
    }, supabase);
    
    // Mensagem com dados atuais e opções de edição
    const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
    const typeText = transaction.type === 'income' ? 'Receita' : 'Despesa';
    const amountFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(transaction.amount);
    const date = new Date(transaction.transaction_date).toLocaleDateString('pt-BR');
    
    return `✏️ *Modo de Edição Ativado!*\n\n` +
           `📋 *Transação:*\n` +
           `${typeEmoji} ${typeText}\n` +
           `💵 ${amountFormatted}\n` +
           `📂 ${transaction.categories?.name || 'Outros'}\n` +
           `📝 ${transaction.description}\n` +
           `📅 ${date}\n` +
           `🏦 ${transaction.accounts?.name || 'N/A'}\n\n` +
           `🎯 *Agora é só me dizer o que quer mudar!*\n\n` +
           `Exemplos:\n` +
           `• \`150\` (muda o valor)\n` +
           `• \`Uber Black\` (muda a descrição)\n` +
           `• \`categoria alimentação\` (muda categoria)\n` +
           `• \`data 15/11\` (muda a data)\n` +
           `• \`pronto\` ou \`cancelar\` (sair da edição)\n\n` +
           `💡 _Fale naturalmente, eu entendo!_`;
  }
  
  return '❌ Ação não reconhecida';
}

// ============================================
// ✏️ FUNÇÃO: PROCESSAR COMANDOS DE EDIÇÃO (v19)
// ============================================
async function handleEditCommand(content: string, userId: string, phone: string, supabase: any) {
  console.log('✏️ [v19] ===== COMANDO DE EDIÇÃO =====');
  console.log('✏️ [v19] Content:', content);
  console.log('✏️ [v19] User ID:', userId);
  console.log('✏️ [v19] Phone:', phone);
  
  const lowerContent = content.toLowerCase();
  
  // Buscar última transação das últimas 24h do usuário (mais flexível)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  console.log('🔍 [v19] Buscando transações com filtros:');
  console.log('  - user_id:', userId);
  console.log('  - source: whatsapp');
  console.log('  - created_at >=:', yesterday.toISOString());
  
  const { data: lastTransaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*, categories(name), accounts:accounts!transactions_account_id_fkey(name)')
    .eq('user_id', userId)
    .eq('source', 'whatsapp')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  console.log('📊 [v19] Resultado da busca:');
  console.log('  - Transação encontrada:', lastTransaction ? 'SIM' : 'NÃO');
  console.log('  - Erro:', fetchError);
  console.log('  - Data completa:', JSON.stringify(lastTransaction, null, 2));
  
  if (fetchError || !lastTransaction) {
    console.warn('⚠️ [v19] Nenhuma transação WhatsApp encontrada (últimas 24h)');
    console.error('⚠️ [v19] Erro completo:', JSON.stringify(fetchError, null, 2));
    
    // Tentar buscar SEM filtro de source para debug
    const { data: anyTransaction } = await supabase
      .from('transactions')
      .select('id, description, source, created_at')
      .eq('user_id', userId)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('🔍 [v19] Últimas 5 transações (qualquer source):', JSON.stringify(anyTransaction, null, 2));
    
    return '❌ Nenhuma transação encontrada nas últimas 24 horas.\n\n💡 Crie uma transação primeiro:\n"Gastei 50 no mercado"';
  }
  
  console.log('✅ [v19] Transação encontrada:', lastTransaction.id);
  
  // ============================================
  // COMANDO: EDITAR VALOR
  // ============================================
  if (lowerContent.includes('editar valor')) {
    const match = content.match(/editar valor (\d+[.,]?\d*)/i);
    if (!match) {
      return '❌ Formato incorreto.\n\n✅ Use: "editar valor 150"';
    }
    
    const newValue = parseFloat(match[1].replace(',', '.'));
    const oldValue = lastTransaction.amount;
    
    // Atualizar transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ amount: newValue, updated_at: new Date().toISOString() })
      .eq('id', lastTransaction.id);
    
    if (updateError) {
      console.error('❌ [v19] Erro ao atualizar:', updateError);
      return '❌ Erro ao editar valor. Tente novamente.';
    }
    
    // Registrar edição no histórico
    await supabase.from('transaction_edits').insert({
      transaction_id: lastTransaction.id,
      user_id: userId,
      edit_type: 'edit_value',
      old_value: oldValue.toString(),
      new_value: newValue.toString(),
      edited_via: 'whatsapp'
    });
    
    console.log('✅ [v19] Valor atualizado');
    
    return `✅ *Valor Atualizado!*\n\n` +
           `📝 ${lastTransaction.description}\n` +
           `💵 Antes: R$ ${oldValue.toFixed(2)}\n` +
           `💵 Depois: R$ ${newValue.toFixed(2)}\n\n` +
           `✨ _Alteração salva com sucesso!_`;
  }
  
  // ============================================
  // COMANDO: EDITAR DESCRIÇÃO
  // ============================================
  if (lowerContent.includes('editar descri')) {
    const match = content.match(/editar descri[çc][ãa]o (.+)/i);
    if (!match) {
      return '❌ Formato incorreto.\n\n✅ Use: "editar descrição Uber Black"';
    }
    
    const newDescription = match[1].trim();
    const oldDescription = lastTransaction.description;
    
    // Atualizar transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ description: newDescription, updated_at: new Date().toISOString() })
      .eq('id', lastTransaction.id);
    
    if (updateError) {
      console.error('❌ [v19] Erro ao atualizar:', updateError);
      return '❌ Erro ao editar descrição. Tente novamente.';
    }
    
    // Registrar edição
    await supabase.from('transaction_edits').insert({
      transaction_id: lastTransaction.id,
      user_id: userId,
      edit_type: 'edit_description',
      old_value: oldDescription,
      new_value: newDescription,
      edited_via: 'whatsapp'
    });
    
    console.log('✅ [v19] Descrição atualizada');
    
    return `✅ *Descrição Atualizada!*\n\n` +
           `💵 Valor: R$ ${lastTransaction.amount.toFixed(2)}\n` +
           `📝 Antes: ${oldDescription}\n` +
           `📝 Depois: ${newDescription}\n\n` +
           `✨ _Alteração salva com sucesso!_`;
  }
  
  // ============================================
  // COMANDO: EDITAR CATEGORIA
  // ============================================
  if (lowerContent.includes('editar categoria')) {
    const match = content.match(/editar categoria (.+)/i);
    if (!match) {
      return '❌ Formato incorreto.\n\n✅ Use: "editar categoria alimentação"';
    }
    
    const newCategoryName = match[1].trim().toLowerCase();
    
    // Buscar categoria por nome (busca parcial)
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${newCategoryName}%`)
      .limit(1)
      .single();
    
    if (!category) {
      return `❌ Categoria "${newCategoryName}" não encontrada.\n\n` +
             `📂 Categorias disponíveis:\n` +
             `• Alimentação\n• Transporte\n• Saúde\n• Educação\n• Lazer\n• Moradia\n• Outros`;
    }
    
    const oldCategoryName = lastTransaction.categories?.name || 'N/A';
    
    // Atualizar transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ category_id: category.id, updated_at: new Date().toISOString() })
      .eq('id', lastTransaction.id);
    
    if (updateError) {
      console.error('❌ [v19] Erro ao atualizar:', updateError);
      return '❌ Erro ao editar categoria. Tente novamente.';
    }
    
    // Registrar edição
    await supabase.from('transaction_edits').insert({
      transaction_id: lastTransaction.id,
      user_id: userId,
      edit_type: 'edit_category',
      old_value: oldCategoryName,
      new_value: category.name,
      edited_via: 'whatsapp'
    });
    
    console.log('✅ [v19] Categoria atualizada');
    
    return `✅ *Categoria Atualizada!*\n\n` +
           `📝 ${lastTransaction.description}\n` +
           `📂 Antes: ${oldCategoryName}\n` +
           `📂 Depois: ${category.name}\n\n` +
           `✨ _Alteração salva com sucesso!_`;
  }
  
  // ============================================
  // COMANDO: EDITAR DATA
  // ============================================
  if (lowerContent.includes('editar data')) {
    const match = content.match(/editar data (\d{1,2})\/(\d{1,2})/i);
    if (!match) {
      return '❌ Formato incorreto.\n\n✅ Use: "editar data 15/11"';
    }
    
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = new Date().getFullYear();
    const newDate = `${year}-${month}-${day}`;
    
    const oldDate = lastTransaction.transaction_date;
    
    // Atualizar transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ transaction_date: newDate, updated_at: new Date().toISOString() })
      .eq('id', lastTransaction.id);
    
    if (updateError) {
      console.error('❌ [v19] Erro ao atualizar:', updateError);
      return '❌ Erro ao editar data. Tente novamente.';
    }
    
    // Registrar edição
    await supabase.from('transaction_edits').insert({
      transaction_id: lastTransaction.id,
      user_id: userId,
      edit_type: 'edit_date',
      old_value: oldDate,
      new_value: newDate,
      edited_via: 'whatsapp'
    });
    
    console.log('✅ [v19] Data atualizada');
    
    const formattedOld = new Date(oldDate).toLocaleDateString('pt-BR');
    const formattedNew = new Date(newDate).toLocaleDateString('pt-BR');
    
    return `✅ *Data Atualizada!*\n\n` +
           `📝 ${lastTransaction.description}\n` +
           `📅 Antes: ${formattedOld}\n` +
           `📅 Depois: ${formattedNew}\n\n` +
           `✨ _Alteração salva com sucesso!_`;
  }
  
  // Comando não reconhecido
  return `❓ Comando não reconhecido.\n\n` +
         `*Comandos disponíveis:*\n` +
         `• editar valor 150\n` +
         `• editar descrição Uber Black\n` +
         `• editar categoria alimentação\n` +
         `• editar data 15/11`;
}

// ============================================
// 🧠 FUNÇÃO: PROCESSAR MENSAGEM COM CONTEXTO (v20)
// Interpreta mensagens baseadas no contexto ativo
// ============================================
async function handleMessageWithContext(content: string, context: any, userId: string, phone: string, supabase: any) {
  console.log('🧠 [v20] Processando com contexto:', context.context_type);
  const lowerContent = content.toLowerCase().trim();
  
  // Comandos para sair da edição
  if (lowerContent === 'pronto' || lowerContent === 'cancelar' || lowerContent === 'sair') {
    await clearContext(userId, phone, supabase);
    return '✅ Modo de edição encerrado!\n\n_Qualquer dúvida, é só chamar._';
  }
  
  // CONTEXTO: EDITING_TRANSACTION
  if (context.context_type === 'editing_transaction') {
    const transactionId = context.context_data?.transaction_id;
    const currentData = context.context_data?.current_data || {};
    
    if (!transactionId) {
      await clearContext(userId, phone, supabase);
      return '❌ Erro no contexto. Tente novamente.';
    }
    
    // 1. INTERPRETAR NÚMERO PURO → VALOR
    if (/^\d+[.,]?\d*$/.test(lowerContent)) {
      const newValue = parseFloat(lowerContent.replace(',', '.'));
      const oldValue = currentData.amount;
      
      const { error } = await supabase
        .from('transactions')
        .update({ amount: newValue, updated_at: new Date().toISOString() })
        .eq('id', transactionId)
        .eq('user_id', userId);
      
      if (error) {
        return '❌ Erro ao atualizar valor. Tente novamente.';
      }
      
      // Registrar edição
      await supabase.from('transaction_edits').insert({
        transaction_id: transactionId,
        user_id: userId,
        edit_type: 'edit_value',
        old_value: String(oldValue),
        new_value: String(newValue),
        edited_via: 'whatsapp'
      });
      
      // Atualizar contexto
      currentData.amount = newValue;
      await saveContext(userId, phone, 'editing_transaction', {
        transaction_id: transactionId,
        current_data: currentData
      }, supabase);
      
      const oldFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oldValue);
      const newFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newValue);
      
      return `✅ *Valor Atualizado!*\n\n` +
             `📝 ${currentData.description}\n` +
             `💵 Antes: ${oldFormatted}\n` +
             `💵 Depois: ${newFormatted}\n\n` +
             `💡 _Quer mudar mais alguma coisa? (categoria/descrição/data)_\n` +
             `_Ou digite "pronto" para finalizar._`;
    }
    
    // 2. INTERPRETAR "categoria X" ou "X" (nome de categoria)
    if (lowerContent.includes('categoria') || /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(lowerContent)) {
      const categoryQuery = lowerContent.replace('categoria', '').trim();
      
      const { data: category } = await supabase
        .from('categories')
        .select('id, name')
        .ilike('name', `%${categoryQuery}%`)
        .limit(1)
        .maybeSingle();
      
      if (!category) {
        return `❌ Categoria "${categoryQuery}" não encontrada.\n\n` +
               `💡 _Tente: alimentação, transporte, saúde, etc._`;
      }
      
      const oldCategory = currentData.category;
      
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: category.id, updated_at: new Date().toISOString() })
        .eq('id', transactionId)
        .eq('user_id', userId);
      
      if (error) {
        return '❌ Erro ao atualizar categoria. Tente novamente.';
      }
      
      // Registrar edição
      await supabase.from('transaction_edits').insert({
        transaction_id: transactionId,
        user_id: userId,
        edit_type: 'edit_category',
        old_value: oldCategory,
        new_value: category.name,
        edited_via: 'whatsapp'
      });
      
      // Atualizar contexto
      currentData.category = category.name;
      currentData.category_id = category.id;
      await saveContext(userId, phone, 'editing_transaction', {
        transaction_id: transactionId,
        current_data: currentData
      }, supabase);
      
      return `✅ *Categoria Atualizada!*\n\n` +
             `📝 ${currentData.description}\n` +
             `📂 Antes: ${oldCategory}\n` +
             `📂 Depois: ${category.name}\n\n` +
             `💡 _Quer mudar mais alguma coisa?_\n` +
             `_Ou digite "pronto" para finalizar._`;
    }
    
    // 3. INTERPRETAR "data DD/MM" ou só "DD/MM"
    if (lowerContent.includes('data') || /^\d{1,2}\/\d{1,2}/.test(lowerContent)) {
      const dateMatch = content.match(/(\d{1,2})\/(\d{1,2})/);
      if (!dateMatch) {
        return '❌ Formato de data inválido. Use: DD/MM ou data DD/MM';
      }
      
      const [, day, month] = dateMatch;
      const year = new Date().getFullYear();
      const newDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const oldDate = currentData.date;
      
      const { error } = await supabase
        .from('transactions')
        .update({ transaction_date: newDate, updated_at: new Date().toISOString() })
        .eq('id', transactionId)
        .eq('user_id', userId);
      
      if (error) {
        return '❌ Erro ao atualizar data. Tente novamente.';
      }
      
      // Registrar edição
      await supabase.from('transaction_edits').insert({
        transaction_id: transactionId,
        user_id: userId,
        edit_type: 'edit_date',
        old_value: oldDate,
        new_value: newDate,
        edited_via: 'whatsapp'
      });
      
      // Atualizar contexto
      currentData.date = newDate;
      await saveContext(userId, phone, 'editing_transaction', {
        transaction_id: transactionId,
        current_data: currentData
      }, supabase);
      
      const formattedOld = new Date(oldDate).toLocaleDateString('pt-BR');
      const formattedNew = new Date(newDate).toLocaleDateString('pt-BR');
      
      return `✅ *Data Atualizada!*\n\n` +
             `📝 ${currentData.description}\n` +
             `📅 Antes: ${formattedOld}\n` +
             `📅 Depois: ${formattedNew}\n\n` +
             `💡 _Quer mudar mais alguma coisa?_\n` +
             `_Ou digite "pronto" para finalizar._`;
    }
    
    // 4. INTERPRETAR TEXTO LIVRE → DESCRIÇÃO
    if (lowerContent.length > 2 && !lowerContent.includes('editar')) {
      const newDescription = content.trim();
      const oldDescription = currentData.description;
      
      const { error } = await supabase
        .from('transactions')
        .update({ description: newDescription, updated_at: new Date().toISOString() })
        .eq('id', transactionId)
        .eq('user_id', userId);
      
      if (error) {
        return '❌ Erro ao atualizar descrição. Tente novamente.';
      }
      
      // Registrar edição
      await supabase.from('transaction_edits').insert({
        transaction_id: transactionId,
        user_id: userId,
        edit_type: 'edit_description',
        old_value: oldDescription,
        new_value: newDescription,
        edited_via: 'whatsapp'
      });
      
      // Atualizar contexto
      currentData.description = newDescription;
      await saveContext(userId, phone, 'editing_transaction', {
        transaction_id: transactionId,
        current_data: currentData
      }, supabase);
      
      return `✅ *Descrição Atualizada!*\n\n` +
             `💵 Valor: R$ ${currentData.amount.toFixed(2)}\n` +
             `📝 Antes: ${oldDescription}\n` +
             `📝 Depois: ${newDescription}\n\n` +
             `💡 _Quer mudar mais alguma coisa?_\n` +
             `_Ou digite "pronto" para finalizar._`;
    }
  }
  
  return '❓ Não entendi. Tente novamente ou digite "cancelar" para sair.';
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
      messageType = messageData.messageType || messageData.type || messageData?.interactive?.type || 'text';
      content = extractMessageText(messageData);
      
      console.log('📱 [N8N] From:', from);
      console.log('📱 [N8N] Phone:', phone);
      console.log('📝 [N8N] MessageType:', messageType);
      console.log('🔘 [N8N] ButtonId:', messageData.buttonOrListid);
    } else {
      // Payload direto UAZAPI
      from = payload.data?.from || '';
      phone = from.split('@')[0];
      messageData = payload.data?.message || {};
      messageType = messageData.type || messageData?.interactive?.type || 'text';
      content = extractMessageText(messageData);
      
      console.log('📱 [Direct] From:', from);
      console.log('📱 [Direct] Phone:', phone);
      console.log('📝 [Direct] MessageType:', messageType);
    }
    console.log('📱 Telefone:', phone);
    console.log('💬 Tipo:', messageType);
    console.log('📝 Conteúdo:', content);
    console.log('📝 Tipo de conteúdo:', typeof content);
    
    // 🛑 CRÍTICO: IGNORAR MENSAGENS DO PRÓPRIO BOT (evita loop infinito)
    console.log('🔍 [DEBUG fromMe] messageData:', JSON.stringify(messageData, null, 2));
    console.log('🔍 [DEBUG fromMe] messageData.fromMe:', messageData?.fromMe);
    console.log('🔍 [DEBUG fromMe] payload.body?.message?.fromMe:', payload.body?.message?.fromMe);
    
    const fromMe = messageData?.fromMe || payload.body?.message?.fromMe || false;
    console.log('🤖 [FINAL] FromMe:', fromMe);
    console.log('🤖 [FINAL] Type of fromMe:', typeof fromMe);
    console.log('🤖 [FINAL] fromMe === true?', fromMe === true);
    console.log('🤖 [FINAL] Boolean(fromMe)?', Boolean(fromMe));
    
    // 🛑 VERIFICAÇÃO MAIS ROBUSTA
    if (fromMe === true || fromMe === 'true' || fromMe === 1 || Boolean(fromMe) === true) {
      console.log('⏭️ ✅✅✅ IGNORANDO mensagem do próprio bot (fromMe detectado)');
      return new Response(JSON.stringify({ ok: true, ignored: 'fromMe' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('⚠️ NÃO É FROMME, continuando processamento...');
    
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
    
    // ✅ CRÍTICO: N8N usa "TemplateButtonReplyMessage"
    const isButtonClick = (
      messageType === 'button' || 
      messageType === 'interactive' || 
      messageType === 'TemplateButtonReplyMessage' ||
      buttonId
    );
    
    if (isButtonClick && buttonId) {
      console.log('🎯 [v20] CLIQUE EM BOTÃO DETECTADO!');
      console.log('🎯 [v20] MessageType:', messageType);
      console.log('🎯 [v20] Button ID:', buttonId);
      
      const buttonResponse = await handleButtonClick(String(buttonId), user.id, phone, supabase);
      
      // Enviar resposta do botão
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phone_number: phone,
          message_type: 'text',
          content: buttonResponse
        })
      });
      
      return new Response(JSON.stringify({
        ok: true,
        message: 'Button processed'
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Mapear messageType para valores válidos do ENUM
    // ENUM aceita: text, audio, image, document, video, location, contact
    const messageTypeMap: Record<string, string> = {
      'Conversation': 'text',
      'TemplateButtonReplyMessage': 'text',
      'text': 'text',
      'audio': 'audio',
      'image': 'image',
      'document': 'document',
      'video': 'video',
      'location': 'location',
      'contact': 'contact'
    };
    
    const validMessageType = messageTypeMap[messageType] || 'text';
    console.log(`📝 Mapeando messageType: "${messageType}" → "${validMessageType}"`);
    
    // Salva mensagem
    const { data: message, error: messageError } = await supabase.from('whatsapp_messages').insert({
      user_id: user.id,
      phone_number: phone,
      message_type: validMessageType,
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
    // 🧠 VERIFICAR CONTEXTO CONVERSACIONAL (v20)
    // Prioridade máxima: se há contexto, processar com ele
    // ============================================
    console.log('🔍🔍🔍 [v20] ANTES de buscar contexto');
    console.log('🔍🔍🔍 [v20] user.id:', user.id);
    console.log('🔍🔍🔍 [v20] phone:', phone);
    
    const activeContext = await getActiveContext(user.id, phone, supabase);
    
    console.log('🔍🔍🔍 [v20] DEPOIS de buscar contexto');
    console.log('🔍🔍🔍 [v20] activeContext:', activeContext);
    
    if (activeContext) {
      console.log('🧠✅✅✅ [v20] CONTEXTO ATIVO DETECTADO!!!:', activeContext.context_type);
      console.log('🧠✅✅✅ [v20] Dados do contexto:', JSON.stringify(activeContext, null, 2));
      const contextResponse = await handleMessageWithContext(content, activeContext, user.id, phone, supabase);
      
      // Enviar resposta do contexto
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phone_number: phone,
          message_type: 'text',
          content: contextResponse
        })
      });
      
      return new Response(JSON.stringify({
        ok: true,
        message: 'Mensagem processada com contexto'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // ============================================
    // ✏️ DETECÇÃO DE COMANDOS DE EDIÇÃO (v20)
    // Só chega aqui se NÃO houver contexto ativo
    // ============================================
    const EDIT_KEYWORDS = ['editar valor', 'editar descri', 'editar categoria', 'editar data'];
    const isEditCommand = EDIT_KEYWORDS.some(keyword => command.includes(keyword));
    
    if (isEditCommand) {
      console.log('✏️ [v20] Comando de edição detectado (sem contexto)');
      const editResponse = await handleEditCommand(content, user.id, phone, supabase);
      
      // Enviar resposta do comando de edição
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phone_number: phone,
          message_type: 'text',
          content: editResponse
        })
      });
      
      return new Response(JSON.stringify({
        ok: true,
        message: 'Comando de edição processado'
      }), {
        headers: { 'Content-Type': 'application/json' }
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
    
    const isTransactionMessage = NLP_KEYWORDS.some(keyword => {
      const match = command.includes(keyword);
      if (match) {
        console.log(`✅ Keyword MATCH: "${keyword}" encontrada em "${command}"`);
      }
      return match;
    });
    
    console.log('🔍 DEBUG - isTransactionMessage:', isTransactionMessage);
    
    let responseText = '';
    let finalIntent = command;
    let buttonsSent = false; // 🔘 Flag para controlar envio de botões
    
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
          // 🔄 MUDAR STATUS PARA COMPLETED
          // ============================================
          console.log('🔄 [v18] Atualizando status para completed...');
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
              status: 'completed',
              is_paid: true
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
          
          // v19: Mensagem de confirmação com status "Pago"
          const confirmationText = `✅ *Lançamento Registrado!*\n\n` +
                                   `${typeEmoji} ${transactionData.type === 'income' ? 'Receita' : 'Despesa'}\n` +
                                   `📂 ${transactionData.category || 'Outros'}\n` +
                                   `📝 ${transactionData.description}\n` +
                                   `💵 ${amountFormatted}\n\n` +
                                   `✅ Pago\n\n` +
                                   `_Para editar, envie:_\n` +
                                   `• "editar valor 150"\n` +
                                   `• "editar descrição Uber Black"\n` +
                                   `• "editar categoria alimentação"`;
          
          console.log('🔘 [v19] Enviando botões interativos...');
          
          const buttonResult = await sendInteractiveButtons(phone, {
            text: confirmationText,
            transactionId: nlpResult.transaction_id,
            footer: 'Ana Clara - Personal Finance'
          });
          
          if (buttonResult.success) {
            console.log('✅ [v18] Botões enviados com sucesso!');
            responseText = confirmationText; // Para salvar no histórico
            buttonsSent = true; // 🔘 Marcar que botões foram enviados
          } else {
            console.error('❌ [v18] Erro ao enviar botões:', buttonResult.error);
            // Fallback: enviar mensagem de texto simples
            responseText = nlpResult.message;
            buttonsSent = false; // Falha nos botões, enviar texto
          }
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
    
    // ============================================
    // 📤 ENVIO DE RESPOSTA
    // ============================================
    // Só envia resposta de texto se NÃO enviou botões
    if (!buttonsSent) {
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
    console.log('📊 isTransactionMessage:', isTransactionMessage);
    
    return new Response(JSON.stringify({
      success: true,
      message_id: message.id,
      user: user.full_name,
      command: isTransactionMessage ? 'nlp_transaction' : command
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
