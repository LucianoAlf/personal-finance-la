import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { shouldResetAIProviderValidationState } from './ai-config-validation.ts';

Deno.test('does not reset validation when model and api key stay the same', () => {
  assertEquals(
    shouldResetAIProviderValidationState(
      {
        apiKeyEncrypted: 'same-key',
        modelName: 'gemini-3-flash-preview',
      },
      {
        apiKey: 'same-key',
        modelName: 'gemini-3-flash-preview',
      },
    ),
    false,
  );
});

Deno.test('resets validation when api key changes', () => {
  assertEquals(
    shouldResetAIProviderValidationState(
      {
        apiKeyEncrypted: 'old-key',
        modelName: 'gemini-3-flash-preview',
      },
      {
        apiKey: 'new-key',
        modelName: 'gemini-3-flash-preview',
      },
    ),
    true,
  );
});

Deno.test('resets validation when model changes', () => {
  assertEquals(
    shouldResetAIProviderValidationState(
      {
        apiKeyEncrypted: 'same-key',
        modelName: 'gemini-3-flash-preview',
      },
      {
        apiKey: 'same-key',
        modelName: 'gemini-3.1-flash-lite-preview',
      },
    ),
    true,
  );
});
