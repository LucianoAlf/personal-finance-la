// Script de teste UAZAPI - Execute com: node test-uazapi.js

const baseUrl = 'https://lamusic.uazapi.com';
const instanceId = '0a5d59d3-f368-419b-b9e8-701375814522';
const apiKey = '0a5d59d3-f368-419b-b9e8-701375814522';
const phone = '5521981278047';

const message = `
━━━━━━━━━━━━━━━━━━━
🔔 *Lembrete Ana Clara*

Olá Luciano Alf! 👋

🔴 HOJE você tem uma conta a pagar:

📄 *🧪 TESTE - Lembrete WhatsApp (CRON)*
💰 Valor: *R$ 99,90*
📅 Vencimento: *07/11/2025*

⏰ *Não esqueça!*
━━━━━━━━━━━━━━━━━━━
💡 _Responda "pago" para marcar como paga_
━━━━━━━━━━━━━━━━━━━
`.trim();

async function testUAZAPI() {
  console.log('🧪 Testando UAZAPI (Documentação Oficial)...\n');
  
  // Teste 0: Verificar status da instância (GET)
  console.log('📤 Teste 0: GET /instance/status');
  const url0 = `${baseUrl}/instance/status`;
  console.log(`URL: ${url0}\n`);
  
  try {
    const response0 = await fetch(url0, {
      method: 'GET',
      headers: {
        'token': apiKey,  // Header correto segundo a doc
      },
    });
    
    console.log(`Status: ${response0.status} ${response0.statusText}`);
    const result0 = await response0.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result0, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Teste 1: Endpoint /message/text
  console.log('📤 Teste 1: POST /message/text');
  const url1 = `${baseUrl}/message/text`;
  console.log(`URL: ${url1}\n`);
  
  try {
    const response1 = await fetch(url1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });
    
    console.log(`Status: ${response1.status} ${response1.statusText}`);
    const result1 = await response1.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Teste 2: Endpoint /send
  console.log('📤 Teste 2: POST /send');
  const url2 = `${baseUrl}/send`;
  console.log(`URL: ${url2}\n`);
  
  try {
    const response2 = await fetch(url2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });
    
    console.log(`Status: ${response2.status} ${response2.statusText}`);
    const result2 = await response2.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Teste 3: Endpoint /messages/send
  console.log('📤 Teste 3: POST /messages/send');
  const url3 = `${baseUrl}/messages/send`;
  console.log(`URL: ${url3}\n`);
  
  try {
    const response3 = await fetch(url3, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });
    
    console.log(`Status: ${response3.status} ${response3.statusText}`);
    const result3 = await response3.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Teste 4: Endpoint /send
  console.log('📤 Teste 4: POST /send');
  const url4 = `${baseUrl}/send`;
  console.log(`URL: ${url4}\n`);
  
  try {
    const response4 = await fetch(url4, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });
    
    console.log(`Status: ${response4.status} ${response4.statusText}`);
    const result4 = await response4.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result4, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Teste 5: Endpoint /messages/send
  console.log('📤 Teste 5: POST /messages/send');
  const url5 = `${baseUrl}/messages/send`;
  console.log(`URL: ${url5}\n`);
  
  try {
    const response5 = await fetch(url5, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });
    
    console.log(`Status: ${response5.status} ${response5.statusText}`);
    const result5 = await response5.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result5, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUAZAPI();
