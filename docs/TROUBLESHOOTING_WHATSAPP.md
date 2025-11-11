# 🚨 TROUBLESHOOTING - WHATSAPP + ANA CLARA

## 🔍 DIAGNÓSTICO RÁPIDO DE ERROS

---

## ❌ ERROS COMUNS E SOLUÇÕES

### **Erro 1: "Webhook não alcançado"**
**Sintomas:**
- Mensagens chegam no WhatsApp mas Ana Clara não responde
- UAZAPI mostra erro 404/500 no webhook

**Causas Prováveis:**
1. URL do webhook incorreta
2. Edge Function não está ativa
3. Secrets não configurados

**Solução:**
```bash
# 1. Verifique se a URL está correta:
https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message

# 2. Teste a Edge Function no navegador:
# Abra a URL acima no browser
# Deve retornar: {"message":"WhatsApp message processor"}

# 3. Verifique logs no Supabase:
# Dashboard → Edge Functions → process-whatsapp-message → Logs
```

---

### **Erro 2: "API Key inválida"**
**Sintomas:**
- Erro 401/403 nos logs
- Mensagem "Invalid API key" ou "Unauthorized"

**Causas Prováveis:**
1. OPENAI_API_KEY não configurada
2. UAZAPI_TOKEN incorreto
3. Secrets com nome errado

**Solução:**
```bash
# 1. Verifique secrets no Supabase:
# Project Settings → Edge Functions → Environment Variables
# Deve ter EXATAMENTE estes nomes:
# - UAZAPI_TOKEN
# - UAZAPI_INSTANCE_ID
# - OPENAI_API_KEY

# 2. Teste API Key OpenAI:
curl -H "Authorization: Bearer sk-proj-SUA_KEY" \
     https://api.openai.com/v1/models

# 3. Teste API UAZAPI:
curl -H "Authorization: Bearer SEU_TOKEN" \
     https://api.uazapi.com/v1/instance
```

---

### **Erro 3: "WhatsApp não conecta"**
**Sintomas:**
- QR Code não aparece
- Badge fica vermelho "Desconectado"
- Timeout ao conectar

**Causas Prováveis:**
1. UAZAPI_TOKEN/INSTANCE_ID incorretos
2. QR Code expirou
3. WhatsApp já tem dispositivo conectado

**Solução:**
```bash
# 1. Verifique se as credenciais UAZAPI estão corretas:
# No painel UAZAPI, copie EXATAMENTE:
# - Token (sem espaços extras)
# - Instance ID (número ou string)

# 2. Desconecte outros dispositivos:
# WhatsApp → Configurações → Aparelhos conectados
# Desconecte todos e tente novamente

# 3. Limpe cache do QR Code:
# No app Settings → Integrações → WhatsApp
# Clique "Desconectar" → "Conectar" novamente
```

---

### **Erro 4: "Ana Clara não responde"**
**Sintomas:**
- Mensagem chega (log mostra recebimento)
- Mas não há resposta

**Causas Prováveis:**
1. Configuração de IA não criada
2. Provedor padrão não definido
3. LLM timeout

**Solução:**
```bash
# 1. Configure IA no app:
# Settings → IA (Ana Clara)
# - Selecione provedor (OpenAI)
# - Insira API Key
# - Marque "Marcar como padrão"
# - Clique "Testar Conexão"

# 2. Verifique logs da categorize-transaction:
# Dashboard → Edge Functions → categorize-transaction
# Procure erros de "timeout" ou "rate limit"
```

---

### **Erro 5: "Erro de CORS"**
**Sintomas:**
- Erro no navegador: "CORS policy blocked"
- Frontend não consegue chamar Edge Functions

**Causas Prováveis:**
1. Edge Function sem headers CORS
2. Chamada de domínio diferente

**Solução:**
```bash
# 1. Verifique se Edge Functions têm CORS:
# Todas as functions devem ter no início:
headers.set('Access-Control-Allow-Origin', '*')
headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')

# 2. Se o erro persistir, deploy novamente:
supabase functions deploy process-whatsapp-message
```

---

## 🔧 FERRAMENTAS DE DIAGNÓSTICO

### **1. Testar Webhook Manualmente**
```bash
# Teste se a Edge Function está ativa:
curl -X POST \
  https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "teste",
    "phone": "+5511999999999",
    "type": "text"
  }'
```

### **2. Verificar Logs em Tempo Real**
```bash
# No Supabase Dashboard:
# Edge Functions → process-whatsapp-message → Logs
# Filtre por "Recent" ou "Last 1 hour"
```

### **3. Testar Conexão com Banco**
```sql
-- No SQL Editor do Supabase:
SELECT COUNT(*) FROM whatsapp_messages;
SELECT COUNT(*) FROM whatsapp_connections;
SELECT COUNT(*) FROM ai_provider_configs;
```

### **4. Verificar Status das Edge Functions**
```bash
# Listar todas as functions:
supabase functions list

# Verificar status:
supabase functions status
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Antes de pedir ajuda, verifique:

### **✅ Supabase:**
- [ ] Secrets configurados (3 variáveis)
- [ ] Edge Functions ativas (6 functions)
- [ ] RLS policies ativas
- [ ] Tabelas WhatsApp existem

### **✅ UAZAPI:**
- [ ] Webhook URL configurado
- [ ] Eventos marcados (Message Received/Sent/Status)
- [ ] Token/Instance ID corretos
- [ ] QR Code gerando

### **✅ Frontend:**
- [ ] Badge WhatsApp aparece
- [ ] Settings → Integrações funciona
- [ ] Consegue clicar "Conectar WhatsApp"
- [ ] QR Code modal abre

### **✅ Testes:**
- [ ] Testou curl na Edge Function?
- [ ] Testou API Key OpenAI?
- [ ] Testou API UAZAPI?
- [ ] Viu logs de erro?

---

## 🆘 COMO PEDIR AJUDA

Se o erro persistir, forneça:

### **1. Informações do Erro:**
```bash
# Cole aqui:
- Mensagem exata do erro
- Onde aconteceu (passo)
- Horário do erro
```

### **2. Logs Relevantes:**
```bash
# Do Supabase Dashboard:
# Edge Functions → Logs (cole as últimas 10 linhas)
```

### **3. Configuração Atual:**
```bash
# Confirme se fez:
- [ ] Secrets configurados?
- [ ] Webhook configurado?
- [ ] WhatsApp conectado?
- [ ] IA configurada?
```

---

## 🚀 SOLUÇÕES RÁPIDAS

### **Reset Completo (se nada funcionar):**
```bash
# 1. Limpar todos os secrets:
# Supabase → Edge Functions → Environment Variables
# Delete todos e re-adicione

# 2. Re-deploy todas as functions:
supabase functions deploy process-whatsapp-message
supabase functions deploy execute-quick-command
supabase functions deploy categorize-transaction
supabase functions deploy send-whatsapp-message
supabase functions deploy transcribe-audio
supabase functions deploy extract-receipt-data

# 3. Resetar conexão WhatsApp:
# No app: Settings → Integrações → WhatsApp
# Desconectar → Conectar novamente

# 4. Limpar cache do navegador:
# Ctrl+F5 ou Cmd+Shift+R
```

---

## 📞 CONTATO SUPORTE

Se precisar de ajuda imediata:

1. **Cole o erro completo aqui**
2. **Anexe screenshot** se tiver
3. **Confirme o checklist acima**

**Tempo médio de resposta:** 2-5 minutos

---

**🔧 Lembre-se:** 90% dos erros são de configuração de secrets ou webhook. Verifique esses primeiro!
