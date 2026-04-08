export interface OpenAICompatibleMessage {
  role: string;
  content: unknown;
  reasoning?: string | null;
}

export function usesOpenAIMaxCompletionTokens(model: string): boolean {
  return model.startsWith('gpt-5');
}

export function usesOpenAIResponsesAPI(model: string): boolean {
  return model.startsWith('gpt-5');
}

function supportsCustomOpenAITemperature(model: string): boolean {
  return model !== 'gpt-5-mini';
}

function shouldDisableOpenRouterReasoning(model: string): boolean {
  return model !== 'minimax/minimax-m2.7';
}

export function ensureStructuredOutputTokens(configuredMaxTokens: number | undefined, minimumTokens: number): number {
  return Math.max(minimumTokens, configuredMaxTokens || 0);
}

export function buildOpenAIChatBody({
  model,
  messages,
  temperature,
  maxTokens,
}: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature: number;
  maxTokens: number;
}) {
  return {
    model,
    messages,
    ...(supportsCustomOpenAITemperature(model) ? { temperature } : {}),
    ...(usesOpenAIMaxCompletionTokens(model)
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens }),
  };
}

function normalizeOpenAIResponsesContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof item.text === 'string') return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (content && typeof content === 'object' && typeof (content as { text?: unknown }).text === 'string') {
    return (content as { text: string }).text;
  }

  return '';
}

export function buildOpenAIResponsesBody({
  model,
  messages,
  temperature,
  maxTokens,
}: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature: number;
  maxTokens: number;
}) {
  return {
    model,
    input: messages.map((message) => ({
      role: message.role,
      content: normalizeOpenAIResponsesContent(message.content),
    })),
    max_output_tokens: maxTokens,
    ...(supportsCustomOpenAITemperature(model) ? { temperature } : {}),
  };
}

export function buildOpenRouterChatBody({
  model,
  messages,
  temperature,
  maxTokens,
}: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature: number;
  maxTokens: number;
}) {
  return {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(shouldDisableOpenRouterReasoning(model)
      ? {
          reasoning: {
            effort: 'none',
          },
        }
      : {}),
  };
}

export function extractOpenAICompatibleText(payload: any): string {
  const message = payload?.choices?.[0]?.message as OpenAICompatibleMessage | undefined;
  const content = message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && typeof item.text === 'string') return item.text;
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();

    if (text) {
      return text;
    }
  }

  if (typeof message?.reasoning === 'string' && message.reasoning.trim()) {
    return message.reasoning;
  }

  return '';
}

export function extractOpenAIResponsesText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = (payload?.output || [])
    .flatMap((item: any) => item?.content || [])
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();

  return text;
}

export function extractJsonObjectText(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned;
}
