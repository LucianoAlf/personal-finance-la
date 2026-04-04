// Edge Function: Automação de Faturas
// Substitui pg_cron em planos gratuitos do Supabase
// Executada via GitHub Actions diariamente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceAutomationResponse {
  success: boolean;
  closedInvoices: number;
  overdueInvoices: number;
  errors: string[];
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autorização (apenas requisições autorizadas podem executar)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service_role para bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const errors: string[] = [];
    let closedCount = 0;
    let overdueCount = 0;

    // ============================================
    // 1. FECHAR FATURAS AUTOMATICAMENTE
    // ============================================
    console.log('🔄 Iniciando fechamento de faturas...');
    
    try {
      // Buscar faturas abertas cujo período já terminou
      const { data: openInvoices, error: fetchError } = await supabase
        .from('credit_card_invoices')
        .select('id, credit_card_id, closing_date')
        .eq('status', 'open')
        .lt('closing_date', new Date().toISOString());

      if (fetchError) {
        throw new Error(`Erro ao buscar faturas: ${fetchError.message}`);
      }

      if (openInvoices && openInvoices.length > 0) {
        console.log(`📋 Encontradas ${openInvoices.length} faturas para fechar`);

        // Fechar cada fatura
        for (const invoice of openInvoices) {
          // Calcular total da fatura (somar transações)
          const { data: transactions, error: txError } = await supabase
            .from('credit_card_transactions')
            .select('amount')
            .eq('invoice_id', invoice.id);

          if (txError) {
            errors.push(`Erro ao calcular total da fatura ${invoice.id}: ${txError.message}`);
            continue;
          }

          const totalAmount = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

          // Atualizar fatura para fechada
          const { error: updateError } = await supabase
            .from('credit_card_invoices')
            .update({
              status: 'closed',
              total_amount: totalAmount,
              remaining_amount: totalAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

          if (updateError) {
            errors.push(`Erro ao fechar fatura ${invoice.id}: ${updateError.message}`);
          } else {
            closedCount++;
            console.log(`✅ Fatura ${invoice.id} fechada - Total: R$ ${totalAmount.toFixed(2)}`);
          }
        }
      } else {
        console.log('ℹ️ Nenhuma fatura para fechar');
      }
    } catch (error: any) {
      errors.push(`Erro no fechamento de faturas: ${error.message}`);
      console.error('❌ Erro:', error);
    }

    // ============================================
    // 2. VERIFICAR FATURAS VENCIDAS
    // ============================================
    console.log('🔄 Verificando faturas vencidas...');

    try {
      // Buscar faturas abertas ou fechadas que já venceram
      const { data: unpaidInvoices, error: fetchError } = await supabase
        .from('credit_card_invoices')
        .select('id, due_date, total_amount, paid_amount')
        .in('status', ['open', 'closed'])
        .lt('due_date', new Date().toISOString());

      if (fetchError) {
        throw new Error(`Erro ao buscar faturas vencidas: ${fetchError.message}`);
      }

      if (unpaidInvoices && unpaidInvoices.length > 0) {
        console.log(`📋 Encontradas ${unpaidInvoices.length} faturas vencidas`);

        // Marcar cada fatura como vencida
        for (const invoice of unpaidInvoices) {
          // Verificar se não está totalmente paga
          const isPaid = invoice.paid_amount >= invoice.total_amount;
          
          if (!isPaid) {
            const { error: updateError } = await supabase
              .from('credit_card_invoices')
              .update({
                status: 'overdue',
                updated_at: new Date().toISOString(),
              })
              .eq('id', invoice.id);

            if (updateError) {
              errors.push(`Erro ao marcar fatura ${invoice.id} como vencida: ${updateError.message}`);
            } else {
              overdueCount++;
              console.log(`⚠️ Fatura ${invoice.id} marcada como vencida`);
            }
          }
        }
      } else {
        console.log('ℹ️ Nenhuma fatura vencida');
      }
    } catch (error: any) {
      errors.push(`Erro na verificação de faturas vencidas: ${error.message}`);
      console.error('❌ Erro:', error);
    }

    // ============================================
    // 3. RESPOSTA
    // ============================================
    const response: InvoiceAutomationResponse = {
      success: errors.length === 0,
      closedInvoices: closedCount,
      overdueInvoices: overdueCount,
      errors,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Automação concluída:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
