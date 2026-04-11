// src/components/settings/IntegrationsSettings.tsx
// Tab de integrações externas (WhatsApp, Google Calendar, Tick Tick)

import { useState, useEffect, useRef } from 'react';
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
import { WhatsAppCommands } from '@/components/whatsapp/WhatsAppCommands';

const COMING_SOON_COPY =
  'Esta integração ainda não está conectada ao backend real nesta versão. Quando estiver pronta, o status e as ações daqui passarão a refletir a conexão real.';

export function IntegrationsSettings() {
  // WhatsApp hooks
  const {
    connection,
    isConnected,
    qrCode,
    qrCodeExpiry,
    isLoading,
    error,
    connect,
    disconnect,
    refreshQRCode,
  } = useWhatsAppConnection();
  const { stats } = useWhatsAppMessages();
  
  // WhatsApp state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [whatsappTab, setWhatsappTab] = useState('overview');
  /** Evita fechar o modal ao abrir "Reconectar" enquanto ainda está conectado (fluxo anterior fechava na mesma renderização). */
  const prevIsConnectedRef = useRef(isConnected);

  const handleWhatsAppConnect = async () => {
    setShowQRModal(true);
    await connect();
  };

  const handleWhatsAppDisconnect = async () => {
    await disconnect();
  };

  useEffect(() => {
    if (!showQRModal) {
      prevIsConnectedRef.current = isConnected;
      return;
    }
    // Fecha o modal só quando a conexão acaba de ficar "true" (ex.: escaneou o QR vindo de desconectado).
    if (isConnected && !prevIsConnectedRef.current) {
      setShowQRModal(false);
    }
    prevIsConnectedRef.current = isConnected;
  }, [isConnected, showQRModal]);

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
                  <CheckCircle className="h-5 w-5 text-success" />
                  <Badge variant="success">
                    Conectado
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-danger" />
                  <Badge variant="danger">
                    Desconectado
                  </Badge>
                </>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Ações */}
          <div className="flex gap-2 flex-wrap">
            {isConnected ? (
              <>
                <Button variant="outline" onClick={handleWhatsAppDisconnect} disabled={isLoading}>
                  Desconectar
                </Button>
                <Button variant="outline" onClick={handleWhatsAppConnect} disabled={isLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconectar
                </Button>
              </>
            ) : (
              <Button onClick={handleWhatsAppConnect} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
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
                <WhatsAppCommands />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Modals WhatsApp */}
      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        qrCode={qrCode}
        qrCodeExpiry={qrCodeExpiry}
        isConnected={isConnected}
        isLoading={isLoading}
        error={error}
        onRefresh={refreshQRCode}
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
              <XCircle className="h-5 w-5 text-warning" />
              <Badge variant="warning">
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
              <XCircle className="h-5 w-5 text-warning" />
              <Badge variant="warning">
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
