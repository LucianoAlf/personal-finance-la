import { createClient } from '@supabase/supabase-js';

// PRODUÇÃO: Chaves corretas do Supabase
const supabaseUrl = 'https://sbnpmhmvcspwcyjhftlw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODg2NTgsImV4cCI6MjA3Nzc2NDY1OH0.IxhNnR85udF-0_WJshDCzV9w3KIe1gfpEJ6LWvdm_eU';

console.log('✅ Supabase inicializado com chave correta');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);