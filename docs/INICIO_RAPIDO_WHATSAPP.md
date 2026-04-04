# ⚡ INÍCIO RÁPIDO - WHATSAPP + ANA CLARA

**3 Passos para Deixar Tudo Funcionando AGORA**

---

## 🚀 PASSO 1: CONFIGURAR SECRETS (2 minutos)

### Acesse o Supabase:
```
https://app.supabase.com/project/sbnpmhmvcspwcyjhftlw/settings/edge-functions
```

### Adicione 3 variáveis:

1. **UAZAPI_TOKEN**
   - Value: `seu_token_uazapi`

2. **UAZAPI_INSTANCE_ID**
   - Value: `seu_instance_id`

3. **OPENAI_API_KEY**
   - Value: `sk-proj-...sua_key`

**Como:** Clique "Add Secret" → Cole o nome → Cole o valor → Save

---

## 🔗 PASSO 2: CONFIGURAR WEBHOOK UAZAPI (1 minuto)

### No painel UAZAPI:

1. Vá em: **Webhooks / Configurações**

2. **URL do Webhook:**
   ```
   https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/process-whatsapp-message
   ```

3. **Marque eventos:**
   - ✅ Message Received
   - ✅ Message Sent
   - ✅ Message Status

4. **Salvar**

---

## 📱 PASSO 3: CONECTAR WHATSAPP (30 segundos)

### No seu app:

1. Acesse: **Settings → Integrações → WhatsApp**
2. Clique: **"Conectar WhatsApp"**
3. **Escaneie o QR Code** com seu WhatsApp
4. Aguarde o badge ficar **verde**

---

## ✅ PRONTO! TESTE AGORA

Envie no WhatsApp conectado:

```
saldo
```

**Você deve receber em 2-5 segundos:**
```
💰 Saldo Total: R$ X.XXX,XX

🏦 Banco Inter: R$ XXX,XX
💳 Nubank: R$ XXX,XX
...
```

---

## 🎯 OUTROS TESTES

```
resumo
contas
investimentos
ajuda
```

**OU lançamento:**
```
Gastei R$ 45 no almoço
```

---

## 🎉 TUDO FUNCIONANDO?

✅ **Sim?** → Explore Settings → Integrações → Tabs WhatsApp
✅ **Não?** → Veja logs no Supabase → Edge Functions → process-whatsapp-message

---

**Tempo total de configuração: ~3-4 minutos**

**Documentação completa:** `CONFIGURACAO_WHATSAPP_PRODUCAO.md`
