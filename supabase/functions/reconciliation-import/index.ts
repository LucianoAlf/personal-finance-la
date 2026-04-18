import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  materializeReconciliationRows,
  type MaterializeBankTransactionInput,
} from '../_shared/reconciliation-materializer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type ImportSource = 'manual_paste' | 'csv_upload' | 'manual_entry';

interface ReconciliationImportRowInput {
  source_item_id: string | null;
  external_id: string | null;
  account_name: string;
  external_account_id: string | null;
  internal_account_id: string | null;
  amount: number;
  date: string;
  description: string;
  raw_description: string | null;
}

export interface ReconciliationImportInput {
  userId: string;
  source: ImportSource;
  rows: ReconciliationImportRowInput[];
}

export interface ReconciliationImportResult {
  importedCount: number;
  createdCases: number;
  matchedCount: number;
  unmatchedCount: number;
}

export async function importReconciliationRows(
  supabase: SupabaseClient,
  input: ReconciliationImportInput,
): Promise<ReconciliationImportResult> {
  const result = await materializeReconciliationRows(supabase, {
    userId: input.userId,
    source: input.source,
    rows: input.rows as MaterializeBankTransactionInput[],
    rollbackInsertedBankRowsOnCaseFailure: true,
  });

  return {
    importedCount: result.importedCount,
    createdCases: result.createdCases,
    matchedCount: result.matchedCount,
    unmatchedCount: result.unmatchedCount,
  };
}

if (import.meta.main) {
  serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase environment');
      }

      const supabase = createClient(supabaseUrl, serviceKey);
      const rawAuth = req.headers.get('x-supabase-authorization') || req.headers.get('authorization');

      if (!rawAuth) {
        return new Response(JSON.stringify({ error: 'Authorization token missing' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userToken = rawAuth.replace(/^Bearer\s+/i, '');
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(userToken);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = (await req.json()) as Omit<ReconciliationImportInput, 'userId'>;
      const result = await importReconciliationRows(supabase, {
        userId: user.id,
        source: body.source,
        rows: body.rows,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
}
