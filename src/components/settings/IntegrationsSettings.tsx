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

const COMING_SOON_COPY =
  'Esta integração ainda não está conectada ao backend real nesta versão. Quando estiver pronta, o status e as ações daqui passarão a refletir a conexão real.';

export function IntegrationsSettings() {
  // WhatsApp hooks
  const { connection, isConnected, qrCode, connect, disconnect } = useWhatsAppConnection();
  const { stats } = useWhatsAppMessages();
  
  // WhatsApp state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [whatsappTab, setWhatsappTab] = useState('overview');

  const handleWhatsAppConnect = async () => {
    setShowQRModal(true);
    await connect();
  };

  const handleWhatsAppDisconnect = async () => {
    await disconnect();
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
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Status transparente: a integração com Google Calendar ainda não está disponível nesta versão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>{COMING_SOON_COPY}</AlertDescription>
          </Alert>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Status da Sincronização</p>
              <p className="text-sm text-muted-foreground">
                OAuth e sincronização automática ainda não foram implementados.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-amber-600" />
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Em planejamento
              </Badge>
            </div>
          </div>

          {/* Ações */}
          <Button disabled variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Em breve
          </Button>
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
            Status transparente: a integração com Tick Tick ainda não está disponível nesta versão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>{COMING_SOON_COPY}</AlertDescription>
          </Alert>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Status da Conexão</p>
              <p className="text-sm text-muted-foreground">
                API Key, projeto padrão e testes de conexão ainda não têm persistência nem validação reais.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-amber-600" />
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Em planejamento
              </Badge>
            </div>
          </div>

          {/* Configuração */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tickTickKey">API Key</Label>
              <Input
                id="tickTickKey"
                type="password"
                value=""
                disabled
                placeholder="Disponível quando a integração real for liberada"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tickTickProject">Projeto Padrão</Label>
              <Input
                id="tickTickProject"
                value=""
                disabled
                placeholder="Disponível quando a integração real for liberada"
              />
            </div>
          </div>

          {/* Ações */}
          <Button disabled variant="outline">
            <CheckSquare className="h-4 w-4 mr-2" />
            Em breve
          </Button>
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
            <strong>Google Calendar:</strong> Planejado, ainda sem OAuth e sem sincronização backend nesta versão
          </p>
          <p>
            <strong>Tick Tick:</strong> Planejado, ainda sem validação de credenciais nem persistência backend nesta versão
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
