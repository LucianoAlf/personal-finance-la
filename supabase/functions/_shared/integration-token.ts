/**
 * Resolução de tokens armazenados em `integration_configs.*_encrypted`.
 *
 * Alinhado ao padrão de `ai-secrets.ts`: camada única para o worker ler o material
 * sem espalhar formatos. Legado: string operacional direta. Protegido: prefixo `enc1:`.
 *
 * Criptografia: AES-256-GCM (Web Crypto). Chave em secret da Edge Function:
 *   INTEGRATION_SECRETS_KEY — 32 bytes em base64 (ou string; derivamos via SHA-256).
 *
 * Formato persistido: enc1:<base64url(iv || ciphertext+tag)>
 * iv = 12 bytes, tag incluído no ciphertext pelo AES-GCM do Web Crypto.
 */

const PREFIX = 'enc1:';

function getKeyMaterial(): string | undefined {
  const g = globalThis as { Deno?: { env: { get(k: string): string | undefined } } };
  const denoKey = g.Deno?.env?.get('INTEGRATION_SECRETS_KEY');
  if (denoKey) return denoKey;
  if (typeof process !== 'undefined' && process.env?.INTEGRATION_SECRETS_KEY) {
    return process.env.INTEGRATION_SECRETS_KEY;
  }
  return undefined;
}

async function importAesKey(rawKey: string): Promise<CryptoKey> {
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
  } catch {
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(rawKey));
    keyBytes = new Uint8Array(digest);
  }
  if (keyBytes.length !== 32) {
    const digest = await crypto.subtle.digest('SHA-256', keyBytes);
    keyBytes = new Uint8Array(digest);
  }
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function decryptIntegrationSecret(ciphertext: string): Promise<string> {
  const rest = ciphertext.slice(PREFIX.length);
  const combined = b64urlDecode(rest);
  if (combined.length < 13) throw new Error('integration_token_invalid_blob');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const material = getKeyMaterial();
  if (!material) throw new Error('integration_secrets_key_missing');
  const key = await importAesKey(material);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

/**
 * Token TickTick (ou outro) a partir do valor da coluna `ticktick_api_key_encrypted`.
 */
export async function resolveTickTickApiToken(stored: string | null | undefined): Promise<string | undefined> {
  if (stored == null || stored === '') return undefined;
  const trimmed = stored.trim();
  if (trimmed.startsWith(PREFIX)) {
    return decryptIntegrationSecret(trimmed);
  }
  return trimmed;
}

function b64urlEncode(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

/** Para scripts de operação (ex.: rodar com Node e gravar no banco). */
export async function encryptIntegrationSecretPlain(plaintext: string): Promise<string> {
  const material = getKeyMaterial();
  if (!material) throw new Error('integration_secrets_key_missing');
  const key = await importAesKey(material);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return PREFIX + b64urlEncode(combined);
}
