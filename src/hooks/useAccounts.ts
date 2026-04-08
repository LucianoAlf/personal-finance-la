import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Account, AccountType } from '@/types/accounts';
import { useAuth } from '@/hooks/useAuth';

const accountsCache = new Map<string, Account[]>();
const accountRequests = new Map<string, Promise<Account[]>>();

const normalizeAccounts = (rows: any[] | null | undefined): Account[] =>
  (rows || []).map((a: any) => ({
    ...a,
    current_balance: Number(a.current_balance) || 0,
    initial_balance: Number(a.initial_balance) || 0,
  }));

export const useAccounts = () => {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>(() =>
    user?.id ? accountsCache.get(user.id) ?? [] : []
  );
  const [loading, setLoading] = useState(() =>
    user?.id ? !accountsCache.has(user.id) : true
  );
  const [error, setError] = useState<string | null>(null);

  // Buscar contas ativas do usuário
  const fetchAccounts = useCallback(async () => {
    if (!user?.id) {
      setAccounts([]);
      setError(null);
      setLoading(false);
      return [];
    }

    const cached = accountsCache.get(user.id);

    try {
      setLoading(!cached);
      setError(null);

      if (cached) {
        setAccounts(cached);
      }

      const existingRequest = accountRequests.get(user.id);
      if (existingRequest) {
        const sharedAccounts = await existingRequest;
        setAccounts(sharedAccounts);
        return sharedAccounts;
      }

      const request = (async (): Promise<Account[]> => {
        const { data, error: fetchError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        const normalized = normalizeAccounts(data);
        accountsCache.set(user.id, normalized);
        return normalized;
      })();

      accountRequests.set(user.id, request);

      const resolvedAccounts = await request;
      setAccounts(resolvedAccounts);
      return resolvedAccounts;
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
      setError('Erro ao carregar contas. Tente novamente.');
      return [];
    } finally {
      if (user?.id) {
        accountRequests.delete(user.id);
      }
      setLoading(false);
    }
  }, [user?.id]);

  // Adicionar nova conta - recebe dados do formulário (sem current_balance)
  const addAccount = async (
    accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_balance'>
  ) => {
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

      const normalizedAccount = normalizeAccounts([data])[0];
      setAccounts(prev => {
        const next = [normalizedAccount, ...prev];
        if (user?.id) {
          accountsCache.set(user.id, next);
        }
        return next;
      });
      return data;
    } catch (err) {
      console.error('Erro ao adicionar conta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar conta');
      throw err;
    }
  };

  // Atualizar conta existente - se vier initial_balance, refletir em current_balance
  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      setError(null);

      const patch: Partial<Account> = {
        ...updates,
        // se o formulário enviou o saldo total em initial_balance,
        // sincronizamos o current_balance
        ...(typeof (updates as any).initial_balance === 'number'
          ? { current_balance: (updates as any).initial_balance }
          : {}),
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('accounts')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const normalizedAccount = normalizeAccounts([data])[0];
      setAccounts(prev => {
        const next = prev.map(account =>
          account.id === id ? normalizedAccount : account
        );
        if (user?.id) {
          accountsCache.set(user.id, next);
        }
        return next;
      });

      return data;
    } catch (err) {
      console.error('Erro ao atualizar conta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar conta');
      throw err;
    }
  };

  // Excluir conta (hard delete)
  const deleteAccount = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setAccounts(prev => {
        const next = prev.filter(account => account.id !== id);
        if (user?.id) {
          accountsCache.set(user.id, next);
        }
        return next;
      });
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir conta');
      throw err;
    }
  };

  // Calcular saldo total de todas as contas
  const getTotalBalance = (): number => {
    return accounts.reduce((total, account) => total + (Number((account as any).current_balance) || 0), 0);
  };

  // Calcular saldo por tipos específicos de conta
  const getBalanceByType = (types: AccountType[]): number => {
    return accounts
      .filter(account => types.includes(account.type))
      .reduce((total, account) => total + (Number((account as any).current_balance) || 0), 0);
  };

  // Effect para buscar contas e configurar realtime
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setAccounts([]);
      setError(null);
      setLoading(false);
      return;
    }

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
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAccounts();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, fetchAccounts, user?.id]);

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