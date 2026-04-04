// Gerar VAPID keys simples para Web Push
const crypto = require('crypto');

// Gerar par de chaves
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'der' }
});

// Extrair apenas os 65 bytes da chave pública (sem header)
const publicKeyRaw = publicKey.slice(-65);

// Converter para base64 URL-safe
const publicKeyBase64 = publicKeyRaw
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

const privateKeyBase64 = privateKey
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

console.log('\n✅ VAPID KEYS GERADAS (FORMATO CORRETO)\n');
console.log('PUBLIC KEY (65 bytes raw):');
console.log(publicKeyBase64);
console.log('\nPRIVATE KEY:');
console.log(privateKeyBase64);
console.log('\n📝 Adicione no .env.local:');
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKeyBase64}`);
console.log('\n📝 Adicione no Supabase Secrets:');
console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`);
