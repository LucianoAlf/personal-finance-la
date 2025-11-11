// src/components/settings/IntegrationsSettings.tsx
// Tab de integrações externas (WhatsApp, Google Calendar, Tick Tick)

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Calendar as CalendarIcon, CheckSquare, RefreshCw, QrCode, CheckCircle, XCircle, Clock, MessageCircleMore, BarChart3, History, GraduationCap } from 'lucide-react';

// WhatsApp components e hooks
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { QRCodeModal } from '@/components/whatsapp/QRCodeModal';
import { MessageHistory } from '@/components/whatsapp/MessageHistory';
import { WhatsAppStats } from '@/components/whatsapp/WhatsAppStats';
import { WhatsAppOnboarding } from '@/components/whatsapp/WhatsAppOnboarding';

export function IntegrationsSettings() {
  // WhatsApp hooks
  const { connection, isConnected, qrCode, connect, disconnect } = useWhatsAppConnection();
  const { stats } = useWhatsAppMessages();
  
  // WhatsApp state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [whatsappTab, setWhatsappTab] = useState('overview');

  // Google Calendar state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [syncFrequency, setSyncFrequency] = useState('30');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Tick Tick state
  const [tickTickConnected, setTickTickConnected] = useState(false);
  const [tickTickApiKey, setTickTickApiKey] = useState('');
  const [tickTickProject, setTickTickProject] = useState('');
  const [testingTickTick, setTestingTickTick] = useState(false);

  const handleWhatsAppConnect = async () => {
    setShowQRModal(true);
    await connect();
  };

  const handleWhatsAppDisconnect = async () => {
    await disconnect();
  };

  const handleGoogleConnect = () => {
    // OAuth flow (simulado)
    setGoogleConnected(true);
    setGoogleEmail('usuario@gmail.com');
    setLastSync(new Date());
  };

  const handleGoogleDisconnect = () => {
    setGoogleConnected(false);
    setGoogleEmail('');
    setLastSync(null);
  };

  const handleGoogleSync = () => {
    setLastSync(new Date());
  };

  const handleTickTickTest = async () => {
    setTestingTickTick(true);
    // Simular teste de conexão
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTickTickConnected(true);
    setTestingTickTick(false);
  };

  const handleTickTickDisconnect = () => {
    setTickTickConnected(false);
    setTickTickApiKey('');
    setTickTickProject('');
  };

  return (
    <div className="space-y-6">
      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <CardTitle>WhatsApp (UAZAPI)</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowOnboarding(true)}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Tutorial
            </Button>
          </div>
          <CardDescription>
            Conecte seu WhatsApp para receber notificações e interagir com a Ana Clara
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Status da Conexão</p>
              {isConnected ? (
                <>
                  <p className="text-sm text-muted-foreground">Número: {connection?.phone_number || 'Não configurado'}</p>
                  <p className="text-xs text-muted-foreground">
                    Conectado desde: {connection?.connected_at ? new Date(connection.connected_at).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Conecte seu WhatsApp para começar a usar
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Conectado
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Desconectado
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            {isConnected ? (
              <>
                <Button variant="outline" onClick={handleWhatsAppDisconnect}>
                  Desconectar
                </Button>
                <Button variant="outline" onClick={handleWhatsAppConnect}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconectar
                </Button>
              </>
            ) : (
              <Button onClick={handleWhatsAppConnect} className="bg-green-600 hover:bg-green-700">
                <QrCode className="h-4 w-4 mr-2" />
                Conectar WhatsApp
              </Button>
            )}
          </div>

          {/* Tabs WhatsApp (se conectado) */}
          {isConnected && (
            <Tabs value={whatsappTab} onValueChange={setWhatsappTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Estatísticas
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="commands" className="gap-2">
                  <MessageCircleMore className="h-4 w-4" />
                  Comandos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <WhatsAppStats />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <MessageHistory />
              </TabsContent>

              <TabsContent value="commands" className="space-y-4 mt-4">
                <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                  <h4 className="font-semibold">Comandos Disponíveis</h4>
                  <div className="grid gap-3">
                    {[
                      { cmd: 'saldo', desc: 'Ver saldo total de todas as contas' },
                      { cmd: 'resumo [dia/semana/mês]', desc: 'Resumo financeiro do período' },
                      { cmd: 'contas', desc: 'Contas a vencer nos próximos 7 dias' },
                      { cmd: 'meta [nome]', desc: 'Status de uma meta específica' },
                      { cmd: 'investimentos', desc: 'Resumo do portfólio' },
                      { cmd: 'cartões', desc: 'Faturas de cartão abertas' },
                      { cmd: 'ajuda', desc: 'Lista todos os comandos' },
                      { cmd: 'relatório [mês]', desc: 'Relatório completo do mês' },
                    ].map((item) => (
                      <div
                        key={item.cmd}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.cmd}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Alert>
                    <MessageCircleMore className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Você também pode enviar lançamentos por <strong>texto</strong>, <strong>áudio</strong> ou <strong>foto de nota fiscal</strong> - processamos automaticamente!
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Modals WhatsApp */}
      <QRCodeModal 
        open={showQRModal} 
        onOpenChange={setShowQRModal}
      />
      
      <WhatsAppOnboarding
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => console.log('Onboarding completo')}
      />

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Sincronize seus eventos financeiros com o Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Status da Sincronização</p>
              {googleConnected ? (
                <>
                  <p className="text-sm text-muted-foreground">Conta: {googleEmail}</p>
                  {lastSync && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Última sincronização: {lastSync.toLocaleString('pt-BR')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta Google para sincronizar eventos
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {googleConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Conectado
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <Badge variant="outline">
                    Desconectado
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Configurações (se conectado) */}
          {googleConnected && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="syncFreq">Frequência de Sincronização</Label>
                <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                  <SelectTrigger id="syncFreq">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">A cada 15 minutos</SelectItem>
                    <SelectItem value="30">A cada 30 minutos</SelectItem>
                    <SelectItem value="60">A cada 1 hora</SelectItem>
                    <SelectItem value="120">A cada 2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            {googleConnected ? (
              <>
                <Button variant="outline" onClick={handleGoogleDisconnect}>
                  Desconectar
                </Button>
                <Button variant="outline" onClick={handleGoogleSync}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Agora
                </Button>
              </>
            ) : (
              <Button onClick={handleGoogleConnect} className="bg-blue-600 hover:bg-blue-700">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tick Tick */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-purple-600" />
            <CardTitle>Tick Tick</CardTitle>
          </div>
          <CardDescription>
            Integre suas tarefas financeiras com o Tick Tick
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Status da Conexão</p>
              {tickTickConnected ? (
                <>
                  <p className="text-sm text-muted-foreground">Projeto: {tickTickProject}</p>
                  <p className="text-xs text-muted-foreground">API Key: ****{tickTickApiKey.slice(-4)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Configure sua API Key do Tick Tick
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {tickTickConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Conectado
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <Badge variant="outline">
                    Desconectado
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Configuração */}
          {!tickTickConnected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tickTickKey">API Key</Label>
                <Input
                  id="tickTickKey"
                  type="password"
                  value={tickTickApiKey}
                  onChange={(e) => setTickTickApiKey(e.target.value)}
                  placeholder="Sua API Key do Tick Tick"
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha sua API Key em: Settings → Integrations no Tick Tick
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tickTickProject">Projeto Padrão</Label>
                <Input
                  id="tickTickProject"
                  value={tickTickProject}
                  onChange={(e) => setTickTickProject(e.target.value)}
                  placeholder="Nome do projeto"
                />
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            {tickTickConnected ? (
              <Button variant="outline" onClick={handleTickTickDisconnect}>
                Desconectar
              </Button>
            ) : (
              <Button
                onClick={handleTickTickTest}
                disabled={!tickTickApiKey || !tickTickProject || testingTickTick}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {testingTickTick ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre as Integrações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>WhatsApp:</strong> Receba notificações, lembretes e interaja com a Ana Clara via mensagens
          </p>
          <p>
            <strong>Google Calendar:</strong> Sincronize automaticamente vencimentos de contas e eventos financeiros
          </p>
          <p>
            <strong>Tick Tick:</strong> Crie tarefas automáticas para suas obrigações financeiras
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
