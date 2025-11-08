// Deploy Edge Function via Supabase Management API
const fs = require('fs');
const https = require('https');

const PROJECT_REF = 'sbnpmhmvcspwcyjhftlw';
const FUNCTION_NAME = 'send-bill-reminders';
const ACCESS_TOKEN = 'sbp_e56de3c08c9c591c0e5d796980289bbaa1f3a9'; // Seu token

// Ler o código da função
const functionCode = fs.readFileSync('./supabase/functions/send-bill-reminders/index.ts', 'utf8');

// Preparar payload
const payload = JSON.stringify({
  slug: FUNCTION_NAME,
  name: FUNCTION_NAME,
  body: functionCode,
  verify_jwt: false
});

// Configurar requisição
const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${PROJECT_REF}/functions/${FUNCTION_NAME}`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('🚀 Fazendo deploy da Edge Function...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Deploy realizado com sucesso!');
      console.log(JSON.parse(data));
    } else {
      console.error('❌ Erro no deploy:');
      console.error('Status:', res.statusCode);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
});

req.write(payload);
req.end();
