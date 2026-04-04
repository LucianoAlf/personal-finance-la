import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

// Email client via Edge Function. Secrets stay on the server side.
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/test-email`;

export const FROM_EMAIL = 'noreply@mypersonalfinance.com.br';

export async function sendTestEmail(to: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ to }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return { success: false, error: data?.error || `HTTP ${res.status}` };
  }
  return { success: true, data };
}
