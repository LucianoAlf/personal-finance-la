import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateOnly = (date: string | Date): Date => {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }

  if (DATE_ONLY_REGEX.test(date)) {
    return new Date(`${date}T12:00:00`);
  }

  return new Date(date);
};

export const formatDateOnly = (date: string | Date): string => {
  const d = parseDateOnly(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (value: number): string => {
  // Validar valor antes de formatar
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date | string, pattern: string = 'dd/MM/yyyy'): string => {
  const dateObj = parseDateOnly(date);
  return format(dateObj, pattern, { locale: ptBR });
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

export const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Formatar data para input (YYYY-MM-DD)
export const formatDateForInput = (date: string | Date): string => {
  return formatDateOnly(date);
};

// Formatar data relativa (hoje, ontem, etc)
export const formatRelativeDate = (date: string | Date): string => {
  // Se for string no formato YYYY-MM-DD, adicionar T12:00:00 para evitar problema de timezone
  // Isso garante que a data seja interpretada corretamente independente do fuso horário
  let d: Date;
  if (typeof date === 'string') {
    d = parseDateOnly(date);
  } else {
    d = date;
  }
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Comparar apenas ano, mês e dia (ignorar horário)
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(d, today)) {
    return 'Hoje';
  }
  if (isSameDay(d, yesterday)) {
    return 'Ontem';
  }
  
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};
