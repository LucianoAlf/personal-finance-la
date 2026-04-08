export interface StructuredIntentConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'openrouter';
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  responseStyle?: string;
  responseTone?: string;
}

interface FunctionSchemaLike {
  name?: string;
  parameters?: unknown;
}

interface RequestPayload {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function usesOpenAIMaxCompletionTokens(model: string): boolean {
  return model.startsWith('gpt-5');
}

function stripMarkdownCodeFences(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function extractJsonText(text: string): string {
  const cleaned = stripMarkdownCodeFences(text);
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match?.[0] ?? cleaned;
}

function buildJsonOnlyInstructions(functionSchema?: FunctionSchemaLike): string {
  const schemaText = functionSchema?.parameters
    ? JSON.stringify(functionSchema.parameters)
    : '{"type":"object"}';

  return [
    'Retorne APENAS um JSON válido, sem markdown e sem explicações extras.',
    'O JSON deve seguir este schema:',
    schemaText,
  ].join('\n');
}

function composeSystemPrompt(config: Partial<StructuredIntentConfig>, systemPrompt: string, functionSchema?: FunctionSchemaLike): string {
  const additions: string[] = [systemPrompt];

  if (config.systemPrompt) {
    additions.push(`INSTRUÇÃO PERSONALIZADA DO USUÁRIO:\n${config.systemPrompt}`);
  }

  if (config.responseStyle) {
    additions.push(`Estilo de resposta preferido: ${config.responseStyle}.`);
  }

  if (config.responseTone) {
    additions.push(`Tom de resposta preferido: ${config.responseTone}.`);
  }

  additions.push(buildJsonOnlyInstructions(functionSchema));

  return additions.join('\n\n');
}

export function normalizeAIConfigRow(row: Record<string, unknown>): StructuredIntentConfig {
  const provider = (row.provider as StructuredIntentConfig['provider'] | undefined) ?? 'openai';
  const model = String(row.model_name ?? row.model ?? '');
  const apiKey = String(row.api_key_encrypted ?? row.api_key ?? '');

  return {
    provider,
    model,
    apiKey,
    temperature: typeof row.temperature === 'number' ? row.temperature : 0.7,
    maxTokens: typeof row.max_tokens === 'number' ? row.max_tokens : 1000,
    systemPrompt: typeof row.system_prompt === 'string' ? row.system_prompt : undefined,
    responseStyle: typeof row.response_style === 'string' ? row.response_style : undefined,
    responseTone: typeof row.response_tone === 'string' ? row.response_tone : undefined,
  };
}

export function buildIntentRequest(
  config: StructuredIntentConfig,
  systemPrompt: string,
  userText: string,
  functionSchema?: FunctionSchemaLike,
): RequestPayload {
  const provider = config.provider;

  if (provider === 'gemini') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${composeSystemPrompt(config, systemPrompt, functionSchema)}\n\nMensagem do usuário: ${userText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          responseMimeType: 'application/json',
        },
      }),
    };
  }

  if (provider === 'claude') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        system: composeSystemPrompt(config, systemPrompt, functionSchema),
        messages: [{ role: 'user', content: userText }],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    };
  }

  const url = provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const isOpenAI = provider === 'openai';
  const tokenField = isOpenAI && usesOpenAIMaxCompletionTokens(config.model)
    ? { max_completion_tokens: config.maxTokens }
    : { max_tokens: config.maxTokens };

  return {
    url,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: composeSystemPrompt(config, systemPrompt) },
        { role: 'user', content: userText },
      ],
      functions: functionSchema ? [functionSchema] : undefined,
      function_call: functionSchema?.name ? { name: functionSchema.name } : undefined,
      temperature: config.temperature,
      ...tokenField,
      response_format: functionSchema ? undefined : { type: 'json_object' },
    }),
  };
}

export function parseIntentResponse(provider: StructuredIntentConfig['provider'], payload: any): Record<string, unknown> {
  const normalizedProvider = provider;

  if (normalizedProvider === 'openai' || normalizedProvider === 'openrouter') {
    const functionArguments = payload?.choices?.[0]?.message?.function_call?.arguments;
    const content = payload?.choices?.[0]?.message?.content;
    const raw = typeof functionArguments === 'string' && functionArguments
      ? functionArguments
      : extractJsonText(String(content ?? ''));
    return JSON.parse(raw);
  }

  if (normalizedProvider === 'gemini') {
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(extractJsonText(String(text ?? '')));
  }

  if (normalizedProvider === 'claude') {
    const text = payload?.content?.[0]?.text;
    return JSON.parse(extractJsonText(String(text ?? '')));
  }

  throw new Error(`Provider não suportado para parse: ${provider}`);
}
