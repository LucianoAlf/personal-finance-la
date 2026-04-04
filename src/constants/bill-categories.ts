/**
 * BILL CATEGORIES - Categorias para Contas a Pagar
 * 
 * Importa do arquivo master-categories.ts para manter consistência
 */

import * as LucideIcons from 'lucide-react';
import { BILL_TYPE_CATEGORIES, getOrderedBillTypeCategories } from './master-categories';

export interface BillCategory {
  id: string;
  name: string;
  icon: keyof typeof LucideIcons;
  color: string;
  description?: string;
}

// Exporta categorias do master, convertendo para o formato esperado
export const BILL_CATEGORIES: BillCategory[] = getOrderedBillTypeCategories().map(cat => ({
  id: cat.id,
  name: cat.name,
  icon: cat.icon,
  color: cat.color,
  description: cat.description,
}));

/**
 * Busca categoria por ID
 */
export function getBillCategoryById(id: string): BillCategory | undefined {
  return BILL_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Obtém componente de ícone de categoria
 */
export function getBillCategoryIcon(
  iconName: keyof typeof LucideIcons
): React.ComponentType<any> | null {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || null;
}
