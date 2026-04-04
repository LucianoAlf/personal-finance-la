// SPRINT 5.1: Edge Function para criar snapshots diários do portfólio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos usuários ativos
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true);

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
    const today = new Date().toISOString().split('T')[0];

    // 2. Processar cada usuário
    for (const user of users) {
      try {
        // Buscar investimentos ativos do usuário
        const { data: investments, error: invError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (invError || !investments || investments.length === 0) {
          console.log(`Usuário ${user.id} sem investimentos ativos`);
          continue;
        }

        // 3. Calcular métricas
        const totalInvested = investments.reduce(
          (sum: number, inv: any) => sum + (inv.total_invested || 0),
          0
        );
        const currentValue = investments.reduce(
          (sum: number, inv: any) => sum + (inv.current_value || inv.total_invested || 0),
          0
        );
        const returnAmount = currentValue - totalInvested;
        const returnPercentage = totalInvested > 0 ? (returnAmount / totalInvested) * 100 : 0;

        // 4. Calcular allocation
        const allocation: Record<string, number> = {};
        investments.forEach((inv: any) => {
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
        const topPerformers = investments
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

        // 7. Inserir snapshot
        const { error: insertError } = await supabase.from('portfolio_snapshots').insert({
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
        });

        if (insertError) {
          // Se já existe (UNIQUE constraint), apenas log
          if (insertError.code === '23505') {
            console.log(`Snapshot já existe para usuário ${user.id} em ${today}`);
          } else {
            console.error(`Erro ao inserir snapshot para usuário ${user.id}:`, insertError);
          }
        } else {
          snapshots.push({ user_id: user.id, success: true });
        }
      } catch (error) {
        console.error(`Erro ao processar usuário ${user.id}:`, error);
        snapshots.push({ user_id: user.id, success: false, error: String(error) });
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
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
