// Script de debug para verificar conexão com Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler .env.local manualmente
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error('❌ Erro ao ler .env.local:', err.message);
}

console.log('🔍 VERIFICANDO CONFIGURAÇÃO DO SUPABASE\n');
console.log('📋 URL:', supabaseUrl ? '✅ Configurada' : '❌ Não encontrada');
console.log('🔑 Key:', supabaseKey ? '✅ Configurada' : '❌ Não encontrada');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERRO: Variáveis de ambiente não configuradas!');
  console.log('\n📝 Verifique se .env.local existe e contém:');
  console.log('   VITE_SUPABASE_URL=sua_url');
  console.log('   VITE_SUPABASE_ANON_KEY=sua_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔌 Testando conexão...\n');

// Teste 1: Verificar usuário autenticado
try {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.log('⚠️  Nenhum usuário autenticado');
    console.log('   Isso é normal se você não está logado no navegador');
  } else if (user) {
    console.log('✅ Usuário autenticado:', user.email);
  } else {
    console.log('ℹ️  Sem sessão ativa');
  }
} catch (err) {
  console.error('❌ Erro ao verificar autenticação:', err.message);
}

// Teste 2: Verificar tabelas
console.log('\n📊 Verificando tabelas...\n');

try {
  const { count: transactionsCount, error: txError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  
  if (txError) {
    console.log('❌ Tabela transactions:', txError.message);
  } else {
    console.log('✅ Tabela transactions existe');
  }
} catch (err) {
  console.log('❌ Erro ao acessar transactions:', err.message);
}

try {
  const { count: categoriesCount, error: catError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });
  
  if (catError) {
    console.log('❌ Tabela categories:', catError.message);
  } else {
    console.log('✅ Tabela categories existe');
  }
} catch (err) {
  console.log('❌ Erro ao acessar categories:', err.message);
}

try {
  const { count: accountsCount, error: accError } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });
  
  if (accError) {
    console.log('❌ Tabela accounts:', accError.message);
  } else {
    console.log('✅ Tabela accounts existe');
  }
} catch (err) {
  console.log('❌ Erro ao acessar accounts:', err.message);
}

console.log('\n✅ Verificação concluída!\n');
