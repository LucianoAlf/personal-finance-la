/**
 * Day Context Builder — unifies calendar events, TickTick tasks, bills, and goals
 * into a single human-readable summary for a given date.
 * Injected into the NLP prompt via agentEnrichment.agendaHoje.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface DayContextItem {
  time?: string;
  label: string;
  type: 'event' | 'task' | 'bill' | 'goal';
  status?: string;
  amount?: number;
}

export interface DayContext {
  date: string;
  items: DayContextItem[];
  formatted: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(isoStr: string | null): string | undefined {
  if (!isoStr) return undefined;
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch {
    return undefined;
  }
}

function formatCurrency(amount: number): string {
  return `R$ ${amount.toFixed(2).replace('.', ',')}`;
}

export async function buildDayContext(
  supabase: SupabaseClient,
  userId: string,
  targetDate?: Date,
): Promise<DayContext> {
  const date = targetDate || new Date();
  const dateStr = formatDate(date);
  const items: DayContextItem[] = [];

  // 1. Calendar events for the day
  try {
    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, start_datetime, end_datetime, status, category')
      .eq('user_id', userId)
      .gte('start_datetime', `${dateStr}T00:00:00`)
      .lt('start_datetime', `${dateStr}T23:59:59`)
      .order('start_datetime');

    if (events) {
      for (const ev of events) {
        items.push({
          time: formatTime(ev.start_datetime),
          label: ev.title,
          type: 'event',
          status: ev.status,
        });
      }
    }
  } catch (err) {
    console.warn('[day-context] Failed to load calendar events:', err);
  }

  // 2. Bills due today or overdue
  try {
    const { data: bills } = await supabase
      .from('payable_bills')
      .select('name, amount, due_date, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', dateStr)
      .order('due_date');

    if (bills) {
      for (const bill of bills) {
        const isOverdue = bill.due_date < dateStr;
        items.push({
          label: `${isOverdue ? '[ATRASADA] ' : ''}${bill.name}`,
          type: 'bill',
          status: bill.status,
          amount: Number(bill.amount),
        });
      }
    }
  } catch (err) {
    console.warn('[day-context] Failed to load bills:', err);
  }

  // 3. Savings/spending goals with progress
  try {
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('name, target_amount, current_amount, deadline')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('deadline', 'is', null)
      .lte('deadline', dateStr)
      .order('deadline');

    if (goals) {
      for (const goal of goals) {
        const pct = Math.round(
          (Number(goal.current_amount) / Number(goal.target_amount)) * 100,
        );
        items.push({
          label: `Meta "${goal.name}" vence hoje (${pct}%)`,
          type: 'goal',
          amount: Number(goal.target_amount) - Number(goal.current_amount),
        });
      }
    }
  } catch (err) {
    console.warn('[day-context] Failed to load goals:', err);
  }

  // Format for prompt
  const formatted = formatDayContextForPrompt(dateStr, items);

  return { date: dateStr, items, formatted };
}

function formatDayContextForPrompt(
  dateStr: string,
  items: DayContextItem[],
): string {
  if (items.length === 0) {
    return `*AGENDA DE HOJE (${dateStr})*\nNada programado para hoje.`;
  }

  const lines: string[] = [`*AGENDA DE HOJE (${dateStr})*`];

  const events = items.filter((i) => i.type === 'event');
  if (events.length > 0) {
    lines.push('\n*Eventos*');
    for (const ev of events) {
      lines.push(`- ${ev.time ? `${ev.time} — ` : ''}${ev.label}`);
    }
  }

  const bills = items.filter((i) => i.type === 'bill');
  if (bills.length > 0) {
    const totalBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    lines.push(`\n*Contas* (${bills.length} | total: ${formatCurrency(totalBills)})`);
    for (const bill of bills) {
      lines.push(
        `- ${bill.label}${bill.amount ? ` — ${formatCurrency(bill.amount)}` : ''}`,
      );
    }
  }

  const goals = items.filter((i) => i.type === 'goal');
  if (goals.length > 0) {
    lines.push('\n*Metas vencendo*');
    for (const goal of goals) {
      lines.push(
        `- ${goal.label}${goal.amount ? ` (faltam ${formatCurrency(goal.amount)})` : ''}`,
      );
    }
  }

  return lines.join('\n');
}
