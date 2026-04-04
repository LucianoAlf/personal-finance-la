# 📸 Documentação Técnica: Leitura de Imagens no WhatsApp

## 🎯 Resumo Executivo

| Aspecto | Informação |
|---------|------------|
| **Provider** | GPT-4o (OpenAI Vision) |
| **Webhook** | Campo `mediaType === "image"` no payload UAZAPI |
| **Download** | Via UAZAPI `/message/download` (URLs do WhatsApp são protegidas!) |
| **Formato** | Base64 enviado para GPT-4 Vision |
| **Tipos Suportados** | Hodômetro, Nota de Abastecimento, Comprovante |
| **Response** | JSON estruturado com dados extraídos |

---

## 1. 🏗️ Arquitetura Geral

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE PROCESSAMENTO DE IMAGENS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1️⃣ WhatsApp → UAZAPI Webhook                                              │
│           ↓                                                                 │
│  2️⃣ Edge Function detecta: messageType="media" && mediaType="image"        │
│           ↓                                                                 │
│  3️⃣ Verificar CONTEXTO ativo (aguardando KM?)                              │
│           ↓                                                                 │
│  4️⃣ Baixar imagem via UAZAPI /message/download (retorna Base64)            │
│           ↓                                                                 │
│  5️⃣ Detectar TIPO de imagem (hodômetro, nota, comprovante, outro)          │
│           ↓                                                                 │
│  6️⃣ Processar com GPT-4 Vision (prompt específico por tipo)                │
│           ↓                                                                 │
│  7️⃣ Extrair dados estruturados (JSON)                                      │
│           ↓                                                                 │
│  8️⃣ Pedir confirmação do usuário (se necessário)                           │
│           ↓                                                                 │
│  9️⃣ Registrar transação no banco                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Arquivos Envolvidos

```
webhook-whatsapp/
├── index.ts           # Detecta imagem e orquestra fluxo
├── image-reader.ts    # Funções de leitura com GPT-4 Vision
├── utils.ts           # baixarImagemUAZAPI()
└── types.ts           # Tipos do payload
```

---

## 2. 📥 Recebimento da Imagem (Webhook UAZAPI)

### Payload de Imagem

```typescript
// Payload recebido do UAZAPI quando é imagem
{
  "EventType": "message_update",
  "message": {
    "chatid": "5511999999999@s.whatsapp.net",
    "messageid": "3EB0A1B2C3D4E5F6",  // ← IMPORTANTE: ID para baixar
    "messageType": "media",           // ← Indica mídia
    "mediaType": "image",             // ← Tipo específico: image
    "type": "media",
    "fromMe": false,
    "sender": "5511999999999@s.whatsapp.net",
    "content": {
      "URL": "https://mmg.whatsapp.net/...",  // ⚠️ NÃO USAR DIRETAMENTE!
      "mimetype": "image/jpeg",
      "caption": "Nota do posto"  // ← Legenda opcional
    }
  },
  "chat": {
    "phone": "5511999999999",
    "wa_chatid": "5511999999999@s.whatsapp.net"
  }
}
```

### Detecção no index.ts

```typescript
// index.ts - Linha 1111
} else if (messageType === "media" && (mediaType === "image" || mediaType === "photo")) {
  console.log(`📷 Imagem detectada de [${userId}]`);
  
  // ⚠️ IMPORTANTE: Usar messageId, NÃO a URL!
  // URLs do WhatsApp são protegidas e expiram rapidamente
  const caption = payload.message.content?.caption || '';
  
  if (!messageId) {
    await enviarTexto(phone, '❌ Não consegui acessar a imagem. Tente novamente.');
    return;
  }
  
  // Continua processamento...
}
```

---

## 3. 📥 Download da Imagem via UAZAPI

### ⚠️ CRÍTICO: Por que NÃO usar URL direta?

```
❌ ERRADO: Usar payload.message.content.URL diretamente
   - URLs do WhatsApp são autenticadas/criptografadas
   - Expiram em poucos minutos
   - GPT-4 Vision NÃO consegue acessar

✅ CORRETO: Baixar via UAZAPI /message/download
   - UAZAPI tem acesso autenticado ao WhatsApp
   - Retorna imagem em Base64
   - Base64 funciona perfeitamente com GPT-4 Vision
```

### Função de Download

```typescript
// utils.ts - Linha 61-107

/**
 * Baixar imagem do WhatsApp via UAZAPI e retornar como Base64
 * Necessário porque URLs do WhatsApp são autenticadas/criptografadas
 * 
 * @param messageId - ID da mensagem que contém a imagem
 * @returns { base64: string, mimetype: string } ou null se falhar
 */
export async function baixarImagemUAZAPI(messageId: string): Promise<{ base64: string; mimetype: string } | null> {
  try {
    console.log('[UAZAPI] Baixando imagem:', messageId);
    
    const response = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN  // ← Header de autenticação
      },
      body: JSON.stringify({
        id: messageId,           // ← ID da mensagem
        return_base64: true,     // ← Retornar como Base64
        return_link: false       // ← Não precisa de link
      })
    });
    
    if (!response.ok) {
      console.error('[UAZAPI] Erro ao baixar imagem:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // UAZAPI pode retornar em diferentes campos
    const base64 = data.base64Data || data.base64;
    const mimetype = data.mimetype || 'image/jpeg';
    
    console.log('[UAZAPI] Imagem baixada. Mimetype:', mimetype, 'Tamanho:', base64.length);
    
    return { base64, mimetype };
    
  } catch (error) {
    console.error('[UAZAPI] Erro ao baixar imagem:', error);
    return null;
  }
}
```

---

## 4. 🔍 Detecção de Tipo de Imagem

### Função detectarTipoImagem

```typescript
// image-reader.ts - Linha 309-386

export type TipoImagem = 'hodometro' | 'nota_abastecimento' | 'comprovante' | 'outro';

export async function detectarTipoImagem(messageId: string): Promise<DeteccaoTipoImagem> {
  // 1. Baixar imagem via UAZAPI
  const imagem = await baixarImagemUAZAPI(messageId);
  
  if (!imagem || !imagem.base64) {
    return { tipo: 'outro', confianca: 'baixa' };
  }
  
  // 2. Montar data URL com base64
  const dataUrl = `data:${imagem.mimetype};base64,${imagem.base64}`;
  
  // 3. Enviar para GPT-4 Vision
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Classifique o tipo de imagem:

TIPOS:
- "hodometro": foto do painel do carro mostrando quilometragem
- "nota_abastecimento": cupom fiscal de posto de combustível
- "comprovante": recibo, comprovante de pagamento
- "outro": qualquer outra imagem

RESPONDA em JSON:
{"tipo": "hodometro", "confianca": "alta"}`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { 
                url: dataUrl,    // ← Base64!
                detail: "low"    // ← Baixa resolução para classificação rápida
              }
            }
          ]
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    })
  });
  
  const data = await response.json();
  const resultado = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(resultado);
  
  return {
    tipo: parsed.tipo || 'outro',
    confianca: parsed.confianca || 'baixa'
  };
}
```

---

## 5. 📊 Extração de Dados por Tipo

### 5.1 Leitura de Hodômetro (KM)

```typescript
// image-reader.ts - Linha 58-164

export interface LeituraKm {
  sucesso: boolean;
  km?: number;
  confianca?: 'alta' | 'media' | 'baixa';
  erro?: string;
}

export async function lerKmDaImagem(messageId: string): Promise<LeituraKm> {
  // 1. Baixar imagem via UAZAPI
  const imagem = await baixarImagemUAZAPI(messageId);
  
  if (!imagem || !imagem.base64) {
    return { sucesso: false, erro: 'Não foi possível baixar a imagem' };
  }
  
  // 2. Montar data URL
  const dataUrl = `data:${imagem.mimetype};base64,${imagem.base64}`;
  
  // 3. Enviar para GPT-4 Vision
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em ler hodômetros/odômetros de veículos.
Analise a imagem e extraia APENAS o número da quilometragem total.

REGRAS:
- Procure por números no painel que representem KM total
- O número pode estar em display digital (laranja, verde, azul) ou analógico
- Ignore trip meters (parciais, geralmente menores)
- Ignore velocidade, RPM, combustível
- Números geralmente têm 5-6 dígitos (ex: 45320, 123456, 404048)

RESPONDA em JSON:
{"km": 404048, "confianca": "alta"}

Confiança:
- "alta": número claramente visível
- "media": número parcialmente visível
- "baixa": incerto sobre o valor

Se NÃO conseguir identificar:
{"km": null, "erro": "motivo"}`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { 
                url: dataUrl,
                detail: "high"  // ← Alta resolução para leitura precisa
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.1  // ← Baixa temperatura para consistência
    })
  });
  
  const data = await response.json();
  const resultado = data.choices?.[0]?.message?.content?.trim();
  
  // Limpar possíveis marcadores de código
  const jsonStr = resultado
    ?.replace(/```json\n?/g, '')
    ?.replace(/```\n?/g, '')
    ?.trim();
  
  const parsed = JSON.parse(jsonStr || '{}');
  
  if (parsed.km && typeof parsed.km === 'number') {
    return {
      sucesso: true,
      km: parsed.km,
      confianca: parsed.confianca || 'media'
    };
  }
  
  return {
    sucesso: false,
    erro: parsed.erro || 'Não foi possível identificar a quilometragem'
  };
}
```

### 5.2 Leitura de Nota de Abastecimento

```typescript
// image-reader.ts - Linha 172-301

export interface LeituraNotaAbastecimento {
  sucesso: boolean;
  dados?: {
    valor_total?: number;
    litros?: number;
    preco_litro?: number;
    tipo_combustivel?: string;
    posto?: string;
    data?: string;
    km?: number;
  };
  confianca?: 'alta' | 'media' | 'baixa';
  erro?: string;
}

export async function lerNotaAbastecimento(messageId: string): Promise<LeituraNotaAbastecimento> {
  const imagem = await baixarImagemUAZAPI(messageId);
  
  if (!imagem || !imagem.base64) {
    return { sucesso: false, erro: 'Não foi possível baixar a imagem' };
  }
  
  const dataUrl = `data:${imagem.mimetype};base64,${imagem.base64}`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em ler cupons fiscais de postos de combustível.
Analise a imagem e extraia as informações de abastecimento.

INFORMAÇÕES A EXTRAIR:
- valor_total: valor total pago (em reais)
- litros: quantidade de litros abastecidos
- preco_litro: preço por litro
- tipo_combustivel: gasolina, etanol, diesel, GNV
- posto: nome do posto (Shell, Ipiranga, BR, etc)
- data: data do abastecimento (formato YYYY-MM-DD)
- km: quilometragem (se aparecer na nota)

RESPONDA em JSON:
{
  "valor_total": 198.50,
  "litros": 45.2,
  "preco_litro": 4.39,
  "tipo_combustivel": "gasolina",
  "posto": "Shell",
  "data": "2025-11-30",
  "km": null,
  "confianca": "alta"
}

Use null para campos não encontrados.

Se NÃO conseguir ler a nota:
{"erro": "motivo", "confianca": null}`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { 
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    })
  });
  
  const data = await response.json();
  const resultado = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(resultado);
  
  if (parsed.erro) {
    return { sucesso: false, erro: parsed.erro };
  }
  
  if (parsed.valor_total || parsed.litros) {
    return {
      sucesso: true,
      dados: {
        valor_total: parsed.valor_total,
        litros: parsed.litros,
        preco_litro: parsed.preco_litro,
        tipo_combustivel: parsed.tipo_combustivel,
        posto: parsed.posto,
        data: parsed.data,
        km: parsed.km
      },
      confianca: parsed.confianca || 'media'
    };
  }
  
  return {
    sucesso: false,
    erro: 'Não foi possível identificar informações de abastecimento'
  };
}
```

---

## 6. 🔄 Integração com Fluxo de Registro

### Fluxo no index.ts

```typescript
// index.ts - Linha 1230-1295

if (tipoImagem.tipo === 'nota_abastecimento') {
  // Ler nota de abastecimento
  const leitura = await imageReader.lerNotaAbastecimento(messageId);
  
  if (leitura.sucesso && leitura.dados) {
    const dados = leitura.dados;
    
    // Montar mensagem de confirmação
    let msg = `⛽ *Nota de Abastecimento Lida!*\n\n`;
    
    if (dados.valor_total) msg += `💰 Valor: R$ ${dados.valor_total.toFixed(2)}\n`;
    if (dados.litros) msg += `📊 Litros: ${dados.litros.toFixed(2)}L\n`;
    if (dados.preco_litro) msg += `📈 Preço/L: R$ ${dados.preco_litro.toFixed(2)}\n`;
    if (dados.tipo_combustivel) msg += `⛽ Tipo: ${dados.tipo_combustivel}\n`;
    if (dados.posto) msg += `🏪 Posto: ${dados.posto}\n`;
    if (dados.data) msg += `📅 Data: ${dados.data}\n`;
    
    msg += `\n_Confiança: ${leitura.confianca}_`;
    msg += `\n\n✅ *Confirma o registro?*`;
    
    // Salvar contexto aguardando confirmação
    await contextManager.salvarContexto(userId, {
      estado: 'aguardando_confirmacao_abastecimento',
      dados: {
        valor: dados.valor_total,
        litros: dados.litros,
        preco_litro: dados.preco_litro,
        tipo_combustivel: dados.tipo_combustivel,
        posto: dados.posto,
        data: dados.data
      }
    });
    
    // Enviar com botões de confirmação
    await buttonSender.enviarConfirmacaoSimNao(
      phone,
      msg,
      'confirmar_abastecimento',
      'cancelar_abastecimento'
    );
    
    return new Response("OK", { status: 200 });
  }
}
```

---

## 7. ⚠️ Edge Cases e Tratamento de Erros

### Imagem Borrada/Ilegível

```typescript
// Se confiança baixa, pedir confirmação manual
if (leitura.confianca === 'baixa') {
  await enviarTexto(phone, 
    `🤔 Li o valor *${leitura.km} km*, mas não tenho certeza.\n\n` +
    `Está correto? Responda *sim* ou digite o valor correto.`
  );
  
  await contextManager.salvarContexto(userId, {
    estado: 'aguardando_confirmacao_km',
    dados: { km_lido: leitura.km }
  });
}
```

### Imagem Não Reconhecida

```typescript
// Imagem não é nota nem hodômetro
if (tipoImagem.tipo === 'outro') {
  if (caption) {
    // Tem legenda, processar como texto
    const intencao = await nlpProcessor.classificarIntencao(caption, userId);
    // ...
  } else {
    await enviarTexto(phone, 
      `📷 Recebi sua imagem!\n\n` +
      `💡 Para que eu possa ajudar, me diga o que é:\n` +
      `• Foto de nota fiscal? Mande junto com _"abasteci"_\n` +
      `• Foto do hodômetro? Diga _"iniciar turno"_ ou _"encerrar turno"_`
    );
  }
}
```

### Erro no Download

```typescript
if (!messageId) {
  await enviarTexto(phone, '❌ Não consegui acessar a imagem. Tente novamente.');
  return;
}

const imagem = await baixarImagemUAZAPI(messageId);
if (!imagem || !imagem.base64) {
  return { sucesso: false, erro: 'Não foi possível baixar a imagem via UAZAPI' };
}
```

---

## 8. 💰 Custos Estimados

| Operação | Modelo | Tokens (aprox) | Custo/Imagem |
|----------|--------|----------------|--------------|
| Detectar tipo | gpt-4o (low detail) | ~100 | ~$0.001 |
| Ler hodômetro | gpt-4o (high detail) | ~300 | ~$0.003 |
| Ler nota | gpt-4o (high detail) | ~500 | ~$0.005 |

**Total por imagem processada:** ~$0.004 a $0.008

---

## 9. 🎯 Adaptação para Personal Finance (Ana Clara)

### Tipos de Imagem Sugeridos

Para o Personal Finance, você pode expandir os tipos:

```typescript
export type TipoImagem = 
  | 'nota_fiscal'        // Cupom de mercado, farmácia, etc
  | 'comprovante_pix'    // Print de transferência
  | 'fatura_cartao'      // Fatura do cartão
  | 'boleto'             // Boleto bancário
  | 'recibo'             // Recibo genérico
  | 'extrato'            // Extrato bancário
  | 'outro';
```

### Prompt para Nota Fiscal Genérica

```typescript
const PROMPT_NOTA_FISCAL = `Você é um especialista em ler cupons e notas fiscais.
Analise a imagem e extraia as informações da compra.

INFORMAÇÕES A EXTRAIR:
- valor_total: valor total pago (em reais)
- estabelecimento: nome da loja/mercado
- categoria: alimentacao, farmacia, vestuario, etc
- data: data da compra (formato YYYY-MM-DD)
- itens: lista dos principais itens (máximo 5)

RESPONDA em JSON:
{
  "valor_total": 156.80,
  "estabelecimento": "Mercado Extra",
  "categoria": "alimentacao",
  "data": "2025-12-07",
  "itens": ["arroz", "feijão", "carne"],
  "confianca": "alta"
}`;
```

### Prompt para Comprovante PIX

```typescript
const PROMPT_COMPROVANTE_PIX = `Você é um especialista em ler comprovantes de transferência.
Analise a imagem e extraia as informações do PIX/transferência.

INFORMAÇÕES A EXTRAIR:
- valor: valor transferido (em reais)
- tipo: "enviado" ou "recebido"
- destinatario: nome de quem recebeu (se enviado)
- remetente: nome de quem enviou (se recebido)
- banco: banco da transação
- data: data da transferência (formato YYYY-MM-DD)

RESPONDA em JSON:
{
  "valor": 500.00,
  "tipo": "enviado",
  "destinatario": "João Silva",
  "banco": "Nubank",
  "data": "2025-12-07",
  "confianca": "alta"
}`;
```

---

## 10. 📋 Checklist de Implementação

### Para Ana Clara (Personal Finance):

- [ ] Criar `image-reader.ts` com funções de leitura
- [ ] Criar `baixarImagemUAZAPI()` no utils.ts
- [ ] Adicionar detecção de imagem no index.ts
- [ ] Criar prompts específicos para cada tipo de imagem
- [ ] Implementar fluxo de confirmação
- [ ] Integrar com registro de transação
- [ ] Tratar edge cases (imagem borrada, não reconhecida)
- [ ] Adicionar logs para debug
- [ ] Testar com diferentes tipos de imagem

### Variáveis de Ambiente Necessárias:

```env
OPENAI_API_KEY=sk-...
UAZAPI_BASE_URL=https://lamusic.uazapi.com
UAZAPI_TOKEN=seu_token
```

---

## 11. 📱 Exemplos de Interação

### Nota Fiscal de Mercado

```
Usuário: [Envia foto de cupom fiscal]

Ana Clara: 🛒 *Nota Fiscal Lida!*

💰 Valor: R$ 156,80
🏪 Local: Mercado Extra
📂 Categoria: Alimentação
📅 Data: 07/12/2025

📝 Itens: arroz, feijão, carne, leite, pão

_Confiança: alta_

✅ *Confirma o registro?*
[Sim] [Não] [Editar]
```

### Comprovante PIX

```
Usuário: [Envia print de PIX]

Ana Clara: 💸 *Transferência Identificada!*

💰 Valor: R$ 500,00
📤 Tipo: Enviado
👤 Para: João Silva
🏦 Banco: Nubank
📅 Data: 07/12/2025

Em qual categoria devo registrar?
[Aluguel] [Empréstimo] [Presente] [Outro]
```

---

Pronto! Esta documentação cobre todo o sistema de leitura de imagens do Copiloto. 🚀