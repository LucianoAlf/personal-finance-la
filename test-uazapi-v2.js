// Script de teste UAZAPI V2 - Tentando mais endpoints

const baseUrl = 'https://lamusic.uazapi.com';
const token = '0a5d59d3-f368-419b-b9e8-701375814522';
const phone = '5521981278047';
const message = 'Olá! 🔔 TESTE de lembrete Ana Clara';

const endpoints = [
  { name: 'sendMessage', url: '/sendMessage', body: { number: phone, text: message } },
  { name: 'sendText', url: '/sendText', body: { number: phone, text: message } },
  { name: 'chat/sendtext', url: '/chat/sendtext', body: { number: phone, text: message } },
  { name: 'api/sendMessage', url: '/api/sendMessage', body: { number: phone, text: message } },
  { name: 'message', url: '/message', body: { number: phone, text: message } },
  { name: 'messages', url: '/messages', body: { number: phone, text: message } },
];

async function testAll() {
  console.log('🧪 Testando TODOS os endpoints possíveis...\n');
  
  for (const endpoint of endpoints) {
    console.log(`📤 Teste: POST ${endpoint.url}`);
    console.log(`URL: ${baseUrl}${endpoint.url}\n`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify(endpoint.body),
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      const result = await response.json().catch(() => ({ error: 'Não é JSON' }));
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log('\n✅ ✅ ✅ SUCESSO! Este é o endpoint correto! ✅ ✅ ✅\n');
        break;
      }
    } catch (error) {
      console.error('❌ Erro:', error.message);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

testAll();
