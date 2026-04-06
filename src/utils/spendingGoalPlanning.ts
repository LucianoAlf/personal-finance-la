import type { CreditCardTransaction, FinancialGoalWithCategory } from '@/types/database.types';
import type { Category } from '@/types/categories';
import type { Transaction } from '@/types/transactions';
import type { BudgetItem } from '@/hooks/useBudgets';

export interface SpendingPlanSuggestion {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  suggested_amount: number;
  average_amount: number;
  last_month_amount: number;
  current_limit?: number;
}

export interface SpendingPlanSummary {
  totalPlanned: number;
  totalActual: number;
  totalDifference: number;
  utilizationPct: number;
  safeCount: number;
  warningCount: number;
  exceededCount: number;
}

export function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthBounds(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, 1);
  const end = new Date(year, month || 1, 0);
  return { start, end };
}

export function getPreviousMonthKey(monthKey: string): string {
  const { start } = getMonthBounds(monthKey);
  return formatMonthKey(new Date(start.getFullYear(), start.getMonth() - 1, 1));
}

export function getLastNMonthKeys(monthKey: string, count: number): string[] {
  const { start } = getMonthBounds(monthKey);
  return Array.from({ length: count }, (_, index) =>
    formatMonthKey(new Date(start.getFullYear(), start.getMonth() - index, 1))
  );
}

function asDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(`${value}T12:00:00`);
}

export function isSpendingGoalActiveInMonth(goal: FinancialGoalWithCategory, monthKey: string): boolean {
  if (goal.goal_type !== 'spending_limit') return false;
  if (goal.status === 'archived' || !goal.category_id) return false;

  const { start, end } = getMonthBounds(monthKey);
  const goalStart = asDate(goal.period_start);
  const goalEnd = asDate(goal.period_end);

  if (!goalStart || !goalEnd) return false;
  return goalStart <= end && goalEnd >= start;
}

export function isMonthlySpendingGoalForMonth(
  goal: FinancialGoalWithCategory,
  monthKey: string
): boolean {
  if (!isSpendingGoalActiveInMonth(goal, monthKey)) return false;
  return goal.period_type === 'monthly' && formatMonthKey(asDate(goal.period_start) || new Date()) === monthKey;
}

export function getSpendingGoalsForMonth(
  goals: FinancialGoalWithCategory[],
  monthKey: string
): FinancialGoalWithCategory[] {
  return goals.filter((goal) => isSpendingGoalActiveInMonth(goal, monthKey));
}

export function toBudgetItemsFromSpendingGoals(
  goals: FinancialGoalWithCategory[],
  monthKey: string
): BudgetItem[] {
  return getSpendingGoalsForMonth(goals, monthKey).map((goal) => {
    const planned = Number(goal.target_amount || 0);
    const actual = Number(goal.current_amount || 0);
    const percentage = planned > 0 ? (actual / planned) * 100 : 0;

    return {
      id: goal.id,
      category_id: goal.category_id || goal.id,
      category_name: goal.category_name || goal.name,
      category_icon: goal.category_icon || 'Wallet',
      category_color: '#f97316',
      planned_amount: planned,
      actual_amount: actual,
      difference: actual - planned,
      percentage,
      status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok',
      month: monthKey,
    };
  });
}

export function summarizeBudgetItems(items: BudgetItem[]): SpendingPlanSummary {
  const totalPlanned = items.reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const totalActual = items.reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
  const totalDifference = totalPlanned - totalActual;

  return {
    totalPlanned,
    totalActual,
    totalDifference,
    utilizationPct: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
    safeCount: items.filter((item) => item.status === 'ok').length,
    warningCount: items.filter((item) => item.status === 'warning').length,
    exceededCount: items.filter((item) => item.status === 'exceeded').length,
  };
}

export function buildSpendingPlanSuggestions(params: {
  categories: Category[];
  goals: FinancialGoalWithCategory[];
  transactions: Transaction[];
  creditCardTransactions: CreditCardTransaction[];
  monthKey: string;
}): SpendingPlanSuggestion[] {
  const { categories, goals, transactions, creditCardTransactions, monthKey } = params;
  const trailingMonths = getLastNMonthKeys(getPreviousMonthKey(monthKey), 3);
  const currentPlan = new Map(
    getSpendingGoalsForMonth(goals, monthKey).map((goal) => [goal.category_id, Number(goal.target_amount || 0)])
  );

  return categories
    .filter((category) => category.type === 'expense')
    .map((category) => {
      const monthlyTotals = trailingMonths.map((candidateMonth) => {
        const regular = transactions
          .filter(
            (transaction) =>
              transaction.type === 'expense' &&
              transaction.category_id === category.id &&
              transaction.is_paid &&
              !transaction.credit_card_id &&
              String(transaction.transaction_date || '').slice(0, 7) === candidateMonth
          )
          .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

        const credit = creditCardTransactions
          .filter(
            (transaction) =>
              transaction.category_id === category.id &&
              String(transaction.purchase_date || '').slice(0, 7) === candidateMonth
          )
          .reduce((sum, transaction) => {
            const total = Number(transaction.total_amount || 0);
            if (total > 0 && transaction.is_parent_installment) return sum + total;
            return sum + Number(transaction.amount || 0);
          }, 0);

        return regular + credit;
      });

      const totalAcrossMonths = monthlyTotals.reduce((sum, value) => sum + value, 0);
      const average = totalAcrossMonths / Math.max(trailingMonths.length, 1);
      const suggested = Math.round(Math.max(average, monthlyTotals[0] || 0) * 1.05 * 100) / 100;

      return {
        category_id: category.id,
        category_name: category.name,
        category_icon: category.icon,
        category_color: category.color,
        suggested_amount: suggested,
        average_amount: Math.round(average * 100) / 100,
        last_month_amount: Math.round((monthlyTotals[0] || 0) * 100) / 100,
        current_limit: currentPlan.get(category.id),
      };
    })
    .filter((item) => item.suggested_amount > 0)
    .sort((a, b) => b.suggested_amount - a.suggested_amount);
}
