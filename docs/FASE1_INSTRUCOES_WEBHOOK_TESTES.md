# 📋 FASE 1 - INSTRUÇÕES FINAIS

## ✅ Sprint 1.1: CONCLUÍDO
- [x] Edge Function `generate-qr-code` criada e deployada
- [x] Edge Function `webhook-uazapi` criada e deployada  
- [x] Hook frontend `useWhatsAppConnection.ts` atualizado (mock removido)

---

## 🔄 Sprint 1.2: CONFIGURAR WEBHOOK UAZAPI

### Passo 1: Acessar Painel UAZAPI

1. Acesse: https://uazapi.com/dashboard (ou URL do seu painel)
2. Login com suas credenciais
3. Selecione a instância configurada (verifique `UAZAPI_INSTANCE_ID`)

### Passo 2: Configurar Webhook URL

**URL do Webhook:**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/webhook-uazapi
```

**Eventos para Habilitar:**
- ✅ `qr_scanned` - QR Code escaneado
- ✅ `connection_update` - Status da conexão mudou
- ✅ `message_received` ou `messages.upsert` - Mensagem recebida
- ✅ `connection_closed` - Conexão desconectada

### Passo 3: Verificar Configuração

1. Salve as configurações no painel UAZAPI
2. Teste a conexão (alguns painéis têm botão "Test Webhook")
3. Verifique logs da Edge Function:
   - Dashboard Supabase → Functions → `webhook-uazapi` → Logs

---

## 🧪 Sprint 1.3: TESTES E2E

### Teste 1: QR Code Real (15min)

**Procedimento:**
1. Abra o aplicativo local: `http://localhost:5173`
2. Login: `lucianoalf.la@gmail.com` / `250178Alf#`
3. Navegue: Configurações → Integrações → WhatsApp
4. Clique: **"Conectar WhatsApp"**

**Verificações:**
- [ ] QR Code aparece (não é o pixel mock anterior)
- [ ] QR Code é uma imagem real (base64 válido)
- [ ] Contador de expiração funciona (2 minutos)
- [ ] Após 2 minutos, QR Code expira

**Logs para Verificar:**
```bash
# Console do navegador
[useWhatsAppConnection] Chamando generate-qr-code...
[useWhatsAppConnection] ✅ QR Code gerado com sucesso

# Dashboard Supabase → Functions → generate-qr-code → Logs
[generate-qr-code] Iniciando...
[generate-qr-code] Gerando QR Code para usuário: xxx
[generate-qr-code] Chamando UAZAPI...
[generate-qr-code] QR Code recebido da UAZAPI
[generate-qr-code] ✅ QR Code salvo com sucesso
```

**Se Falhar:**
- Verificar se `UAZAPI_SERVER_URL`, `UAZAPI_TOKEN`, `UAZAPI_INSTANCE_ID` estão corretos
- Verificar logs da Edge Function no Supabase
- Verificar se instância UAZAPI está ativa

---

### Teste 2: Escanear QR Code (10min)

**Procedimento:**
1. Com QR Code exibido no app, abra WhatsApp no celular
2. Vá em: **Aparelhos Conectados** → **Conectar Dispositivo**
3. Escaneie o QR Code

**Verificações:**
- [ ] WhatsApp conecta com sucesso
- [ ] Status no app muda para "Conectado"
- [ ] Telefone aparece na tela
- [ ] Badge verde "Conectado" exibido

**Banco de Dados (Verificar):**
```sql
SELECT 
  is_connected, 
  phone_number, 
  connected_at,
  instance_id
FROM whatsapp_connection_status
WHERE user_id = '{seu_user_id}';
```

Esperado:
- `is_connected`: `true`
- `phone_number`: Seu número formatado
- `connected_at`: Timestamp atual
- `instance_id`: Valor de `UAZAPI_INSTANCE_ID`

---

### Teste 3: Enviar Mensagem de Texto (5min)

**Procedimento:**
1. No WhatsApp do celular, envie mensagem para a instância conectada:
   ```
   saldo
   ```

**Verificações:**
- [ ] Webhook recebe mensagem (`webhook-uazapi` logs)
- [ ] Mensagem salva em `whatsapp_messages`
- [ ] `process-whatsapp-message` é chamado
- [ ] Ana Clara responde com saldo atual

**Logs Esperados:**
```
[webhook-uazapi] Webhook recebido
[webhook-uazapi] Event: message_received
[webhook-uazapi] Processando mensagem recebida...
[webhook-uazapi] ✅ Mensagem salva: {message_id}
[webhook-uazapi] ✅ Mensagem enviada para processamento

[process-whatsapp-message] Processando mensagem: {message_id}
[process-whatsapp-message] Detectando intent...
[process-whatsapp-message] Intent detectado: check_balance
[process-whatsapp-message] ✅ Resposta enviada
```

---

### Teste 4: Comandos Rápidos (15min)

**Enviar via WhatsApp:**

1. **"resumo"**
   - Espera: Resumo financeiro do mês
   
2. **"contas"**
   - Espera: Lista de contas a pagar

3. **"meta"**
   - Espera: Status das metas financeiras

4. **"ajuda"**
   - Espera: Lista de comandos disponíveis

**Verificações:**
- [ ] Todos os comandos respondem em <5 segundos
- [ ] Respostas formatadas corretamente
- [ ] Dados estão corretos (comparar com app)

---

### Teste 5: Áudio (Whisper) (10min)

**Procedimento:**
1. Envie áudio do WhatsApp:
   ```
   🎤 "Adicionar despesa de 50 reais com almoço"
   ```

**Verificações:**
- [ ] Áudio é recebido (`message_type: 'audio'`)
- [ ] `transcribe-audio` Edge Function é chamada
- [ ] Transcrição correta salva em `whatsapp_messages.content`
- [ ] Intent detectado: `add_expense`
- [ ] Despesa criada no banco

**SQL para Verificar:**
```sql
SELECT * FROM whatsapp_messages 
WHERE message_type = 'audio' 
ORDER BY created_at DESC 
LIMIT 1;

SELECT * FROM transactions 
WHERE description ILIKE '%almoço%' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Teste 6: Imagem/Nota Fiscal (OCR) (10min)

**Procedimento:**
1. Tire foto de uma nota fiscal
2. Envie no WhatsApp com legenda:
   ```
   Nota fiscal do mercado
   ```

**Verificações:**
- [ ] Imagem recebida (`message_type: 'image'`)
- [ ] `extract-receipt-data` Edge Function chamada (GPT-4 Vision)
- [ ] Dados extraídos: valor, data, estabelecimento
- [ ] Transação criada automaticamente
- [ ] Ana Clara confirma: "Registrei sua compra de R$ XX,XX no {estabelecimento}"

**SQL para Verificar:**
```sql
SELECT 
  content,
  extracted_data,
  response_text
FROM whatsapp_messages 
WHERE message_type = 'image' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Teste 7: Conversa Livre (5min)

**Procedimento:**
1. Envie mensagem:
   ```
   Quanto eu gastei essa semana?
   ```

**Verificações:**
- [ ] Intent detectado: `general_question`
- [ ] LLM processado (`process-whatsapp-message`)
- [ ] Resposta contextualizada
- [ ] Tom natural (Ana Clara)

---

## 📊 CRITÉRIOS DE SUCESSO

### WhatsApp 100% Funcional:
- ✅ QR Code real gerado via UAZAPI
- ✅ Conexão estabelecida com sucesso
- ✅ Webhook recebendo eventos
- ✅ 8 comandos rápidos funcionando
- ✅ Áudio → Transcrição → Ação
- ✅ Imagem → OCR → Transação
- ✅ Conversa livre com Ana Clara

### Performance:
- ✅ Tempo de resposta: < 5 segundos
- ✅ Taxa de sucesso: > 95%
- ✅ Zero erros críticos

### Banco de Dados:
- ✅ `whatsapp_connection_status.is_connected = true`
- ✅ `whatsapp_messages` populada
- ✅ Transações criadas via WhatsApp

---

## 🐛 TROUBLESHOOTING

### Problema: QR Code não aparece

**Possíveis causas:**
1. Edge Function `generate-qr-code` falhou
2. Credenciais UAZAPI incorretas
3. Instância UAZAPI desativada

**Solução:**
```bash
# Verificar logs
supabase functions logs generate-qr-code --tail

# Testar UAZAPI manualmente
curl -X POST https://{UAZAPI_SERVER_URL}/instance/qr \
  -H "Authorization: Bearer {UAZAPI_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"instance_id": "{UAZAPI_INSTANCE_ID}"}'
```

---

### Problema: Webhook não recebe mensagens

**Possíveis causas:**
1. Webhook URL não configurada no painel UAZAPI
2. Eventos não habilitados
3. Instância desconectada

**Solução:**
1. Verificar painel UAZAPI → Webhooks
2. Testar manualmente:
   ```bash
   curl -X POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/webhook-uazapi \
     -H "Content-Type: application/json" \
     -d '{
       "event": "message_received",
       "instance_id": "{UAZAPI_INSTANCE_ID}",
       "message": {
         "id": "test123",
         "from": "5511999999999",
         "type": "text",
         "body": "teste",
         "timestamp": 1699999999
       }
     }'
   ```

---

### Problema: Comandos não respondem

**Possíveis causas:**
1. `process-whatsapp-message` com erro
2. `whatsapp_quick_commands` vazia
3. LLM API sem créditos

**Solução:**
```sql
-- Verificar comandos
SELECT * FROM whatsapp_quick_commands;

-- Se vazio, popular:
INSERT INTO whatsapp_quick_commands (command, description, response_template)
VALUES 
  ('saldo', 'Ver saldo atual', 'Seu saldo atual é...'),
  ('resumo', 'Resumo financeiro', 'Resumo do mês...'),
  ('contas', 'Contas a pagar', 'Você tem X contas...');
```

---

## ✅ CHECKLIST FINAL SPRINT 1.2 e 1.3

- [ ] Webhook configurado no painel UAZAPI
- [ ] QR Code real testado e funcionando
- [ ] WhatsApp conectado com sucesso
- [ ] 8 comandos testados e funcionando
- [ ] Áudio → Transcrição OK
- [ ] Imagem → OCR → Transação OK
- [ ] Conversa livre OK
- [ ] Logs sem erros críticos
- [ ] Performance < 5s
- [ ] Banco de dados atualizado

---

**🎯 Após concluir todos os testes, WhatsApp estará 100% FUNCIONAL!**

**Próximo passo:** FASE 2 - Notificações Proativas
