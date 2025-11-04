import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const TestePage = () => {
  const [status, setStatus] = useState('Verificando...');
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const testar = async () => {
      console.log('🔍 INICIANDO TESTE DE CONEXÃO');
      
      // Teste 1: Verificar usuário
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ Erro de autenticação:', authError);
          setStatus('❌ Erro de autenticação: ' + authError.message);
          return;
        }
        
        if (!authUser) {
          console.warn('⚠️ Usuário não autenticado');
          setStatus('⚠️ Você precisa fazer login no Supabase');
          return;
        }
        
        console.log('✅ Usuário autenticado:', authUser.email);
        setUser(authUser);
        setStatus('✅ Autenticado como: ' + authUser.email);
        
        // Teste 2: Buscar transações
        console.log('🔍 Buscando transações...');
        const { data, error: fetchError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', authUser.id);
        
        if (fetchError) {
          console.error('❌ Erro ao buscar transações:', fetchError);
          setStatus('❌ Erro ao buscar: ' + fetchError.message);
          return;
        }
        
        console.log('✅ Transações encontradas:', data?.length || 0);
        setTransactions(data || []);
        setStatus(`✅ Conectado! ${data?.length || 0} transações encontradas`);
        
      } catch (err: any) {
        console.error('❌ Erro geral:', err);
        setStatus('❌ Erro: ' + err.message);
      }
    };
    
    testar();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Teste de Conexão Supabase</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status:</h2>
          <p className="text-lg">{status}</p>
        </div>
        
        {user && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Usuário:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
        
        {transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Transações ({transactions.length}):</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(transactions, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold mb-2">📝 Instruções:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Abra o Console do navegador (F12)</li>
            <li>Veja os logs começando com 🔍, ✅ ou ❌</li>
            <li>Se aparecer "⚠️ Usuário não autenticado", faça login no Supabase</li>
            <li>Tire um print do console e da tela</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
