// Cliente de email via Edge Function (Resend no servidor)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sbnpmhmvcspwcyjhftlw.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODg2NTgsImV4cCI6MjA3Nzc2NDY1OH0.IxhNnR85udF-0_WJshDCzV9w3KIe1gfpEJ6LWvdm_eU';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/test-email`;

export const FROM_EMAIL = 'noreply@mypersonalfinance.com.br';

export async function sendTestEmail(to: string) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ to }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return { success: false, error: data?.error || `HTTP ${res.status}` };
  }
  return { success: true, data };
}
