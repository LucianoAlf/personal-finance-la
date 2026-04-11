// src/components/settings/WebhooksSettings.tsx
// Tab de gerenciamento de webhooks N8N

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Webhook, Plus, MoreVertical, Edit, Trash2, TestTube, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookFormDialog } from './WebhookFormDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WebhookEndpoint } from '@/types/settings.types';
import {
  mapWebhookFormToCreateInput,
  mapWebhookFormToUpdateInput,
  type WebhookFormPayload,
} from '@/utils/webhookPayload';
import {
  settingsCodeChipClassName,
  settingsDangerMenuItemClassName,
  settingsMetricTileClassName,
  settingsSectionCardClassName,
  settingsTableShellClassName,
} from './settingsSemantics';

export function WebhooksSettings() {
  const { webhooks, logs, loading, testWebhook, deleteWebhook, createWebhook, updateWebhook, fetchLogs } = useWebhooks();
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);

  const handleTest = async (webhookId: string) => {
    await testWebhook(webhookId, { test: true, timestamp: new Date().toISOString() });
  };

  const handleDelete = async (webhookId: string) => {
    if (confirm('Tem certeza que deseja deletar este webhook?')) {
      await deleteWebhook(webhookId);
    }
  };

  const handleOpenDialog = (webhook?: WebhookEndpoint) => {
    setEditingWebhook(webhook || null);
    setDialogOpen(true);
  };

  const handleSaveWebhook = async (data: WebhookFormPayload) => {
    if (editingWebhook) {
      await updateWebhook(editingWebhook.id, mapWebhookFormToUpdateInput(data, editingWebhook));
    } else {
      await createWebhook(mapWebhookFormToCreateInput(data));
    }
    setDialogOpen(false);
    setEditingWebhook(null);
  };

  const handleViewLogs = async (webhookId: string) => {
    setSelectedWebhook(webhookId);
    await fetchLogs(webhookId, 20);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando webhooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={settingsSectionCardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                <CardTitle>Webhooks & N8N</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Configure webhooks para integrar com N8N e automatizar fluxos
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className={settingsMetricTileClassName}>
              <p className="text-2xl font-bold text-primary">{webhooks.length}</p>
              <p className="text-xs text-muted-foreground">Total de Webhooks</p>
            </div>
            <div className={settingsMetricTileClassName}>
              <p className="text-2xl font-bold text-success">
                {webhooks.filter(w => w.is_active).length}
              </p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className={settingsMetricTileClassName}>
              <p className="text-2xl font-bold text-info">
                {webhooks.reduce((sum, w) => sum + (w.total_calls || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total de Chamadas</p>
            </div>
            <div className={settingsMetricTileClassName}>
              <p className="text-2xl font-bold text-warning">
                {webhooks.length > 0
                  ? Math.round(
                      (webhooks.reduce((sum, w) => sum + (w.success_count || 0), 0) /
                        Math.max(webhooks.reduce((sum, w) => sum + (w.total_calls || 0), 0), 1)) *
                        100
                    )
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Webhooks */}
      <Card className={settingsSectionCardClassName}>
        <CardHeader>
          <CardTitle className="text-base">Webhooks Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum webhook configurado ainda
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Webhook
              </Button>
            </div>
          ) : (
            <div className={settingsTableShellClassName}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Chamadas</TableHead>
                    <TableHead className="text-center">Sucesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">
                        {webhook.name}
                        {webhook.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {webhook.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className={`text-xs ${settingsCodeChipClassName}`}>
                          {webhook.url.length > 40
                            ? webhook.url.substring(0, 40) + '...'
                            : webhook.url}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {webhook.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {webhook.auth_type === 'none' ? 'Nenhuma' : webhook.auth_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {webhook.is_active ? (
                          <Badge variant="success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {webhook.total_calls || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {webhook.total_calls && webhook.total_calls > 0 ? (
                          <span
                            className={
                              ((webhook.success_count || 0) / webhook.total_calls) * 100 >= 80
                                ? 'text-success font-medium'
                                : 'text-warning font-medium'
                            }
                          >
                            {Math.round(
                              ((webhook.success_count || 0) / webhook.total_calls) * 100
                            )}
                            %
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTest(webhook.id)}>
                              <TestTube className="h-4 w-4 mr-2" />
                              Testar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewLogs(webhook.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDialog(webhook)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(webhook.id)}
                              className={settingsDangerMenuItemClassName}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Recentes (se houver webhook selecionado) */}
      {selectedWebhook && (
        <Card className={settingsSectionCardClassName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Logs Recentes</CardTitle>
                <CardDescription>
                  Últimas 20 chamadas do webhook selecionado
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedWebhook(null)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className={settingsTableShellClassName}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Retries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDistanceToNow(new Date(log.triggered_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge variant="success">
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Erro</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {log.response_status_code ?? log.status_code ?? '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.response_time_ms}ms
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.retry_count > 0 ? `${log.retry_count}x` : '-'}
                      </TableCell>
                    </TableRow>
                  )))
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações */}
      <Card className={settingsSectionCardClassName}>
        <CardHeader>
          <CardTitle className="text-base">Como usar Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>1.</strong> Crie um workflow no N8N e copie a URL do webhook
          </p>
          <p>
            <strong>2.</strong> Adicione o webhook aqui configurando método HTTP e autenticação
          </p>
          <p>
            <strong>3.</strong> Teste a conexão antes de ativar
          </p>
          <p>
            <strong>4.</strong> Configure retry automático para maior confiabilidade
          </p>
          <p className="pt-2 border-t">
            <strong>Dica:</strong> Use webhooks para automatizar notificações, sincronizações e
            integrações com outros sistemas
          </p>
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <WebhookFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        webhook={editingWebhook}
        onSave={handleSaveWebhook}
      />
    </div>
  );
}
