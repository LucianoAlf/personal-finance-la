# 🔧 TROUBLESHOOTING: WhatsApp UAZAPI

## ❌ **PROBLEMA ATUAL**

**Erro:** `Invalid token.`

**Causa:** O token de instância (`Instance Token`) que está configurado no Supabase Secrets não corresponde ao token atual da instância UAZAPI.

---

## ✅ **SOLUÇÃO PASSO A PASSO**

### **1️⃣ Obter o Token Correto**

1. Acesse o dashboard UAZAPI: https://lamusic.uazapi.com
2. Faça login com suas credenciais
3. Localize o campo **"Instance Token"** (como na imagem que você mostrou)
4. **COPIE** o token completo (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### **2️⃣ Atualizar no Supabase**

Execute no terminal:

```bash
npx supabase secrets set UAZAPI_INSTANCE_TOKEN=<cole_o_token_aqui> --project-ref sbnpmhmvcspwcyjhftlw
```

**Exemplo:**
```bash
npx supabase secrets set UAZAPI_INSTANCE_TOKEN=0a5d59d3-f3c8-419b-b9e8-701375814522 --project-ref sbnpmhmvcspwcyjhftlw
```

### **3️⃣ Testar Manualmente**

Teste se o token funciona:

```powershell
$headers = @{
    'token'='<seu_token_aqui>'; 
    'Content-Type'='application/json'
}
$body = @{
    'number'='5521981278047'; 
    'text'='🧪 TESTE - FinanceLA'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://lamusic.uazapi.com/send/text' -Method POST -Headers $headers -Body $body
```

**Resposta esperada:**
```json
{
  "success": true,
  "messageId": "..."
}
```

### **4️⃣ Testar via Sistema**

Depois de atualizar o secret, teste o sistema completo:

```bash
node test-whatsapp.cjs
```

---

## 🔍 **DIAGNÓSTICO COMPLETO**

### **Status Atual:**
- ✅ **Instância UAZAPI:** Conectada (conforme imagem)
- ✅ **Número:** 5521981278047
- ✅ **Server URL:** https://lamusic.uazapi.com
- ❌ **Token:** Desatualizado no Supabase

### **Histórico de Erros:**
1. **"UAZAPI_API_KEY não configurada"** → Corrigido (usamos UAZAPI_INSTANCE_TOKEN)
2. **"WhatsApp disconnected"** → Token errado
3. **"Invalid token"** → Token ainda não corresponde ao dashboard

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

- [ ] Token copiado do dashboard UAZAPI
- [ ] Secret atualizado no Supabase
- [ ] Teste manual funcionou
- [ ] Teste via sistema funcionou
- [ ] WhatsApp recebido no celular

---

## 🎯 **POSSÍVEIS CAUSAS DO TOKEN INVÁLIDO**

1. **Token desatualizado:** Você reconectou o WhatsApp e o token mudou
2. **Token copiado errado:** Espaços ou caracteres extras
3. **Instância diferente:** Está usando outra instância no dashboard
4. **Token expirado:** UAZAPI pode ter políticas de expiração

---

## 🔄 **SE AINDA NÃO FUNCIONAR**

### **Opção 1: Gerar Novo Token**
1. No dashboard UAZAPI, procure por "Regenerar Token" ou "API Keys"
2. Gere um novo token
3. Atualize no Supabase

### **Opção 2: Reconectar WhatsApp**
1. Desconecte o WhatsApp no dashboard
2. Escaneie o QR Code novamente
3. Copie o novo token gerado
4. Atualize no Supabase

### **Opção 3: Verificar Webhook**
Na imagem 2, vi que você tem webhook configurado. Certifique-se de que:
- URL: `https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-bill-reminders/uazapi-webhook`
- Eventos: `messages`, `messages_update`
- Status: Habilitado

---

## 📞 **SUPORTE**

Se nada funcionar:
1. Verifique créditos da conta UAZAPI
2. Teste com outro número
3. Entre em contato com suporte UAZAPI
4. Considere usar WhatsApp Business API oficial

---

## ✅ **QUANDO ESTIVER FUNCIONANDO**

Você verá:
```
📊 Status final: {
  "status": "sent",
  "sent_at": "2025-11-08T20:52:00",
  "retry_count": 0
}
```

E receberá a mensagem no WhatsApp! 🎉

---

**RESUMO:** O problema é apenas o token. Copie o token correto do dashboard e atualize no Supabase. O resto está funcionando perfeitamente! 🚀
