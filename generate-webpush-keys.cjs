// Gerar VAPID keys compatíveis com web-push library
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n✅ VAPID KEYS (WEB-PUSH FORMAT)\n');
console.log('PUBLIC KEY:');
console.log(vapidKeys.publicKey);
console.log('\nPRIVATE KEY:');
console.log(vapidKeys.privateKey);
console.log('\n📝 Adicione no .env.local:');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('\n📝 Atualize no Supabase Secrets:');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
