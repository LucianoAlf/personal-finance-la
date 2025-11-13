# 🧪 TESTES PRÁTICOS - EDGE FUNCTIONS WHATSAPP

**Data:** 13/11/2025 12:30  
**Objetivo:** Validar TODAS as Edge Functions antes de criar workflows N8N  
**Método:** Testes diretos via Supabase MCP + Logs

---

## 👤 DADOS DE TESTE

**Usuário:** Luciano Alf  
**User ID:** `68dc8ee5-a710-4116-8f18-af9ac3e8ed36`  
**Telefone:** `5521981278047`  
**WhatsApp:** `5521981278047@s.whatsapp.net`

**Dados Financeiros:**
- 💰 Saldo: R$ 12.679,32
- 📊 2 Contas
- 💳 59 Transações
- 📋 6 Contas a pagar
- 🎯 3 Metas ativas

**IA Configurada:**
- Provider: OpenAI
- Model: gpt-4.1-mini
- Status: ✅ Validada
- Temperature: 0.7
- Max Tokens: 1000

---

## 📋 PLANO DE TESTES

### ✅ TESTE 1: execute-quick-command
**Objetivo:** Testar os 8 comandos rápidos

**Comandos a testar:**
1. `saldo` - Deve retornar R$ 12.679,32
2. `resumo mês` - Resumo do mês atual
3. `contas` - 6 contas pendentes
4. `meta` - 3 metas ativas
5. `investimentos` - Resumo portfólio
6. `cartões` - Faturas de cartão
7. `ajuda` - Lista de comandos
8. `relatório` - Relatório do mês

**Expected Result:** Todas respostas formatadas em PT-BR com emojis

---

### ✅ TESTE 2: categorize-transaction
**Objetivo:** Criar transação via LLM

**Inputs a testar:**
1. Texto simples: "Gastei 50 reais no mercado"
2. Texto detalhado: "Recebi salário de 5000 reais hoje"
3. Texto com data: "Paguei 150 na academia em 10/11"

**Expected Result:**
- LLM extrai: amount, type, category, description
- Transação criada no banco
- Response formatada

---

### ✅ TESTE 3: send-whatsapp-message
**Objetivo:** Enviar mensagem via UAZAPI

**Tipos a testar:**
1. Texto simples
2. Texto com formatação (bold, italic)

**Expected Result:**
- Mensagem enviada via UAZAPI
- Salva em whatsapp_messages
- Estatísticas atualizadas

---

### ✅ TESTE 4: process-whatsapp-message (ORQUESTRADOR)
**Objetivo:** Testar fluxo completo

**Cenários:**
1. Mensagem texto: "saldo"
2. Mensagem texto: "gastei 50 no mercado"
3. Mensagem texto: "quanto tenho de saldo?"

**Expected Result:**
- Parse webhook
- Identifica usuário
- Detecta intenção (quick_command ou transaction)
- Processa
- Envia resposta
- Atualiza banco

---

### 🔜 TESTE 5: transcribe-audio (MOCK)
**Objetivo:** Validar integração Whisper

**Nota:** Precisaria de URL de áudio real do UAZAPI  
**Alternativa:** Mock com URL de teste

---

### 🔜 TESTE 6: extract-receipt-data (MOCK)
**Objetivo:** Validar integração Vision

**Nota:** Precisaria de URL de imagem real  
**Alternativa:** Mock com URL de teste

---

## 📊 RESULTADOS DOS TESTES

### ✅ TESTE 1.1: Comando "saldo"

**Request:**
```json
{
  "user_id": "68dc8ee5-a710-4116-8f18-af9ac3e8ed36",
  "command": "saldo"
}
```

**Expected Response:**
```
💰 *Seu Saldo Total*

R$ 12.679,32

_Atualizado agora_
```

**Status:** ⏳ Aguardando execução

---

### ✅ TESTE 1.2: Comando "resumo"

**Request:**
```json
{
  "user_id": "68dc8ee5-a710-4116-8f18-af9ac3e8ed36",
  "command": "resumo mês"
}
```

**Expected Response:**
```
📊 *Resumo do Mês*

💵 Receitas: R$ X.XXX,XX
💸 Despesas: R$ X.XXX,XX
✅ Saldo: R$ X.XXX,XX
```

**Status:** ⏳ Aguardando execução

---

### ✅ TESTE 1.3: Comando "contas"

**Request:**
```json
{
  "user_id": "68dc8ee5-a710-4116-8f18-af9ac3e8ed36",
  "command": "contas"
}
```

**Expected Response:**
```
📋 *Contas a Pagar (6)*

[Lista de 6 contas pendentes]
```

**Status:** ⏳ Aguardando execução

---

### ✅ TESTE 2.1: Categorizar Transação

**Request:**
```json
{
  "user_id": "68dc8ee5-a710-4116-8f18-af9ac3e8ed36",
  "data": {
    "raw_text": "Gastei 50 reais no mercado"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "💸 *Lançamento Registrado!*\n\n🍔 Alimentação\nCompra no mercado\nR$ 50,00",
  "transaction_id": "uuid",
  "data": {
    "amount": 50.00,
    "type": "expense",
    "category": "food",
    "description": "Compra no mercado",
    "confidence": 0.95
  }
}
```

**Status:** ⏳ Aguardando execução

---

### ✅ TESTE 3.1: Enviar Mensagem

**Request:**
```json
{
  "user_id": "68dc8ee5-a710-4116-8f18-af9ac3e8ed36",
  "message_type": "text",
  "content": "🧪 Teste da Edge Function send-whatsapp-message!"
}
```

**Expected Result:**
- POST para UAZAPI
- Mensagem salva em whatsapp_messages
- Estatísticas atualizadas

**Status:** ⏳ Aguardando execução

---

### ✅ TESTE 4.1: Process Mensagem (Comando)

**Request (simulando webhook UAZAPI):**
```json
{
  "event": "message",
  "data": {
    "from": "5521981278047@s.whatsapp.net",
    "message": {
      "type": "text",
      "text": "saldo"
    },
    "messageTimestamp": 1699999999
  }
}
```

**Expected Flow:**
```
1. Parse webhook
2. Identifica usuário pelo telefone
3. Salva mensagem (status: pending)
4. Detecta tipo: text
5. Detecta intenção: quick_command
6. Chama execute-quick-command("saldo")
7. Envia resposta via send-whatsapp-message
8. Atualiza mensagem (status: completed)
```

**Status:** ⏳ Aguardando execução

---

### ✅ TESTE 4.2: Process Mensagem (Transação)

**Request (simulando webhook UAZAPI):**
```json
{
  "event": "message",
  "data": {
    "from": "5521981278047@s.whatsapp.net",
    "message": {
      "type": "text",
      "text": "Gastei 50 reais no mercado"
    },
    "messageTimestamp": 1699999999
  }
}
```

**Expected Flow:**
```
1. Parse webhook
2. Identifica usuário
3. Salva mensagem
4. Detecta tipo: text
5. Detecta intenção via LLM: transaction
6. Chama categorize-transaction
7. LLM extrai dados
8. Cria transação
9. Envia confirmação via WhatsApp
10. Atualiza mensagem
```

**Status:** ⏳ Aguardando execução

---

## 🎯 MÉTRICAS DE SUCESSO

**Para considerar os testes bem-sucedidos:**

- [ ] Todos os 8 comandos retornam response válida
- [ ] LLM categoriza transações corretamente
- [ ] Mensagens são salvas no banco
- [ ] Estatísticas são atualizadas
- [ ] process-whatsapp-message orquestra tudo corretamente
- [ ] Nenhum erro 500 nas Edge Functions
- [ ] Logs mostram fluxo completo

---

## 📝 NOTAS IMPORTANTES

**Limitações dos Testes:**

1. **UAZAPI Real:** Não vamos enviar mensagens reais via UAZAPI (evitar custos)
2. **Áudio/Imagem:** Precisaria de URLs reais do UAZAPI
3. **Webhook Real:** Simulamos o payload, não recebemos webhook real

**O que PODEMOS testar:**

- ✅ Lógica das Edge Functions
- ✅ Queries SQL
- ✅ Formatação de respostas
- ✅ Integração com LLM (OpenAI)
- ✅ Salvamento no banco
- ✅ Fluxo de processamento

**O que NÃO podemos testar (sem UAZAPI real):**

- ❌ Envio real de mensagens WhatsApp
- ❌ Recebimento de webhook real
- ❌ Download de mídia (áudio/imagem)

---

## 🚀 PRÓXIMOS PASSOS

**Após validar Edge Functions:**

1. ✅ Criar workflow N8N básico (webhook → process-whatsapp-message)
2. ✅ Configurar webhook UAZAPI apontando para N8N
3. ✅ Testar fluxo completo end-to-end
4. ✅ Criar workflows avançados (v2-v10)
5. ✅ Implementar frontend React

---

**Status:** 🧪 PRONTO PARA EXECUTAR TESTES!
