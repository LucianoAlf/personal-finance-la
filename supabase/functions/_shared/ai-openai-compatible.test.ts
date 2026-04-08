import {
  buildOpenAIChatBody,
  buildOpenAIResponsesBody,
  buildOpenRouterChatBody,
  ensureStructuredOutputTokens,
  extractJsonObjectText,
  extractOpenAICompatibleText,
  extractOpenAIResponsesText,
  usesOpenAIResponsesAPI,
  usesOpenAIMaxCompletionTokens,
} from './ai-openai-compatible.ts';

Deno.test('usesOpenAIMaxCompletionTokens enables GPT-5 token field switching', () => {
  if (!usesOpenAIMaxCompletionTokens('gpt-5.4-mini')) {
    throw new Error('gpt-5 models should use max_completion_tokens');
  }
  if (usesOpenAIMaxCompletionTokens('gpt-4o-mini')) {
    throw new Error('non gpt-5 models should keep max_tokens');
  }
});

Deno.test('usesOpenAIResponsesAPI routes GPT-5 models through Responses API', () => {
  if (!usesOpenAIResponsesAPI('gpt-5-mini')) {
    throw new Error('gpt-5-mini should use the Responses API');
  }
  if (!usesOpenAIResponsesAPI('gpt-5.4-mini')) {
    throw new Error('gpt-5.4-mini should use the Responses API');
  }
  if (usesOpenAIResponsesAPI('gpt-4o-mini')) {
    throw new Error('gpt-4o-mini should stay on chat completions');
  }
});

Deno.test('buildOpenAIChatBody uses max_completion_tokens for GPT-5 models', () => {
  const body = buildOpenAIChatBody({
    model: 'gpt-5.4-mini',
    messages: [{ role: 'user', content: 'Oi' }],
    temperature: 0.7,
    maxTokens: 900,
  }) as Record<string, unknown>;

  if (body.max_completion_tokens !== 900) {
    throw new Error('gpt-5 body should use max_completion_tokens');
  }
  if ('max_tokens' in body) {
    throw new Error('gpt-5 body should not send max_tokens');
  }
});

Deno.test('buildOpenAIChatBody omits temperature for gpt-5-mini runtime compatibility', () => {
  const body = buildOpenAIChatBody({
    model: 'gpt-5-mini',
    messages: [{ role: 'user', content: 'Oi' }],
    temperature: 0.7,
    maxTokens: 900,
  }) as Record<string, unknown>;

  if ('temperature' in body) {
    throw new Error('gpt-5-mini body should omit temperature to use the provider default');
  }
  if (body.max_completion_tokens !== 900) {
    throw new Error('gpt-5-mini body should still use max_completion_tokens');
  }
});

Deno.test('buildOpenAIChatBody keeps max_tokens for non GPT-5 models', () => {
  const body = buildOpenAIChatBody({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Oi' }],
    temperature: 0.7,
    maxTokens: 900,
  }) as Record<string, unknown>;

  if (body.max_tokens !== 900) {
    throw new Error('non gpt-5 body should use max_tokens');
  }
  if ('max_completion_tokens' in body) {
    throw new Error('non gpt-5 body should not send max_completion_tokens');
  }
});

Deno.test('buildOpenAIResponsesBody maps GPT-5 chat messages into responses input items', () => {
  const body = buildOpenAIResponsesBody({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User prompt' },
    ],
    temperature: 0.7,
    maxTokens: 1200,
  }) as Record<string, unknown>;

  const input = body.input as Array<Record<string, unknown>>;
  if (!Array.isArray(input) || input.length !== 2) {
    throw new Error('Responses body should include all chat messages as input items');
  }
  if (body.max_output_tokens !== 1200) {
    throw new Error('Responses body should use max_output_tokens');
  }
  if (body.temperature !== 0.7) {
    throw new Error('gpt-5.4-mini should keep custom temperature in Responses API');
  }
});

Deno.test('buildOpenAIResponsesBody omits temperature for gpt-5-mini', () => {
  const body = buildOpenAIResponsesBody({
    model: 'gpt-5-mini',
    messages: [{ role: 'user', content: 'Oi' }],
    temperature: 0.7,
    maxTokens: 1200,
  }) as Record<string, unknown>;

  if ('temperature' in body) {
    throw new Error('gpt-5-mini should not send custom temperature in Responses API');
  }
});

Deno.test('buildOpenRouterChatBody disables explicit reasoning for glm-5.1', () => {
  const body = buildOpenRouterChatBody({
    model: 'z-ai/glm-5.1',
    messages: [{ role: 'user', content: 'Responda em JSON' }],
    temperature: 0.7,
    maxTokens: 1200,
  });

  if (body.reasoning?.effort !== 'none') {
    throw new Error('OpenRouter body should disable explicit reasoning');
  }
  if (body.max_tokens !== 1200) {
    throw new Error('OpenRouter body should preserve max_tokens');
  }
});

Deno.test('buildOpenRouterChatBody leaves reasoning untouched for minimax m2.7', () => {
  const body = buildOpenRouterChatBody({
    model: 'minimax/minimax-m2.7',
    messages: [{ role: 'user', content: 'Responda em JSON' }],
    temperature: 0.7,
    maxTokens: 1200,
  }) as Record<string, unknown>;

  if ('reasoning' in body) {
    throw new Error('MiniMax body should not force reasoning.effort to none');
  }
  if (body.max_tokens !== 1200) {
    throw new Error('MiniMax body should preserve max_tokens');
  }
});

Deno.test('extractOpenAICompatibleText reads string content first', () => {
  const text = extractOpenAICompatibleText({
    choices: [{ message: { content: '{"ok":true}' } }],
  });

  if (text !== '{"ok":true}') {
    throw new Error('expected direct content string');
  }
});

Deno.test('extractOpenAICompatibleText falls back to reasoning when content is null', () => {
  const text = extractOpenAICompatibleText({
    choices: [{ message: { content: null, reasoning: '{"ok":true}' } }],
  });

  if (text !== '{"ok":true}') {
    throw new Error('expected reasoning fallback text');
  }
});

Deno.test('extractOpenAIResponsesText reads output_text blocks from Responses API', () => {
  const text = extractOpenAIResponsesText({
    output: [
      { type: 'reasoning', summary: [] },
      {
        type: 'message',
        content: [
          { type: 'output_text', text: '{"ok":true}' },
        ],
      },
    ],
  });

  if (text !== '{"ok":true}') {
    throw new Error('expected output_text to be extracted from Responses API payload');
  }
});

Deno.test('extractJsonObjectText removes markdown fences around JSON', () => {
  const json = extractJsonObjectText('```json\n{"ok":true}\n```');

  if (json !== '{"ok":true}') {
    throw new Error('expected fenced JSON to be unwrapped');
  }
});

Deno.test('extractJsonObjectText extracts JSON from surrounding prose', () => {
  const json = extractJsonObjectText('Aqui está:\n{"ok":true,"items":[1,2]}\nObrigado');

  if (json !== '{"ok":true,"items":[1,2]}') {
    throw new Error('expected parser to isolate JSON object');
  }
});

Deno.test('ensureStructuredOutputTokens enforces a safe minimum for structured JSON flows', () => {
  if (ensureStructuredOutputTokens(1000, 2500) !== 2500) {
    throw new Error('structured outputs should raise too-low token budgets');
  }
  if (ensureStructuredOutputTokens(3200, 2500) !== 3200) {
    throw new Error('structured outputs should preserve larger budgets');
  }
});
