import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  detectAccountsDiagnosableAnomalies,
  detectAccountsObservationAnomalies,
  generateAccountsHealthCheckResponse,
  listAccountsDiagnosableAnomalies,
} from './accounts-diagnostic.ts';
import { listarContasPagar } from './contas-pagar.ts';

type FakeRow = Record<string, unknown>;

class FakeSelectQuery {
  private readonly sourceRows: FakeRow[];
  private filters: Array<(row: FakeRow) => boolean> = [];
  private sortBy: { column: string; ascending: boolean } | null = null;

  constructor(rows: FakeRow[]) {
    this.sourceRows = rows;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortBy = {
      column,
      ascending: options?.ascending ?? true,
    };
    return this;
  }

  then(resolve: (value: { data: FakeRow[]; error: null }) => void, reject?: (reason?: unknown) => void) {
    try {
      const data = [...this.sourceRows]
        .filter((row) => this.filters.every((filter) => filter(row)))
        .sort((a, b) => {
          if (!this.sortBy) return 0;

          const left = String(a[this.sortBy.column] ?? '');
          const right = String(b[this.sortBy.column] ?? '');
          return this.sortBy.ascending ? left.localeCompare(right) : right.localeCompare(left);
        });

      resolve({ data, error: null });
    } catch (error) {
      if (reject) reject(error);
    }
  }
}

function createReadonlySupabase(tables: Record<string, FakeRow[]>) {
  const mutationCalls: string[] = [];

  return {
    mutationCalls,
    from(table: string) {
      return {
        select() {
          return new FakeSelectQuery(tables[table] ?? []);
        },
        insert() {
          mutationCalls.push(`insert:${table}`);
          throw new Error(`Unexpected insert on ${table}`);
        },
        update() {
          mutationCalls.push(`update:${table}`);
          throw new Error(`Unexpected update on ${table}`);
        },
        delete() {
          mutationCalls.push(`delete:${table}`);
          throw new Error(`Unexpected delete on ${table}`);
        },
        upsert() {
          mutationCalls.push(`upsert:${table}`);
          throw new Error(`Unexpected upsert on ${table}`);
        },
      };
    },
    rpc(name: string) {
      mutationCalls.push(`rpc:${name}`);
      throw new Error(`Unexpected rpc call: ${name}`);
    },
  };
}

Deno.test('detectAccountsObservationAnomalies sorts S1 before S2 and due date ascending inside the same severity', () => {
  const anomalies = detectAccountsObservationAnomalies([
    {
      id: 'zero-late',
      description: 'Conta zerada tardia',
      provider_name: 'Operadora X',
      amount: 0,
      due_date: '2026-04-08',
      status: 'pending',
      paid_at: null,
    },
    {
      id: 'overdue-newer',
      description: 'Internet',
      provider_name: null,
      amount: 120,
      due_date: '2026-04-05',
      status: 'pending',
      paid_at: null,
    },
    {
      id: 'overdue-older',
      description: 'Aluguel',
      provider_name: null,
      amount: 1500,
      due_date: '2026-04-01',
      status: 'pending',
      paid_at: null,
    },
    {
      id: 'zero-only',
      description: 'Streaming',
      provider_name: 'Netflix',
      amount: null,
      due_date: '2026-04-03',
      status: 'overdue',
      paid_at: null,
    },
  ], {
    today: new Date('2026-04-10T12:00:00-03:00'),
  });

  assertEquals(
    anomalies.map((anomaly) => [anomaly.type, anomaly.billId]),
    [
      ['overdue_without_settlement', 'overdue-older'],
      ['overdue_without_settlement', 'overdue-newer'],
      ['overdue_without_settlement', 'zero-late'],
      ['zeroed_bill', 'zero-only'],
      ['zeroed_bill', 'zero-late'],
    ],
  );
});

Deno.test('listarContasPagar keeps the current list and appends only the top 3 anomalies without mutating state', async () => {
  const supabase = createReadonlySupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: 'user-1',
        description: 'Aluguel',
        provider_name: null,
        amount: 1500,
        due_date: '2026-04-01',
        status: 'pending',
        is_recurring: true,
        bill_type: 'housing',
        category: null,
        account: null,
        paid_at: null,
      },
      {
        id: 'bill-2',
        user_id: 'user-1',
        description: 'Internet',
        provider_name: null,
        amount: 210,
        due_date: '2026-04-02',
        status: 'pending',
        is_recurring: true,
        bill_type: 'utilities',
        category: null,
        account: null,
        paid_at: null,
      },
      {
        id: 'bill-3',
        user_id: 'user-1',
        description: 'Streaming',
        provider_name: 'Netflix',
        amount: 0,
        due_date: '2026-04-03',
        status: 'overdue',
        is_recurring: true,
        bill_type: 'entertainment',
        category: null,
        account: null,
        paid_at: null,
      },
      {
        id: 'bill-4',
        user_id: 'user-1',
        description: 'Celular',
        provider_name: 'Vivo',
        amount: 0,
        due_date: '2026-04-04',
        status: 'pending',
        is_recurring: true,
        bill_type: 'utilities',
        category: null,
        account: null,
        paid_at: null,
      },
    ],
    credit_card_invoices: [],
  });

  const result = await listarContasPagar('user-1', {
    supabase,
    diagnostics: {
      supabase,
      today: new Date('2026-04-10T12:00:00-03:00'),
    },
  });

  assertStringIncludes(result.mensagem, '📋 *Suas Contas a Pagar*');
  assertStringIncludes(result.mensagem, '💰 *Total pendente:*');
  assertStringIncludes(result.mensagem, 'Notei alguns pontos que merecem atenção');
  assertStringIncludes(result.mensagem, "e mais 1 itens que merecem atencao. Diga 'analisa minhas contas' para ver tudo.");
  assertStringIncludes(result.mensagem, "ainda nao tem pagamento registrado");

  const aluguelIndex = result.mensagem.indexOf('*Aluguel*');
  const internetIndex = result.mensagem.indexOf('*Internet*');
  const celularIndex = result.mensagem.indexOf('*Celular*');

  assertEquals(aluguelIndex < internetIndex, true);
  assertEquals(internetIndex < celularIndex, true);
  assertEquals(supabase.mutationCalls, []);
});

Deno.test('generateAccountsHealthCheckResponse returns the full ordered report without mutating state', async () => {
  const supabase = createReadonlySupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: 'user-1',
        description: 'Aluguel',
        provider_name: null,
        amount: 1500,
        due_date: '2026-04-01',
        status: 'pending',
        paid_at: null,
      },
      {
        id: 'bill-2',
        user_id: 'user-1',
        description: 'Internet',
        provider_name: null,
        amount: 210,
        due_date: '2026-04-02',
        status: 'pending',
        paid_at: null,
      },
      {
        id: 'bill-3',
        user_id: 'user-1',
        description: 'Streaming',
        provider_name: 'Netflix',
        amount: 0,
        due_date: '2026-04-03',
        status: 'overdue',
        paid_at: null,
      },
      {
        id: 'bill-4',
        user_id: 'user-1',
        description: 'Celular',
        provider_name: 'Vivo',
        amount: 0,
        due_date: '2026-04-04',
        status: 'pending',
        paid_at: null,
      },
    ],
  });

  const message = await generateAccountsHealthCheckResponse('user-1', {
    supabase,
    today: new Date('2026-04-10T12:00:00-03:00'),
  });

  assertStringIncludes(message, 'Checkup das contas');
  assertStringIncludes(message, 'Encontrei alguns pontos que merecem atenção');
  assertStringIncludes(message, '*Aluguel*');
  assertStringIncludes(message, '*Internet*');
  assertStringIncludes(message, '*Streaming*');
  assertStringIncludes(message, '*Celular*');
  assertStringIncludes(message, "ainda nao tem pagamento registrado");
  assertEquals(message.includes('e mais'), false);
  assertEquals(supabase.mutationCalls, []);
});

Deno.test('detectAccountsDiagnosableAnomalies adds paid inconsistent and zero balance account without disturbing severity ordering', () => {
  const anomalies = detectAccountsDiagnosableAnomalies(
    [
      {
        id: 'paid-1',
        description: 'Plano de saude',
        provider_name: null,
        amount: 320,
        due_date: '2026-04-09',
        status: 'paid',
        paid_at: null,
        paid_amount: null,
      },
    ],
    [
      {
        id: 'account-1',
        name: 'NuConta',
        current_balance: 0,
        is_active: true,
      },
    ],
    {
      today: new Date('2026-04-10T12:00:00-03:00'),
    },
  );

  assertEquals(
    anomalies.map((anomaly) => [anomaly.type, anomaly.description]),
    [
      ['paid_inconsistent', 'Plano de saude'],
      ['zero_balance_account', 'NuConta'],
    ],
  );
});

Deno.test('listAccountsDiagnosableAnomalies remains strictly read-only while fetching Phase 2 anomalies', async () => {
  const supabase = createReadonlySupabase({
    payable_bills: [
      {
        id: 'paid-1',
        user_id: 'user-1',
        description: 'Plano de saude',
        provider_name: null,
        amount: 320,
        due_date: '2026-04-09',
        status: 'paid',
        paid_at: null,
        paid_amount: null,
      },
    ],
    accounts: [
      {
        id: 'account-1',
        user_id: 'user-1',
        name: 'NuConta',
        current_balance: 0,
        is_active: true,
      },
    ],
  });

  const anomalies = await listAccountsDiagnosableAnomalies('user-1', { supabase });

  assertEquals(
    anomalies.map((anomaly) => anomaly.type),
    ['paid_inconsistent', 'zero_balance_account'],
  );
  assertEquals(supabase.mutationCalls, []);
});
