# 📱 Documentação Completa: Integração WhatsApp + Supabase

> **Projeto de Referência:** DriveCFO - Copiloto Financeiro para Motoristas de App  
> **Assistente:** "Zé" - Assistente Inteligente WhatsApp  
> **Versão:** v25.1 | **Data:** Dezembro 2025

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Configuração e Variáveis de Ambiente](#2-configuração-e-variáveis-de-ambiente)
3. [Edge Functions - Estrutura de Arquivos](#3-edge-functions---estrutura-de-arquivos)
4. [Webhook Principal](#4-webhook-principal)
5. [Processamento de Áudio (Whisper)](#5-processamento-de-áudio)
6. [NLP e Classificação de Intenções](#6-nlp-e-classificação)
7. [Gerenciamento de Contexto](#7-gerenciamento-de-contexto)
8. [Mapeamento Financeiro](#8-mapeamento-financeiro)
9. [Envio de Mensagens e Botões](#9-envio-de-mensagens)
10. [Processamento de Imagens](#10-processamento-de-imagens)
11. [Fila de Notificações](#11-fila-de-notificações)
12. [Tratamento de Erros](#12-tratamento-de-erros)
13. [Tabelas do Banco](#13-tabelas-do-banco)
14. [Padrões de Código](#14-padrões-de-código)
15. [Fluxos Conversacionais](#15-fluxos-conversacionais)
16. [Recomendações](#16-recomendações)

---

## 1. Visão Geral da Arquitetura

### Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA 1: WhatsApp (UAZAPI)                 │
│  • Recebe mensagens do usuário                                  │
│  • Envia webhooks para Edge Function                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                CAMADA 2: Edge Function (Receptor)               │
│  • webhook-whatsapp/index.ts                                    │
│  • Valida token, filtra mensagens próprias                      │
│  • Identifica usuário pelo telefone                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               CAMADA 3: Processamento de Mídia                  │
│  • audio-handler.ts → Whisper API (transcrição)                 │
│  • image-reader.ts → GPT-4 Vision (OCR)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 CAMADA 4: NLP - Classificação                   │
│  • nlp-processor.ts                                             │
│  • GPT-4.1 Mini com Function Calling                            │
│  • Memória do usuário (gírias, preferências)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CAMADA 5: Context Manager                      │
│  • context-manager.ts                                           │
│  • Gerencia fluxos multi-turno                                  │
│  • Expiração automática (15 minutos)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CAMADA 6: Business Logic                       │
│  • financial-mapper.ts                                          │
│  • Registra corridas, despesas, abastecimentos                  │
│  • Triggers do banco recalculam métricas                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 CAMADA 7: Response Generator                    │
│  • response-templates.ts + button-sender.ts                     │
│  • Formata mensagens com emojis                                 │
│  • Gera botões interativos [Editar] [Excluir]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Configuração e Variáveis de Ambiente

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# UAZAPI (Provedor WhatsApp)
UAZAPI_BASE_URL=https://sua-instancia.uazapi.com
UAZAPI_TOKEN=seu-token-de-autenticacao
UAZAPI_INSTANCE_ID=seu-instance-id

# OpenAI
OPENAI_API_KEY=sk-...

# Opcional: n8n para fluxos complexos
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/...
```

---

## 3. Edge Functions - Estrutura de Arquivos

```
supabase/functions/
├── webhook-whatsapp/           # Função principal
│   ├── index.ts               # Entry point, roteamento
│   ├── types.ts               # Interfaces TypeScript
│   ├── utils.ts               # Funções utilitárias
│   ├── audio-handler.ts       # Processamento de áudio PTT
│   ├── nlp-processor.ts       # Classificação NLP com GPT-4
│   ├── context-manager.ts     # Gerenciamento de contexto
│   ├── financial-mapper.ts    # CRUD financeiro
│   ├── button-sender.ts       # Envio de botões interativos
│   ├── response-templates.ts  # Templates de resposta
│   └── image-reader.ts        # Leitura de imagens (Vision)
│
├── enviar-whatsapp/            # Função de envio
│   ├── index.ts
│   └── types.ts
│
└── processar-fila-whatsapp/    # Cron job para notificações
    └── index.ts
```

---

## 4. Webhook Principal

### 4.1 Payload UAZAPI (types.ts)

```typescript
export interface UazapiWebhookPayload {
  EventType: string;
  token: string;
  owner: string;
  message: {
    chatid: string;
    messageid: string;
    messageType: string;
    type: "text" | "media" | "interactive";
    mediaType?: "ptt" | "image" | "document";
    fromMe: boolean;
    sender: string;
    senderName: string;
    messageTimestamp: number;
    text?: string;
    content: string | {
      text?: string;
      URL?: string;
      PTT?: boolean;
      buttonResponse?: { id: string; displayText: string; };
    };
  };
  chat: { phone: string; wa_chatid: string; wa_name: string; };
}
```

### 4.2 Entry Point (index.ts)

```typescript
serve(async (req) => {
  const payload: UazapiWebhookPayload = await req.json();
  
  // 1. Validar token
  if (payload.token !== UAZAPI_INSTANCE_ID) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // 2. Filtrar mensagens próprias
  if (payload.message.fromMe) {
    return new Response("OK", { status: 200 });
  }
  
  // 3. Identificar usuário
  const phone = sanitizePhone(payload.chat.phone);
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telefone', phone)
    .single();
  
  if (!profile) {
    await enviarTexto(phone, "❌ Número não cadastrado.");
    return new Response("OK", { status: 200 });
  }
  
  // 4. Rotear por tipo
  if (payload.message.mediaType === "ptt") {
    await processarAudioPTT(payload, profile.id, payload.message.messageid);
  } else if (payload.message.type === "interactive") {
    await processarBotao(payload, profile.id, phone);
  } else {
    const texto = extrairTexto(payload);
    await processarTexto(texto, profile.id, phone);
  }
  
  return new Response("OK", { status: 200 });
});
```

### 4.3 Processamento de Botões (IMPORTANTE!)

```typescript
// ⚠️ CUIDADO: UUIDs têm hífens! Não use split('_') simples
async function processarBotao(payload, userId, phone) {
  const buttonId = payload.message.content?.buttonResponse?.id || '';
  
  // ✅ CORRETO: Extrair ação de forma robusta
  let acao = '';
  let transacaoId = '';
  
  if (buttonId.startsWith('editar_')) {
    acao = 'editar';
    transacaoId = buttonId.replace('editar_', '');
  } else if (buttonId.startsWith('excluir_')) {
    acao = 'excluir';
    transacaoId = buttonId.replace('excluir_', '');
  }
  
  // Processar ação...
}
```

---

## 5. Processamento de Áudio

```typescript
// audio-handler.ts
export async function processarAudioPTT(payload, userId, messageId) {
  // UAZAPI faz download + transcrição via Whisper
  const response = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
    body: JSON.stringify({
      id: messageId,
      transcribe: true,
      openai_apikey: OPENAI_KEY,
      return_base64: false,
    })
  });
  
  const result = await response.json();
  const texto = result.transcription || "";
  
  // Processar com NLP
  const intencao = await nlpProcessor.classificarIntencao(texto, userId);
  const resposta = await nlpProcessor.processarIntencaoClassificada(intencao, userId, phone);
  await enviarTexto(phone, resposta);
}
```

---

## 6. NLP e Classificação

### 6.1 Tipos de Intenções

```typescript
export type IntencaoTipo = 
  | 'REGISTRAR_RECEITA'        // Ganhou dinheiro
  | 'REGISTRAR_DESPESA'        // Gastou com algo
  | 'REGISTRAR_ABASTECIMENTO'  // Abasteceu
  | 'CONSULTAR_SALDO'          // Quanto ganhei/gastei
  | 'RELATORIO'                // Resumo detalhado
  | 'INICIO_TURNO'             // Começou a trabalhar
  | 'FIM_TURNO'                // Terminou
  | 'EDITAR_TRANSACAO'
  | 'EXCLUIR_TRANSACAO'
  | 'SAUDACAO'
  | 'AJUDA'
  | 'OUTRO';
```

### 6.2 Function Calling com GPT-4

```typescript
export async function classificarIntencao(texto, userId) {
  const [memoria, historico] = await Promise.all([
    buscarMemoriaUsuario(userId),
    buscarHistoricoConversa(userId, 8)
  ]);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: gerarSystemPrompt(memoria, historico) },
        { role: 'user', content: texto }
      ],
      functions: [INTENT_CLASSIFICATION_FUNCTION],
      function_call: { name: 'classificar_comando' },
      temperature: 0.3
    })
  });
  
  const result = await response.json();
  return JSON.parse(result.choices[0].message.function_call.arguments);
}
```

---

## 7. Gerenciamento de Contexto

```typescript
// context-manager.ts
export type EstadoContexto = 
  | 'aguardando_confirmacao'
  | 'aguardando_valor'
  | 'aguardando_novo_valor_campo'
  | 'aguardando_confirmacao_exclusao'
  | 'aguardando_km_inicial'
  | 'idle';

const CONTEXT_EXPIRATION_MINUTES = 15;

export async function buscarContexto(userId) {
  const { data } = await supabase
    .from('contextos_conversa')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single();
  return data;
}

export async function salvarContexto(contexto) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CONTEXT_EXPIRATION_MINUTES);
  
  await supabase.from('contextos_conversa').upsert({
    ...contexto,
    expires_at: expiresAt.toISOString()
  });
}

export async function limparContexto(userId) {
  await supabase.from('contextos_conversa').delete().eq('user_id', userId);
}
```

---

## 8. Mapeamento Financeiro

```typescript
// financial-mapper.ts
export async function registrarCorrida(userId, entidades) {
  // Normalizar plataforma
  const mapeamento = { 'uber': 'uber', '99': '99', '99pop': '99' };
  const plataforma = mapeamento[entidades.plataforma?.toLowerCase()] || 'outro';
  
  // Buscar turno ativo
  const { data: turno } = await supabase
    .from('turnos')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .single();
  
  // Inserir corrida
  const { data } = await supabase.from('corridas').insert({
    user_id: userId,
    turno_id: turno?.id,
    plataforma,
    valor: entidades.valor,
    data_hora: entidades.data || new Date().toISOString()
  }).select('id').single();
  
  return { success: true, corridaId: data.id };
}

export async function consultarSaldoDia(userId, data) {
  const dataConsulta = data || new Date().toISOString().split('T')[0];
  
  // Timezone Brasil (BRT = UTC-3)
  const inicioDiaUTC = `${dataConsulta}T03:00:00Z`;
  
  const { data: corridas } = await supabase
    .from('corridas')
    .select('valor')
    .eq('user_id', userId)
    .gte('data_hora', inicioDiaUTC);
  
  const receitas = corridas?.reduce((sum, c) => sum + Number(c.valor), 0) || 0;
  // ... buscar despesas, abastecimentos, custos fixos
  
  return { receitas, despesas, lucroReal };
}
```

---

## 9. Envio de Mensagens

### 9.1 Texto Simples (utils.ts)

```typescript
export async function enviarTexto(numero, texto) {
  const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "token": UAZAPI_TOKEN },
    body: JSON.stringify({ number: numero.replace(/\D/g, ""), text: texto })
  });
  return await response.json();
}
```

### 9.2 Botões Interativos (button-sender.ts)

```typescript
export async function enviarMensagemComBotoes(phone, texto, botoes, footer) {
  // Máximo 3 botões
  const choices = botoes.slice(0, 3).map(b => `${b.texto}|${b.id}`);
  
  await fetch(`${UAZAPI_BASE_URL}/send/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'token': UAZAPI_TOKEN },
    body: JSON.stringify({
      number: phone,
      type: "button",
      text: texto,
      choices,
      footerText: footer
    })
  });
}

export async function enviarConfirmacaoComBotoes(phone, mensagem, transacaoId) {
  const botoes = [
    { texto: '✏️ Editar', id: `editar_${transacaoId}` },
    { texto: '🗑️ Excluir', id: `excluir_${transacaoId}` }
  ];
  await enviarMensagemComBotoes(phone, mensagem, botoes, 'Escolha uma ação');
}
```

---

## 10. Processamento de Imagens

```typescript
// image-reader.ts - Ler KM do hodômetro
export async function lerKmDaImagem(messageId) {
  // 1. Baixar via UAZAPI (URLs do WhatsApp são protegidas!)
  const imagem = await baixarImagemUAZAPI(messageId);
  const dataUrl = `data:${imagem.mimetype};base64,${imagem.base64}`;
  
  // 2. Enviar para GPT-4 Vision
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: "Extraia o número da quilometragem. Responda JSON: {km: 404048}"
      }, {
        role: "user",
        content: [{ type: "image_url", image_url: { url: dataUrl, detail: "high" } }]
      }]
    })
  });
  
  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}
```

---

## 11. Fila de Notificações

```typescript
// processar-fila-whatsapp/index.ts
async function processarFila(limite = 10) {
  const { data: itens } = await supabase
    .from('fila_whatsapp')
    .select('*')
    .eq('status', 'pendente')
    .lte('scheduled_for', new Date().toISOString())
    .limit(limite);
  
  for (const item of itens) {
    // Verificar Modo Não Perturbe
    const { data: config } = await supabase
      .from('configuracoes_notificacoes')
      .select('nao_perturbe_ativo')
      .eq('user_id', item.user_id)
      .single();
    
    if (config?.nao_perturbe_ativo) continue;
    
    // Enviar
    await enviarTextoUazapi(telefone, item.mensagem);
    await supabase.from('fila_whatsapp')
      .update({ status: 'enviada' })
      .eq('id', item.id);
  }
}
```

---

## 12. Tratamento de Erros

```typescript
async function processarMensagem(payload, userId, phone) {
  try {
    const intencao = await nlpProcessor.classificarIntencao(texto, userId);
    const resposta = await nlpProcessor.processarIntencaoClassificada(intencao, userId, phone);
    await enviarTexto(phone, resposta);
    
    // Salvar sucesso
    await supabase.from('conversas_whatsapp').insert({
      user_id: userId,
      mensagem_texto: texto,
      intencao_classificada: intencao.intencao,
      estado_atual: 'processada'
    });
    
  } catch (error) {
    console.error('💥 Erro:', error);
    
    // Fallback amigável
    await enviarTexto(phone, "⚠️ Desculpe, tive um problema. Pode tentar novamente?");
    
    // Salvar erro
    await supabase.from('conversas_whatsapp').insert({
      user_id: userId,
      erro: error.message,
      estado_atual: 'erro'
    });
  }
}
```

---

## 13. Tabelas do Banco

```sql
-- Conversas WhatsApp
CREATE TABLE conversas_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tipo_mensagem TEXT, -- 'texto', 'audio', 'botao', 'imagem'
  mensagem_texto TEXT,
  whatsapp_message_id TEXT,
  transcricao TEXT,
  intencao_classificada TEXT,
  entidades_extraidas JSONB,
  confianca_nlp NUMERIC,
  acao_executada TEXT,
  erro TEXT,
  estado_atual TEXT DEFAULT 'recebida',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contextos de Conversa
CREATE TABLE contextos_conversa (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  estado TEXT NOT NULL,
  intencao_pendente JSONB,
  transacao_id UUID,
  transacao_tipo TEXT,
  dados_temporarios JSONB,
  ultima_atividade TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Fila de Notificações
CREATE TABLE fila_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  botoes JSONB,
  status TEXT DEFAULT 'pendente',
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  enviada_em TIMESTAMPTZ,
  tentativas INT DEFAULT 0,
  max_tentativas INT DEFAULT 3,
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memória do Usuário
CREATE TABLE memoria_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tipo TEXT, -- 'gíria_expressao', 'local_frequente', 'preferencia'
  chave TEXT,
  valor JSONB,
  categoria TEXT,
  confianca NUMERIC DEFAULT 0.5,
  frequencia INT DEFAULT 1,
  origem TEXT DEFAULT 'inferido',
  ultima_vez TIMESTAMPTZ,
  UNIQUE(user_id, tipo, chave)
);
```

---

## 14. Padrões de Código

### ✅ Boas Práticas

1. **Validar token no início do webhook**
2. **Filtrar mensagens fromMe para evitar loops**
3. **Usar `replace()` ao invés de `split()` para extrair IDs de botões**
4. **Timezone Brasil (UTC-3) para datas**
5. **Fallback amigável em caso de erro**
6. **Salvar todas as interações no banco**
7. **Expiração automática de contextos (15 min)**
8. **Modo Não Perturbe para notificações**

### ❌ Evitar

1. **Não usar `split('_')` para extrair UUIDs** (têm hífens!)
2. **Não confiar em URLs diretas do WhatsApp** (usar UAZAPI para download)
3. **Não processar mensagens próprias** (causa loop infinito)

---

## 15. Fluxos Conversacionais

### Fluxo de Registro de Corrida

```
Usuário: "Ganhei 50 no Uber"
    │
    ▼
NLP classifica: REGISTRAR_RECEITA
    │
    ▼
Extrai: valor=50, plataforma=uber
    │
    ▼
Insere em corridas
    │
    ▼
Envia confirmação com botões [Editar] [Excluir]
```

### Fluxo de Edição

```
Usuário clica: [Editar]
    │
    ▼
Cria contexto: aguardando_novo_valor_campo
    │
    ▼
Envia: "O que você gostaria de mudar?"
    │
    ▼
Usuário: "Foi 45 reais"
    │
    ▼
NLP interpreta correção
    │
    ▼
Atualiza transação
    │
    ▼
Limpa contexto
    │
    ▼
Envia: "✅ Transação atualizada!"
```

---

## 16. Recomendações para Novo Projeto

1. **Comece pelo webhook básico** - Valide token, identifique usuário
2. **Adicione NLP gradualmente** - Comece com intenções simples
3. **Implemente contexto cedo** - Essencial para fluxos multi-turno
4. **Use Function Calling** - Mais preciso que parsing manual
5. **Salve tudo no banco** - Facilita debug e analytics
6. **Teste com áudios reais** - Whisper tem ótima precisão
7. **Botões são poderosos** - Reduzem erros de digitação
8. **Modo Não Perturbe** - Respeite o horário do usuário

---

**Documentação gerada automaticamente do projeto DriveCFO.**
