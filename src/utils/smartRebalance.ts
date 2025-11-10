// SPRINT 4 DIA 2: Smart Rebalance Utils
export interface AllocationItem {
  assetClass: string;
  percentage: number;
  value: number;
}

export interface RebalanceAction {
  assetClass: string;
  action: 'BUY' | 'SELL';
  amount: number;
  percentage: number;
  currentPercentage: number;
  targetPercentage: number;
  reason: string;
}

/**
 * Calcula ações de rebalanceamento comparando alocação atual vs meta
 * @param currentAllocation - Alocação atual do portfólio
 * @param targetAllocation - Alocação desejada (metas)
 * @param totalValue - Valor total do portfólio
 * @param threshold - Diferença mínima em % para sugerir ação (padrão: 5%)
 * @returns Lista de ações BUY/SELL sugeridas
 */
export function calculateRebalancing(
  currentAllocation: AllocationItem[],
  targetAllocation: Array<{ asset_class: string; target_percentage: number }>,
  totalValue: number,
  threshold = 5
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];

  // Validar totalValue
  if (!totalValue || totalValue <= 0 || isNaN(totalValue)) {
    return actions;
  }

  // Mapear current allocation para fácil acesso
  const currentMap = new Map<string, AllocationItem>();
  currentAllocation.forEach((item) => {
    currentMap.set(item.assetClass, item);
  });

  // Para cada meta de alocação, verificar se precisa rebalancear
  for (const target of targetAllocation) {
    const current = currentMap.get(target.asset_class);
    const currentPct = current?.percentage || 0;
    const targetPct = target.target_percentage;
    const diff = targetPct - currentPct;

    // Validar valores antes de calcular
    if (isNaN(currentPct) || isNaN(targetPct) || isNaN(diff)) {
      continue;
    }

    // Somente sugerir ação se diferença for maior que threshold
    if (Math.abs(diff) > threshold) {
      const amount = (Math.abs(diff) / 100) * totalValue;

      // Validar amount antes de adicionar
      if (isNaN(amount) || amount <= 0) {
        continue;
      }

      actions.push({
        assetClass: formatAssetClass(target.asset_class),
        action: diff > 0 ? 'BUY' : 'SELL',
        amount,
        percentage: Math.abs(diff),
        currentPercentage: currentPct,
        targetPercentage: targetPct,
        reason: `Alocação atual: ${currentPct.toFixed(1)}%, Meta: ${targetPct.toFixed(1)}%`,
      });
    }
  }

  // Ordenar por magnitude da diferença (prioridade)
  return actions.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Verifica se o portfólio está balanceado dentro do threshold
 */
export function isPortfolioBalanced(
  currentAllocation: AllocationItem[],
  targetAllocation: Array<{ asset_class: string; target_percentage: number }>,
  threshold = 5
): boolean {
  const currentMap = new Map<string, AllocationItem>();
  currentAllocation.forEach((item) => {
    currentMap.set(item.assetClass, item);
  });

  for (const target of targetAllocation) {
    const current = currentMap.get(target.asset_class);
    const currentPct = current?.percentage || 0;
    const diff = Math.abs(target.target_percentage - currentPct);

    if (diff > threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Calcula o desvio total do portfólio em relação às metas
 */
export function calculateTotalDeviation(
  currentAllocation: AllocationItem[],
  targetAllocation: Array<{ asset_class: string; target_percentage: number }>
): number {
  const currentMap = new Map<string, AllocationItem>();
  currentAllocation.forEach((item) => {
    currentMap.set(item.assetClass, item);
  });

  let totalDeviation = 0;

  for (const target of targetAllocation) {
    const current = currentMap.get(target.asset_class);
    const currentPct = current?.percentage || 0;
    const diff = Math.abs(target.target_percentage - currentPct);
    totalDeviation += diff;
  }

  return totalDeviation;
}

/**
 * Formata o nome da classe de ativo para exibição
 */
function formatAssetClass(assetClass: string): string {
  const labels: Record<string, string> = {
    renda_fixa: 'Renda Fixa',
    acoes_nacionais: 'Ações Nacionais',
    fiis: 'FIIs',
    internacional: 'Internacional',
    cripto: 'Criptomoedas',
    previdencia: 'Previdência',
    outros: 'Outros',
  };

  return labels[assetClass] || assetClass;
}
