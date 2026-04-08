export interface ExistingAIProviderConfigState {
  apiKeyEncrypted?: string | null;
  modelName?: string | null;
}

export interface IncomingAIProviderConfigState {
  apiKey?: string | null;
  modelName?: string | null;
}

export function shouldResetAIProviderValidationState(
  existing: ExistingAIProviderConfigState | null | undefined,
  incoming: IncomingAIProviderConfigState,
): boolean {
  const apiKeyChanged =
    typeof incoming.apiKey === 'string' &&
    incoming.apiKey.length > 0 &&
    incoming.apiKey !== (existing?.apiKeyEncrypted ?? null);

  const modelChanged =
    typeof incoming.modelName === 'string' &&
    incoming.modelName.length > 0 &&
    incoming.modelName !== (existing?.modelName ?? null);

  return apiKeyChanged || modelChanged;
}
