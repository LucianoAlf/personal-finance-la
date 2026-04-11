import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('calendar routing ownership', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const indexPath = join(dir, '..', 'index.ts');
  const src = readFileSync(indexPath, 'utf8');

  it('keeps calendar gate before the NLP classifier in the WhatsApp pipeline', () => {
    const calendarGate = src.indexOf('hasPendingCalendarCreateConfirm(user.id, phone)');
    const nlpClassifier = src.indexOf('const intencaoNLP = await classificarIntencaoNLP');

    expect(calendarGate).toBeGreaterThan(-1);
    expect(nlpClassifier).toBeGreaterThan(-1);
    expect(calendarGate).toBeLessThan(nlpClassifier);
  });

  it('falls through to the NLP classifier when the calendar gate does not match', () => {
    expect(src).toContain('hasPendingCalendarCreateConfirm(user.id, phone)');
    expect(src).toContain('isCalendarIntent(command)');
    expect(src).toContain('const intencaoNLP = await classificarIntencaoNLP');
    expect(src).not.toContain('else { await processarComandoAgenda');
  });

  it('routes group messages before generic user context lookup', () => {
    const groupMode = src.indexOf('if (internalGroup) {');
    const contextLookup = src.indexOf('const contexto = await buscarContexto(user.id);');

    expect(groupMode).toBeGreaterThan(-1);
    expect(contextLookup).toBeGreaterThan(-1);
    expect(groupMode).toBeLessThan(contextLookup);
  });

  it('checks pending DM calendar confirmations before generic context processing', () => {
    const contextLookup = src.indexOf('const contexto = await buscarContexto(user.id);');
    const pendingCalendarGate = src.indexOf('if (await hasPendingCalendarCreateConfirm(user.id, phone)) {');

    expect(contextLookup).toBeGreaterThan(-1);
    expect(pendingCalendarGate).toBeGreaterThan(-1);
    expect(pendingCalendarGate).toBeLessThan(contextLookup);
  });
});
