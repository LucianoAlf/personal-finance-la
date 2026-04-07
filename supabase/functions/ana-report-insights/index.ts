import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildReportAnaNarrative } from '../_shared/report-ana.ts';
import { buildReportIntelligenceContext } from '../_shared/report-intelligence.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment is not configured');
    }

    const body = await readRequestBody(req);
    const startDate = requireDate(body.startDate, 'startDate');
    const endDate = requireDate(body.endDate, 'endDate');
    const periodLabel =
      typeof body.periodLabel === 'string' && body.periodLabel.trim()
        ? body.periodLabel.trim()
        : `${startDate} a ${endDate}`;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserIdFromRequest(req, supabase);
    const context = await buildReportIntelligenceContext({
      supabase,
      userId,
      startDate,
      endDate,
      supabaseUrl,
    });

    const payload = await buildReportAnaNarrative({
      supabase,
      userId,
      context,
      periodLabel,
    });

    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[ana-report-insights] error', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

async function resolveUserIdFromRequest(req: Request, supabase: any): Promise<string> {
  const authHeader =
    req.headers.get('x-supabase-authorization') || req.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Authorization token missing');
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user.id;
}

async function readRequestBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch (_) {
    throw new Error('Invalid JSON body');
  }
}

function requireDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }

  return value;
}
