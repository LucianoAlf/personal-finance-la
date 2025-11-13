# 🎓 GUIA DO INICIANTE - N8N PARA PERSONAL FINANCE LA

**Para quem:** Você que já tem N8N instalado mas não sabe mexer  
**Objetivo:** Configurar tudo do zero com JSONs prontos  
**Tempo:** ~2 horas  
**Dificuldade:** ⭐⭐ (Fácil/Médio)

---

## 📚 ÍNDICE

1. [Entendendo o N8N](#entendendo)
2. [Acessando o N8N](#acessando)
3. [Configurando Credenciais](#credenciais)
4. [Importando Workflows](#importando)
5. [Testando Tudo](#testando)
6. [Ativando Automações](#ativando)

---

<a name="entendendo"></a>
## 🧠 PARTE 1: ENTENDENDO O N8N (5 min)

### O que é N8N?

Pense no N8N como um **LEGO de automações**:
- Cada **peça** = um "node" (pedaço do fluxo)
- Você **conecta as peças** = cria um workflow
- Quando termina = tem uma automação funcionando

### Conceitos Básicos

```
┌─────────────────────────────────────────────┐
│              WORKFLOW (Fluxo)               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────┐    ┌──────┐    ┌──────┐          │
│  │Node 1│───▶│Node 2│───▶│Node 3│          │
│  │Start │    │Faz   │    │Envia │          │
│  │      │    │Algo  │    │WhatsApp│        │
│  └──────┘    └──────┘    └──────┘          │
│                                             │
└─────────────────────────────────────────────┘
```

**Tipos de Nodes:**
1. **Trigger** 🎬 - Inicia o workflow (Schedule, Webhook, Manual)
2. **Action** 🔨 - Faz algo (Query, HTTP, Function)
3. **Logic** 🧠 - Decide (IF, Switch, Loop)

### Nossa Arquitetura

Vamos criar **2 workflows simples primeiro**:

1. ✅ **Workflow Teste** - Para você aprender
2. ✅ **Processar WhatsApp** - Recebe mensagens

Depois expandimos para os outros 8 workflows!

---

<a name="acessando"></a>
## 🌐 PARTE 2: ACESSANDO O N8N (2 min)

### Se N8N está rodando localmente:

**1. Abra o navegador**
```
http://localhost:5678
```

**2. Faça login**
- Se é primeira vez: crie conta local
- Username: seu_email@example.com
- Password: senha_forte

**3. Você verá essa tela:**
```
┌────────────────────────────────────────┐
│  N8N - Workflow Automation             │
├────────────────────────────────────────┤
│                                        │
│  🏠 Dashboard                          │
│  📋 Workflows      ← CLIQUE AQUI       │
│  🔑 Credentials                        │
│  ⚙️  Settings                          │
│                                        │
└────────────────────────────────────────┘
```

---

<a name="credenciais"></a>
## 🔑 PARTE 3: CONFIGURANDO CREDENCIAIS (15 min)

**IMPORTANTE:** Configure as credenciais ANTES de importar workflows!

### 3.1. Credencial: Supabase

**Passo a passo:**

1. No N8N, vá em: **Credentials** (menu esquerdo)
2. Clique: **Add Credential**
3. Busque: **Postgres**
4. Preencha:

```
┌────────────────────────────────────────┐
│ Postgres Credential                    │
├────────────────────────────────────────┤
│ Name: Supabase Personal Finance       │
│                                        │
│ Host: db.xxxx.supabase.co              │
│   └─ Pegar no Supabase Dashboard      │
│      Project Settings → Database       │
│                                        │
│ Port: 5432                             │
│                                        │
│ Database: postgres                     │
│                                        │
│ User: postgres                         │
│                                        │
│ Password: [SUA_SERVICE_ROLE_KEY]       │
│   └─ Supabase → Settings → API        │
│      Service Role Key (secret)         │
│                                        │
│ SSL: ✅ Enable                         │
│   └─ OBRIGATÓRIO para Supabase        │
└────────────────────────────────────────┘
```

5. Clique **Test Connection**
6. Se aparecer ✅ "Connection successful" → **Save**

**🚨 ERRO COMUM:**
- ❌ "Connection failed" = SSL não ativado
- ✅ Ativar SSL e testar novamente

---

### 3.2. Credencial: UAZAPI (WhatsApp)

1. **Add Credential**
2. Busque: **HTTP Request Header Auth**
3. Preencha:

```
┌────────────────────────────────────────┐
│ Header Auth Credential                 │
├────────────────────────────────────────┤
│ Name: UAZAPI WhatsApp                  │
│                                        │
│ Header Name: apiKey                    │
│                                        │
│ Value: [SUA_API_KEY]                   │
│   └─ UAZAPI Dashboard → API Keys       │
└────────────────────────────────────────┘
```

4. **Save**

**Onde pegar API Key:**
1. Login em: https://uazapi.com
2. Dashboard → API
3. Copiar "API Key"

---

### 3.3. Credencial: OpenAI (Opcional agora)

Vamos configurar depois quando precisar de IA.

---

### ✅ CHECKPOINT 1

Antes de continuar, confirme:
- [ ] Credencial Supabase testada e salva
- [ ] Credencial UAZAPI salva
- [ ] Você está na tela "Workflows"

---

<a name="importando"></a>
## 📥 PARTE 4: IMPORTANDO SEU PRIMEIRO WORKFLOW (10 min)

### 4.1. Workflow de Teste (para aprender)

Vou criar um workflow SUPER SIMPLES para você entender como funciona.

**O que ele faz:**
1. Você clica "Execute"
2. Ele busca 1 usuário no Supabase
3. Mostra na tela

**Passo a passo:**

1. No N8N, clique: **New Workflow**
2. Na tela em branco, clique no **menu ⋮** (canto superior direito)
3. Clique: **Import from URL** (ou **Import from File**)
4. **Cole o JSON abaixo** OU **salve como arquivo e importe**

**JSON DO WORKFLOW TESTE:**

```json
{
  "name": "🧪 Teste - Buscar Usuário",
  "nodes": [
    {
      "parameters": {},
      "id": "manual-trigger-1",
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT id, full_name, email, phone FROM users LIMIT 1;",
        "options": {}
      },
      "id": "postgres-1",
      "name": "Buscar Usuário Supabase",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.4,
      "position": [450, 300],
      "credentials": {
        "postgres": {
          "id": "SUBSTITUA_PELO_ID_DA_SUA_CREDENCIAL",
          "name": "Supabase Personal Finance"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "set-1",
              "name": "mensagem",
              "value": "=Usuário encontrado: {{ $json.full_name }}\nEmail: {{ $json.email }}\nTelefone: {{ $json.phone }}",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "id": "set-1",
      "name": "Formatar Resultado",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.3,
      "position": [650, 300]
    }
  ],
  "pinData": {},
  "connections": {
    "Manual Trigger": {
      "main": [
        [
          {
            "node": "Buscar Usuário Supabase",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Usuário Supabase": {
      "main": [
        [
          {
            "node": "Formatar Resultado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1",
  "meta": {
    "instanceId": "personal-finance-la"
  },
  "id": "workflow-test-1",
  "tags": []
}
```

5. **Importante:** Após importar, você precisa **reconectar a credencial**:
   - Clique no node "Buscar Usuário Supabase"
   - No painel direito, clique em **Credential to connect with**
   - Selecione: "Supabase Personal Finance"
   - **Save**

6. Clique **Save** (canto superior direito)

---

### 4.2. Testando o Workflow

**Agora vamos executar!**

1. Clique no botão **Execute Workflow** (canto superior direito)
2. Aguarde ~2 segundos
3. Você verá **bolinhas verdes** nos nodes ✅
4. Clique no último node "Formatar Resultado"
5. Veja o resultado na aba **Output**:

```
┌───────────────────────────────────────┐
│ Output                                │
├───────────────────────────────────────┤
│ mensagem:                             │
│ "Usuário encontrado: João Silva       │
│  Email: joao@example.com              │
│  Telefone: 5521999999999"             │
└───────────────────────────────────────┘
```

🎉 **PARABÉNS!** Você executou seu primeiro workflow!

---

### 4.3. Entendendo o que Aconteceu

```
[Manual Trigger]  →  [Buscar no DB]  →  [Formatar]
      ↓                    ↓                  ↓
   Você clica       Query Supabase      Monta texto
```

**Cada node fez:**
1. **Manual Trigger** - Você ativou manualmente
2. **Buscar Usuário** - Executou SQL no Supabase
3. **Formatar Resultado** - Pegou os dados e formatou

---

### ✅ CHECKPOINT 2

Antes de continuar:
- [ ] Workflow de teste importado
- [ ] Credencial reconectada
- [ ] Execução bem-sucedida (bolinhas verdes)
- [ ] Você viu o output

Se tudo OK, **agora vamos ao workflow de produção!**

---

<a name="testando"></a>
## 🚀 PARTE 5: WORKFLOW DE PRODUÇÃO SIMPLIFICADO (30 min)

Agora vamos importar o **workflow REAL** mas em versão simplificada.

### 5.1. Workflow: Processar Mensagem WhatsApp (v1 Simples)

**O que ele faz:**
1. Recebe webhook do WhatsApp (UAZAPI)
2. Identifica o usuário pelo telefone
3. Salva a mensagem no banco
4. Envia uma resposta automática

**Vou criar 3 versões para você:**
- ✅ **v1-simples.json** - Apenas recebe e responde (COMECE POR AQUI)
- ⏳ **v2-completa.json** - Com IA e categorização (depois)
- ⏳ **v3-producao.json** - Com todos os recursos (depois)

---

### 5.2. Importando o Workflow v1 Simples

**Arquivo:** `workflows/v1-simples-webhook-whatsapp.json`

**Passo a passo:**

1. **Baixe o arquivo JSON** (ou copie o conteúdo)
2. No N8N, clique **New Workflow**
3. Menu ⋮ → **Import from File**
4. Selecione o arquivo `v1-simples-webhook-whatsapp.json`
5. **IMPORTANTE:** Você verá AVISOS em vermelho nos nodes ⚠️

**Isso é NORMAL!** São as credenciais que precisam ser reconectadas.

---

### 5.3. Reconectando Credenciais (CRÍTICO!)

Você precisa reconectar **3 nodes**:

**Node 1: "Buscar Usuário"**
1. Clique no node
2. Painel direito → **Credential to connect with**
3. Selecione: "Supabase Personal Finance"
4. ✅ Aviso vermelho desaparece

**Node 2: "Enviar WhatsApp"**
1. Clique no node  
2. Credential to connect with
3. Selecione: "UAZAPI WhatsApp"

**Node 3: "Enviar Erro WhatsApp"**
1. Mesmo processo
2. Selecione: "UAZAPI WhatsApp"

4. **Save Workflow** (canto superior direito)

---

### 5.4. Configurando Variáveis de Ambiente

O workflow usa variáveis de ambiente. Vamos configurar:

**Onde:** N8N → **Settings** (canto inferior esquerdo) → **Environments**

**Adicione essas variáveis:**

```env
UAZAPI_INSTANCE_ID=sua_instancia_aqui
```

**Como pegar:**
1. Login UAZAPI: https://uazapi.com
2. Dashboard → Instâncias
3. Copiar o "Instance ID"

**Exemplo:**
```
UAZAPI_INSTANCE_ID=instance_abc123def456
```

---

### 5.5. Obtendo a URL do Webhook

Agora você precisa da URL para configurar no UAZAPI.

**Passo a passo:**

1. No workflow, clique no primeiro node **"Webhook UAZAPI"**
2. No painel direito, você verá:

```
┌────────────────────────────────────────┐
│ Webhook URLs                           │
├────────────────────────────────────────┤
│ Production:                            │
│ https://seu-n8n.com/webhook/whatsapp-  │
│ receive                                │
│                                        │
│ Test:                                  │
│ http://localhost:5678/webhook-test/... │
└────────────────────────────────────────┘
```

3. **Copie a URL Production**

**Se estiver local (localhost):**
- Você precisa **expor** o N8N para internet
- Use **ngrok** ou **Cloudflare Tunnel**
- Ou configure domínio próprio

**Exemplo com ngrok:**
```bash
ngrok http 5678
# Copia URL: https://abc123.ngrok.io
# Webhook ficaria: https://abc123.ngrok.io/webhook/whatsapp-receive
```

---

### 5.6. Configurar Webhook no UAZAPI

**Agora vamos conectar UAZAPI → N8N:**

1. Login UAZAPI → Sua Instância
2. **Settings** → **Webhooks**
3. **Add New Webhook**

Preencha:
```
┌────────────────────────────────────────┐
│ Webhook Configuration                  │
├────────────────────────────────────────┤
│ Name: N8N Personal Finance             │
│                                        │
│ URL: [COLA A URL DO N8N AQUI]          │
│   Ex: https://seu-n8n.com/webhook/     │
│       whatsapp-receive                 │
│                                        │
│ Events: ✅ message.received            │
│                                        │
│ Method: POST                           │
│                                        │
│ Active: ✅ Yes                         │
└────────────────────────────────────────┘
```

4. **Save**

---

### ✅ CHECKPOINT 3

Antes de testar:
- [ ] Workflow importado
- [ ] 3 credenciais reconectadas
- [ ] Variável UAZAPI_INSTANCE_ID configurada
- [ ] URL do webhook copiada
- [ ] Webhook configurado no UAZAPI
- [ ] Workflow **ATIVADO** (toggle no canto superior direito)

---

<a name="testando"></a>
## 🧪 PARTE 6: TESTANDO (15 min)

### 6.1. Teste Manual (sem WhatsApp)

Você pode testar diretamente no N8N:

1. Clique no node **"Webhook UAZAPI"**
2. Clique **"Listen for Test Event"**
3. O node fica aguardando (ícone de ouvido 👂)

4. **Envie um POST** com `curl` ou Postman:

```bash
curl -X POST https://seu-n8n.com/webhook/whatsapp-receive \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.received",
    "data": {
      "key": {
        "remoteJid": "5521999999999@s.whatsapp.net"
      },
      "message": {
        "conversation": "Olá, teste!"
      },
      "messageTimestamp": 1699999999
    }
  }'
```

**Substitua:**
- `5521999999999` = Telefone de um usuário cadastrado no Supabase

5. Veja o workflow **executar** em tempo real! ✅

---

### 6.2. Teste Real com WhatsApp

**Agora o teste de verdade:**

1. No seu celular, abra WhatsApp
2. Envie mensagem para o **número UAZAPI**
3. Digite: "Olá Ana Clara, teste!"

**O que deve acontecer:**

```
Você: Olá Ana Clara, teste!

Ana Clara (bot):
Olá [Seu Nome]! 👋

Recebi sua mensagem:
"Olá Ana Clara, teste!"

✅ Mensagem salva com sucesso!

Em breve a Ana Clara vai processar e responder.

💡 Digite "ajuda" para ver os comandos disponíveis.
```

---

### 6.3. Verificando no Banco

**Confirme que salvou:**

```sql
-- No Supabase SQL Editor
SELECT * FROM whatsapp_messages 
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

Você deve ver sua mensagem com:
- `content`: "Olá Ana Clara, teste!"
- `direction`: "inbound"
- `processing_status`: "pending"

---

### 6.4. Debugando Erros

**Se não funcionar:**

1. **Veja os logs N8N:**
   - N8N → **Executions** (menu esquerdo)
   - Clique na última execução
   - Veja qual node deu erro (🔴 vermelho)

2. **Erros comuns:**

**❌ "Connection failed" no Postgres:**
- SSL não ativado na credencial
- Service Role Key errada
- Firewall bloqueando

**❌ "401 Unauthorized" no UAZAPI:**
- API Key errada
- Instance ID errado

**❌ "User not found":**
- Telefone não cadastrado no Supabase
- Formato do telefone diferente (ex: com/sem +55)

**❌ Webhook não recebe:**
- URL errada no UAZAPI
- N8N não acessível externamente (usar ngrok)
- Webhook não ativado no UAZAPI

---

### ✅ CHECKPOINT 4

Se tudo funcionou:
- [ ] Recebeu mensagem via WhatsApp
- [ ] Bot respondeu
- [ ] Mensagem salva no Supabase
- [ ] Logs N8N sem erros

🎉 **PARABÉNS!** Seu primeiro workflow está FUNCIONANDO!

---

<a name="ativando"></a>
## 🚀 PARTE 7: PRÓXIMOS PASSOS (5 min)

### O que você tem agora:

✅ N8N configurado e funcionando  
✅ Credenciais Supabase + UAZAPI  
✅ Workflow v1 recebendo mensagens  
✅ Bot respondendo no WhatsApp  
✅ Mensagens sendo salvas

---

### Próximos Workflows (em ordem de prioridade):

**1. Comandos Rápidos** (próximo!)
- `/saldo` - Ver saldo das contas
- `/resumo` - Resumo financeiro
- `/contas` - Contas a vencer
- `/ajuda` - Lista de comandos

**2. Processar Áudio**
- Recebe áudio
- Transcreve (Whisper)
- Processa como texto

**3. Processar Imagem/OCR**
- Recebe foto de nota fiscal
- Extrai dados (Vision)
- Cria transação

**4. Notificações Automáticas**
- Lembretes de contas (Cron diário)
- Resumo semanal
- Alertas de orçamento

---

### Estrutura de Arquivos Recomendada:

```
docs/n8n/
├── GUIA_INICIANTE_N8N.md (este arquivo)
├── arquitetura-N8N-completa.md (referência)
├── README_N8N_SETUP.md (setup avançado)
│
└── workflows/
    ├── v1-simples-webhook-whatsapp.json ✅
    ├── v2-comandos-rapidos.json (próximo)
    ├── v3-processar-audio.json
    ├── v4-processar-imagem.json
    ├── v5-lembretes-cron.json
    ├── v6-resumo-semanal.json
    ├── v7-resumo-mensal.json
    ├── v8-alertas-orcamento.json
    ├── v9-progresso-metas.json
    └── v10-ana-clara-ia.json
```

---

## 📚 RECURSOS EXTRAS

### Documentação Oficial:
- N8N: https://docs.n8n.io
- UAZAPI: https://docs.uazapi.com
- Supabase: https://supabase.com/docs

### Comunidade:
- N8N Community: https://community.n8n.io
- Discord N8N: https://discord.gg/n8n

### Vídeos Tutorial (buscar no YouTube):
- "N8N Tutorial for Beginners"
- "N8N WhatsApp Integration"
- "N8N Supabase Connection"

---

## 🆘 PRECISA DE AJUDA?

**Se travar em algum passo:**

1. ✅ Releia a seção específica
2. ✅ Veja os logs N8N (Executions)
3. ✅ Teste cada node individualmente
4. ✅ Verifique as credenciais
5. ✅ Confira variáveis de ambiente

**Erros mais comuns já estão documentados!**

---

## 🎯 RESUMO FINAL

### O que você aprendeu:

✅ Como funciona o N8N (nodes, workflows, triggers)  
✅ Como configurar credenciais  
✅ Como importar JSONs prontos  
✅ Como testar workflows  
✅ Como integrar WhatsApp via webhook  
✅ Como debugar erros

### Tempo investido:
- Setup: ~30min
- Primeiro workflow: ~1h
- Testes: ~30min
- **Total: ~2h**

### Resultado:
🤖 **Bot WhatsApp funcionando e salvando mensagens!**

---

**Pronto para o próximo workflow?**  
👉 Continue com: `v2-comandos-rapidos.json`

---

**Autor:** Personal Finance LA Team  
**Versão:** 1.0  
**Data:** Novembro 2025  
**Status:** ✅ Testado e Funcionando

