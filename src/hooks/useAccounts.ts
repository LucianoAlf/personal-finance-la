import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Account, AccountType } from '@/types/accounts';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar contas ativas do usuário
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAccounts(data || []);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
      setError('Erro ao carregar contas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar nova conta
  const addAccount = async (accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const newAccount = {
        ...accountData,
        user_id: user.id,
        current_balance: accountData.initial_balance,
      };

      const { data, error: insertError } = await supabase
        .from('accounts')
        .insert(newAccount)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setAccounts(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Erro ao adicionar conta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar conta');
      throw err;
    }
  };

  // Atualizar conta existente
  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('accounts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setAccounts(prev => 
        prev.map(account => 
          account.id === id ? data : account
        )
      );

      return data;
    } catch (err) {
      console.error('Erro ao atualizar conta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar conta');
      throw err;
    }
  };

  // Arquivar conta (soft delete)
  const deleteAccount = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('accounts')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setAccounts(prev => prev.filter(account => account.id !== id));
    } catch (err) {
      console.error('Erro ao arquivar conta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao arquivar conta');
      throw err;
    }
  };

  // Calcular saldo total de todas as contas
  const getTotalBalance = (): number => {
    return accounts.reduce((total, account) => total + (account.current_balance || 0), 0);
  };

  // Calcular saldo por tipos específicos de conta
  const getBalanceByType = (types: AccountType[]): number => {
    return accounts
      .filter(account => types.includes(account.type))
      .reduce((total, account) => total + (account.current_balance || 0), 0);
  };

  // Effect para buscar contas e configurar realtime
  useEffect(() => {
    fetchAccounts();

    // Configurar Realtime subscription
    const channel = supabase
      .channel('accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
        },
        (payload) => {
          console.log('Mudança detectada na tabela accounts:', payload);
          fetchAccounts();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    getTotalBalance,
    getBalanceByType,
  };
};