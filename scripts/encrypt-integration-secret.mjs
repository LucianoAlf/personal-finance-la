#!/usr/bin/env node
/**
 * Gera valor para integration_configs.ticktick_api_key_encrypted no formato enc1:
 * (AES-256-GCM, mesma lógica que supabase/functions/_shared/integration-token.ts).
 *
 * Uso:
 *   INTEGRATION_SECRETS_KEY="mesmo_secret_da_edge_function" node scripts/encrypt-integration-secret.mjs "token_ticktick"
 *
 * Copie a linha impressa para UPDATE no banco ou para o painel.
 */

import crypto from 'node:crypto';

const PREFIX = 'enc1:';

function importKeyBytes(rawKey) {
  try {
    const buf = Buffer.from(rawKey, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    /* fall through */
  }
  return crypto.createHash('sha256').update(String(rawKey), 'utf8').digest();
}

function b64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const keyMaterial = process.env.INTEGRATION_SECRETS_KEY;
const plaintext = process.argv[2];

if (!keyMaterial || !plaintext) {
  console.error('Usage: INTEGRATION_SECRETS_KEY=... node scripts/encrypt-integration-secret.mjs "<plaintext>"');
  process.exit(1);
}

const key = importKeyBytes(keyMaterial);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
const combined = Buffer.concat([iv, enc, tag]);
console.log(PREFIX + b64url(combined));
