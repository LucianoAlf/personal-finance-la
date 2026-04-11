/** Normalizes short replies for calendar create confirmation (sim/não). */

function normalizeConfirmText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isCalendarConfirmationYes(text: string): boolean {
  const t = normalizeConfirmText(text);
  if (!t) return false;
  if (t === 'sim' || t === 'si' || t === 'pode' || t === 'confirmo' || t === 'isso' || t === 'beleza' || t === 'blz') {
    return true;
  }
  if (t.startsWith('sim') && t.length <= 8) return true;
  if (t === 'ok' || t === 'okay' || (t.startsWith('ok') && t.length <= 12)) return true;
  return false;
}

export function isCalendarConfirmationNo(text: string): boolean {
  const t = normalizeConfirmText(text);
  if (!t) return false;
  if (t === 'nao' || t === 'cancela' || t === 'cancelar' || t === 'negativo') return true;
  if (t.startsWith('nao') && t.length <= 12) return true;
  return false;
}
