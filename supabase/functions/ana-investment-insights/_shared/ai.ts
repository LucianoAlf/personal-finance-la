// Shared AI utilities for Edge Functions

export interface NormalizedAIConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'openrouter';
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  responseStyle?: string;
  responseTone?: string;
}

export async function getDefaultAIConfig(supabase: any, userId: string): Promise<NormalizedAIConfig | null> {
  const { data, error } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('is_validated', true)
    .single();

  if (error || !data) return null;

  return {
    provider: data.provider,
    model: data.model_name,
    apiKey: data.api_key_encrypted,
    temperature: typeof data.temperature === 'number' ? data.temperature : 0.7,
    maxTokens: typeof data.max_tokens === 'number' ? data.max_tokens : 1000,
    systemPrompt: data.system_prompt || undefined,
    responseStyle: data.response_style || undefined,
    responseTone: data.response_tone || undefined,
  } as NormalizedAIConfig;
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export async function callChat(config: NormalizedAIConfig, messages: ChatMessage[]): Promise<string> {
  switch (config.provider) {
    case 'openai':
      return await callOpenAI(config, messages);
    case 'openrouter':
      return await callOpenRouter(config, messages);
    case 'gemini':
      return await callGemini(config, messages);
    case 'claude':
      return await callClaude(config, messages);
    default:
      throw new Error(`Provider não suportado: ${config.provider}`);
  }
}

async function callOpenAI(config: NormalizedAIConfig, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouter(config: NormalizedAIConfig, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(config: NormalizedAIConfig, messages: ChatMessage[]): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content || '';
  const userParts: any[] = [];
  const text = messages.filter(m => m.role !== 'system').map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n');
  if (system) userParts.push({ text: system });
  userParts.push({ text });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: userParts }],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callClaude(config: NormalizedAIConfig, messages: ChatMessage[]): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content;
  const nonSystem = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': `${config.apiKey}`,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      system,
      messages: nonSystem.length ? nonSystem : [{ role: 'user', content: 'Olá' }],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`);
  const data = await res.json();
  const content = data?.content?.[0]?.text ?? '';
  return content;
}

export async function callVision(config: NormalizedAIConfig, imageDataUrl: string, systemPrompt: string, userText: string): Promise<string> {
  if (config.provider === 'openai' || config.provider === 'openrouter') {
    const url = config.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    const headers: Record<string,string> = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
    const body = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } }
        ] }
      ],
      temperature: Math.max(0.1, config.temperature || 0.2),
      max_tokens: Math.max(500, config.maxTokens || 1000),
    } as any;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${config.provider} vision error: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  if (config.provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt + '\n' + userText },
            { inline_data: { mime_type: 'image/jpeg', data: imageDataUrl.split(',')[1] || '' } }
          ]
        }],
        generationConfig: {
          temperature: Math.max(0.1, config.temperature || 0.2),
          maxOutputTokens: Math.max(500, config.maxTokens || 1000),
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini vision error: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  throw new Error('Vision não suportado para este provedor');
}
