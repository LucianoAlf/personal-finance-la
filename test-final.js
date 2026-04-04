// TESTE FINAL - Endpoint correto da documentação

const baseUrl = 'https://lamusic.uazapi.com';
const token = '0a5d59d3-f368-419b-b9e8-701375814522';
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

async function testFinal() {
  console.log('🎯 TESTE FINAL - Endpoint correto da documentação\n');
  
  const url = `${baseUrl}/send/text`;
  console.log(`📤 POST ${url}\n`);
  
  const body = {
    number: phone,
    text: message,
  };
  
  console.log('Body:', JSON.stringify(body, null, 2), '\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(body),
    });
    
    console.log(`Status: ${response.status} ${response.statusText}\n`);
    const result = await response.json().catch(() => ({ error: 'Não é JSON' }));
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ ✅ ✅ SUCESSO! Mensagem enviada! ✅ ✅ ✅');
      console.log('\n📱 Verifique seu WhatsApp agora!');
    } else {
      console.log('\n❌ Falhou - Status não é 2xx');
    }
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

testFinal();
