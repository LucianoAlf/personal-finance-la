/**
 * Camada única para obter o material de API key a partir da linha em `ai_provider_configs`.
 *
 * Hoje: `api_key_encrypted` guarda o valor usado nas chamadas (legado: texto operacional).
 * Futuro: ramificar por `key_storage`, referência Vault ou KMS sem mudar assinatura dos callers.
 */
export function resolveApiKeyFromProviderConfigRow(row: {
  api_key_encrypted?: string | null;
}): string | undefined {
  const raw = row.api_key_encrypted;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return undefined;
}
