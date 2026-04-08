import {
  buildIntentRequest,
  normalizeAIConfigRow,
  parseIntentResponse,
} from './structured-intent.ts';

Deno.test('normalizeAIConfigRow maps ai_provider_configs columns used by settings', () => {
  const config = normalizeAIConfigRow({
    provider: 'gemini',
    model_name: 'gemini-3-flash-preview',
    api_key_encrypted: 'gem-key',
    temperature: 0.9,
    max_tokens: 1400,
    system_prompt: 'Prompt personalizado',
    response_style: 'medium',
    response_tone: 'friendly',
  });

  if (config.provider !== 'gemini') throw new Error('provider not mapped');
  if (config.model !== 'gemini-3-flash-preview') throw new Error('model_name not mapped');
  if (config.apiKey !== 'gem-key') throw new Error('api_key_encrypted not mapped');
  if (config.temperature !== 0.9) throw new Error('temperature not mapped');
  if (config.maxTokens !== 1400) throw new Error('max_tokens not mapped');
  if (config.systemPrompt !== 'Prompt personalizado') throw new Error('system_prompt not mapped');
});

Deno.test('buildIntentRequest uses Gemini-native payload instead of OpenAI function calling', () => {
  const request = buildIntentRequest(
    {
      provider: 'gemini',
      model: 'gemini-3-flash-preview',
      apiKey: 'gem-key',
      temperature: 1,
      maxTokens: 900,
      systemPrompt: 'System',
    },
    'Classifique a intenção',
    'gastei 20 reais no almoço',
  );

  if (!request.url.includes('gemini-3-flash-preview:generateContent')) {
    throw new Error('gemini endpoint not used');
  }

  const parsed = JSON.parse(request.body);
  if (!parsed.contents?.[0]?.parts?.[0]?.text) {
    throw new Error('gemini contents payload missing');
  }
  if (parsed.functions || parsed.function_call || parsed.messages) {
    throw new Error('gemini payload should not use openai function calling shape');
  }
});

Deno.test('parseIntentResponse extracts function call arguments for OpenAI compatible providers', () => {
  const parsed = parseIntentResponse('openai', {
    choices: [
      {
        message: {
          function_call: {
            arguments: '{"intencao":"REGISTRAR_DESPESA","confianca":0.91,"entidades":{}}',
          },
        },
      },
    ],
  });

  if (parsed.intencao !== 'REGISTRAR_DESPESA') throw new Error('openai arguments not parsed');
  if (parsed.confianca !== 0.91) throw new Error('openai confidence not parsed');
});

Deno.test('buildIntentRequest uses max_completion_tokens for GPT-5 OpenAI models', () => {
  const request = buildIntentRequest(
    {
      provider: 'openai',
      model: 'gpt-5.4-mini',
      apiKey: 'openai-key',
      temperature: 0.7,
      maxTokens: 1000,
    },
    'System',
    'User',
  );

  const parsed = JSON.parse(request.body);
  if (parsed.max_completion_tokens !== 1000) {
    throw new Error('gpt-5 request must use max_completion_tokens');
  }
  if ('max_tokens' in parsed) {
    throw new Error('gpt-5 request should not send max_tokens');
  }
});

Deno.test('parseIntentResponse extracts JSON text returned by Gemini', () => {
  const parsed = parseIntentResponse('gemini', {
    candidates: [
      {
        content: {
          parts: [
            {
              text: '```json\n{"intencao":"CONSULTAR_SALDO","confianca":0.88,"entidades":{}}\n```',
            },
          ],
        },
      },
    ],
  });

  if (parsed.intencao !== 'CONSULTAR_SALDO') throw new Error('gemini JSON text not parsed');
  if (parsed.confianca !== 0.88) throw new Error('gemini confidence not parsed');
});

Deno.test('parseIntentResponse extracts JSON text returned by Claude', () => {
  const parsed = parseIntentResponse('claude', {
    content: [
      {
        text: '{"intencao":"SAUDACAO","confianca":0.8,"entidades":{}}',
      },
    ],
  });

  if (parsed.intencao !== 'SAUDACAO') throw new Error('claude JSON text not parsed');
});
