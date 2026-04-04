// Script para gerar VAPID keys para Web Push Notifications
// Executar: node generate-vapid-keys.js

const crypto = require('crypto');

function generateVAPIDKeys() {
  // Gerar par de chaves ECDH usando curva P-256
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Converter para base64 URL-safe
  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

console.log('\n🔐 VAPID KEYS GERADAS\n');
console.log('═'.repeat(80));

const keys = generateVAPIDKeys();

console.log('\n📌 PUBLIC KEY (usar no frontend):');
console.log(keys.publicKey);

console.log('\n🔒 PRIVATE KEY (configurar no Supabase Secrets):');
console.log(keys.privateKey);

console.log('\n');
console.log('═'.repeat(80));
console.log('\n📝 PRÓXIMOS PASSOS:\n');
console.log('1. Copie a PUBLIC KEY e adicione em .env:');
console.log('   VITE_VAPID_PUBLIC_KEY="' + keys.publicKey + '"');
console.log('\n2. Configure a PRIVATE KEY no Supabase Dashboard:');
console.log('   Settings > Edge Functions > Secrets');
console.log('   Nome: VAPID_PRIVATE_KEY');
console.log('   Valor: ' + keys.privateKey);
console.log('\n3. Adicione também o email de contato:');
console.log('   Nome: VAPID_SUBJECT');
console.log('   Valor: mailto:lucianoalf.la@gmail.com');
console.log('\n');
