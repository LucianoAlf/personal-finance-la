const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sbnpmhmvcspwcyjhftlw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4ODY1OCwiZXhwIjoyMDc3NzY0NjU4fQ.Fnga17OcuHFzXB75CIZ23abk_8wgCPB58qTwqCS0YXo'
);

async function testWhatsApp() {
  try {
    // Buscar usuário
    const { data: user } = await supabase
      .from('users')
      .select('id, phone, email')
      .eq('email', 'lucianoalf.la@gmail.com')
      .single();
    
    console.log('👤 User:', user);
    
    // Criar lembrete WhatsApp
    const { data: bills } = await supabase
      .from('payable_bills')
      .select('id, description, due_date, amount')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);
    
    if (!bills || bills.length === 0) {
      console.log('❌ Nenhuma conta encontrada');
      return;
    }
    
    const bill = bills[0];
    console.log('💳 Bill:', bill);
    
    // Deletar lembretes antigos
    await supabase
      .from('bill_reminders')
      .delete()
      .eq('bill_id', bill.id)
      .eq('channel', 'whatsapp');
    
    // Criar lembrete WhatsApp para hoje
    const { data: reminder, error: reminderError } = await supabase
      .from('bill_reminders')
      .insert({
        bill_id: bill.id,
        user_id: user.id,
        reminder_date: new Date().toISOString().split('T')[0], // Hoje
        reminder_time: new Date().toTimeString().split(' ')[0].substring(0, 5), // Agora
        days_before: 0,
        channel: 'whatsapp',
        reminder_type: 'whatsapp',
        status: 'pending'
      })
      .select()
      .single();
    
    if (reminderError) {
      console.log('❌ Erro ao criar lembrete:', reminderError);
      return;
    }
    
    console.log('✅ Lembrete WhatsApp criado:', reminder);
    
    // Chamar Edge Function para enviar agora
    const response = await fetch('https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-bill-reminders', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4ODY1OCwiZXhwIjoyMDc3NzY0NjU4fQ.Fnga17OcuHFzXB75CIZ23abk_8wgCPB58qTwqCS0YXo',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('📤 Resultado do envio:', result);
    
    // Verificar status do lembrete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: updatedReminder } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('id', reminder.id)
      .single();
    
    console.log('📊 Status final:', updatedReminder);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testWhatsApp();
