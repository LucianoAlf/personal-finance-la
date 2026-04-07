// SPRINT 5.1: Edge Function para criar snapshots diários do portfólio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildHouseholdBalanceSnapshot } from '../_shared/household-balance-snapshot.ts';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos usuários ativos
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum usuário ativo encontrado' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const snapshots = [];
    const today = getCurrentBrazilDate();

    // 2. Processar cada usuário
    for (const user of users) {
      try {
        // Buscar investimentos ativos do usuário
        const { data: investments, error: invError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (invError) {
          throw invError;
        }

        const [
          { data: accounts, error: accountsError },
          { data: payableBills, error: payableBillsError },
          { data: creditCards, error: creditCardsError },
        ] = await Promise.all([
          supabase
            .from('accounts')
            .select('id, type, current_balance, include_in_total, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase
            .from('payable_bills')
            .select('id, amount, status, due_date')
            .eq('user_id', user.id),
          supabase
            .from('credit_cards')
            .select('id, credit_limit, available_limit')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('is_archived', false),
        ]);

        if (accountsError) throw accountsError;
        if (payableBillsError) throw payableBillsError;
        if (creditCardsError) throw creditCardsError;

        const activeInvestments = (investments || []) as any[];

        // 3. Calcular métricas
        const totalInvested = activeInvestments.reduce(
          (sum: number, inv: any) => sum + (inv.total_invested || 0),
          0
        );
        const currentValue = activeInvestments.reduce(
          (sum: number, inv: any) => sum + (inv.current_value || inv.total_invested || 0),
          0
        );
        const returnAmount = currentValue - totalInvested;
        const returnPercentage = totalInvested > 0 ? (returnAmount / totalInvested) * 100 : 0;

        // 4. Calcular allocation
        const allocation: Record<string, number> = {};
        activeInvestments.forEach((inv: any) => {
          const category = inv.category || 'outros';
          const value = inv.current_value || inv.total_invested || 0;
          allocation[category] = (allocation[category] || 0) + value;
        });

        // Converter para percentuais
        const allocationPct: Record<string, number> = {};
        Object.keys(allocation).forEach((cat) => {
          allocationPct[cat] = currentValue > 0 ? (allocation[cat] / currentValue) * 100 : 0;
        });

        // 5. Top performers
        const topPerformers = activeInvestments
          .map((inv: any) => {
            const invested = inv.total_invested || 0;
            const current = inv.current_value || invested;
            const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
            return {
              ticker: inv.ticker || inv.name,
              return: returnPct,
            };
          })
          .sort((a, b) => b.return - a.return)
          .slice(0, 5);

        // 6. Dividendos YTD (buscar transações do ano)
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const { data: dividendTxs } = await supabase
          .from('investment_transactions')
          .select('total_value')
          .eq('user_id', user.id)
          .eq('transaction_type', 'dividend')
          .gte('transaction_date', yearStart);

        const dividendsYtd = dividendTxs
          ? dividendTxs.reduce((sum, tx) => sum + (tx.total_value || 0), 0)
          : 0;
        const dividendYield = totalInvested > 0 ? (dividendsYtd / totalInvested) * 100 : 0;
        const householdSnapshot = buildHouseholdBalanceSnapshot({
          referenceDate: today,
          accounts: (accounts || []) as any[],
          investments: activeInvestments,
          payableBills: (payableBills || []) as any[],
          creditCards: (creditCards || []) as any[],
        });

        // 7. Inserir snapshot
        const { error: insertError } = await supabase.from('portfolio_snapshots').upsert({
          user_id: user.id,
          snapshot_date: today,
          total_invested: totalInvested,
          current_value: currentValue,
          return_amount: returnAmount,
          return_percentage: returnPercentage,
          allocation: allocationPct,
          top_performers: topPerformers,
          dividends_ytd: dividendsYtd,
          dividend_yield: dividendYield,
          total_assets: householdSnapshot.totalAssets,
          total_liabilities: householdSnapshot.totalLiabilities,
          net_worth: householdSnapshot.netWorth,
          asset_breakdown: householdSnapshot.assetBreakdown,
          liability_breakdown: householdSnapshot.liabilityBreakdown,
        }, {
          onConflict: 'user_id,snapshot_date',
        });

        if (insertError) {
          console.error(`Erro ao inserir snapshot para usuário ${user.id}:`, insertError);
        } else {
          snapshots.push({ user_id: user.id, success: true });
        }
      } catch (error) {
        console.error(`Erro ao processar usuário ${user.id}:`, error);
        snapshots.push({ user_id: user.id, success: false, error: describeError(error) });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Snapshots criados para ${snapshots.filter((s) => s.success).length} de ${users.length} usuários`,
        snapshots,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: describeError(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return String(record.message || record.details || JSON.stringify(record));
  }

  return String(error);
}

function getCurrentBrazilDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}
