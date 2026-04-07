import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildEducationIntelligenceContext } from '../_shared/education-intelligence.ts';
import {
  createErrorResponse,
  EducationIntelligenceHttpError,
  parseOptionalYmd,
  readRequestBody,
  resolveUserIdFromRequest,
} from '../_shared/education-intelligence-http.ts';

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
    if (req.method !== 'POST') {
      throw new EducationIntelligenceHttpError(405, 'Method not allowed');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment is not configured');
    }

    const body = await readRequestBody(req);
    const startDate = parseOptionalYmd(body.startDate, 'startDate');
    const endDate = parseOptionalYmd(body.endDate, 'endDate');

    if (startDate && endDate && startDate > endDate) {
      throw new EducationIntelligenceHttpError(
        400,
        'startDate must be less than or equal to endDate',
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserIdFromRequest(req, supabase);

    const context = await buildEducationIntelligenceContext({
      supabase,
      userId,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    });

    return new Response(JSON.stringify(context), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[education-intelligence] error', error);

    return createErrorResponse(error, corsHeaders);
  }
});
