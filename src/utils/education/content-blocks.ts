export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip' | 'example'; title: string; text: string }
  | { type: 'key_point'; text: string }
  | { type: 'checklist'; title: string; items: Array<{ id: string; label: string; help?: string }> }
  | { type: 'exercise'; title: string; instructions: string; hint?: string }
  | { type: 'glossary_link'; term_slug: string; inline_definition: string }
  | { type: 'separator' }
  | { type: 'summary'; points: string[] }
  | { type: 'next_step'; text: string; lesson_slug?: string };

const CALLOUT_VARIANTS = new Set(['info', 'warning', 'tip', 'example']);
const HEADING_LEVELS = new Set([2, 3]);

export function isValidContentBlock(block: unknown): block is ContentBlock {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  switch (b.type) {
    case 'heading':
      return HEADING_LEVELS.has(b.level as number) && typeof b.text === 'string' && b.text.length > 0;
    case 'paragraph':
    case 'key_point':
      return typeof b.text === 'string' && b.text.length > 0;
    case 'callout':
      return (
        CALLOUT_VARIANTS.has(b.variant as string) &&
        typeof b.title === 'string' &&
        typeof b.text === 'string'
      );
    case 'checklist':
      return (
        typeof b.title === 'string' &&
        Array.isArray(b.items) &&
        b.items.length > 0 &&
        b.items.every(
          (i: unknown) =>
            typeof i === 'object' &&
            i !== null &&
            typeof (i as Record<string, unknown>).id === 'string' &&
            typeof (i as Record<string, unknown>).label === 'string',
        )
      );
    case 'exercise':
      return typeof b.title === 'string' && typeof b.instructions === 'string';
    case 'glossary_link':
      return typeof b.term_slug === 'string' && typeof b.inline_definition === 'string';
    case 'separator':
      return true;
    case 'summary':
      return Array.isArray(b.points) && b.points.length > 0 && b.points.every((p: unknown) => typeof p === 'string');
    case 'next_step':
      return typeof b.text === 'string';
    default:
      return false;
  }
}

export function isValidContentBlockArray(blocks: unknown): blocks is ContentBlock[] {
  return Array.isArray(blocks) && blocks.length > 0 && blocks.every(isValidContentBlock);
}

export function extractKeyPoints(blocks: ContentBlock[]): string[] {
  return blocks.filter((b): b is ContentBlock & { type: 'key_point' } => b.type === 'key_point').map((b) => b.text);
}

export function extractChecklistItems(blocks: ContentBlock[]): Array<{ id: string; label: string; help?: string }> {
  return blocks
    .filter((b): b is ContentBlock & { type: 'checklist' } => b.type === 'checklist')
    .flatMap((b) => b.items);
}

export function getReadableTextLength(blocks: ContentBlock[]): number {
  let len = 0;
  for (const b of blocks) {
    if ('text' in b && typeof b.text === 'string') len += b.text.length;
    if (b.type === 'summary') len += b.points.join(' ').length;
    if (b.type === 'checklist') len += b.items.reduce((acc, i) => acc + i.label.length, 0);
  }
  return len;
}

export function extractTipContent(blocks: ContentBlock[]): string | null {
  const keyPoints = extractKeyPoints(blocks);
  if (keyPoints.length > 0) return keyPoints[0];
  const callout = blocks.find((b) => b.type === 'callout' && b.variant === 'tip');
  if (callout && callout.type === 'callout') return `${callout.title}: ${callout.text}`;
  return null;
}
