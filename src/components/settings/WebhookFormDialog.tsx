// src/components/settings/WebhookFormDialog.tsx
// Dialog para criar/editar webhooks

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, Eye, EyeOff } from 'lucide-react';
import type { WebhookEndpoint } from '@/types/settings.types';

const webhookSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  url: z.string().url('URL inválida').startsWith('https://', 'URL deve usar HTTPS'),
  http_method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  auth_type: z.enum(['none', 'bearer', 'api_key', 'basic']),
  auth_token: z.string().optional(),
  auth_username: z.string().optional(),
  auth_password: z.string().optional(),
  custom_headers: z.string().optional(),
  retry_enabled: z.boolean(),
  retry_max_attempts: z.number().min(1).max(10),
  retry_delay_seconds: z.number().min(10).max(300),
  is_active: z.boolean(),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

interface WebhookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: WebhookEndpoint | null;
  onSave: (data: WebhookFormData) => Promise<void>;
}

export function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
  onSave,
}: WebhookFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: '',
      description: '',
      url: '',
      http_method: 'POST',
      auth_type: 'none',
      auth_token: '',
      auth_username: '',
      auth_password: '',
      custom_headers: '{}',
      retry_enabled: true,
      retry_max_attempts: 3,
      retry_delay_seconds: 60,
      is_active: true,
    },
  });

  const authType = watch('auth_type');

  // Preencher form quando editar
  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name,
        description: webhook.description || '',
        url: webhook.url,
        http_method: webhook.http_method as any,
        auth_type: webhook.auth_type as any,
        auth_token: '',
        auth_username: webhook.auth_username || '',
        auth_password: '',
        custom_headers: JSON.stringify(webhook.custom_headers || {}, null, 2),
        retry_enabled: webhook.retry_enabled ?? true,
        retry_max_attempts: webhook.retry_max_attempts ?? 3,
        retry_delay_seconds: webhook.retry_delay_seconds ?? 60,
        is_active: webhook.is_active,
      });
    }
  }, [webhook, reset]);

  const onSubmit = async (data: WebhookFormData) => {
    try {
      setLoading(true);
      await onSave(data);
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Error saving webhook:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {webhook ? 'Editar Webhook' : 'Criar Webhook'}
          </DialogTitle>
          <DialogDescription>
            Configure um webhook para integrar com N8N ou outros sistemas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="auth">Autenticação</TabsTrigger>
              <TabsTrigger value="advanced">Avançado</TabsTrigger>
            </TabsList>

            {/* TAB 1: Básico */}
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: N8N WhatsApp Handler"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito deste webhook"
                  rows={2}
                  {...register('description')}
                />
              </div>

              <div>
                <Label htmlFor="url">URL do Webhook *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://seu-n8n.app/webhook/..."
                  {...register('url')}
                />
                {errors.url && (
                  <p className="text-sm text-red-500 mt-1">{errors.url.message}</p>
                )}
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    A URL deve começar com https:// por segurança
                  </AlertDescription>
                </Alert>
              </div>

              <div>
                <Label htmlFor="http_method">Método HTTP</Label>
                <Select
                  defaultValue="POST"
                  onValueChange={(value) => setValue('http_method', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active">Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Webhook só será disparado se estiver ativo
                  </p>
                </div>
                <Switch
                  id="is_active"
                  defaultChecked
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
              </div>
            </TabsContent>

            {/* TAB 2: Autenticação */}
            <TabsContent value="auth" className="space-y-4">
              <div>
                <Label htmlFor="auth_type">Tipo de Autenticação</Label>
                <Select
                  defaultValue="none"
                  onValueChange={(value) => setValue('auth_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(authType === 'bearer' || authType === 'api_key') && (
                <div>
                  <Label htmlFor="auth_token">
                    {authType === 'bearer' ? 'Bearer Token' : 'API Key'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="auth_token"
                      type={showToken ? 'text' : 'password'}
                      placeholder={webhook ? '••••••••' : 'Cole seu token aqui'}
                      {...register('auth_token')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {webhook && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Token está criptografado. Deixe em branco para manter o atual.
                    </p>
                  )}
                </div>
              )}

              {authType === 'basic' && (
                <>
                  <div>
                    <Label htmlFor="auth_username">Username</Label>
                    <Input
                      id="auth_username"
                      placeholder="seu-usuario"
                      {...register('auth_username')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="auth_password">Password</Label>
                    <div className="relative">
                      <Input
                        id="auth_password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={webhook ? '••••••••' : 'sua-senha'}
                        {...register('auth_password')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {webhook && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Senha está criptografada. Deixe em branco para manter a atual.
                      </p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* TAB 3: Avançado */}
            <TabsContent value="advanced" className="space-y-4">
              <div>
                <Label htmlFor="custom_headers">Headers Customizados (JSON)</Label>
                <Textarea
                  id="custom_headers"
                  placeholder='{"X-Custom-Header": "value"}'
                  rows={4}
                  className="font-mono text-sm"
                  {...register('custom_headers')}
                />
                {errors.custom_headers && (
                  <p className="text-sm text-red-500 mt-1">JSON inválido</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="retry_enabled">Retry Automático</Label>
                  <p className="text-xs text-muted-foreground">
                    Tentar novamente em caso de falha
                  </p>
                </div>
                <Switch
                  id="retry_enabled"
                  defaultChecked
                  onCheckedChange={(checked) => setValue('retry_enabled', checked)}
                />
              </div>

              <div>
                <Label htmlFor="retry_max_attempts">Máximo de Tentativas</Label>
                <Input
                  id="retry_max_attempts"
                  type="number"
                  min={1}
                  max={10}
                  {...register('retry_max_attempts', { valueAsNumber: true })}
                />
                {errors.retry_max_attempts && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.retry_max_attempts.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="retry_delay_seconds">Delay entre Tentativas (segundos)</Label>
                <Input
                  id="retry_delay_seconds"
                  type="number"
                  min={10}
                  max={300}
                  {...register('retry_delay_seconds', { valueAsNumber: true })}
                />
                {errors.retry_delay_seconds && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.retry_delay_seconds.message}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {webhook ? 'Atualizar' : 'Criar'} Webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
