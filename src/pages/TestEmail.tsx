import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sendTestEmail } from '@/lib/email';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestEmail() {
  const [email, setEmail] = useState('lucianoalf.la@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!email) {
      setResult({ success: false, message: 'Digite um email válido' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await sendTestEmail(email);
      
      if (response.success) {
        setResult({
          success: true,
          message: `✅ Email enviado com sucesso para ${email}!`
        });
      } else {
        setResult({
          success: false,
          message: `❌ Erro ao enviar: ${response.error}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Erro: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-lg">
            <CardTitle className="text-3xl flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Teste de Email - Resend
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Envie um email de teste para verificar a configuração
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Configuração */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">📧 Configuração Atual:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Domínio:</strong> mypersonalfinance.com.br</li>
                <li><strong>Email:</strong> noreply@mypersonalfinance.com.br</li>
                <li><strong>Região:</strong> São Paulo (sa-east-1)</li>
                <li><strong>Provider:</strong> Resend</li>
              </ul>
            </div>

            {/* Input de Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email de Destino:
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="text-lg"
              />
            </div>

            {/* Botão de Envio */}
            <Button
              onClick={handleSendTest}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-lg py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Enviar Email de Teste
                </>
              )}
            </Button>

            {/* Resultado */}
            {result && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  result.success
                    ? 'bg-green-50 border-green-500 text-green-800'
                    : 'bg-red-50 border-red-500 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <p className="font-medium">{result.message}</p>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Instruções:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Digite o email de destino</li>
                <li>Clique em "Enviar Email de Teste"</li>
                <li>Verifique sua caixa de entrada</li>
                <li>Confira também a pasta de SPAM</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
