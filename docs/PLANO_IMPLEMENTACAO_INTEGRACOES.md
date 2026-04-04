# 🚀 PLANO DE IMPLEMENTAÇÃO - INTEGRAÇÕES 100%
**Objetivo:** Deixar WhatsApp, Google Calendar e Tick Tick 100% funcionais  
**Duração Total:** 4-5 semanas (80-100h)  
**Data:** 12/11/2025

---

## 📊 ANÁLISE CONSOLIDADA (DOIS RELATÓRIOS)

### Status Real Verificado:

**✅ WhatsApp: 95% Completo**
- Secrets configurados no Supabase ✅
- 6 Edge Functions deployadas ✅
- Database completa ✅
- Frontend UI/UX ✅
- **FALTA:** QR Code real (mock na linha 118)

**❌ Google Calendar: 5% Completo**
- Apenas UI mockada
- Nenhum backend implementado

**❌ Tick Tick: 5% Completo**
- Apenas UI mockada
- Nenhum backend implementado

---

## 🎯 ROADMAP GERAL

```
FASE 1 (P0) → WhatsApp 100%        → 1-2 dias   → 8h
FASE 2 (P1) → Notificações          → 1 semana   → 10h
FASE 3 (P2) → Google Calendar       → 2 semanas  → 40h
FASE 4 (P2) → Sincronização Faturas → 1 semana   → 20h
FASE 5 (P3) → Tick Tick             → 1 semana   → 28h
FASE 6 (P4) → Open Banking          → 2+ semanas → 40h+
```

---

## 📅 FASE 1: WHATSAPP 100% (P0 - CRÍTICO)
**Duração:** 1-2 dias | **Esforço:** 8 horas

### Sprint 1.1: QR Code Real (4h)

**Etapa 1.1.1: Criar Edge Function `generate-qr-code`** (2h)
```typescript
// supabase/functions/generate-qr-code/index.ts
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { user_id } = await req.json();
  
  // 1. Buscar session do usuário
  const { data: connection } = await supabase
    .from('whatsapp_connection_status')
    .select('*')
    .eq('user_id', user_id)
    .single();
  
  // 2. Chamar UAZAPI para gerar QR Code
  const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_SERVER_URL');
  const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN');
  
  const response = await fetch(`${UAZAPI_BASE_URL}/instance/qr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UAZAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  const { qrCode, expiresAt } = await response.json();
  
  // 3. Salvar no banco
  await supabase
    .from('whatsapp_connection_status')
    .update({
      qr_code: qrCode,
      qr_code_expires_at: expiresAt,
    })
    .eq('user_id', user_id);
  
  return new Response(JSON.stringify({ qrCode, expiresAt }));
});
```

**Checklist:**
- [ ] Criar arquivo `supabase/functions/generate-qr-code/index.ts`
- [ ] Implementar lógica acima
- [ ] Deploy: `supabase functions deploy generate-qr-code`
- [ ] Testar via Postman/Thunder Client

**Etapa 1.1.2: Atualizar Hook Frontend** (1h)
```typescript
// src/hooks/useWhatsAppConnection.ts (linha 109-141)
const connect = async () => {
  if (!userId || !connection) return;
  
  try {
    setIsLoading(true);
    setError(null);
    
    // ✅ CHAMAR EDGE FUNCTION REAL
    const { data, error } = await supabase.functions.invoke('generate-qr-code', {
      body: { user_id: userId },
    });
    
    if (error) throw error;
    
    setQrCode(data.qrCode);
    setQrCodeExpiry(new Date(data.expiresAt));
    
    await fetchConnection();
  } catch (err) {
    console.error('Erro ao conectar WhatsApp:', err);
    setError(err instanceof Error ? err.message : 'Erro ao conectar');
  } finally {
    setIsLoading(false);
  }
};
```

**Checklist:**
- [ ] Remover mock da linha 118-119
- [ ] Implementar chamada real acima
- [ ] Testar no frontend

**Etapa 1.1.3: Webhook UAZAPI** (1h)
```typescript
// supabase/functions/webhook-uazapi/index.ts
serve(async (req) => {
  const payload = await req.json();
  
  // Validar signature
  const signature = req.headers.get('X-UAZAPI-Signature');
  if (!validateSignature(payload, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Processar evento
  if (payload.event === 'qr_scanned') {
    await supabase
      .from('whatsapp_connection_status')
      .update({
        is_connected: true,
        phone_number: payload.phone,
        connected_at: new Date().toISOString(),
      })
      .eq('session_id', payload.sessionId);
  }
  
  if (payload.event === 'message_received') {
    // Chamar process-whatsapp-message
    await supabase.functions.invoke('process-whatsapp-message', {
      body: payload.message,
    });
  }
  
  return new Response('OK');
});
```

**Checklist:**
- [ ] Criar Edge Function `webhook-uazapi`
- [ ] Deploy
- [ ] Configurar webhook no painel UAZAPI: `{SUPABASE_URL}/functions/v1/webhook-uazapi`

### Sprint 1.2: Testes E2E (2h)

**Etapa 1.2.1: Teste Manual**
- [ ] Abrir app → Configurações → Integrações → WhatsApp
- [ ] Clicar "Conectar WhatsApp"
- [ ] Verificar QR Code real gerado
- [ ] Escanear com celular
- [ ] Verificar status "Conectado"

**Etapa 1.2.2: Teste Comandos**
- [ ] Enviar mensagem "saldo" → Verificar resposta
- [ ] Enviar mensagem "resumo" → Verificar resposta
- [ ] Enviar áudio → Verificar transcrição
- [ ] Enviar foto de nota fiscal → Verificar OCR

**Etapa 1.2.3: Logs**
- [ ] Verificar logs no Supabase Functions
- [ ] Verificar registros em `whatsapp_messages`

---

## 📅 FASE 2: NOTIFICAÇÕES PROATIVAS (P1)
**Duração:** 1 semana | **Esforço:** 10 horas

### Sprint 2.1: Sistema de Notificações (10h)

**Etapa 2.1.1: Edge Function `send-proactive-notifications`** (4h)
- Vencimento de contas (3 dias antes)
- Orçamento em 80%, 90%, 100%
- Metas atingidas
- Dividendos recebidos

**Etapa 2.1.2: Cron Job** (2h)
```sql
SELECT cron.schedule(
  'send-proactive-notifications',
  '0 9 * * *', -- Todo dia 9h
  $$
  SELECT net.http_post(
    url := '{SUPABASE_URL}/functions/v1/send-proactive-notifications',
    headers := '{"Authorization": "Bearer {SERVICE_KEY}"}'::jsonb
  )
  $$
);
```

**Etapa 2.1.3: Preferências do Usuário** (4h)
- Criar tabela `notification_preferences`
- UI para ativar/desativar notificações
- Horário preferido

---

## 📅 FASE 3: GOOGLE CALENDAR (P2)
**Duração:** 2 semanas | **Esforço:** 40 horas

### Sprint 3.1: OAuth 2.0 Setup (16h)

**Etapa 3.1.1: Google Cloud Console** (2h)
- [ ] Criar projeto: "Personal Finance LA"
- [ ] Ativar Google Calendar API
- [ ] Configurar OAuth consent screen
- [ ] Criar credenciais OAuth 2.0
- [ ] Adicionar Redirect URI: `{SUPABASE_URL}/functions/v1/google-auth-callback`
- [ ] Copiar Client ID e Client Secret

**Etapa 3.1.2: Secrets Supabase** (30min)
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI={SUPABASE_URL}/functions/v1/google-auth-callback
```

**Etapa 3.1.3: Edge Function `google-auth-start`** (3h)
```typescript
serve(async (req) => {
  const { user_id } = await req.json();
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${GOOGLE_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=https://www.googleapis.com/auth/calendar` +
    `&access_type=offline` +
    `&state=${user_id}`;
  
  return new Response(JSON.stringify({ authUrl }));
});
```

**Etapa 3.1.4: Edge Function `google-auth-callback`** (4h)
```typescript
serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // user_id
  
  // Trocar code por tokens
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  
  const { access_token, refresh_token, expires_in } = await response.json();
  
  // Salvar em integration_configs
  await supabase.from('integration_configs').upsert({
    user_id: state,
    integration_type: 'google_calendar',
    status: 'connected',
    access_token_encrypted: encrypt(access_token),
    refresh_token_encrypted: encrypt(refresh_token),
    last_connected_at: new Date().toISOString(),
  });
  
  // Redirect para app
  return Response.redirect(`${APP_URL}/configuracoes/integracoes?success=true`);
});
```

**Etapa 3.1.5: Edge Function `refresh-google-token`** (2h)
**Etapa 3.1.6: Testes OAuth** (2h)

### Sprint 3.2: Sync Engine (16h)

**Etapa 3.2.1: Edge Function `sync-google-calendar`** (8h)
Lógica:
1. Buscar integration_config
2. Refresh token se expirado
3. Buscar contas a pagar próximas 30 dias
4. Criar eventos no Google Calendar
5. Atualizar last_sync_at

**Etapa 3.2.2: Cron Job Sync** (2h)
```sql
SELECT cron.schedule(
  'sync-google-calendar',
  '0 */2 * * *', -- A cada 2 horas
  $$...$$
);
```

**Etapa 3.2.3: Mapeamento de Dados** (4h)
- Contas → Eventos com reminders
- Recorrentes → Eventos recorrentes
- Metas → Eventos com deadline
- Dividendos → Eventos futuros

**Etapa 3.2.4: Conflict Resolution** (2h)

### Sprint 3.3: Frontend Hook (8h)

**Etapa 3.3.1: Hook `useGoogleCalendar.ts`** (6h)
```typescript
export function useGoogleCalendar() {
  const [config, setConfig] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const connect = async () => {
    const { data } = await supabase.functions.invoke('google-auth-start', {
      body: { user_id },
    });
    window.location.href = data.authUrl;
  };
  
  const disconnect = async () => {
    await supabase.from('integration_configs')
      .update({ status: 'disconnected' })
      .eq('user_id', user_id)
      .eq('integration_type', 'google_calendar');
  };
  
  const sync = async () => {
    await supabase.functions.invoke('sync-google-calendar', {
      body: { user_id },
    });
  };
  
  return { config, isConnected, connect, disconnect, sync, isLoading };
}
```

**Etapa 3.3.2: Atualizar `IntegrationsSettings.tsx`** (2h)
- Remover handlers mock
- Integrar hook real
- Loading states
- Error handling

---

## 📅 FASE 4: SINCRONIZAÇÃO DE FATURAS (P2)
**Duração:** 1 semana | **Esforço:** 20 horas

### Sprint 4.1: OCR de Emails (12h)
- Integrar com Gmail API
- Detectar emails de faturas
- Extrair dados (valor, vencimento, fornecedor)
- Criar contas automaticamente

### Sprint 4.2: APIs de Bancos (8h)
- Nubank via Pluggy/Belvo
- Itaú via Pluggy/Belvo
- Reconciliação automática

---

## 📅 FASE 5: TICK TICK (P3)
**Duração:** 1 semana | **Esforço:** 28 horas

### Sprint 5.1: API Integration (12h)

**Etapa 5.1.1: Estudar Docs** (2h)
- https://developer.ticktick.com

**Etapa 5.1.2: Edge Function `test-ticktick-connection`** (3h)
```typescript
serve(async (req) => {
  const { api_key } = await req.json();
  
  const response = await fetch('https://api.ticktick.com/api/v2/project', {
    headers: { 'Authorization': `Bearer ${api_key}` },
  });
  
  if (response.ok) {
    const projects = await response.json();
    return new Response(JSON.stringify({ valid: true, projects }));
  }
  
  return new Response(JSON.stringify({ valid: false }));
});
```

**Etapa 5.1.3: Edge Function `create-ticktick-task`** (4h)
**Etapa 5.1.4: Edge Function `sync-ticktick-status`** (3h)

### Sprint 5.2: Triggers & Sync (10h)

**Etapa 5.2.1: Trigger Supabase** (4h)
```sql
CREATE TRIGGER create_ticktick_task_on_bill_insert
AFTER INSERT ON payable_bills
FOR EACH ROW
EXECUTE FUNCTION create_ticktick_task();
```

**Etapa 5.2.2: Cron Job** (2h)
**Etapa 5.2.3: Webhook Tick Tick → Supabase** (4h)

### Sprint 5.3: Frontend (6h)
- Hook `useTickTick.ts`
- Atualizar UI
- Validação real de API Key

---

## 📅 FASE 6: OPEN BANKING (P4 - OPCIONAL)
**Duração:** 2+ semanas | **Esforço:** 40+ horas

### Sprint 6.1: Pluggy/Belvo Integration (20h)
- Criar conta
- Implementar OAuth flow
- Buscar extratos
- Categorização automática

### Sprint 6.2: Pagamento de Boletos (12h)
- Integrar API Banco Central
- Pix integration
- Pagamento automático

### Sprint 6.3: Reconciliação Bancária (8h)
- Matching transactions
- Upload OFX/CSV
- Dashboard de divergências

---

## 📋 CHECKLIST GERAL

### ✅ Antes de Começar
- [ ] Verificar todos os secrets no Supabase (já feito ✅)
- [ ] Confirmar Edge Functions deployadas (já feito ✅)
- [ ] Testar conexão UAZAPI manualmente
- [ ] Criar conta Google Cloud Console
- [ ] Criar conta Tick Tick Developer

### ✅ Durante Implementação
- [ ] Commitar a cada etapa concluída
- [ ] Testar após cada deploy
- [ ] Documentar erros encontrados
- [ ] Atualizar este plano se necessário

### ✅ Após Conclusão
- [ ] Testes E2E completos
- [ ] Documentação atualizada
- [ ] Screenshots/videos de demo
- [ ] Deploy em produção

---

## 💰 CUSTOS MENSAIS (100 usuários)

| Serviço | Custo/Mês |
|---------|-----------|
| UAZAPI | $30 |
| Supabase Pro | $25 |
| OpenAI API | ~$50 |
| Google API | $0 (free tier) |
| Tick Tick API | $0 |
| Pluggy/Belvo | $0-100 (volume) |
| **TOTAL** | **$105-205** |

**Por usuário:** ~$1-2/mês

---

## 📊 MÉTRICAS DE SUCESSO

### WhatsApp
- [ ] Conexões ativas: >60%
- [ ] Mensagens/dia: >3
- [ ] Taxa resposta: >95%
- [ ] Tempo resposta: <5s

### Google Calendar
- [ ] Syncs ativas: >40%
- [ ] Eventos criados/mês: >50
- [ ] Success rate: >98%

### Tick Tick
- [ ] Conexões ativas: >20%
- [ ] Tasks criadas/mês: >30
- [ ] Taxa conclusão: >70%

---

**🎯 PRÓXIMO PASSO IMEDIATO:** Começar FASE 1 - Sprint 1.1 - Etapa 1.1.1 (Criar Edge Function `generate-qr-code`)
