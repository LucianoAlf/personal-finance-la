export interface DayContextQueryDetection {
  kind: 'day_context';
  dayOffset: 0 | 1;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function detectDayContextQuery(text: string): DayContextQueryDetection | null {
  const normalized = normalize(text);

  if (
    /\b(o que (eu )?tenho hoje|minha agenda hoje|meus compromissos hoje|priorizar hoje)\b/.test(normalized)
  ) {
    return { kind: 'day_context', dayOffset: 0 };
  }

  if (
    /\b(o que (eu )?tenho amanha|minha agenda amanha|meus compromissos amanha)\b/.test(normalized)
  ) {
    return { kind: 'day_context', dayOffset: 1 };
  }

  return null;
}

export function detectResumoFinanceiroPeriodo(
  text: string,
): 'hoje' | 'semana' | 'mes' | 'trimestre' | null {
  const normalized = normalize(text);

  if (
    normalized.includes('resumo de hoje') ||
    normalized.includes('resumo do dia') ||
    normalized.includes('resumo do meu dia') ||
    normalized.includes('resumo diario') ||
    (normalized.includes('como foi') && normalized.includes('dia')) ||
    normalized.includes('meu dia financeiro')
  ) {
    return 'hoje';
  }

  if (
    normalized.includes('resumo da semana') ||
    normalized.includes('resumo semanal') ||
    (normalized.includes('como foi') && normalized.includes('semana')) ||
    normalized.includes('semana financeira')
  ) {
    return 'semana';
  }

  if (
    normalized.includes('resumo do trimestre') ||
    normalized.includes('resumo trimestral') ||
    normalized.includes('ultimos 3 meses') ||
    normalized.includes('trimestre financeiro')
  ) {
    return 'trimestre';
  }

  if (
    normalized.includes('resumo do mes') ||
    normalized.includes('resumo mensal') ||
    (normalized.includes('como foi') && normalized.includes('mes')) ||
    normalized.includes('mes financeiro') ||
    /resumo de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/.test(
      normalized,
    )
  ) {
    return 'mes';
  }

  return null;
}

export function isHypotheticalFinancialMessage(text: string): boolean {
  const normalized = normalize(text);
  return /\b(acho que vou gastar|vou gastar|pretendo gastar|estou pensando em gastar|talvez eu gaste|quero gastar)\b/.test(
    normalized,
  );
}

export function shouldBypassFlowContext(text: string): boolean {
  const normalized = normalize(text);

  return (
    /\bsempre que eu falar\b/.test(normalized) ||
    /\bconsidere\b/.test(normalized) ||
    /\bpode me chamar de\b/.test(normalized) ||
    /\bme chama de\b/.test(normalized)
  );
}

