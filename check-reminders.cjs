const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sbnpmhmvcspwcyjhftlw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4ODY1OCwiZXhwIjoyMDc3NzY0NjU4fQ.Fnga17OcuHFzXB75CIZ23abk_8wgCPB58qTwqCS0YXo'
);

async function checkReminders() {
  try {
    // Buscar user_id do email
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'lucianoalf.la@gmail.com')
      .single();
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log(`👤 User ID: ${user.id}`);
    
    // Verificar lembretes do usuário
    const { data: reminders, error } = await supabase
      .from('bill_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('reminder_date', { ascending: true });
    
    if (error) {
      console.error('❌ Erro:', error);
      return;
    }
    
    console.log(`📊 TOTAL DE LEMBRETES: ${reminders.length}`);
    
    const status = {
      pending: reminders.filter(r => r.status === 'pending').length,
      sent: reminders.filter(r => r.status === 'sent').length,
      failed: reminders.filter(r => r.status === 'failed').length
    };
    
    console.log(`⏳ PENDENTES: ${status.pending}`);
    console.log(`✅ ENVIADOS: ${status.sent}`);
    console.log(`❌ FALHADOS: ${status.failed}`);
    
    // Próximos lembretes
    const upcoming = reminders.filter(r => r.status === 'pending' && new Date(r.reminder_date) >= new Date()).slice(0, 5);
    console.log('\n📅 PRÓXIMOS LEMBRETES:');
    upcoming.forEach(r => {
      console.log(`  ${r.reminder_date} - ${r.channel} - ${r.days_before} dias antes`);
    });
    
    // Verificar contas para gerar lembretes
    const { data: bills } = await supabase
      .from('payable_bills')
      .select('id, description, due_date, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(5);
    
    console.log('\n💳 CONTAS PENDENTES:');
    if (bills && bills.length > 0) {
      bills.forEach(bill => {
        const daysUntil = Math.ceil((new Date(bill.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`  ${bill.description} - Vence em ${daysUntil} dias (${bill.due_date})`);
      });
    } else {
      console.log('  Nenhuma conta pendente encontrada');
    }
    
    // Testar criar lembrete
    console.log('\n🧪 TESTANDO CRIAÇÃO DE LEMBRETE...');
    if (bills && bills.length > 0) {
      const testBill = bills[0];
      const { data: newReminder, error: reminderError } = await supabase
        .from('bill_reminders')
        .insert({
          bill_id: testBill.id,
          user_id: user.id,
          reminder_date: new Date().toISOString().split('T')[0],
          reminder_time: '09:00:00',
          days_before: 0,
          channel: 'email',
          reminder_type: 'email',
          status: 'pending'
        })
        .select()
        .single();
      
      if (reminderError) {
        console.log('❌ Erro ao criar lembrete:', reminderError.message);
      } else {
        console.log('✅ Lembrete criado:', newReminder.id);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkReminders();
