/**
 * Extrai mensagem segura para o usuário a partir da resposta de uma Edge Function.
 * Preferência: body.error.userMessage (contrato novo); evita exibir detalhes técnicos de provedor.
 */
export function getUserSafeEdgeErrorMessage(
  data: unknown,
  fnError: { message?: string } | null | undefined,
  fallback = 'Erro ao buscar insights',
): string {
  if (data && typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    const err = d.error;
    if (err && typeof err === 'object' && err !== null) {
      const um = (err as { userMessage?: unknown }).userMessage;
      if (typeof um === 'string' && um.trim()) return um.trim();
      const legacy = (err as { message?: unknown }).message;
      if (typeof legacy === 'string' && legacy.trim()) {
        const m = legacy.trim();
        if (m.length <= 280 && !looksLikeTechnicalLeak(m)) return m;
      }
    }
    if (typeof err === 'string' && err.trim()) {
      const m = err.trim();
      if (m.length <= 280 && !looksLikeTechnicalLeak(m)) return m;
    }
    const top = d.userMessage;
    if (typeof top === 'string' && top.trim()) return top.trim();
  }
  const msg = fnError?.message?.trim();
  if (msg && !msg.toLowerCase().includes('non-2xx')) return msg;
  return fallback;
}

function looksLikeTechnicalLeak(s: string): boolean {
  const lower = s.toLowerCase();
  return (
    lower.includes('openai') ||
    lower.includes('openrouter') ||
    lower.includes('anthropic') ||
    lower.includes('generativelanguage') ||
    lower.includes('api_key') ||
    lower.includes('sk-') ||
    lower.includes('aiza') ||
    lower.includes('error:') && lower.includes('http')
  );
}
