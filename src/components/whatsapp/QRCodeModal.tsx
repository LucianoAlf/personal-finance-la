/**
 * Component: QRCodeModal
 * Responsabilidade: Modal para conectar WhatsApp via QR Code
 *
 * Features:
 * - QR Code para escanear
 * - Timer de expiração (2 minutos)
 * - Instruções passo a passo
 * - Atualizar / gerar novo via callback do pai (estado de conexão único)
 */

import { useState, useEffect } from 'react';
import { QrCode, Smartphone, RefreshCw, CheckCircle2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string | null;
  qrCodeExpiry: Date | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

export function QRCodeModal({
  open,
  onOpenChange,
  qrCode,
  qrCodeExpiry,
  isConnected,
  isLoading,
  error,
  onRefresh,
}: QRCodeModalProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!qrCodeExpiry) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = qrCodeExpiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrCodeExpiry]);

  const handleRefresh = async () => {
    await onRefresh();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          ) : null}

          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            {isConnected ? (
              <div className="flex flex-col items-center space-y-3 p-8">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-600">
                  WhatsApp Conectado!
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Você já pode enviar e receber mensagens.
                </p>
              </div>
            ) : qrCode ? (
              <>
                <div className="relative">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="h-64 w-64 rounded-lg border-2 border-border"
                  />
                  {timeLeft !== null && timeLeft <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                      <div className="text-center space-y-2">
                        <X className="h-12 w-12 text-destructive mx-auto" />
                        <p className="text-sm font-medium">QR Code Expirado</p>
                        <Button size="sm" onClick={handleRefresh} disabled={isLoading}>
                          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                          Gerar Novo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {timeLeft !== null && timeLeft > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Expira em:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading || (timeLeft !== null && timeLeft > 0)}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                  Atualizar QR Code
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-3 p-8">
                <Button onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          {!isConnected && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Como conectar:
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold min-w-5">1.</span>
                  <span>Abra o WhatsApp no seu celular</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold min-w-5">2.</span>
                  <span>
                    Toque em <strong>Menu</strong> ou <strong>Configurações</strong> e selecione{' '}
                    <strong>Aparelhos conectados</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold min-w-5">3.</span>
                  <span>
                    Toque em <strong>Conectar um aparelho</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold min-w-5">4.</span>
                  <span>Aponte o celular para esta tela para escanear o QR Code</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
