import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { processGamificationEvent } from '@/lib/gamification';
import {
  PayableBill,
  CreateBillInput,
  UpdateBillInput,
  MarkBillAsPaidInput,
  BillFilters,
  BillsSummary,
} from '@/types/payable-bills.types';
import { addDays, parseISO, isWithinInterval } from 'date-fns';
import { normalizePayableBillTags } from '@/utils/payableBillTags';

async function replaceBillTagsRpc(billId: string, tagIds: string[]) {
  const { error } = await supabase.rpc('replace_bill_tags', {
    p_bill_id: billId,
    p_tag_ids: tagIds,
  });
  if (error) throw error;
}

export function usePayableBills(initialFilters?: BillFilters) {
  const { user } = useAuth();
  const [bills, setBills] = useState<PayableBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BillFilters>(initialFilters || {});
  const channelNameRef = useRef(`payable-bills-${crypto.randomUUID()}`);

  const syncRecurringBillsHorizon = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase.rpc('generate_recurring_bills', {
      p_horizon_days: 120,
    });

    if (error) {
      throw error;
    }
  }, [user?.id]);

  // ============================================
  // FETCH: Buscar contas
  // ============================================
  const fetchBills = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from('payable_bills')
        .select(`
          *,
          bill_tags (
            tags (*)
          )
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      // Aplicar filtros
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.bill_type) {
        if (Array.isArray(filters.bill_type)) {
          // Se inclui 'credit_card', também incluir parcelamentos com payment_method='credit_card'
          if (filters.bill_type.includes('credit_card')) {
            const otherTypes = filters.bill_type.filter(t => t !== 'credit_card');
            if (otherTypes.length > 0) {
              query = query.or(`bill_type.in.(${filters.bill_type.join(',')}),payment_method.eq.credit_card`);
            } else {
              query = query.or(`bill_type.eq.credit_card,payment_method.eq.credit_card`);
            }
          } else {
            query = query.in('bill_type', filters.bill_type);
          }
        } else {
          // Se filtro é 'credit_card', incluir também parcelamentos com payment_method='credit_card'
          if (filters.bill_type === 'credit_card') {
            query = query.or(`bill_type.eq.credit_card,payment_method.eq.credit_card`);
          } else {
            query = query.eq('bill_type', filters.bill_type);
          }
        }
      }

      if (filters.provider_name) {
        query = query.ilike('provider_name', `%${filters.provider_name}%`);
      }

      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in('priority', filters.priority);
        } else {
          query = query.eq('priority', filters.priority);
        }
      }

      if (filters.is_recurring !== undefined) {
        query = query.eq('is_recurring', filters.is_recurring);
      }

      if (filters.is_installment !== undefined) {
        query = query.eq('is_installment', filters.is_installment);
      }

      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }

      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar dados para incluir tags como objetos do domínio
      const billsWithTags = (data || []).map((bill: any) => ({
        ...bill,
        tags: normalizePayableBillTags(bill),
      }));

      // Busca local (search)
      let filteredData = billsWithTags;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(
          (bill) =>
            bill.description.toLowerCase().includes(searchLower) ||
            bill.provider_name?.toLowerCase().includes(searchLower)
        );
      }

      setBills(filteredData);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // ============================================
  // REALTIME: Atualização em tempo real
  // ============================================
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payable_bills', filter: `user_id=eq.${user.id}` },
        () => {
          fetchBills();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime[payable_bills] channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Mantém o canal estável por usuário sem recriar a subscription a cada refetch

  // ============================================
  // CREATE: Criar conta
  // ============================================
  const createBill = async (input: CreateBillInput) => {
    if (!user?.id) return null;

    try {
      const { tags, ...rowPayload } = input;
      const { data, error } = await supabase
        .from('payable_bills')
        .insert([
          {
            user_id: user.id,
            ...rowPayload,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        await replaceBillTagsRpc(data.id, tags ?? []);
      }

      if (input.is_recurring) {
        await syncRecurringBillsHorizon();
      }

      toast.success('Conta criada com sucesso!');
      await fetchBills();
      return data;
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta');
      return null;
    }
  };

  // ============================================
  // CREATE MANY: Criar parcelamento
  // ============================================
  const createInstallmentBills = async (
    input: CreateBillInput & { installment_total: number }
  ) => {
    if (!user?.id) return null;

    try {
      const installment_group_id = crypto.randomUUID();
      const bills_to_insert: any[] = [];

      for (let i = 1; i <= input.installment_total; i++) {
        const due_date = new Date(input.due_date);
        due_date.setMonth(due_date.getMonth() + (i - 1));

        bills_to_insert.push({
          user_id: user.id,
          description: `${input.description} (${i}/${input.installment_total})`,
          amount: input.amount,
          due_date: due_date.toISOString().split('T')[0],
          bill_type: input.bill_type,
          provider_name: input.provider_name,
          category_id: input.category_id,
          payment_account_id: input.payment_account_id,
          payment_method: input.payment_method,
          is_installment: true,
          installment_number: i,
          installment_total: input.installment_total,
          installment_group_id,
          original_purchase_amount: input.amount * input.installment_total,
          reminder_enabled: input.reminder_enabled ?? true,
          reminder_days_before: input.reminder_days_before ?? 3,
          reminder_channels: input.reminder_channels ?? ['app'],
          priority: input.priority ?? 'medium',
          notes: input.notes,
          status: 'pending',
        });
      }

      const { data, error } = await supabase
        .from('payable_bills')
        .insert(bills_to_insert)
        .select();

      if (error) throw error;

      const tagIds = input.tags ?? [];
      if (data?.length) {
        for (const row of data) {
          if (row.id) {
            await replaceBillTagsRpc(row.id, tagIds);
          }
        }
      }

      toast.success(
        `Parcelamento criado com sucesso! ${input.installment_total} parcelas.`
      );
      await fetchBills();
      return data;
    } catch (error) {
      console.error('Erro ao criar parcelamento:', error);
      toast.error('Erro ao criar parcelamento');
      return null;
    }
  };

  // ============================================
  // UPDATE: Atualizar conta
  // ============================================
  const updateBill = async (id: string, input: UpdateBillInput) => {
    if (!user?.id) return null;

    try {
      const { tags: nextTagIds, ...inputWithoutTags } = input;

      // 1. Buscar conta atual para verificar status e valores
      const { data: currentBill, error: fetchError } = await supabase
        .from('payable_bills')
        .select('status, amount, paid_amount, paid_at, is_recurring, recurrence_config, due_date, parent_bill_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Limpar dados para evitar violação de constraints
      const cleanInput: Record<string, unknown> = { ...inputWithoutTags };

      // 3. Constraint valid_paid_status: Se a conta está PAGA e o valor foi alterado
      if (currentBill.status === 'paid' && cleanInput.amount !== undefined) {
        // Se o novo valor é diferente do valor pago, atualizar paid_amount também
        if (cleanInput.amount !== currentBill.paid_amount) {
          cleanInput.paid_amount = cleanInput.amount;
        }
      }

      // 4. Constraint valid_recurrence: Se is_recurring = true, recurrence_config deve existir e ter frequency válido
      if (cleanInput.is_recurring) {
        const config = cleanInput.recurrence_config as { frequency?: string } | null | undefined;
        if (!config || !config.frequency) {
          // Se não tem config válida, desativar recorrência
          cleanInput.is_recurring = false;
          cleanInput.recurrence_config = null;
        }
      } else if (cleanInput.is_recurring === false) {
        // Se desativou recorrência, limpar config
        cleanInput.recurrence_config = null;
      }

      // 5. Remover campos undefined
      Object.keys(cleanInput).forEach(key => {
        if (cleanInput[key] === undefined) {
          delete cleanInput[key];
        }
      });

      const rowPatchKeys = Object.keys(cleanInput);
      let data: PayableBill | null = null;

      if (rowPatchKeys.length > 0) {
        const { data: updated, error } = await supabase
          .from('payable_bills')
          .update(cleanInput)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        data = updated as PayableBill;

        const willRemainRecurringTemplate =
          !currentBill.parent_bill_id &&
          (cleanInput.is_recurring === true ||
            (cleanInput.is_recurring === undefined && currentBill.is_recurring));

        if (willRemainRecurringTemplate) {
          const effectiveDueDate = String(cleanInput.due_date ?? currentBill.due_date);

          await supabase
            .from('payable_bills')
            .delete()
            .eq('parent_bill_id', id)
            .in('status', ['pending', 'scheduled'])
            .gt('due_date', effectiveDueDate);

          await supabase
            .from('payable_bills')
            .update({
              next_occurrence_date: effectiveDueDate,
            })
            .eq('id', id)
            .eq('user_id', user.id);

          await syncRecurringBillsHorizon();
        }
      } else {
        const { data: currentRow, error: readError } = await supabase
          .from('payable_bills')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        if (readError) throw readError;
        data = currentRow as PayableBill;
      }

      if (nextTagIds !== undefined) {
        await replaceBillTagsRpc(id, nextTagIds);
      }

      toast.success('Conta atualizada com sucesso!');
      await fetchBills();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
      return null;
    }
  };

  // ============================================
  // DELETE: Deletar conta
  // ============================================
  const deleteBill = async (id: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('payable_bills')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Conta deletada com sucesso!');
      await fetchBills();
      return true;
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      toast.error('Erro ao deletar conta');
      return false;
    }
  };

  // ============================================
  // DELETE GROUP: Deletar grupo de parcelamento
  // ============================================
  const deleteInstallmentGroup = async (groupId: string) => {
    if (!user?.id) return false;

    try {
      // 1. Deletar de payable_bills
      const { error } = await supabase
        .from('payable_bills')
        .delete()
        .eq('installment_group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Deletar também de credit_card_transactions (se existir)
      // Isso garante sincronização entre Contas a Pagar e Cartões
      await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('installment_group_id', groupId)
        .eq('user_id', user.id);

      toast.success('Parcelamento deletado com sucesso!');
      await fetchBills();
      return true;
    } catch (error) {
      console.error('Erro ao deletar parcelamento:', error);
      toast.error('Erro ao deletar parcelamento');
      return false;
    }
  };

  // ============================================
  // MARK AS PAID: Marcar como paga
  // ============================================
  const markAsPaid = async (input: MarkBillAsPaidInput) => {
    if (!user?.id) return null;

    try {
      // Chamar function SQL
      const { data, error } = await supabase.rpc('mark_bill_as_paid', {
        p_bill_id: input.bill_id,
        p_user_id: user.id,
        p_paid_amount: input.paid_amount,
        p_payment_method: input.payment_method,
        p_account_from_id: input.account_from_id || null,
        p_confirmation_number: input.confirmation_number || null,
        p_payment_proof_url: input.payment_proof_url || null,
        p_notes: input.notes || null,
      });

      if (error) throw error;

      const result = data as any;

      if (result.status === 'paid') {
        toast.success('Conta marcada como paga!');
      } else if (result.status === 'partial') {
        const remaining = result.remaining;
        toast.success(
          `Pagamento registrado! Faltam R$ ${remaining.toFixed(2)}`
        );
      }

      await fetchBills();
      await processGamificationEvent('pay_bill');
      return result;
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      toast.error('Erro ao registrar pagamento');
      return null;
    }
  };

  // ============================================
  // REVERT PAYMENT: Reverter pagamento
  // ============================================
  const revertPayment = async (billId: string) => {
    if (!user?.id) return false;

    try {
      // 1. Buscar a conta para obter dados do pagamento
      const { data: bill, error: fetchError } = await supabase
        .from('payable_bills')
        .select('*, payment_account_id, paid_amount')
        .eq('id', billId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      if (bill.status !== 'paid' && bill.status !== 'partial') {
        toast.error('Esta conta não está paga');
        return false;
      }

      // 2. Se tinha conta bancária associada, reverter o saldo
      if (bill.payment_account_id && bill.paid_amount) {
        // Buscar saldo atual da conta
        const { data: account, error: fetchAccountError } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('id', bill.payment_account_id)
          .single();

        if (!fetchAccountError && account) {
          const newBalance = Number(account.current_balance) + Number(bill.paid_amount);
          const { error: updateError } = await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', bill.payment_account_id);

          if (updateError) {
            console.error('Erro ao reverter saldo:', updateError);
          }
        }
      }

      // 3. Buscar e deletar transação associada (se houver)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('payable_bill_id', billId);

      if (transactions && transactions.length > 0) {
        await supabase
          .from('transactions')
          .delete()
          .eq('payable_bill_id', billId)
          .eq('user_id', user.id);
      }

      // 4. Deletar histórico de pagamento
      await supabase
        .from('bill_payment_history')
        .delete()
        .eq('bill_id', billId)
        .eq('user_id', user.id);

      // 5. Reverter status da conta para pending
      const { error: updateError } = await supabase
        .from('payable_bills')
        .update({
          status: 'pending',
          paid_at: null,
          paid_amount: null,
          payment_method: null,
          payment_account_id: null,
          payment_proof_url: null,
        })
        .eq('id', billId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Pagamento revertido com sucesso!');
      await fetchBills();
      return true;
    } catch (error) {
      console.error('Erro ao reverter pagamento:', error);
      toast.error('Erro ao reverter pagamento');
      return false;
    }
  };

  // ============================================
  // FILTROS COMPUTADOS
  // ============================================
  // Contas vencidas: status não é 'paid' E data de vencimento < hoje
  const overdueBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Início do dia
    
    return bills.filter((b) => {
      if (b.status === 'paid') return false;
      const dueDate = parseISO(b.due_date);
      return dueDate < today;
    });
  }, [bills]);

  // Contas pendentes: status pending/scheduled E data de vencimento >= hoje
  const pendingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Início do dia
    
    return bills.filter((b) => {
      if (b.status !== 'pending' && b.status !== 'scheduled') return false;
      const dueDate = parseISO(b.due_date);
      return dueDate >= today;
    });
  }, [bills]);

  const paidBills = useMemo(
    () => bills.filter((b) => b.status === 'paid'),
    [bills]
  );

  const partialBills = useMemo(
    () => bills.filter((b) => b.status === 'partial'),
    [bills]
  );

  // Próximas 7 dias
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const in7Days = addDays(today, 7);

    return bills.filter((b) => {
      if (b.status !== 'pending' && b.status !== 'scheduled') return false;
      const dueDate = parseISO(b.due_date);
      return isWithinInterval(dueDate, { start: today, end: in7Days });
    });
  }, [bills]);

  // Contas recorrentes (templates)
  const recurringBills = useMemo(
    () => bills.filter((b) => b.is_recurring && !b.parent_bill_id),
    [bills]
  );

  // Parcelamentos (agrupados)
  const installmentGroups = useMemo(() => {
    const groups = new Map<string, PayableBill[]>();

    bills
      .filter((b) => b.is_installment && b.installment_group_id)
      .forEach((bill) => {
        const groupId = bill.installment_group_id!;
        if (!groups.has(groupId)) {
          groups.set(groupId, []);
        }
        groups.get(groupId)!.push(bill);
      });

    return Array.from(groups.entries()).map(([group_id, groupBills]) => {
      const firstBill = groupBills[0];
      return {
        group_id,
        bills: groupBills.sort((a, b) => a.installment_number! - b.installment_number!),
        total: firstBill?.original_purchase_amount || 0,
        paid_count: groupBills.filter((b) => b.status === 'paid').length,
        total_count: groupBills.length,
        // Método de pagamento (pegar do primeiro bill do grupo)
        payment_method: firstBill?.payment_method || null,
        credit_card_id: firstBill?.credit_card_id || null,
      };
    });
  }, [bills]);

  // ============================================
  // RESUMOS
  // ============================================
  const summary = useMemo(() => {
    const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
    const pendingAmount = pendingBills.reduce((sum, b) => sum + b.amount, 0);
    const overdueAmount = overdueBills.reduce((sum, b) => sum + b.amount, 0);
    const paidAmount = paidBills.reduce((sum, b) => sum + b.amount, 0);
    const partialAmount = partialBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);

    return {
      total_bills: bills.length,
      pending_count: pendingBills.length,
      overdue_count: overdueBills.length,
      paid_count: paidBills.length,
      partial_count: partialBills.length,
      total_amount: totalAmount,
      pending_amount: pendingAmount,
      overdue_amount: overdueAmount,
      paid_amount: paidAmount,
      partial_amount: partialAmount,
      critical_pending: pendingBills.filter(
        (b) => b.priority === 'critical'
      ).length,
      high_pending: pendingBills.filter(
        (b) => b.priority === 'high'
      ).length,
    };
  }, [bills, pendingBills, overdueBills, paidBills, partialBills]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // Data
    bills,
    pendingBills,
    overdueBills,
    paidBills,
    partialBills,
    upcomingBills,
    recurringBills,
    installmentGroups,
    summary,

    // State
    loading,
    filters,
    setFilters,

    // Actions
    fetchBills,
    createBill,
    createInstallmentBills,
    updateBill,
    deleteBill,
    deleteInstallmentGroup,
    markAsPaid,
    revertPayment,
  };
}
