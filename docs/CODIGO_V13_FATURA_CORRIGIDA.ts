// ============================================
// VERSÃO V13 - CORREÇÃO FATURA DOS CARTÕES
// Bug: Query estava tentando JOIN com transactions (não existe)
// Fix: Usar campos diretamente de credit_card_transactions
// ============================================

// APENAS A PARTE DO SWITCH CASE 'cartões' PRECISA SER ALTERADA
// Cole este trecho SUBSTITUINDO o case 'cartões' existente (linhas ~315-372)

      case 'cartões':
      case 'cartoes':
      case 'cartão':
      case 'cartao':
        // ✅ CORREÇÃO 3: last_four_digits + is_archived
        const { data: cards } = await supabase
          .from('credit_cards')
          .select('id, name, last_four_digits, due_day, credit_limit')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('is_archived', false);

        if (!cards || cards.length === 0) {
          responseText = `💳 *Cartões de Crédito*\n\n` +
            `Você ainda não tem cartões ativos.\n\n` +
            `_Cadastre seus cartões no app para acompanhar faturas!_`;
        } else {
          responseText = `💳 *Seus Cartões (${cards.length})*\n\n`;
          
          for (const card of cards) {
            // ✅ FIX: Query corrigida - campos diretos sem JOIN
            const { data: cardTransactions } = await supabase
              .from('credit_card_transactions')
              .select('amount, purchase_date')  // ✅ Campos diretos
              .eq('credit_card_id', card.id)
              .gte('purchase_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])  // ✅ purchase_date
              .lt('purchase_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]);
            
            // ✅ FIX: Cálculo correto usando amount diretamente
            const totalSpent = cardTransactions?.reduce((sum, ct) => 
              sum + Math.abs(parseFloat(ct.amount || 0)), 0) || 0;
            
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
            
            const whenText = daysUntilDue === 0 ? 'Hoje' : 
                             daysUntilDue === 1 ? 'Amanhã' : 
                             `Em ${daysUntilDue} dias`;
            
            responseText += `*${card.name}* ${card.last_four_digits ? `(****${card.last_four_digits})` : ''}\n` +
              `💰 Fatura Atual: R$ ${totalSpent.toFixed(2).replace('.', ',')}\n` +
              `📊 Limite: R$ ${limit.toFixed(2).replace('.', ',')} (${usedPercent.toFixed(0)}% usado)\n` +
              `📅 Vencimento: ${whenText} (dia ${dueDay})\n\n`;
          }
          
          responseText += `_Gerencie seus cartões no app!_`;
        }
        break;
