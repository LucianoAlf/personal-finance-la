import { enUS, es, ptBR } from 'date-fns/locale';

export function getDateFnsLocale(locale: string) {
  switch (locale) {
    case 'en-US':
      return enUS;
    case 'es-ES':
      return es;
    case 'pt-BR':
    default:
      return ptBR;
  }
}
