import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Converte string ISO ou Date em objeto Date
 */
function parseDate(date: Date | string): Date {
  if (typeof date === "string") {
    return parseISO(date);
  }
  return date;
}

/**
 * Formata data para padrão brasileiro dd/MM/yyyy
 * @param date - Data a ser formatada (Date ou string ISO)
 * @returns String no formato dd/MM/yyyy
 * @example formatDateBR("2025-11-05") // "05/11/2025"
 */
export function formatDateBR(date: Date | string): string {
  try {
    const dateObj = parseDate(date);
    return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return "";
  }
}

/**
 * Formata data com hora: dd/MM/yyyy HH:mm
 * @param date - Data a ser formatada (Date ou string ISO)
 * @returns String no formato dd/MM/yyyy HH:mm
 * @example formatDateTimeBR("2025-11-05T14:30:00") // "05/11/2025 14:30"
 */
export function formatDateTimeBR(date: Date | string): string {
  try {
    const dateObj = parseDate(date);
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data/hora:", error);
    return "";
  }
}

/**
 * Retorna data relativa: "hoje", "ontem", "há 3 dias"
 * @param date - Data a ser formatada (Date ou string ISO)
 * @returns String com descrição relativa da data
 * @example formatRelativeDate("2025-11-05") // "hoje"
 * @example formatRelativeDate("2025-11-04") // "ontem"
 * @example formatRelativeDate("2025-11-01") // "há 4 dias"
 */
export function formatRelativeDate(date: Date | string): string {
  try {
    const dateObj = parseDate(date);
    
    if (isToday(dateObj)) {
      return "hoje";
    }
    
    if (isYesterday(dateObj)) {
      return "ontem";
    }
    
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: ptBR,
    });
  } catch (error) {
    console.error("Erro ao formatar data relativa:", error);
    return "";
  }
}

/**
 * Formata data para exibição curta: dd/MM
 * @param date - Data a ser formatada (Date ou string ISO)
 * @returns String no formato dd/MM
 * @example formatShortDateBR("2025-11-05") // "05/11"
 */
export function formatShortDateBR(date: Date | string): string {
  try {
    const dateObj = parseDate(date);
    return format(dateObj, "dd/MM", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data curta:", error);
    return "";
  }
}

/**
 * Formata data para exibição por extenso: 5 de novembro de 2025
 * @param date - Data a ser formatada (Date ou string ISO)
 * @returns String no formato extenso
 * @example formatLongDateBR("2025-11-05") // "5 de novembro de 2025"
 */
export function formatLongDateBR(date: Date | string): string {
  try {
    const dateObj = parseDate(date);
    return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data extensa:", error);
    return "";
  }
}
