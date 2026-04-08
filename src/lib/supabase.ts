import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

/** Project URL canónico (Personal Finance LA). Typos aqui geram 401 nas Edge Functions. */
const SUPABASE_CANONICAL_HOST = 'sbnpmhmvcspwcyjhftlw.supabase.co';
/** Hostnames vistos em produção por cópia incorreta (n/p e/ou f em falta). */
const SUPABASE_URL_TYPOS = new Set([
  'sbnpmhmvcspwcyjhtlw.supabase.co', // …jh**t**lw em vez de jh**ft**lw
  'sbnpnhmvcspwcyjhtlw.supabase.co', // sb**npn**… e jhtlw
  'sbnpnhmvcspwcyjhftlw.supabase.co', // sb**npn**… só
]);
try {
  const host = new URL(supabaseUrl).hostname.toLowerCase();
  if (SUPABASE_URL_TYPOS.has(host)) {
    throw new Error(
      `VITE_SUPABASE_URL com typo (hostname: "${host}"). O correto é https://${SUPABASE_CANONICAL_HOST} ` +
        '(segundo **npm** após sbn, não **npn**; e **jhftlw** com **ft**). Copie o Project URL em Supabase → Settings → API → Redeploy na Vercel.',
    );
  }
} catch (e) {
  if (e instanceof Error && e.message.includes('VITE_SUPABASE_URL com typo')) throw e;
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
