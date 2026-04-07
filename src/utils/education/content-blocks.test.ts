import { describe, it, expect } from 'vitest';
import {
  isValidContentBlock,
  isValidContentBlockArray,
  extractKeyPoints,
  extractChecklistItems,
  getReadableTextLength,
  extractTipContent,
  type ContentBlock,
} from './content-blocks';

describe('ContentBlock validation', () => {
  it('accepts a valid heading block', () => {
    expect(isValidContentBlock({ type: 'heading', level: 2, text: 'Título' })).toBe(true);
  });

  it('rejects heading with invalid level', () => {
    expect(isValidContentBlock({ type: 'heading', level: 1, text: 'x' })).toBe(false);
  });

  it('accepts a valid paragraph block', () => {
    expect(isValidContentBlock({ type: 'paragraph', text: 'Texto aqui.' })).toBe(true);
  });

  it('accepts a valid callout block', () => {
    expect(isValidContentBlock({ type: 'callout', variant: 'tip', title: 'Dica', text: 'Faça isso.' })).toBe(true);
  });

  it('rejects callout with invalid variant', () => {
    expect(isValidContentBlock({ type: 'callout', variant: 'danger', title: 'x', text: 'x' })).toBe(false);
  });

  it('accepts a valid checklist block', () => {
    expect(isValidContentBlock({ type: 'checklist', title: 'Lista', items: [{ id: '1', label: 'Item 1' }] })).toBe(true);
  });

  it('rejects checklist with empty items', () => {
    expect(isValidContentBlock({ type: 'checklist', title: 'Lista', items: [] })).toBe(false);
  });

  it('validates a full content block array', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', level: 2, text: 'Introdução' },
      { type: 'paragraph', text: 'Texto.' },
      { type: 'key_point', text: 'Ponto importante.' },
      { type: 'separator' },
      { type: 'summary', points: ['Resumo 1', 'Resumo 2'] },
    ];
    expect(isValidContentBlockArray(blocks)).toBe(true);
  });

  it('extracts key points from blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Intro' },
      { type: 'key_point', text: 'Ponto A' },
      { type: 'key_point', text: 'Ponto B' },
    ];
    expect(extractKeyPoints(blocks)).toEqual(['Ponto A', 'Ponto B']);
  });

  it('extracts checklist items from blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'checklist', title: 'T', items: [{ id: '1', label: 'A' }, { id: '2', label: 'B' }] },
    ];
    expect(extractChecklistItems(blocks)).toHaveLength(2);
  });

  it('calculates readable text length', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Doze caracteres' },
      { type: 'key_point', text: '123' },
    ];
    expect(getReadableTextLength(blocks)).toBeGreaterThan(0);
  });

  it('extracts tip content from key_point', () => {
    const blocks: ContentBlock[] = [
      { type: 'key_point', text: 'Dica principal' },
      { type: 'paragraph', text: 'Outro texto' },
    ];
    expect(extractTipContent(blocks)).toBe('Dica principal');
  });

  it('extracts tip content from callout when no key_point', () => {
    const blocks: ContentBlock[] = [
      { type: 'callout', variant: 'tip', title: 'Dica', text: 'Faça X' },
    ];
    expect(extractTipContent(blocks)).toBe('Dica: Faça X');
  });

  it('returns null tip when no extractable content', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Só texto.' },
    ];
    expect(extractTipContent(blocks)).toBeNull();
  });
});
