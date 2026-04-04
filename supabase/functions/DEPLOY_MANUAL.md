# 🚀 Deploy Manual da Edge Function (SEM CLI)

## ✅ **MÉTODO MAIS SIMPLES - Via Dashboard**

### **PASSO 1: Acessar Edge Functions**

1. Acesse: [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em: **Edge Functions** (menu lateral)
4. Clique em: **Create a new function**

### **PASSO 2: Criar a Função**

**Nome da função:**
```
invoice-automation
```

**Código da função:**

Copie TODO o conteúdo do arquivo `supabase/functions/invoice-automation/index.ts` e cole no editor.

### **PASSO 3: Deploy**

1. Clique em: **Deploy function**
2. Aguarde o deploy (leva ~30 segundos)
3. Pronto! ✅

---

## 🔑 **CONFIGURAR SECRETS NO GITHUB**

### **1. Obter as credenciais do Supabase**

**SUPABASE_URL:**
- Dashboard → Settings → API
- Copie: **Project URL**
- Exemplo: `https://abcdefghijk.supabase.co`

**SUPABASE_SERVICE_ROLE_KEY:**
- Dashboard → Settings → API
- Copie: **service_role** (secret key)
- ⚠️ **NUNCA exponha essa chave publicamente!**

### **2. Adicionar no GitHub**

1. Vá no seu repositório no GitHub
2. Acesse: **Settings** → **Secrets and variables** → **Actions**
3. Clique em: **New repository secret**

**Adicione 2 secrets:**

**Secret 1:**
```
Name: SUPABASE_URL
Secret: https://SEU_PROJECT_REF.supabase.co
```

**Secret 2:**
```
Name: SUPABASE_SERVICE_ROLE_KEY
Secret: (cole a service_role key aqui)
```

---

## ⏰ **ATIVAR O GITHUB ACTION**

### **1. Commit e Push**

```bash
git add .
git commit -m "feat: adicionar automação de faturas"
git push origin main
```

### **2. Verificar se está ativo**

1. Vá em: **Actions** no GitHub
2. Você deve ver: **Invoice Automation (Daily Cron)**
3. Status: ✅ (verde)

### **3. Testar Manualmente**

1. Clique no workflow: **Invoice Automation**
2. Clique em: **Run workflow**
3. Selecione: **main** branch
4. Clique em: **Run workflow**
5. Aguarde ~30 segundos
6. Veja os logs da execução

---

## 🧪 **TESTAR A EDGE FUNCTION DIRETAMENTE**

### **Opção 1: Via Dashboard**

1. Dashboard → Edge Functions
2. Selecione: `invoice-automation`
3. Clique em: **Invoke function**
4. Veja a resposta

### **Opção 2: Via cURL**

```bash
curl -X POST \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://SEU_PROJECT_REF.supabase.co/functions/v1/invoice-automation"
```

### **Opção 3: Via Postman/Insomnia**

```
Method: POST
URL: https://SEU_PROJECT_REF.supabase.co/functions/v1/invoice-automation
Headers:
  Authorization: Bearer SUA_SERVICE_ROLE_KEY
  Content-Type: application/json
```

---

## 📊 **RESPOSTA ESPERADA**

```json
{
  "success": true,
  "closedInvoices": 0,
  "overdueInvoices": 0,
  "errors": [],
  "timestamp": "2025-01-05T20:30:00.000Z"
}
```

---

## ✅ **CHECKLIST COMPLETO**

- [ ] Edge Function criada no Dashboard
- [ ] Código copiado e deployado
- [ ] SUPABASE_URL adicionado nos secrets do GitHub
- [ ] SUPABASE_SERVICE_ROLE_KEY adicionado nos secrets do GitHub
- [ ] GitHub Action commitado e pushed
- [ ] Teste manual executado com sucesso
- [ ] Workflow aparece em Actions

---

## 🎉 **PRONTO!**

Sua automação está funcionando **SEM precisar do CLI**! 🚀

**Próxima execução automática:** Todo dia às 00:00 UTC (21:00 Brasília)

---

## 🆘 **TROUBLESHOOTING**

### **Edge Function não aparece no Dashboard**
- Aguarde 1-2 minutos após criar
- Recarregue a página

### **GitHub Action não executa**
- Verifique se os secrets estão corretos
- Confirme que o arquivo `.github/workflows/invoice-automation.yml` foi commitado
- Veja se há erros em: Actions → workflow → logs

### **Erro 401 ao invocar**
- Verifique se está usando a `service_role` key
- Confirme que a key não expirou

### **Erro 404 ao invocar**
- Confirme que a função foi deployada
- Verifique o nome: `invoice-automation` (exato)
- URL correta: `/functions/v1/invoice-automation`
